import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chunks, documentName, clearExisting = true } = await req.json();

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      throw new Error("chunks must be a non-empty array of strings");
    }

    if (!documentName || typeof documentName !== "string") {
      throw new Error("documentName is required");
    }

    console.log(`Importing ${chunks.length} chunks for document: ${documentName}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optionally clear existing documents
    if (clearExisting) {
      console.log("Clearing existing documents...");
      const { data: existingDocs } = await supabase
        .from("documents")
        .select("id");
      
      if (existingDocs && existingDocs.length > 0) {
        const { error: deleteError } = await supabase
          .from("documents")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        
        if (deleteError) {
          console.error("Error deleting existing documents:", deleteError);
        } else {
          console.log(`Deleted ${existingDocs.length} existing documents`);
        }
      }
    }

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        name: documentName,
        storage_path: "manual-import",
        status: "processing",
        chunk_count: chunks.length,
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to create document: ${docError.message}`);
    }

    console.log(`Created document record: ${doc.id}`);

    // Sanitize chunks for PostgreSQL
    const sanitizeForPostgres = (text: string): string => {
      return text
        .replace(/\u0000/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    };

    // Insert chunks in batches
    const batchSize = 50;
    const totalBatches = Math.ceil(chunks.length / batchSize);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      const chunkRecords = batch.map((content: string, idx: number) => ({
        document_id: doc.id,
        content: sanitizeForPostgres(content),
        chunk_index: i + idx,
      }));

      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(chunkRecords);

      if (insertError) {
        throw new Error(`Failed to insert batch ${batchNumber}: ${insertError.message}`);
      }

      console.log(`Inserted batch ${batchNumber}/${totalBatches}`);
    }

    // Update document status to ready
    await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", doc.id);

    console.log("Import complete!");

    return new Response(
      JSON.stringify({
        success: true,
        documentId: doc.id,
        chunksImported: chunks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Import error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
