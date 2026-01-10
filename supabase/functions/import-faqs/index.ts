import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FAQ {
  id: string;
  category: string;
  question: { de: string; en: string };
  answer: { de: string; en: string };
  tags: string[];
}

interface FAQData {
  meta: { version: string; totalFaqs: number };
  faqs: FAQ[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { faqs: faqData } = await req.json() as { faqs: FAQData };
    
    if (!faqData || !faqData.faqs || !Array.isArray(faqData.faqs)) {
      return new Response(
        JSON.stringify({ error: "Invalid FAQ data format. Expected { faqs: { faqs: [...] } }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log(`Starting import of ${faqData.faqs.length} FAQs...`);

    // Process FAQs in batches to avoid rate limits
    const batchSize = 5;
    const faqs = faqData.faqs;

    for (let i = 0; i < faqs.length; i += batchSize) {
      const batch = faqs.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(faqs.length / batchSize)}`);

      const batchPromises = batch.map(async (faq) => {
        try {
          // Create text for embedding: question_en + answer_en + tags
          const textForEmbedding = `${faq.question.en} ${faq.answer.en} ${faq.tags.join(" ")}`;

          // Generate embedding
          const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: textForEmbedding,
            }),
          });

          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`Embedding failed for ${faq.id}: ${embeddingResponse.status} - ${errorText}`);
          }

          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.data[0].embedding;

          // Upsert FAQ into database
          const { error: upsertError } = await supabase
            .from("faqs")
            .upsert({
              id: faq.id,
              category: faq.category,
              question_de: faq.question.de,
              question_en: faq.question.en,
              answer_de: faq.answer.de,
              answer_en: faq.answer.en,
              tags: faq.tags,
              embedding: embedding,
            }, { onConflict: "id" });

          if (upsertError) {
            throw new Error(`Database upsert failed for ${faq.id}: ${upsertError.message}`);
          }

          return { success: true, id: faq.id };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          console.error(`Failed to process FAQ ${faq.id}:`, errorMsg);
          return { success: false, id: faq.id, error: errorMsg };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`${result.id}: ${result.error}`);
        }
      }

      // Small delay between batches to avoid rate limits
      if (i + batchSize < faqs.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Import complete: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: `Imported ${results.success} FAQs successfully`,
        success: results.success,
        failed: results.failed,
        errors: results.errors.slice(0, 10), // Limit error messages
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("import-faqs error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
