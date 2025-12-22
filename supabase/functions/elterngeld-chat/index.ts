import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an expert assistant specializing in German Elterngeld (parental allowance). You help parents understand their benefits, eligibility, and planning options.

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service not configured');
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

    console.log('Sending request to Lovable AI with context:', contextMessage);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + contextMessage },
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
