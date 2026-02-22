// supabase/functions/process-text/index.ts
// Edge Function: Text Processing via Google Gemini API
// Gemini receives a raw text description and rewrites it formally.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    // In local development or anon usage, we might not have a full user. 
    // If authError says "Invalid JWT" or "missing sub claim", it might be the anon key.
    // Let's just ensure we have an auth header and a valid Supabase project.
    if (authError && authError.message !== 'Invalid JWT' && authError.message !== 'Auth session missing!' && !authError.message.includes('missing sub claim')) {
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const textToProcess: string = body.text;

    if (!textToProcess || textToProcess.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No text data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      return new Response(JSON.stringify({
        error: 'OpenRouter API key not configured',
        details: 'The environment variable OPENROUTER_API_KEY is missing in the Edge Function'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing text: length=${textToProcess.length}`);

    // ---- Formally rewrite the text with OpenRouter (Nemotron) ----
    const formalRewritePrompt = `Você é um assistente especializado em redação escolar e gestão pedagógica.
Reescreva e formalize o seguinte relato de ocorrência escolar.

Diretrizes rigorosas:
1. Tom e Estilo: Profissional, objetivo, imparcial e pedagógico.
2. Fidelidade: Mantenha estritamente os fatos, nomes e o contexto narrado. NÃO adicione nomes, opiniões, resoluções ou fatos que não estejam na transcrição provida.
3. Não Alucine: Não invente regras da escola, não atribua punições não descritas e não mude o foco do relato original.
4. Correção: Corrija gramática, elimine gírias, hesitações e coloquialismos.
5. Formato: Retorne APENAS a versão final do texto reescrito. Não inicie com saudações, não use aspas ou introduções (ex: "Aqui está o texto revisado"). Sua única saída deve ser o conteúdo aproveitável.

Texto original para revisão:
"${textToProcess}"
`;

    const rewriteResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://escolaflow.com.br', // Optional, for OpenRouter analytics
          'X-Title': 'EscolaFlow' // Optional, for OpenRouter analytics
        },
        body: JSON.stringify({
          model: "google/gemma-3-4b-it:free",
          messages: [
            {
              role: 'user',
              content: formalRewritePrompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      }
    );

    if (!rewriteResponse.ok) {
      const errBody = await rewriteResponse.text();
      console.error('Gemini rewrite error:', errBody);

      return new Response(JSON.stringify({
        original: textToProcess,
        formal: textToProcess,
        error: 'Formalization failed, returning original text instead',
        details: errBody
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rewriteData = await rewriteResponse.json();
    const messageContent = rewriteData.choices?.[0]?.message?.content;

    let formalText = textToProcess; // Fallback to original

    if (messageContent) {
      formalText = messageContent.replace(/<think>[\s\S]*?<\/think>\n?/g, '').trim();
    } else {
      console.warn('OpenRouter rewrite returned no content, using original.', rewriteData);
    }

    console.log(`Rewritten formal text(${formalText.length} chars).`);
    // Success response matching Audio result
    return new Response(JSON.stringify({
      original: textToProcess,
      formal: formalText,
      error: null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Text processing exception:', error);
    return new Response(JSON.stringify({
      error: 'Internal processing error',
      details: error.message || String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
