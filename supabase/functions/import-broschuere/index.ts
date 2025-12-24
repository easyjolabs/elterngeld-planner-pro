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

// Use Gemini Vision to extract text from PDF with user-friendly formatting
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
              text: `Extrahiere den VOLLSTÄNDIGEN Text aus diesem PDF-Dokument über Elterngeld und Elternzeit.

WICHTIG:
- Behalte die Kapitelstruktur (1., 1.1, 1.2, 2., etc.)
- Behalte alle Überschriften und Unterüberschriften
- Behalte alle praktischen Beispiele und Rechenbeispiele
- Entferne Kopf-/Fußzeilen und Seitenzahlen
- Gib NUR den extrahierten Text zurück, ohne Kommentare

Das Dokument ist die offizielle BMFSFJ Broschüre "Elterngeld und Elternzeit".`
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
      max_tokens: 32000,
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

// Split text into chunks by sections for better context
function chunkTextBySections(text: string): string[] {
  const chunks: string[] = [];
  
  // Split by major section headers (1., 2., 3., etc. or 1.1, 1.2, etc.)
  const sectionPattern = /(?=\n(?:\d+\.(?:\d+\.?)*)\s+[A-ZÄÖÜ])/g;
  const sections = text.split(sectionPattern).filter(s => s.trim());
  
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed || trimmed.length < 50) continue;
    
    // If section is too long, split by subsections or paragraphs
    if (trimmed.length > 2000) {
      const paragraphs = trimmed.split(/\n\n+/);
      let currentChunk = '';
      
      for (const para of paragraphs) {
        if ((currentChunk + para).length > 1500 && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = para;
        } else {
          currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    } else {
      chunks.push(trimmed);
    }
  }
  
  // Fallback if section splitting didn't work well
  if (chunks.length < 5 && text.length > 3000) {
    console.log('Section splitting produced few chunks, falling back to paragraph splitting');
    chunks.length = 0;
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    
    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;
      
      if ((currentChunk + trimmedPara).length > 1200 && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedPara;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedPara : trimmedPara;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }
  
  return chunks;
}

// Sanitize text for PostgreSQL
function sanitizeForPostgres(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfUrl } = await req.json();
    
    // Default to the official BMFSFJ brochure URL
    const url = pdfUrl || 'https://www.bmfsfj.de/resource/blob/93614/883f612fc3cfa075315e5905c61e3a1d/elterngeld-und-elternzeit-data.pdf';
    
    console.log(`Fetching PDF from: ${url}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, clear existing documents and chunks
    console.log('Clearing existing documents...');
    const { data: existingDocs } = await supabase.from('documents').select('id');
    
    if (existingDocs && existingDocs.length > 0) {
      const docIds = existingDocs.map(d => d.id);
      await supabase.from('document_chunks').delete().in('document_id', docIds);
      await supabase.from('documents').delete().in('id', docIds);
      console.log(`Deleted ${existingDocs.length} existing documents`);
    }

    // Create new document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        name: 'Elterngeld und Elternzeit - BMFSFJ Broschüre',
        storage_path: url,
        status: 'processing',
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      throw docError;
    }

    console.log(`Created document record: ${doc.id}`);

    // Fetch PDF from URL
    const pdfResponse = await fetch(url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }
    
    const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
    console.log(`Downloaded PDF: ${pdfBytes.length} bytes`);

    // Extract text using Gemini
    const text = await extractTextWithGemini(pdfBytes, lovableApiKey);

    if (!text || text.length < 100) {
      console.error('Could not extract sufficient text from PDF');
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new Error('Could not extract text from PDF.');
    }

    console.log(`Extracted ${text.length} characters of text`);
    console.log(`Sample: ${text.substring(0, 500)}`);

    // Chunk the text by sections
    const chunks = chunkTextBySections(text);
    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new Error('No text chunks could be created from the PDF');
    }

    // Store chunks
    const chunkRecords = chunks.map((content, index) => ({
      document_id: doc.id,
      content: sanitizeForPostgres(content),
      chunk_index: index,
    }));

    // Insert in batches
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

    console.log(`Successfully imported brochure with ${chunks.length} chunks`);

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
    console.error('Error importing brochure:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
