import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSupabaseEnv() {
  return {
    url: Deno.env.get('SUPABASE_URL') ?? '',
    anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  };
}

export function createAnonClient(authHeader: string) {
  const env = getSupabaseEnv();
  return createClient(env.url, env.anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

export function createAdminClient() {
  const env = getSupabaseEnv();
  return createClient(env.url, env.serviceKey);
}
