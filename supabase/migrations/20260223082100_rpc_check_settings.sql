-- supabase/migrations/20260223082100_rpc_check_settings.sql
CREATE OR REPLACE FUNCTION get_db_settings()
RETURNS JSONB AS $$
DECLARE
  res JSONB;
BEGIN
  res := jsonb_build_object(
    'supabase_url', current_setting('app.settings.supabase_url', true),
    'supabase_anon_key', current_setting('app.settings.supabase_anon_key', true),
    'service_role_key', current_setting('app.settings.service_role_key', true)
  );
  RETURN res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
