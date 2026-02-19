// supabase/functions/send-whatsapp/index.ts
// Edge Function: WhatsApp Notification via Meta Cloud API

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

async function sendWhatsAppMessage(
    phoneNumber: string,
    templateName: string,
    parameters: string[],
): Promise<{ success: boolean; error?: string }> {
    const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappToken || !phoneNumberId) {
        console.warn('WhatsApp credentials not configured');
        return { success: false, error: 'WhatsApp credentials not configured' };
    }

    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${whatsappToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phoneNumber,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: 'pt_BR' },
                        components: [
                            {
                                type: 'body',
                                parameters: parameters.map((text) => ({
                                    type: 'text',
                                    text,
                                })),
                            },
                        ],
                    },
                }),
            },
        );

        if (!response.ok) {
            const errBody = await response.text();
            console.error('WhatsApp API error:', errBody);
            return { success: false, error: errBody };
        }

        const data = await response.json();
        console.log('WhatsApp message sent:', data);
        return { success: true };
    } catch (error) {
        console.error('WhatsApp send error:', error);
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

        // Create admin client for querying profiles
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
            .select('name')
            .eq('id', payload.student_id)
            .single();

        const studentName = student?.name ?? 'Aluno';
        const results: Array<{ recipient: string; success: boolean; error?: string }> = [];

        // ---- Event: Occurrence Created ----
        if (payload.event === 'occurrence_created') {
            // Notify the tutor (if tutor != author)
            if (tutor && tutor.id !== payload.author_id && tutor.whatsapp_number) {
                const result = await sendWhatsAppMessage(
                    tutor.whatsapp_number,
                    'nova_ocorrencia', // Pre-approved WhatsApp template name
                    [
                        tutor.full_name,
                        studentName,
                        author?.full_name ?? 'Professor',
                    ],
                );
                results.push({ recipient: 'tutor', ...result });
            }
        }

        // ---- Event: Status Changed ----
        if (payload.event === 'status_changed') {
            const newStatus = payload.new_status;

            // Notify author when occurrence is concluded or escalated
            if (
                (newStatus === 'CONCLUDED' || newStatus === 'ESCALATED_VP') &&
                author?.whatsapp_number
            ) {
                const statusLabel =
                    newStatus === 'CONCLUDED' ? 'Concluída' : 'Encaminhada à Vice-Direção';

                const result = await sendWhatsAppMessage(
                    author.whatsapp_number,
                    'status_ocorrencia', // Pre-approved WhatsApp template name
                    [
                        author.full_name,
                        studentName,
                        statusLabel,
                    ],
                );
                results.push({ recipient: 'author', ...result });
            }

            // Notify vice-director(s) when escalated
            if (newStatus === 'ESCALATED_VP') {
                const { data: vps } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, whatsapp_number')
                    .eq('role', 'vice_director')
                    .not('whatsapp_number', 'is', null);

                if (vps) {
                    for (const vp of vps) {
                        if (vp.whatsapp_number) {
                            const result = await sendWhatsAppMessage(
                                vp.whatsapp_number,
                                'ocorrencia_escalada', // Pre-approved WhatsApp template name
                                [
                                    vp.full_name,
                                    studentName,
                                    author?.full_name ?? 'Professor',
                                ],
                            );
                            results.push({ recipient: `vp_${vp.id}`, ...result });
                        }
                    }
                }
            }
        }

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
