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
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({
        error: 'Gemini API key not configured',
        details: 'The environment variable GEMINI_API_KEY is missing in the Edge Function'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing text: length=${textToProcess.length}`);

    // ---- Formally rewrite the text with Gemini ----
    const formalRewritePrompt = `
Você é um assistente especializado em redação escolar e gestão de conflitos educacionais.
Reescreva o texto abaixo em um formato estritamente formal, claro e objetivo, adequado
para o registro em um sistema de controle de ocorrências escolares.

Instruções:
- Elimine gírias, hesitações e coloquialismos.
- Mantenha todo o contexto, todos os fatos detalhados e os nomes citados.
- Escreva em terceira pessoa ou primeira pessoa formal de forma coerente com o relato original.
- NÃO invente fatos, opiniões, nem resoluções.
- Seja impessoal e direto.
- Retorne APENAS a versão final do texto formatada para sistema profissional, sem apresentações, aspas nem cumprimentos.

Texto original para revisão:
"${textToProcess}"
        `;

    const rewriteResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: formalRewritePrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
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
    const candidate = rewriteData.candidates?.[0];

    let formalText = textToProcess; // Fallback to original

    if (candidate && candidate.content?.parts?.[0]?.text) {
      formalText = candidate.content.parts[0].text.trim();
    } else {
      console.warn('Gemini rewrite returned no content, using original.');
    }

    console.log(`Rewritten formal text (${formalText.length} chars).`);

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
