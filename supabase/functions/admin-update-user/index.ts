import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth, ensureAdmin } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse } from '../_shared/errors.ts';

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await verifyAuth(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const isAdmin = await ensureAdmin(auth.user.id);
    if (!isAdmin) return errorResponse(corsHeaders, 403, 'Admin access required');

    const supabaseAdmin = createAdminClient();

    const { profile_id, updates } = await req.json();
    if (!profile_id || !updates) {
      return errorResponse(corsHeaders, 400, 'Missing profile_id or updates');
    }

    const payload = {
      full_name: typeof updates.full_name === 'string' ? updates.full_name.trim() : undefined,
      role: updates.role,
      whatsapp_number: typeof updates.whatsapp_number === 'string'
        ? updates.whatsapp_number.trim().replace(/\D/g, '') || null
        : updates.whatsapp_number,
    };

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(payload)
      .eq('id', profile_id);

    if (error) {
      return errorResponse(corsHeaders, 400, error.message);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (error) {
    return errorResponse(corsHeaders, 500, (error as Error).message);
  }
});