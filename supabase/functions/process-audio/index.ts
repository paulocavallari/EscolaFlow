// supabase/functions/process-audio/index.ts
// Edge Function: Audio Processing via Google Gemini 2.0 Flash
// Single multimodal call: transcribes audio AND rewrites formally in one request.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use gemini-2.5-flash
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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
        if (authError && authError.message !== 'Invalid JWT' && authError.message !== 'Auth session missing!' && !authError.message.includes('missing sub claim')) {
            return new Response(JSON.stringify({ error: 'Unauthorized', details: authError.message }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const body = await req.json();
        const audioBase64: string = body.audio;
        const mimeType: string = body.mimeType || 'audio/mp4';

        if (!audioBase64) {
            return new Response(JSON.stringify({ error: 'No audio data provided' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) {
            return new Response(JSON.stringify({
                error: 'Gemini API key not configured',
                details: 'The environment variable GEMINI_API_KEY is missing',
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`[process-audio] model=${GEMINI_MODEL} base64Length=${audioBase64.length} mimeType=${mimeType}`);
        const startTime = Date.now();

        // ---- Single combined call: transcribe + formal rewrite ----
        // We ask Gemini to return a JSON object with {original, formal} in one shot.
        // This halves the number of API round-trips and network overhead.
        const prompt = `Você é um assistente especializado em registros escolares em português brasileiro.

Analise o áudio e faça as seguintes tarefas, respondendo SOMENTE com um objeto JSON válido:

1. "original": Transcreva o áudio fielmente, exatamente como foi falado. Se o áudio estiver inaudível ou vazio, use o valor "Áudio não reconhecido".
2. "formal": Reescreva o relato de forma formal, clara e objetiva, adequada para um registro oficial escolar. Mantenha todos os fatos. Se o original for "Áudio não reconhecido", use string vazia "".

Responda APENAS com o JSON, sem markdown, sem explicações, sem blocos de código.
Exemplo de resposta esperada: {"original":"o aluno bateu no colega na hora do recreio","formal":"O aluno agrediu fisicamente um colega durante o período de recreio."}`;

        const combinedResponse = await fetch(
            `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: audioBase64,
                                    },
                                },
                                { text: prompt },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 2048,
                        responseMimeType: 'application/json',
                    },
                }),
            }
        );

        const elapsed = Date.now() - startTime;
        console.log(`[process-audio] Gemini responded in ${elapsed}ms. status=${combinedResponse.status}`);

        if (!combinedResponse.ok) {
            const errBody = await combinedResponse.text();
            console.error('[process-audio] Gemini API error:', errBody);
            return new Response(JSON.stringify({ error: 'Audio processing failed', details: errBody }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const geminiData = await combinedResponse.json();

        const candidate = geminiData.candidates?.[0];
        if (!candidate) {
            const promptFeedback = geminiData.promptFeedback;
            console.error('[process-audio] No candidates returned. promptFeedback:', JSON.stringify(promptFeedback));
            return new Response(JSON.stringify({
                original: 'Áudio não reconhecido',
                formal: '',
                error: 'Gemini returned no response (possible safety block or unsupported audio format)',
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn(`[process-audio] Unexpected finishReason: ${candidate.finishReason}`);
        }

        const rawText = candidate.content?.parts?.[0]?.text?.trim() ?? '';
        console.log(`[process-audio] Raw response (${rawText.length} chars): "${rawText.slice(0, 200)}"`);

        // Parse JSON response from Gemini
        let original = 'Áudio não reconhecido';
        let formal = '';

        try {
            // Strip any accidental markdown fences before parsing
            const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            const parsed = JSON.parse(cleaned);
            original = parsed.original || 'Áudio não reconhecido';
            formal = parsed.formal || '';
        } catch (parseErr) {
            // Gemini didn't return valid JSON — treat entire text as transcription and reuse it
            console.warn('[process-audio] JSON parse failed, using raw text as original:', parseErr);
            original = rawText || 'Áudio não reconhecido';
            formal = rawText;
        }

        console.log(`[process-audio] Done. elapsed=${elapsed}ms original="${original.slice(0, 80)}..."`);

        return new Response(JSON.stringify({ original, formal }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('[process-audio] Unexpected error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message || String(error),
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
