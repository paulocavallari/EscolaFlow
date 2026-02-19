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

        // Fetch student name
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('name, class:classes!students_class_id_fkey(name)')
            .eq('id', payload.student_id)
            .single();

        const studentName = student?.name ?? 'Aluno';
        const results: Array<{ recipient: string; success: boolean; error?: string }> = [];

        // ---- Event: Occurrence Created ----
        if (payload.event === 'occurrence_created') {
            // Notify the tutor (responsible) if they have a phone and are not the author
            if (tutor && tutor.id !== payload.author_id && tutor.whatsapp_number) {
                const message =
                    `📋 *Nova Ocorrência Escolar*\n\n` +
                    `Olá, ${tutor.full_name}!\n\n` +
                    `Uma nova ocorrência foi registrada pelo(a) Prof(a). ${author?.full_name ?? 'Professor'}.\n\n` +
                    `*Aluno:* ${studentName}\n\n` +
                    `Acesse o app EscolaFlow para ver os detalhes e registrar a tratativa.`;

                const result = await sendEvolutionMessage(tutor.whatsapp_number, message);
                results.push({ recipient: 'tutor', ...result });
            }
        }

        // ---- Event: Status Changed ----
        if (payload.event === 'status_changed') {
            const newStatus = payload.new_status;

            // Notify author when occurrence is concluded or escalated
            if ((newStatus === 'CONCLUDED' || newStatus === 'ESCALATED_VP') && author?.whatsapp_number) {
                const statusLabel =
                    newStatus === 'CONCLUDED'
                        ? '✅ Concluída'
                        : '⬆️ Encaminhada à Vice-Direção';

                const message =
                    `📋 *Atualização de Ocorrência*\n\n` +
                    `Olá, ${author.full_name}!\n\n` +
                    `A ocorrência do(a) aluno(a) *${studentName}* foi atualizada.\n\n` +
                    `*Novo status:* ${statusLabel}\n\n` +
                    `Acesse o app EscolaFlow para mais detalhes.`;

                const result = await sendEvolutionMessage(author.whatsapp_number, message);
                results.push({ recipient: 'author', ...result });
            }

            // Notify all vice-directors when escalated
            if (newStatus === 'ESCALATED_VP') {
                const { data: vps } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, whatsapp_number')
                    .eq('role', 'vice_director')
                    .not('whatsapp_number', 'is', null);

                if (vps) {
                    for (const vp of vps) {
                        if (vp.whatsapp_number) {
                            const message =
                                `🔔 *Ocorrência Encaminhada para a Vice-Direção*\n\n` +
                                `Olá, ${vp.full_name}!\n\n` +
                                `Uma ocorrência do(a) aluno(a) *${studentName}* foi encaminhada para sua análise pelo(a) Prof(a). ${author?.full_name ?? 'Professor'}.\n\n` +
                                `Acesse o app EscolaFlow para visualizar e tratar.`;

                            const result = await sendEvolutionMessage(vp.whatsapp_number, message);
                            results.push({ recipient: `vp_${vp.id}`, ...result });
                        }
                    }
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
