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

    const { profile_id, auth_id } = await req.json();
    if (!profile_id || !auth_id) {
      return errorResponse(corsHeaders, 400, 'Missing profile_id or auth_id');
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(auth_id);
    if (deleteAuthError) {
      return errorResponse(corsHeaders, 400, deleteAuthError.message);
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', profile_id);

    if (deleteProfileError) {
      return errorResponse(corsHeaders, 400, deleteProfileError.message);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (error) {
    return errorResponse(corsHeaders, 500, (error as Error).message);
  }
});