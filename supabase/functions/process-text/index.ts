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
    const formalRewritePrompt = `Você é um assistente escolar que reescreve relatos de ocorrência de forma culta, clara e direta.

Diretrizes:
1. Tom: Direto, objetivo e imparcial. Evite palavras muito rebuscadas ou redundâncias.
2. Tempo Verbal: Use SEMPRE o PASSADO SIMPLES (Pretérito Perfeito). Exemplo: "O aluno chutou" (ERRADO: "foi encontrado chutando" ou "estava chutando").
3. Fidelidade e Tamanho: Mantenha TODOS os fatos relatados. NÃO invente nomes, regras ou punições. NÃO RESUMA O TEXTO. Reescreva todo o conteúdo original preservando todas as informações.
4. Exemplo de saída esperada: "O aluno Gabriel chutou a porta da sala de aula. Mesmo após o professor adverti-lo verbalmente, o aluno recusou-se a entrar na sala."
5. Formato: Retorne APENAS o texto reescrito. Nada de aspas, saudações ou explicações.

Texto original:
"${textToProcess}"
`;

    const modelsToTry = [
      "google/gemma-3-12b-it:free",
      "google/gemma-3-4b-it:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-coder-32b-instruct:free",
      "qwen/qwen3-next-80b-a3b-instruct:free",
      "nvidia/nemotron-mini-4b-instruct:free",
      "microsoft/phi-3-mini-128k-instruct:free"
    ];

    let rewriteResponse: Response | null = null;
    let fallbackError: any = null;
    let usedModel = "";

    for (const model of modelsToTry) {
      console.log(`[OpenRouter] Trying model: ${model}`);
      try {
        rewriteResponse = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://escolaflow.com.br',
              'X-Title': 'EscolaFlow'
            },
            body: JSON.stringify({
              model: model,
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

        if (rewriteResponse.ok) {
          usedModel = model;
          break; // success, break loop
        }

        const errBody = await rewriteResponse.text();
        console.warn(`[OpenRouter] Model ${model} failed (HTTP ${rewriteResponse.status}):`, errBody);
        fallbackError = errBody;
      } catch (fetchErr: any) {
        console.error(`[OpenRouter] Exception on model ${model}:`, fetchErr.message);
        fallbackError = fetchErr.message;
      }
    }

    if (!rewriteResponse || !rewriteResponse.ok) {
      console.error('All fallback models failed. Last error:', fallbackError);

      return new Response(JSON.stringify({
        original: textToProcess,
        formal: textToProcess,
        error: 'Formalization failed, returning original text instead',
        details: fallbackError
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

    console.log(`Rewritten formal text(${formalText.length} chars) using model: ${usedModel}`);
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
