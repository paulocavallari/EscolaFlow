// supabase/functions/process-text/index.ts
// Edge Function: Text Processing via OpenRouter
// Receives a raw text description and rewrites it formally using free-tier chat models (tier racing).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { errorResponse, jsonResponse } from '../_shared/errors.ts';
import { stripThinkTags } from '../_shared/json-safe.ts';

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const textToProcess: string = body.text;

    if (!textToProcess || textToProcess.trim().length === 0) {
      return errorResponse(corsHeaders, 400, 'No text data provided');
    }

    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      return errorResponse(
        corsHeaders,
        500,
        'OpenRouter API key not configured',
        'The environment variable OPENROUTER_API_KEY is missing in the Edge Function'
      );
    }

    const fnStart = Date.now();
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

    // ---- Parallel model racing strategy ----
    // Models are split into tiers. All models within a tier are fired simultaneously;
    // the first successful response wins (Promise.any), the rest are aborted.
    // If an entire tier fails, the next tier is tried.
    // This reduces worst-case latency from ~40s (sequential) to ~6s per tier.
    const MODEL_TIERS: string[][] = [
      // Tier 1 — Fast (small active params, quickest inference)
      // Trinity Mini leads: consistently fastest in production (observed <2s p50)
      [
        "arcee-ai/trinity-mini:free",      // 26B MoE / 3B active — fastest observed
        "google/gemma-3-4b-it:free",       // 4B dense
        "openai/gpt-oss-20b:free",         // 21B MoE / 3.6B active
      ],
      // Tier 2 — Medium (larger but reliable, good Portuguese)
      [
        "google/gemma-3-12b-it:free",                    // 12B dense
        "mistralai/mistral-small-3.1-24b-instruct:free", // 24B dense
        "google/gemma-3-27b-it:free",                    // 27B dense
      ],
    ];
    const TIER_TIMEOUT_MS = 6000; // 6s max per tier

    interface RaceResult { model: string; content: string; }

    async function raceTier(models: string[], signal?: AbortSignal): Promise<RaceResult> {
      const tierController = new AbortController();
      // If parent signals abort, propagate
      if (signal) signal.addEventListener('abort', () => tierController.abort(), { once: true });

      const modelPromises = models.map(async (model): Promise<RaceResult> => {
        console.log(`[OpenRouter] Racing: ${model}`);
        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://escolaflow.com.br',
            'X-Title': 'Ocorrências VC',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: formalRewritePrompt }],
            temperature: 0.2,
            max_tokens: 1024,
          }),
          signal: tierController.signal,
        });

        if (!resp.ok) {
          const errBody = await resp.text().catch(() => '');
          throw new Error(`${model} HTTP ${resp.status}: ${errBody.slice(0, 100)}`);
        }

        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error(`${model}: empty content`);

        return { model, content };
      });

      // Timeout rejects if no model responds in time
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          tierController.abort();
          reject(new Error(`Tier timeout after ${TIER_TIMEOUT_MS}ms`));
        }, TIER_TIMEOUT_MS);
      });

      try {
        // Promise.any: first fulfilled wins; rejects only if ALL reject
        // Promise.race: whichever settles first (success or timeout)
        const result = await Promise.race([
          Promise.any(modelPromises),
          timeoutPromise,
        ]);
        tierController.abort(); // cancel remaining requests
        return result;
      } catch (err) {
        tierController.abort();
        throw err;
      }
    }

    let usedModel = '';
    let formalText = textToProcess;
    let tiersAttempted = 0;
    let lastError: any = null;

    for (const tier of MODEL_TIERS) {
      tiersAttempted++;
      try {
        console.log(`[OpenRouter] Trying tier ${tiersAttempted} (${tier.length} models in parallel)...`);
        const result = await raceTier(tier);
        usedModel = result.model;
        // Strip <think> tags some models emit
        formalText = stripThinkTags(result.content);
        console.log(`[OpenRouter] ✅ Tier ${tiersAttempted} succeeded: ${usedModel}`);
        break;
      } catch (tierErr: any) {
        console.warn(`[OpenRouter] Tier ${tiersAttempted} failed:`, tierErr.message ?? tierErr);
        lastError = tierErr.message ?? String(tierErr);
      }
    }

    const duration = Date.now() - fnStart;

    // All tiers failed — return original text as graceful degradation
    if (!usedModel) {
      console.error(`All ${tiersAttempted} tier(s) failed. Last error: ${lastError}`);
      return jsonResponse({
        original: textToProcess,
        formal: textToProcess,
        error: 'Formalization failed, returning original text instead',
        details: lastError,
        model_used: null,
        tiers_attempted: tiersAttempted,
        duration_ms: duration,
      }, 200, corsHeaders);
    }

    console.log(`Rewritten formal text(${formalText.length} chars) | model: ${usedModel} | tiers: ${tiersAttempted} | ${duration}ms`);

    return jsonResponse({
      original: textToProcess,
      formal: formalText,
      error: null,
      model_used: usedModel,
      tiers_attempted: tiersAttempted,
      duration_ms: duration,
    }, 200, corsHeaders);

  } catch (error: any) {
    console.error('Text processing exception:', error);
    return errorResponse(corsHeaders, 500, 'Internal processing error', error.message || String(error));
  }
});
