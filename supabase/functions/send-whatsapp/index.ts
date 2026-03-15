// supabase/functions/send-whatsapp/index.ts
// Edge Function: WhatsApp Notification via Evolution API

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { sendEvolutionMessage } from '../_shared/evolution.ts';
import { errorResponse, jsonResponse } from '../_shared/errors.ts';

interface NotificationPayload {
    event: 'occurrence_created' | 'status_changed';
    occurrence_id: string;
    student_id: string;
    author_id: string;
    tutor_id: string | null;
    status?: string;
    old_status?: string;
    new_status?: string;
    resolution_text?: string;
}

/**
 * Summarize the occurrence formal description using Gemini API
 */
async function summarizeWithGemini(text: string): Promise<string> {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey || !text) return '';

    const prompt = `Você é um coordenador pedagógico da Escola Estadual Virgílio Capoani comunicando-se com os responsáveis de um aluno via WhatsApp.
Por favor, faça um pequeno resumo (máximo de 2 a 3 frases) da seguinte ocorrência disciplinar. O tom deve ser estritamente profissional, respeitoso, transmitindo clareza e seriedade, sem ser excessivamente punitivo ou alarmista.
IMPORTANTE: Não inclua saudações (como "Olá", "Prezados"), nem despedidas. Retorne APENAS o parágrafo de resumo. O resumo deve ser escrito EXCLUSIVAMENTE em Português do Brasil.

Ocorrência Registrada:
"${text}"`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 250,
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (content) return content;
        } else {
            console.error('Gemini summary error:', await response.text());
        }
    } catch (error) {
        console.error('Gemini summary exception:', error);
    }
    return '';
}

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload: NotificationPayload = await req.json();
        console.log('Received notification payload:', payload);

        // Admin client for querying profiles without RLS
        const supabaseAdmin = createAdminClient();

        // Fetch relevant profiles
        const profileIds = [payload.author_id, payload.tutor_id].filter(Boolean) as string[];
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, whatsapp_number, role')
            .in('id', profileIds);

        if (profileError) {
            console.error('Error fetching profiles:', profileError);
            return errorResponse(corsHeaders, 500, 'Failed to fetch profiles');
        }

        const author = profiles?.find((p) => p.id === payload.author_id);
        const tutor = profiles?.find((p) => p.id === payload.tutor_id);

        // Fetch student details including guardian phone
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('name, guardian_phone, class:classes!students_class_id_fkey(name)')
            .eq('id', payload.student_id)
            .single();

        const studentName = student?.name ?? 'Aluno';
        const results: Array<{ recipient: string; success: boolean; error?: string }> = [];

        // ---- Event: Occurrence Created ----
        if (payload.event === 'occurrence_created') {
            // 1. Ocorrência cadastrada -> Notificar apenas o Tutor do aluno
            if (tutor && tutor.whatsapp_number) {
                const message =
                    `🔔 *Ocorrência Escolar*\n\n` +
                    `Prezado(a) ${tutor.full_name},\n\n` +
                    `Informamos que uma nova ocorrência disciplinar foi registrada pelo docente ${author?.full_name ?? 'Professor'} referente ao aluno *${studentName}*, sob sua tutoria.\n\n` +
                    `Solicitamos a verificação através do sistema Ocorrências VC para as devidas providências.`;

                const result = await sendEvolutionMessage(tutor.whatsapp_number, message);
                results.push({ recipient: 'tutor', ...result });
            }
        }

        // ---- Event: Status Changed ----
        if (payload.event === 'status_changed') {
            const newStatus = payload.new_status;
            const oldStatus = payload.old_status;
            const resolutionText = payload.resolution_text || 'Resolução não fornecida.';

            // 2. Ocorrência encaminhada para VP -> Notificar Autor e VPs
            if (newStatus === 'ESCALATED_VP') {
                if (author?.whatsapp_number) {
                    const messageAutor = `🔄 *Ocorrência Escalonada*\n\nPrezado(a) ${author.full_name},\n\nInformamos que a ocorrência referente ao aluno *${studentName}* foi encaminhada para análise da Vice-Direção.\n\nAs atualizações sobre a resolução serão notificadas através deste canal.`;
                    const r1 = await sendEvolutionMessage(author.whatsapp_number, messageAutor);
                    results.push({ recipient: 'author_escalated', ...r1 });
                }

                const { data: vps } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, whatsapp_number')
                    .eq('role', 'vice_director')
                    .not('whatsapp_number', 'is', null);

                if (vps) {
                    for (const vp of vps) {
                        if (vp.whatsapp_number) {
                            const messageVp =
                                `🏢 *Ocorrência para Análise*\n\nPrezado(a) ${vp.full_name},\n\nInformamos o recebimento de uma ocorrência disciplinar referente ao aluno *${studentName}*, registrada pelo docente ${author?.full_name ?? 'Professor'}.\n\nEsta ocorrência demanda análise da Vice-Direção. Por gentileza, acesse o sistema Ocorrências VC para acompanhamento.`;
                            const r2 = await sendEvolutionMessage(vp.whatsapp_number, messageVp);
                            results.push({ recipient: `vp_${vp.id}`, ...r2 });
                        }
                    }
                }
            }

            // 3. Ocorrência marcada como concluída
            if (newStatus === 'CONCLUDED') {
                // Fetch the formal description to summarize to the guardian
                let statementSummary = '';
                const { data: occData } = await supabaseAdmin
                    .from('occurrences')
                    .select('description_formal')
                    .eq('id', payload.occurrence_id)
                    .single();

                if (occData?.description_formal) {
                    statementSummary = await summarizeWithGemini(occData.description_formal);
                }

                // Concluída pelo VP (was ESCALATED_VP) ou Tutor (was PENDING_TUTOR)
                if (oldStatus === 'ESCALATED_VP') {
                    const message = `✅ *Ocorrência Concluída*\n\nPrezado(a),\n\nInformamos que a ocorrência referente ao aluno *${studentName}* teve seu acompanhamento concluído pela Vice-Direção.\n\n*Síntese das providências:*\n${resolutionText}`;

                    if (author?.whatsapp_number) {
                        const r1 = await sendEvolutionMessage(author.whatsapp_number, message);
                        results.push({ recipient: 'author_concluded_vp', ...r1 });
                    }
                    if (tutor?.whatsapp_number) {
                        const r2 = await sendEvolutionMessage(tutor.whatsapp_number, message);
                        results.push({ recipient: 'tutor_concluded_vp', ...r2 });
                    }
                } else {
                    // FOI CONCLUÍDA PELO TUTOR
                    const message = `✅ *Ocorrência Concluída*\n\nPrezado(a) ${author?.full_name ?? 'Professor(a)'},\n\nInformamos que a ocorrência referente ao aluno *${studentName}* teve seu acompanhamento concluído pelo tutor responsável.\n\n*Síntese das providências:*\n${resolutionText}`;

                    if (author?.whatsapp_number) {
                        const r1 = await sendEvolutionMessage(author.whatsapp_number, message);
                        results.push({ recipient: 'author_concluded_tutor', ...r1 });
                    }
                }

                // The guardian is no longer notified automatically upon conclusion.
                // It is now an entirely manual action triggered by the button in the UI.
            }
        }

        console.log('Notification results:', results);

        return jsonResponse({ success: true, results }, 200, corsHeaders);
    } catch (error) {
        console.error('Send WhatsApp error:', error);
        return errorResponse(corsHeaders, 500, 'Internal server error');
    }
});
