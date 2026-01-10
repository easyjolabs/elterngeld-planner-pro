import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, language = "en" } = await req.json();
    
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
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

    // Step 1: Generate embedding for the user's question
    console.log("Generating embedding for question:", message.substring(0, 50));
    
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: message,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding error:", embeddingResponse.status, errorText);
      throw new Error(`Failed to generate embedding: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Step 2: Search for similar FAQs
    console.log("Searching for similar FAQs...");
    
    const { data: faqs, error: searchError } = await supabase.rpc("search_faqs", {
      query_embedding: queryEmbedding,
      match_count: 5,
      similarity_threshold: 0.3,
    });

    if (searchError) {
      console.error("FAQ search error:", searchError);
      throw new Error(`Failed to search FAQs: ${searchError.message}`);
    }

    console.log(`Found ${faqs?.length || 0} relevant FAQs`);

    // Step 3: Build context from FAQs
    const isGerman = language === "de";
    let context = "";
    
    if (faqs && faqs.length > 0) {
      context = faqs.map((faq: any, index: number) => {
        const question = isGerman ? faq.question_de : faq.question_en;
        const answer = isGerman ? faq.answer_de : faq.answer_en;
        return `FAQ ${index + 1} (Similarity: ${(faq.similarity * 100).toFixed(1)}%):
Q: ${question}
A: ${answer}`;
      }).join("\n\n");
    }

    // Step 4: Create system prompt
    const systemPrompt = isGerman 
      ? `Du bist ein freundlicher und kompetenter Elterngeld-Experte für Expats in Deutschland.

REGELN:
- Antworte basierend auf den bereitgestellten FAQs
- Nutze **fett** für wichtige Begriffe wie **Basiselterngeld**, **ElterngeldPlus**, **Partnerschaftsbonus**
- Sei präzise und hilfreich
- Wenn du etwas nicht basierend auf den FAQs beantworten kannst, sage das ehrlich
- Halte die Antworten verständlich und strukturiert
- Erwähne relevante Zahlen, Fristen und Bedingungen

KONTEXT AUS FAQ-DATENBANK:
${context || "Keine relevanten FAQs gefunden."}

Beantworte die Frage des Nutzers basierend auf dem obigen Kontext.`
      : `You are a friendly and knowledgeable Elterngeld expert for expats in Germany.

RULES:
- Answer based on the provided FAQs
- Use **bold** for important terms like **Basiselterngeld**, **ElterngeldPlus**, **Partnerschaftsbonus**
- Be precise and helpful
- If you cannot answer based on the FAQs, say so honestly
- Keep answers clear and well-structured
- Mention relevant numbers, deadlines, and conditions

CONTEXT FROM FAQ DATABASE:
${context || "No relevant FAQs found."}

Answer the user's question based on the context above.`;

    // Step 5: Generate streaming response
    console.log("Generating response with Lovable AI...");
    
    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        stream: true,
      }),
    });

    if (!chatResponse.ok) {
      if (chatResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (chatResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await chatResponse.text();
      console.error("Chat response error:", chatResponse.status, errorText);
      throw new Error(`AI gateway error: ${chatResponse.status}`);
    }

    // Return streaming response
    return new Response(chatResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("elterngeld-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
