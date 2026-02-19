// supabase/functions/send-whatsapp-manual/index.ts
// Proxy para enviar WhatsApp do Frontend (HTTPS) para a Evolution API (HTTP)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { phone, text } = payload;

    if (!phone || !text) {
      return new Response(JSON.stringify({ error: 'Missing phone or text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiUrl = Deno.env.get('EVOLUTION_API_URL');
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    const instance = Deno.env.get('EVOLUTION_INSTANCE_NAME') ?? 'zap';

    if (!apiUrl || !apiKey) {
      return new Response(JSON.stringify({ error: 'Evolution API credentials not configured in Supabase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean phone number to format 5511999999999
    const cleaned = phone.replace(/\D/g, '');
    const formattedPhone = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;

    const url = `${apiUrl}/message/sendText/${instance}`;

    console.log(`[Proxy] Sending direct WhatsApp to ${formattedPhone}`);

    // Call Evolution API
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

    if (!response.ok) {
      console.error('[Proxy] Evolution API error:', responseText);
      return new Response(JSON.stringify({ error: `Evolution API returned ${response.status}`, details: responseText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Success
    return new Response(JSON.stringify({ success: true, data: responseText }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Proxy] Internal Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server proxy error', details: error.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
