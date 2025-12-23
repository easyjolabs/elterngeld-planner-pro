import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Split text into chunks with overlap - optimized for German text
function chunkText(text: string, chunkSize = 400, overlap = 80): string[] {
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
    const { text, documentName } = await req.json();
    
    if (!text || text.length < 100) {
      throw new Error('Text content is required (minimum 100 characters)');
    }

    console.log(`Processing text document: ${documentName || 'Unnamed'}`);
    console.log(`Text length: ${text.length} characters`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        name: documentName || 'Text Document',
        storage_path: 'text-import',
        status: 'processing',
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      throw docError;
    }

    console.log(`Created document record: ${doc.id}`);

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      await supabase.from('documents').update({ status: 'failed' }).eq('id', doc.id);
      throw new Error('No text chunks could be created');
    }

    // Store chunks (tsvector is generated automatically by trigger)
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

    console.log(`Successfully processed text with ${chunks.length} chunks`);

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
    console.error('Error processing text:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
