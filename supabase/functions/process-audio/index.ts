// supabase/functions/process-audio/index.ts
// Edge Function: Audio Processing via Google Gemini API (Free Tier)
// Gemini handles both transcription and formal rewriting in a single multimodal call.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from 'https://deno.land/std@0.177.0/encoding/base64.ts';

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

        // Parse multipart form data with audio file
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return new Response(JSON.stringify({ error: 'No audio file provided' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) {
            return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Convert audio to base64 for Gemini's inline_data
        const audioBuffer = await audioFile.arrayBuffer();
        const audioBase64 = base64Encode(new Uint8Array(audioBuffer));

        // Determine MIME type
        const mimeType = audioFile.type || 'audio/mp4';

        // ---- Step 1: Transcribe audio with Gemini (multimodal) ----
        const transcriptionResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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
        const transcription =
            transcriptionData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

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
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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
    } catch (error) {
        console.error('Process audio error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
