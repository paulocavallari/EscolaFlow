// supabase/functions/send-whatsapp/index.ts
// Edge Function: WhatsApp Notification via Evolution API

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
 * Send a text message via Evolution API
 */
async function sendEvolutionMessage(
    phoneNumber: string,
    text: string,
): Promise<{ success: boolean; error?: string }> {
    const apiUrl = Deno.env.get('EVOLUTION_API_URL');
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    const instance = Deno.env.get('EVOLUTION_INSTANCE_NAME') ?? 'zap';

    if (!apiUrl || !apiKey) {
        console.warn('Evolution API credentials not configured');
        return { success: false, error: 'Evolution API credentials not configured' };
    }

    // Ensure phone starts with country code (55 for Brazil)
    const cleaned = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;

    const url = `${apiUrl}/message/sendText/${instance}`;
    console.log(`Sending WhatsApp to ${formattedPhone} via ${url}`);

    try {
        // Evolution API v2: only 'number' and 'textMessage' are required
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify({
                number: formattedPhone,
                textMessage: { text },
            }),
        });

        const responseText = await response.text();
        console.log(`Evolution API response (${response.status}):`, responseText);

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${responseText}` };
        }

        return { success: true };
    } catch (error) {
        console.error('Evolution API send error:', error);
        return { success: false, error: String(error) };
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const payload: NotificationPayload = await req.json();
        console.log('Received notification payload:', payload);

        // Admin client for querying profiles without RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Fetch relevant profiles
        const profileIds = [payload.author_id, payload.tutor_id].filter(Boolean) as string[];
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, whatsapp_number, role')
            .in('id', profileIds);

        if (profileError) {
            console.error('Error fetching profiles:', profileError);
            return new Response(JSON.stringify({ error: 'Failed to fetch profiles' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
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
                    `🔔 *Nova Ocorrência Escolar*\n\n` +
                    `Olá, ${tutor.full_name}!\n\n` +
                    `O(a) Prof(a). ${author?.full_name ?? 'Professor'} registrou uma nova ocorrência para o seu aluno tutorado *${studentName}*.\n\n` +
                    `Acesse o app EscolaFlow para visualizar os detalhes e tomar as providências necessárias.`;

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
                    const messageAutor = `🔄 *Ocorrência Escalonada*\n\nSua ocorrência referente ao aluno *${studentName}* foi escalonada para a Vice-Direção.\n\nVocê será notificado assim que houver uma resolução.`;
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
                                `🏢 *Ocorrência Encaminhada*\n\nOlá, ${vp.full_name}!\n\nUma ocorrência do(a) aluno(a) *${studentName}* (registrada por ${author?.full_name ?? 'Professor'}) foi encaminhada para sua análise.\nAcesse o app EscolaFlow.`;
                            const r2 = await sendEvolutionMessage(vp.whatsapp_number, messageVp);
                            results.push({ recipient: `vp_${vp.id}`, ...r2 });
                        }
                    }
                }
            }

            // 3. Ocorrência marcada como concluída
            if (newStatus === 'CONCLUDED') {
                // Concluída pelo VP (was ESCALATED_VP)
                if (oldStatus === 'ESCALATED_VP') {
                    const message = `✅ *Ocorrência Concluída (Vice-Direção)*\n\nA ocorrência do aluno *${studentName}* foi resolvida pela Vice-Direção.\n\n*Resumo da Resolução:*\n${resolutionText}`;

                    if (author?.whatsapp_number) {
                        const r1 = await sendEvolutionMessage(author.whatsapp_number, message);
                        results.push({ recipient: 'author_concluded_vp', ...r1 });
                    }
                    if (tutor?.whatsapp_number) {
                        const r2 = await sendEvolutionMessage(tutor.whatsapp_number, message);
                        results.push({ recipient: 'tutor_concluded_vp', ...r2 });
                    }
                }
                // Concluída pelo Tutor (was PENDING_TUTOR)
                else {
                    const message = `✅ *Ocorrência Concluída (Tutor)*\n\nA ocorrência do aluno *${studentName}* que você registrou foi resolvida pelo tutor responsável.\n\n*Resumo da Resolução:*\n${resolutionText}`;

                    if (author?.whatsapp_number) {
                        const r1 = await sendEvolutionMessage(author.whatsapp_number, message);
                        results.push({ recipient: 'author_concluded_tutor', ...r1 });
                    }
                }

                // Notificar o Responsável (Guardião)
                if (student?.guardian_phone) {
                    const guardianMessage = `🏫 *Escola Estadual Virgílio Capoani*\n\nPrezado(a) responsável,\nInformamos que uma ocorrência escolar registrada envolvendo o aluno *${studentName}* foi acompanhada e concluída com sucesso.\n\nPara maiores esclarecimentos, fique à vontade para entrar em contato com a equipe pedagógica.\nObrigado pela parceria.`;

                    const rg = await sendEvolutionMessage(student.guardian_phone, guardianMessage);
                    results.push({ recipient: 'guardian_concluded', ...rg });
                }
            }
        }

        console.log('Notification results:', results);

        return new Response(JSON.stringify({ success: true, results }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Send WhatsApp error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
