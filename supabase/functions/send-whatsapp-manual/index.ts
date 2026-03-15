// supabase/functions/send-whatsapp-manual/index.ts
// Proxy para enviar WhatsApp do Frontend (HTTPS) para a Evolution API (HTTP)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { sendEvolutionMessage } from '../_shared/evolution.ts';
import { errorResponse, jsonResponse } from '../_shared/errors.ts';

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const payload = await req.json();
    const { phone, text } = payload;

    if (!phone || !text) {
      return errorResponse(corsHeaders, 400, 'Missing phone or text');
    }

    const result = await sendEvolutionMessage(phone, text);
    if (!result.success) {
      return errorResponse(corsHeaders, 502, 'Evolution API returned an error', result.error);
    }

    // Success
    return jsonResponse({ success: true }, 200, corsHeaders);

  } catch (error: any) {
    console.error('[Proxy] Internal Error:', error);
    return errorResponse(corsHeaders, 500, 'Internal server proxy error', error.message || String(error));
  }
});
