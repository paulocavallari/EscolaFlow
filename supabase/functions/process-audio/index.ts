// supabase/functions/process-audio/index.ts
// Edge Function: Audio Processing via Google Gemini API (Free Tier)
// Gemini handles both transcription and formal rewriting in a single multimodal call.

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

        // Accept JSON body with base64 audio (sent by supabase.functions.invoke)
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
                details: 'The environment variable GEMINI_API_KEY is missing in the Edge Function'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Processing audio: base64Length=${audioBase64.length}, mimeType=${mimeType}`);

        // ---- Step 1: Transcribe audio with Gemini (multimodal) ----
        const transcriptionResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${geminiApiKey}`,
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
                                {
                                    text: 'Transcreva o áudio acima em português brasileiro. Retorne APENAS o texto transcrito, sem explicações, sem formatação, sem aspas. Se o áudio estiver vazio ou inaudível, retorne "Áudio não reconhecido".',
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 2048,
                    },
                }),
            }
        );

        if (!transcriptionResponse.ok) {
            const errBody = await transcriptionResponse.text();
            console.error('Gemini transcription error:', errBody);
            return new Response(JSON.stringify({ error: 'Transcription failed', details: errBody }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const transcriptionData = await transcriptionResponse.json();

        // Check for safety blocks or empty candidates
        const candidate = transcriptionData.candidates?.[0];
        if (!candidate) {
            const promptFeedback = transcriptionData.promptFeedback;
            console.error('Gemini returned no candidates. promptFeedback:', JSON.stringify(promptFeedback));
            return new Response(JSON.stringify({
                original: 'Áudio não reconhecido',
                formal: '',
                error: 'Gemini returned no response. Possible safety block or unsupported audio format.',
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Warn if the response was cut short (e.g. SAFETY, MAX_TOKENS)
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            console.warn(`Gemini transcription finishReason: ${candidate.finishReason}`);
        }

        const transcription = candidate.content?.parts?.[0]?.text?.trim() ?? '';
        console.log(`Transcription result (${transcription.length} chars): "${transcription.slice(0, 100)}..."`);

        if (!transcription || transcription === 'Áudio não reconhecido') {
            return new Response(JSON.stringify({
                original: transcription || 'Áudio não reconhecido',
                formal: '',
                error: 'Could not transcribe audio',
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ---- Step 2: Formal rewrite with Gemini ----
        const rewriteResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Você é um redator profissional especializado em documentos escolares.

Reescreva o seguinte relato de ocorrência escolar de forma formal, clara e objetiva, 
mantendo todos os fatos e detalhes importantes. Use linguagem adequada para um 
registro oficial escolar. Não adicione informações que não estejam no texto original.
Mantenha o texto em português brasileiro.
Retorne APENAS o texto reescrito, sem explicações adicionais.

Relato original:
"${transcription}"`,
                                },
                            ],
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
            // Return transcription even if rewrite fails
            return new Response(JSON.stringify({
                original: transcription,
                formal: transcription,
                rewrite_error: 'Formal rewrite failed, returning original',
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const rewriteData = await rewriteResponse.json();
        const formalText =
            rewriteData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? transcription;

        return new Response(JSON.stringify({
            original: transcription,
            formal: formalText,
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('Process audio error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message || String(error),
            stack: error.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
