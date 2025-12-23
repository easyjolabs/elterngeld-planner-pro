import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text extraction from PDF bytes (handles basic PDFs)
async function extractTextFromPDF(pdfBytes: Uint8Array): Promise<string> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const pdfText = decoder.decode(pdfBytes);
  
  // Extract text streams from PDF
  const textMatches: string[] = [];
  
  // Pattern 1: Text between BT and ET markers (text objects)
  const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  
  while ((match = btEtPattern.exec(pdfText)) !== null) {
    const textBlock = match[1];
    // Extract text from Tj, TJ, ' and " operators
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    const tjArrayPattern = /\[(.*?)\]\s*TJ/g;
    
    let textMatch;
    while ((textMatch = tjPattern.exec(textBlock)) !== null) {
      textMatches.push(decodeEscapedText(textMatch[1]));
    }
    while ((textMatch = tjArrayPattern.exec(textBlock)) !== null) {
      const arrayContent = textMatch[1];
      const stringPattern = /\(([^)]*)\)/g;
      let stringMatch;
      while ((stringMatch = stringPattern.exec(arrayContent)) !== null) {
        textMatches.push(decodeEscapedText(stringMatch[1]));
      }
    }
  }
  
  // Pattern 2: Look for stream content that might contain readable text
  const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
  while ((match = streamPattern.exec(pdfText)) !== null) {
    const streamContent = match[1];
    // Only include if it looks like text (contains mostly printable characters)
    const printableRatio = (streamContent.match(/[\x20-\x7E]/g) || []).length / streamContent.length;
    if (printableRatio > 0.7 && streamContent.length > 20) {
      // Clean up the text
      const cleaned = streamContent
        .replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleaned.length > 10) {
        textMatches.push(cleaned);
      }
    }
  }
  
  let extractedText = textMatches.join(' ');
  
  // Clean up the extracted text
  extractedText = extractedText
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ')
    .trim();
  
  return extractedText;
}

function decodeEscapedText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

// Split text into chunks with overlap
function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  if (words.length === 0) return [];
  
  let i = 0;
  while (i < words.length) {
    const chunkWords = words.slice(i, i + chunkSize);
    const chunk = chunkWords.join(' ').trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    i += chunkSize - overlap;
    if (i < 0) i = chunkSize;
  }
  
  return chunks;
}

// Generate embeddings using Lovable AI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Embedding API error:', error);
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storagePath, documentName } = await req.json();
    
    if (!storagePath) {
      throw new Error('storagePath is required');
    }

    console.log(`Processing PDF: ${storagePath}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        name: documentName || storagePath.split('/').pop() || 'document.pdf',
        storage_path: storagePath,
        status: 'processing',
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      throw docError;
    }

    console.log(`Created document record: ${doc.id}`);

    // Download PDF from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('pdf-documents')
      .download(storagePath);

    if (downloadError) {
      console.error('Error downloading PDF:', downloadError);
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw downloadError;
    }

    console.log('PDF downloaded, extracting text...');

    // Extract text from PDF
    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    const text = await extractTextFromPDF(pdfBytes);

    if (!text || text.length < 50) {
      console.error('Could not extract sufficient text from PDF');
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new Error('Could not extract text from PDF. The PDF may be image-based or encrypted.');
    }

    console.log(`Extracted ${text.length} characters of text`);

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new Error('No text chunks could be created from the PDF');
    }

    // Generate embeddings and store chunks
    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`);
      
      const embedding = await generateEmbedding(chunks[i], lovableApiKey);
      
      chunkRecords.push({
        document_id: doc.id,
        content: chunks[i],
        embedding: `[${embedding.join(',')}]`,
        chunk_index: i,
      });

      // Small delay to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Insert all chunks
    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(chunkRecords);

    if (insertError) {
      console.error('Error inserting chunks:', insertError);
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw insertError;
    }

    // Update document status
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'ready', chunk_count: chunks.length })
      .eq('id', doc.id);

    if (updateError) {
      console.error('Error updating document status:', updateError);
      throw updateError;
    }

    console.log(`Successfully processed PDF with ${chunks.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        documentId: doc.id,
        chunkCount: chunks.length,
        textLength: text.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing PDF:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
