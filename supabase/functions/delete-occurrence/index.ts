// supabase/functions/delete-occurrence/index.ts
// Edge Function to delete an occurrence using service_role key (bypasses RLS)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { verifyAuth, ensureAdminOrVP } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse } from '../_shared/errors.ts';

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { occurrence_id } = await req.json();

        if (!occurrence_id) {
            return errorResponse(corsHeaders, 400, 'Missing occurrence_id');
        }

        const auth = await verifyAuth(req, corsHeaders);
        if (!auth.ok) return auth.response;

        const allowed = await ensureAdminOrVP(auth.user.id);
        if (!allowed) return errorResponse(corsHeaders, 403, 'Insufficient permissions');

        const supabaseAdmin = createAdminClient();

        // Delete with service_role (bypasses RLS)
        // First delete associated actions
        const { error: actionsError } = await supabaseAdmin
            .from('actions')
            .delete()
            .eq('occurrence_id', occurrence_id);

        if (actionsError) {
            console.error('Error deleting actions:', actionsError);
        }

        // Then delete the occurrence
        const { error: deleteError } = await supabaseAdmin
            .from('occurrences')
            .delete()
            .eq('id', occurrence_id);

        if (deleteError) {
            console.error('Error deleting occurrence:', deleteError);
            return errorResponse(corsHeaders, 500, deleteError.message);
        }

        return jsonResponse({ success: true }, 200, corsHeaders);

    } catch (error: any) {
        console.error('Delete error:', error);
        return errorResponse(corsHeaders, 500, error.message || 'Internal error');
    }
});
