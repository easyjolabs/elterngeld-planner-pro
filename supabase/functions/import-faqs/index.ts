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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log(`Starting import of ${faqData.faqs.length} FAQs...`);

    // Process FAQs in batches
    const batchSize = 10;
    const faqs = faqData.faqs;

    for (let i = 0; i < faqs.length; i += batchSize) {
      const batch = faqs.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(faqs.length / batchSize)}`);

      const upsertData = batch.map(faq => ({
        id: faq.id,
        category: faq.category,
        question_de: faq.question.de,
        question_en: faq.question.en,
        answer_de: faq.answer.de,
        answer_en: faq.answer.en,
        tags: faq.tags,
      }));

      const { error: upsertError } = await supabase
        .from("faqs")
        .upsert(upsertData, { onConflict: "id" });

      if (upsertError) {
        console.error("Batch upsert error:", upsertError);
        results.failed += batch.length;
        results.errors.push(`Batch error: ${upsertError.message}`);
      } else {
        results.success += batch.length;
      }
    }

    console.log(`Import complete: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: `Imported ${results.success} FAQs successfully`,
        success: results.success,
        failed: results.failed,
        errors: results.errors.slice(0, 10),
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
