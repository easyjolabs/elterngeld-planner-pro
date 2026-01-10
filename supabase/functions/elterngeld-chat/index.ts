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

    // Step 1: Search for similar FAQs using keyword search
    console.log("Searching FAQs for:", message.substring(0, 50));
    
    const { data: faqs, error: searchError } = await supabase.rpc("search_faqs_keyword", {
      search_query: message,
      match_count: 5,
    });

    if (searchError) {
      console.error("FAQ search error:", searchError);
    }

    // Log found FAQs with their rank scores
    if (faqs && faqs.length > 0) {
      console.log("=== RAG Search Results ===");
      faqs.forEach((faq: any, index: number) => {
        console.log(`[${index + 1}] Rank: ${faq.rank?.toFixed(4)} | Category: ${faq.category}`);
        console.log(`    Q_EN: ${faq.question_en?.substring(0, 80)}...`);
      });
      console.log("==========================");
    } else {
      console.log("No FAQs found for query:", message);
    }

    console.log(`Found ${faqs?.length || 0} relevant FAQs`);

    // Step 2: Build context from FAQs
    const isGerman = language === "de";
    let context = "";
    
    if (faqs && faqs.length > 0) {
      context = faqs.map((faq: any, index: number) => {
        const question = isGerman ? faq.question_de : faq.question_en;
        const answer = isGerman ? faq.answer_de : faq.answer_en;
        return `FAQ ${index + 1}:
Q: ${question}
A: ${answer}`;
      }).join("\n\n");
    }

    // Step 3: Create system prompt
    const systemPrompt = isGerman 
      ? `Du bist ein freundlicher Elterngeld-Experte für Expats in Deutschland.

STIL:
- Antworte KURZ und PRÄZISE (max 3-4 Sätze für einfache Fragen)
- Nutze kurze Absätze statt langer Fließtexte
- Nur bei komplexen Fragen mehr Details geben
- Nutze **fett** für wichtige Begriffe
- Beende mit einer Rückfrage ob mehr Details gewünscht sind

FORMAT:
- Keine langen Aufzählungen
- Kurze, klare Absätze
- Leicht lesbar und scanbar

KONTEXT AUS FAQ-DATENBANK:
${context || "Keine relevanten FAQs gefunden."}

Beantworte die Frage kurz und prägnant.`
      : `You are a friendly Elterngeld expert for expats in Germany.

STYLE:
- Answer SHORT and PRECISE (max 3-4 sentences for simple questions)
- Use short paragraphs, not long blocks of text
- Only give more details for complex questions
- Use **bold** for key terms
- End with a follow-up question asking if they need more details

FORMAT:
- No long bullet lists
- Short, clear paragraphs
- Easy to read and scan

CONTEXT FROM FAQ DATABASE:
${context || "No relevant FAQs found."}

Answer the question briefly and clearly.`;

    // Step 4: Generate streaming response
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
