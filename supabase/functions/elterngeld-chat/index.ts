import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate embedding for a query
async function generateQueryEmbedding(text: string, apiKey: string): Promise<number[]> {
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
    console.error('Embedding API error:', await response.text());
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Retrieve relevant document chunks
async function getRelevantChunks(
  supabase: any,
  queryEmbedding: number[],
  matchCount: number = 5
): Promise<string[]> {
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_count: matchCount,
  });

  if (error) {
    console.error('Error fetching chunks:', error);
    return [];
  }

  return data?.map((chunk: { content: string }) => chunk.content) || [];
}

// Check if there's a ready document
async function hasReadyDocument(supabase: any): Promise<boolean> {
  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .eq('status', 'ready')
    .limit(1);

  if (error) {
    console.error('Error checking documents:', error);
    return false;
  }

  return data && data.length > 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get the latest user message for RAG query
    const latestUserMessage = messages
      .slice()
      .reverse()
      .find((m: { role: string }) => m.role === 'user')?.content || '';

    // Check if there's a document available
    const hasDocument = await hasReadyDocument(supabase);
    
    let documentContext = '';
    let systemPrompt = '';

    if (hasDocument && latestUserMessage) {
      console.log('Generating embedding for user query...');
      
      // Generate embedding for the query
      const queryEmbedding = await generateQueryEmbedding(latestUserMessage, LOVABLE_API_KEY);
      
      // Get relevant chunks
      const relevantChunks = await getRelevantChunks(supabase, queryEmbedding, 5);
      
      if (relevantChunks.length > 0) {
        documentContext = relevantChunks.join('\n\n---\n\n');
        console.log(`Found ${relevantChunks.length} relevant chunks`);
      }
    }

    // Build system prompt based on whether we have document context
    if (documentContext) {
      systemPrompt = `Du bist ein Experte für deutsches Elterngeld (Elterngeld). Beantworte Fragen NUR auf Grundlage des unten stehenden Dokumentkontexts.

Wenn die Antwort nicht im Kontext gefunden werden kann, sage "Diese Information konnte ich im hochgeladenen Dokument nicht finden."

Verwende kein externes Wissen. Antworte in der Sprache, in der der Benutzer schreibt (Deutsch oder Englisch).

DOKUMENTKONTEXT:
${documentContext}`;
    } else {
      // Fallback to original system prompt if no document
      systemPrompt = `You are an expert assistant specializing in German Elterngeld (parental allowance). You help parents understand their benefits, eligibility, and planning options.

Key knowledge:
- Elterngeld is a German government benefit for parents after childbirth
- Basis Elterngeld: 65% of net income (min €300, max €1,800/month), paid for up to 12 months (14 with partner months)
- Elterngeld Plus: Half of Basis amount but can be received for twice as long
- Sibling bonus: Additional 10% (min €75) if you have another child under 3 or two children under 6
- Multiple birth bonus: €300 per additional child
- Income limit: Annual income over €175,000 makes you ineligible
- Partner months: 2 additional months if both parents take at least 2 months each

When given user context (income, calculation results), provide personalized advice based on their specific situation.

Be concise, helpful, and accurate. If unsure about specific regulations, recommend consulting the local Elterngeldstelle.
Respond in the same language the user writes in (German or English).`;
    }

    // Build context message if available
    let contextMessage = '';
    if (context) {
      contextMessage = `\n\nUser's current calculator state:
- Monthly income: €${context.monthlyIncome}
- Has sibling bonus: ${context.hasSiblingBonus ? 'Yes' : 'No'}
- Multiple children (twins/triplets): ${context.multipleChildren}
- Eligibility status: ${context.isEligible ? 'Eligible' : 'Not eligible (income too high)'}
- Calculated Basis Elterngeld: €${context.totalBasis}/month (base: €${context.basisAmount})
- Calculated Elterngeld Plus: €${context.totalPlus}/month (base: €${context.plusAmount})`;
    }

    console.log('Sending request to Lovable AI with RAG context');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt + contextMessage },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    console.log('Streaming response from AI gateway');

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Error in elterngeld-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});