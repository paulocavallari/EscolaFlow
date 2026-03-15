// supabase/functions/categorize-occurrence/index.ts
// Edge Function: AI categorization of occurrences into 50 final categories
// Called when an occurrence with category "OUTRO" is concluded.

// @ts-ignore Deno remote import is resolved at Edge runtime.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse } from '../_shared/errors.ts';
import { parseJsonSafe, stripThinkTags } from '../_shared/json-safe.ts';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const FINAL_CATEGORIES = [
  'ACIDENTES_E_EVENTOS_INESPERADOS',
  'AGRESSAO_FISICA',
  'ALERTA_DE_DESAPARECIMENTO',
  'AMEACA_DE_ATAQUE_ATIVO',
  'APOLOGIA_AO_NAZISMO',
  'ASSEDIO_MORAL',
  'ASSEDIO_SEXUAL',
  'ATAQUE_ATIVO_CONCRETIZADO',
  'ATOS_OBSCENOS',
  'BULLYING_E_CYBERBULLYING',
  'COMERCIALIZACAO_DE_ALCOOL_E_TABACO',
  'COMUNICACAO_VIOLENTA',
  'CONSUMO_DE_ALCOOL_E_TABACO',
  'CONSUMO_DE_CIGARRO_ELETRONICO',
  'CONSUMO_DE_SUBSTANCIAS_ILICITAS',
  'CRIMES_CIBERNETICOS',
  'DANOS_AO_PATRIMONIO',
  'ENVOLVIMENTO_COM_TRAFICO',
  'EVASAO_ESCOLAR',
  'FAKE_NEWS',
  'FEMINICIDIO',
  'FURTO',
  'GORDOFOBIA',
  'HOMICIDIO',
  'HOMOFOBIA',
  'IMPORTUNACAO_SEXUAL',
  'INCITAMENTO_ATOS_INFRACIONAIS',
  'INDISCIPLINA',
  'INVASAO',
  'MAL_SUBITO',
  'OBITO',
  'OCUPACAO_DE_UNIDADE_ESCOLAR',
  'POSSE_DE_ARMA_BRANCA',
  'POSSE_DE_ARMA_DE_BRINQUEDO',
  'POSSE_DE_ARMA_DE_FOGO',
  'RACISMO',
  'ROUBO',
  'SEQUESTRO',
  'SINAIS_DE_ALTERACOES_EMOCIONAIS',
  'SINAIS_DE_AUTOMUTILACAO',
  'SINAIS_DE_ISOLAMENTO_SOCIAL',
  'SITUACAO_DE_AMEACA',
  'SUICIDIO_CONCRETIZADO',
  'TENTATIVA_DE_SUICIDIO',
  'TRANSFOBIA',
  'USO_INADEQUADO_DE_DISPOSITIVOS',
  'VIOLENCIA_DE_GENERO',
  'VIOLENCIA_DOMESTICA',
  'VULNERABILIDADE_FAMILIAR',
  'XENOFOBIA',
];

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if (!auth.ok) return auth.response;

    // ---- Parse body ----
    const body = await req.json();
    const occurrenceId: string = body.occurrence_id;

    if (!occurrenceId) {
      return errorResponse(corsHeaders, 400, 'Missing occurrence_id');
    }

    // ---- Fetch occurrence + actions with service role ----
    const supabaseAdmin = createAdminClient();

    const { data: occurrence, error: occError } = await supabaseAdmin
      .from('occurrences')
      .select('id, description_original, description_formal, category, status, students(name, classes(name))')
      .eq('id', occurrenceId)
      .single();

    if (occError || !occurrence) {
      return errorResponse(corsHeaders, 404, 'Occurrence not found');
    }

    const { data: actions } = await supabaseAdmin
      .from('actions')
      .select('action_type, description')
      .eq('occurrence_id', occurrenceId)
      .order('created_at', { ascending: true });

    // ---- Build AI prompt ----
    const actionsText = actions?.length
      ? actions.map((a: any, i: number) => `  ${i + 1}. [${a.action_type}] ${a.description}`).join('\n')
      : '  Nenhuma tratativa registrada.';

    const studentName = (occurrence as any).students?.name ?? 'Desconhecido';
    const className = (occurrence as any).students?.classes?.name ?? 'N/A';

    const prompt = `Você é um classificador de ocorrências escolares. Analise o relato abaixo e classifique-o em EXATAMENTE UMA das categorias listadas.

Aluno: ${studentName}
Turma: ${className}
Categoria de Criação: ${occurrence.category}

Relato Original:
"${occurrence.description_original}"

Relato Formal:
"${occurrence.description_formal}"

Tratativas:
${actionsText}

CATEGORIAS VÁLIDAS (retorne EXATAMENTE uma destas strings):
${FINAL_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Responda SOMENTE em JSON válido, sem markdown, sem explicação fora do JSON:
{"final_category": "NOME_EXATO_DA_CATEGORIA", "justification": "Breve justificativa em português (1-2 frases)"}`;

    // ---- Call OpenRouter ----
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterApiKey) {
      return errorResponse(corsHeaders, 500, 'OpenRouter API key not configured');
    }

    const fnStart = Date.now();

    // Free models on OpenRouter ordered by speed (fastest active parameters first).
    // Updated: March 2026 — models verified against OpenRouter /api/v1/models.
    const modelsToTry = [
      "openai/gpt-oss-20b:free",                       // 21B MoE / 3.6B active  — ultra-fast, great JSON output
      "google/gemma-3-4b-it:free",                     // 4B dense               — very fast
      "arcee-ai/trinity-mini:free",                    // 26B MoE / 3B active    — very fast
      "google/gemma-3-12b-it:free",                    // 12B dense              — fast, reliable
      "mistralai/mistral-small-3.1-24b-instruct:free", // 24B dense              — good JSON/Portuguese
      "stepfun/step-3.5-flash:free",                   // 196B MoE / 11B active  — Flash speed
      "nvidia/nemotron-3-super-120b-a12b:free",        // 120B MoE / 12B active  — fast MoE
      "meta-llama/llama-3.3-70b-instruct:free",        // 70B dense              — reliable fallback
      "qwen/qwen3-coder:free",                         // 480B MoE / 35B active  — coder = good JSON
    ];

    let aiResponse: Response | null = null;
    let usedModel = '';
    let lastError: any = null;
    let fallbacksTried = 0;

    for (const model of modelsToTry) {
      console.log(`[categorize] Trying model: ${model}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://escolaflow.com.br',
            'X-Title': 'Ocorrências VC',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 256,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (aiResponse.ok) {
          usedModel = model;
          break;
        }

        const errBody = await aiResponse.text();
        console.warn(`[categorize] Model ${model} failed (HTTP ${aiResponse.status}):`, errBody);
        lastError = errBody;
        fallbacksTried++;
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        const isTimeout = fetchErr.name === 'AbortError';
        console.error(`[categorize] ${model}:`, isTimeout ? 'Timeout' : fetchErr.message);
        lastError = isTimeout ? 'Timeout' : fetchErr.message;
        fallbacksTried++;
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      return jsonResponse({
        error: 'All AI models failed for categorization',
        details: lastError,
      }, 502, corsHeaders);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? '';

    // Strip <think> tags and markdown fences
    const cleaned = stripThinkTags(rawContent)
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = parseJsonSafe<{ final_category: string; justification: string }>(cleaned);
    if (!parsed) {
      console.error('[categorize] Failed to parse AI response:', cleaned);
      return jsonResponse({
        error: 'AI returned invalid JSON',
        raw: cleaned,
      }, 502, corsHeaders);
    }

    // Validate the category is in our allowed list
    if (!FINAL_CATEGORIES.includes(parsed.final_category)) {
      console.error('[categorize] Invalid category from AI:', parsed.final_category);
      return jsonResponse({
        error: `AI returned invalid category: ${parsed.final_category}`,
        valid_categories: FINAL_CATEGORIES,
      }, 422, corsHeaders);
    }

    // ---- Update occurrence in DB ----
    const { error: updateError } = await supabaseAdmin
      .from('occurrences')
      .update({ final_category: parsed.final_category })
      .eq('id', occurrenceId);

    if (updateError) {
      console.error('[categorize] DB update failed:', updateError);
      return errorResponse(corsHeaders, 500, 'Failed to save categorization', updateError.message);
    }

    const duration = Date.now() - fnStart;
    console.log(`[categorize] Success: ${occurrenceId} → ${parsed.final_category} (model: ${usedModel} | fallbacks: ${fallbacksTried} | ${duration}ms)`);

    return jsonResponse({
      final_category: parsed.final_category,
      justification: parsed.justification,
      model_used: usedModel,
      fallbacks_tried: fallbacksTried,
      duration_ms: duration,
    }, 200, corsHeaders);

  } catch (error: any) {
    console.error('[categorize] Exception:', error);
    return errorResponse(corsHeaders, 500, 'Internal processing error', error.message || String(error));
  }
});
