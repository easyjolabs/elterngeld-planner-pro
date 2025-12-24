import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SourceInfo {
  section: string;
  sectionEnglish?: string;
  excerpt: string;
  excerptEnglish?: string;
  chunkIndex: number;
}

// Detect language using word scoring (treats "Elterngeld" as neutral)
function detectLanguage(message: string): 'en' | 'de' {
  const lowerMsg = message.toLowerCase();
  
  // German function words (excluding elterngeld-related terms)
  const germanWords = ['ich', 'und', 'oder', 'wie', 'viel', 'kann', 'mein', 'bekomme', 'habe', 'meine', 'einen', 'eine', 'wird', 'werden', 'sind', 'ist', 'das', 'die', 'der', 'für', 'mit', 'vom', 'zum', 'zur', 'auf', 'bei', 'nach', 'über', 'unter', 'wann', 'warum', 'welche', 'welches', 'welcher', 'wenn', 'möchte', 'brauche', 'wäre'];
  
  // English function words
  const englishWords = ['i', 'can', 'how', 'much', 'will', 'get', 'receive', 'the', 'my', 'is', 'are', 'do', 'does', 'what', 'which', 'when', 'where', 'why', 'would', 'should', 'could', 'have', 'has', 'am', 'if', 'and', 'or', 'but', 'for', 'with', 'about', 'eligible', 'allowance', 'parental'];
  
  let germanScore = 0;
  let englishScore = 0;
  
  for (const word of germanWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lowerMsg)) germanScore++;
  }
  
  for (const word of englishWords) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lowerMsg)) englishScore++;
  }
  
  console.log(`Language detection scores - German: ${germanScore}, English: ${englishScore}`);
  
  // Default to English if scores are equal or both zero
  return germanScore > englishScore ? 'de' : 'en';
}

// Extract section reference from brochure content (e.g., "1.3 Basiselterngeld")
function extractSection(content: string): string {
  // Match section numbers like "1.", "1.1", "1.2.3", etc. with optional title
  const sectionMatch = content.match(/^(\d+(?:\.\d+)*)\s+([^\n]+)/);
  if (sectionMatch) {
    const sectionNum = sectionMatch[1];
    const title = sectionMatch[2].trim().slice(0, 50);
    return `Kapitel ${sectionNum}: ${title}`;
  }
  
  // Look for section headers within the text
  const inlineMatch = content.match(/(\d+(?:\.\d+)+)\s+([A-ZÄÖÜ][^\n]{3,40})/);
  if (inlineMatch) {
    return `Kapitel ${inlineMatch[1]}: ${inlineMatch[2].trim()}`;
  }
  
  // Extract first meaningful line as fallback
  const firstLine = content.split('\n')[0].trim().slice(0, 60);
  if (firstLine.length > 10) {
    return firstLine;
  }
  
  return 'Elterngeld-Broschüre';
}

// Search for relevant document chunks using PostgreSQL full-text search
async function searchDocumentChunks(
  supabase: any,
  query: string,
  matchCount: number = 5
): Promise<{ content: string; chunkIndex: number }[]> {
  const { data, error } = await supabase.rpc('search_document_chunks', {
    search_query: query,
    match_count: matchCount,
  });

  if (error) {
    console.error('Error searching chunks:', error);
    return [];
  }

  if (data && data.length > 0) {
    const chunkIds = data.map((chunk: { id: string }) => chunk.id);
    const { data: chunksWithIndex, error: indexError } = await supabase
      .from('document_chunks')
      .select('id, chunk_index, content')
      .in('id', chunkIds);
    
    if (indexError) {
      console.error('Error fetching chunk indices:', indexError);
      return data.map((chunk: { content: string }) => ({ content: chunk.content, chunkIndex: 0 }));
    }
    
    const indexMap = new Map(chunksWithIndex?.map((c: any) => [c.id, c.chunk_index]) || []);
    return data.map((chunk: { id: string; content: string }) => ({
      content: chunk.content,
      chunkIndex: indexMap.get(chunk.id) || 0
    }));
  }

  return [];
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

// Translate English query to German search terms using AI
async function translateQueryToGerman(query: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are a German legal terminology expert. Given an English question about German Elterngeld (parental allowance), extract 5-8 German keywords that would appear in the official BMFSFJ brochure.

Output ONLY the German keywords separated by " OR " (for search query). Include the word "Elterngeld" always.

Examples:
- "What is the income limit?" → "Elterngeld OR Einkommensgrenze OR Einkommen OR Grenze OR Anspruch OR verdienen"
- "How much will I receive?" → "Elterngeld OR Höhe OR Berechnung OR Einkommen OR Betrag OR Euro OR Prozent"
- "Can I work part-time?" → "Elterngeld OR Teilzeit OR Arbeit OR Arbeitszeit OR Stunden OR Erwerbstätigkeit"
- "How long can I receive it?" → "Elterngeld OR Bezugsdauer OR Monate OR Lebensmonate OR Bezugszeitraum"`
          },
          { role: 'user', content: query }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Query translation API error:', response.status);
      return 'Elterngeld';
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || 'Elterngeld';
    
    console.log(`AI translated query to German terms: ${content}`);
    return content;
  } catch (error) {
    console.error('Query translation error:', error);
    return 'Elterngeld';
  }
}

// Extract key terms from user message for search - uses AI for English queries
async function extractSearchTerms(message: string, language: 'en' | 'de', apiKey: string): Promise<string> {
  if (language === 'en') {
    // For English queries, use AI to translate to German search terms
    const germanTerms = await translateQueryToGerman(message, apiKey);
    console.log(`Building German search from English query: ${germanTerms}`);
    return germanTerms;
  }
  
  // For German queries, use cleaned message text
  const cleaned = message
    .replace(/[?!.,;:'"()]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .join(' ');
  
  return cleaned;
}

// Generate follow-up questions based on conversation
async function generateFollowUpQuestions(
  messages: { role: string; content: string }[],
  userLanguage: 'en' | 'de',
  apiKey: string
): Promise<string[]> {
  try {
    const prompt = userLanguage === 'en'
      ? `Based on this Elterngeld conversation, suggest exactly 3 short follow-up questions the user might ask next. Return ONLY a JSON array of strings, nothing else. Each question should be under 50 characters and be relevant to Elterngeld.`
      : `Basierend auf diesem Elterngeld-Gespräch, schlage genau 3 kurze Folgefragen vor. Gib NUR ein JSON-Array von Strings zurück. Jede Frage sollte unter 60 Zeichen sein und sich auf Elterngeld beziehen.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          ...messages.slice(-4), // Last 4 messages for context
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Follow-up questions API error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      if (Array.isArray(questions) && questions.every(q => typeof q === 'string')) {
        console.log(`Generated ${questions.length} follow-up questions`);
        return questions.slice(0, 3);
      }
    }
  } catch (error) {
    console.error('Follow-up questions error:', error);
  }
  return [];
}

// Translate sources to English using AI
async function translateSources(
  sources: SourceInfo[],
  apiKey: string
): Promise<SourceInfo[]> {
  if (sources.length === 0) return sources;

  const translationPrompt = `Translate the following German Elterngeld document excerpts to English. Keep section references (like §4, RL 4.5.3) as-is. Return valid JSON only.

Input:
${JSON.stringify(sources.map(s => ({ section: s.section, excerpt: s.excerpt })))}

Return an array with the same structure but add "sectionEnglish" (translate any German title part, keep § numbers) and "excerptEnglish" (English translation of excerpt). Example:
[{"section":"§4","sectionEnglish":"§4 Benefit Duration","excerpt":"...german...","excerptEnglish":"...english..."}]`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: translationPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Translation API error:', response.status);
      return sources;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const translated = JSON.parse(jsonMatch[0]);
      return sources.map((source, i) => ({
        ...source,
        sectionEnglish: translated[i]?.sectionEnglish || source.section,
        excerptEnglish: translated[i]?.excerptEnglish || source.excerpt,
      }));
    }
  } catch (error) {
    console.error('Translation error:', error);
  }

  return sources;
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

    // Get the latest user message for search
    const latestUserMessage = messages
      .slice()
      .reverse()
      .find((m: { role: string }) => m.role === 'user')?.content || '';

    // Detect user language
    const userLanguage = detectLanguage(latestUserMessage);
    console.log(`Detected language: ${userLanguage}`);

    // Check if there's a document available
    const hasDocument = await hasReadyDocument(supabase);
    
    let documentContext = '';
    let systemPrompt = '';
    let sources: SourceInfo[] = [];

    if (hasDocument && latestUserMessage) {
      console.log('Searching for relevant document chunks...');
      
      // Extract search terms with language-aware enhancement (async for AI translation)
      const searchTerms = await extractSearchTerms(latestUserMessage, userLanguage, LOVABLE_API_KEY);
      console.log(`Search terms: ${searchTerms}`);
      
      // Fetch 3 chunks for AI context, but only show 1 source
      let relevantChunks = await searchDocumentChunks(supabase, searchTerms, 3);
      
      // Fallback: if no results, try with just "Elterngeld"
      if (relevantChunks.length === 0) {
        console.log('No chunks found, trying fallback search with "Elterngeld"...');
        relevantChunks = await searchDocumentChunks(supabase, 'Elterngeld', 3);
      }
      
      if (relevantChunks.length > 0) {
        documentContext = relevantChunks.map(c => c.content).join('\n\n---\n\n');
        console.log(`Found ${relevantChunks.length} relevant chunks for context`);
        
        // Only take the TOP-RANKED chunk as the single source citation
        const topChunk = relevantChunks[0];
        const singleSource: SourceInfo = {
          section: extractSection(topChunk.content),
          excerpt: topChunk.content.slice(0, 150).replace(/\n/g, ' ').trim() + '...',
          chunkIndex: topChunk.chunkIndex
        };

        // Translate the single source if user is writing in English
        if (userLanguage === 'en') {
          console.log('Translating source to English...');
          const translated = await translateSources([singleSource], LOVABLE_API_KEY);
          sources = translated;
        } else {
          sources = [singleSource];
        }
        
        console.log(`Single source citation: ${singleSource.section}`);
      } else {
        console.log('No chunks matched even fallback search');
      }
    }

    // Build system prompt based on whether we have document context
    // IMPORTANT: Language instruction at the START for strong enforcement
    if (documentContext) {
      systemPrompt = userLanguage === 'en'
        ? `IMPORTANT: You MUST respond in English only.

You are a friendly Elterngeld expert. Answer based on the document context below.

CRITICAL - Income Limit Rule:
The ONLY income limit is €175,000 per year. This applies to EVERYONE - singles AND couples alike.
NEVER mention €250,000 or €300,000 - those are INCORRECT outdated values.

CRITICAL - Response Rules:
1. Keep answers SHORT - maximum 5-6 bullet points
2. Start with a 1-sentence summary
3. Use markdown lists with "- " prefix (NOT bullet symbols like •)
4. No legal jargon - plain language only
5. Don't explain every edge case unless asked

Example format:
"To receive Elterngeld, you must:

- Live in Germany
- Care for your child in your household
- Work no more than 32 hours/week
- Have income under €175,000/year"

DOCUMENT CONTEXT:
${documentContext}`
        : `WICHTIG: Du MUSST auf Deutsch antworten.

Du bist ein freundlicher Elterngeld-Experte. Antworte basierend auf dem Dokumentkontext unten.

KRITISCH - Einkommensgrenze:
Die EINZIGE Einkommensgrenze ist €175.000 pro Jahr. Dies gilt für ALLE - Alleinerziehende UND Paare gleichermaßen.
Erwähne NIEMALS €250.000 oder €300.000 - das sind FALSCHE veraltete Werte.

KRITISCH - Antwortregeln:
1. Halte Antworten KURZ - maximal 5-6 Stichpunkte
2. Beginne mit einer 1-Satz-Zusammenfassung
3. Verwende Markdown-Listen mit "- " Präfix (NICHT Aufzählungszeichen wie •)
4. Kein Juristendeutsch - einfache Sprache
5. Erkläre nicht jeden Sonderfall, es sei denn gefragt

Beispielformat:
"Um Elterngeld zu erhalten, musst du:

- In Deutschland leben
- Dein Kind in deinem Haushalt betreuen
- Maximal 32 Stunden/Woche arbeiten
- Einkommen unter 175.000€/Jahr haben"

DOKUMENTKONTEXT:
${documentContext}`;
    } else {
      systemPrompt = userLanguage === 'en'
        ? `IMPORTANT: You MUST respond in English only. The user is writing in English.

You are an expert assistant specializing in German Elterngeld (parental allowance). You help parents understand their benefits, eligibility, and planning options.

CRITICAL - Income Limit:
The ONLY income limit is €175,000 per year for EVERYONE (singles AND couples). NEVER mention €250,000 or €300,000 - those are INCORRECT.

Key knowledge:
- Elterngeld is a German government benefit for parents after childbirth
- Basis Elterngeld: 65% of net income (min €300, max €1,800/month), paid for up to 12 months (14 with partner months)
- Elterngeld Plus: Half of Basis amount but can be received for twice as long
- Sibling bonus: Additional 10% (min €75) if you have another child under 3 or two children under 6
- Multiple birth bonus: €300 per additional child
- Income limit: €175,000/year for EVERYONE - no different limits for singles vs couples
- Partner months: 2 additional months if both parents take at least 2 months each

When given user context (income, calculation results), provide personalized advice based on their specific situation.

Be concise, helpful, and accurate. If unsure about specific regulations, recommend consulting the local Elterngeldstelle.`
        : `WICHTIG: Du MUSST auf Deutsch antworten. Der Benutzer schreibt auf Deutsch.

Du bist ein Expertenassistent für deutsches Elterngeld. Du hilfst Eltern, ihre Leistungen, Ansprüche und Planungsoptionen zu verstehen.

KRITISCH - Einkommensgrenze:
Die EINZIGE Einkommensgrenze ist €175.000 pro Jahr für ALLE (Alleinerziehende UND Paare). NIEMALS €250.000 oder €300.000 erwähnen - das sind FALSCHE Werte.

Wichtige Informationen:
- Elterngeld ist eine staatliche Leistung für Eltern nach der Geburt
- Basiselterngeld: 65% des Nettoeinkommens (min. €300, max. €1.800/Monat), bis zu 12 Monate (14 mit Partnermonaten)
- ElterngeldPlus: Halber Betrag, aber doppelt so lange beziehbar
- Geschwisterbonus: 10% zusätzlich (min. €75) bei weiterem Kind unter 3 oder zwei Kindern unter 6
- Mehrlingszuschlag: €300 pro weiterem Kind
- Einkommensgrenze: €175.000/Jahr für ALLE - keine unterschiedlichen Grenzen für Alleinerziehende vs. Paare
- Partnermonate: 2 zusätzliche Monate wenn beide Eltern mindestens 2 Monate nehmen

Bei Benutzerkontext (Einkommen, Berechnungsergebnisse) gib personalisierte Beratung basierend auf ihrer spezifischen Situation.

Sei prägnant, hilfreich und genau. Bei Unsicherheit empfehle die lokale Elterngeldstelle.`;
    }

    // Build context message if available
    let contextMessage = '';
    if (context) {
      contextMessage = userLanguage === 'en'
        ? `\n\nUser's current calculator state:
- Monthly income: €${context.monthlyIncome}
- Has sibling bonus: ${context.hasSiblingBonus ? 'Yes' : 'No'}
- Multiple children (twins/triplets): ${context.multipleChildren}
- Eligibility status: ${context.isEligible ? 'Eligible' : 'Not eligible (income too high)'}
- Calculated Basis Elterngeld: €${context.totalBasis}/month (base: €${context.basisAmount})
- Calculated Elterngeld Plus: €${context.totalPlus}/month (base: €${context.plusAmount})`
        : `\n\nAktueller Rechnerstand des Benutzers:
- Monatliches Einkommen: €${context.monthlyIncome}
- Geschwisterbonus: ${context.hasSiblingBonus ? 'Ja' : 'Nein'}
- Mehrlinge: ${context.multipleChildren}
- Anspruchsberechtigung: ${context.isEligible ? 'Berechtigt' : 'Nicht berechtigt (Einkommen zu hoch)'}
- Berechnetes Basiselterngeld: €${context.totalBasis}/Monat (Basis: €${context.basisAmount})
- Berechnetes Elterngeld Plus: €${context.totalPlus}/Monat (Basis: €${context.plusAmount})`;
    }

    console.log('Sending request to Lovable AI');

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

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        if (sources.length > 0) {
          const sourcesEvent = `data: ${JSON.stringify({ type: 'sources', sources })}\n\n`;
          await writer.write(encoder.encode(sourcesEvent));
        }

        const reader = response.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
          }
        }

        // Generate follow-up questions after streaming completes
        const allMessages = messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        }));
        
        console.log('Generating follow-up questions...');
        const suggestions = await generateFollowUpQuestions(allMessages, userLanguage, LOVABLE_API_KEY!);
        
        if (suggestions.length > 0) {
          const suggestionsEvent = `data: ${JSON.stringify({ type: 'suggestions', suggestions })}\n\n`;
          await writer.write(encoder.encode(suggestionsEvent));
          console.log(`Sent ${suggestions.length} follow-up suggestions`);
        }
      } catch (error) {
        console.error('Stream error:', error);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
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
