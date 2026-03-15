import { createAnonClient, createAdminClient } from './supabase.ts';
import { errorResponse } from './errors.ts';

export async function verifyAuth(req: Request, corsHeaders: Record<string, string>) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { ok: false as const, response: errorResponse(corsHeaders, 401, 'Missing authorization header') };
  }

  const supabaseClient = createAnonClient(authHeader);
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { ok: false as const, response: errorResponse(corsHeaders, 401, 'Unauthorized') };
  }

  return { ok: true as const, authHeader, user };
}

export async function ensureAdmin(authUserId: string) {
  const supabaseAdmin = createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_id', authUserId)
    .single();

  return profile?.role === 'admin';
}

export async function ensureAdminOrVP(authUserId: string) {
  const supabaseAdmin = createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('auth_id', authUserId)
    .single();

  return profile?.role === 'admin' || profile?.role === 'vice_director';
}
