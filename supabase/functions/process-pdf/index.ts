import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Use Gemini Vision to extract text from PDF
async function extractTextWithGemini(pdfBytes: Uint8Array, apiKey: string): Promise<string> {
  const base64Pdf = uint8ArrayToBase64(pdfBytes);
  
  console.log('Sending PDF to Gemini for text extraction...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extrahiere den VOLLSTÄNDIGEN Text aus diesem PDF-Dokument. 
Gib NUR den extrahierten Text zurück, ohne Formatierung, Kommentare oder Erklärungen.
Behalte die Struktur mit Absätzen bei, aber entferne Kopf-/Fußzeilen und Seitenzahlen.
Es ist ein deutsches Dokument über Elterngeld (BEEG).
Extrahiere so viel Text wie möglich.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`
              }
            }
          ]
        }
      ],
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', response.status, error);
    throw new Error(`Failed to extract text with Gemini: ${response.status}`);
  }

  const data = await response.json();
  const extractedText = data.choices?.[0]?.message?.content || '';
  
  console.log(`Gemini extracted ${extractedText.length} characters`);
  
  return extractedText;
}

// Split text into chunks with overlap - optimized for German text
function chunkText(text: string, chunkSize = 400, overlap = 80): string[] {
  // Split by paragraphs first for better context
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;
    
    const currentWords = currentChunk.split(/\s+/).filter(w => w);
    const paraWords = trimmedPara.split(/\s+/).filter(w => w);
    
    if (currentWords.length + paraWords.length > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      // Start new chunk with overlap from previous
      const words = currentChunk.split(/\s+/).filter(w => w);
      const overlapText = words.slice(-overlap).join(' ');
      currentChunk = overlapText ? overlapText + '\n\n' + trimmedPara : trimmedPara;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If paragraph-based chunking results in too few chunks, fall back to word-based
  if (chunks.length < 3 && text.length > 1000) {
    const words = text.split(/\s+/).filter(w => w);
    chunks.length = 0;
    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunk = chunkWords.join(' ').trim();
      if (chunk) chunks.push(chunk);
      i += chunkSize - overlap;
    }
  }
  
  return chunks;
}

// Sanitize text for PostgreSQL - remove null bytes and invalid characters
function sanitizeForPostgres(text: string): string {
  return text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ') // Remove control characters except \n, \r, \t
    .trim();
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

    console.log('PDF downloaded, extracting text with Gemini...');

    // Extract text from PDF using Gemini
    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    const text = await extractTextWithGemini(pdfBytes, lovableApiKey);

    if (!text || text.length < 100) {
      console.error('Could not extract sufficient text from PDF');
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new Error('Could not extract text from PDF.');
    }

    console.log(`Extracted ${text.length} characters of text`);
    console.log(`Sample: ${text.substring(0, 300)}`);

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new Error('No text chunks could be created from the PDF');
    }

    // Store chunks (tsvector is generated automatically by trigger)
    const chunkRecords = chunks.map((content, index) => ({
      document_id: doc.id,
      content: sanitizeForPostgres(content),
      chunk_index: index,
    }));

    // Insert in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < chunkRecords.length; i += batchSize) {
      const batch = chunkRecords.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
        throw insertError;
      }
      
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunkRecords.length / batchSize)}`);
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
