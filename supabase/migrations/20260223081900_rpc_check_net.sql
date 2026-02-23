-- supabase/migrations/20260223081900_rpc_check_net.sql
CREATE OR REPLACE FUNCTION get_net_logs()
RETURNS JSONB AS $$
DECLARE
  res JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(r)) INTO res
  FROM (
    SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10
  ) r;
  RETURN res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
