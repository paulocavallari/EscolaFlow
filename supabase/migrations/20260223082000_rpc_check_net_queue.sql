-- supabase/migrations/20260223082000_rpc_check_net_queue.sql
CREATE OR REPLACE FUNCTION get_net_queue()
RETURNS JSONB AS $$
DECLARE
  res JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(r)) INTO res
  FROM (
    SELECT id, url, method, error_msg, timeout_milliseconds, created_at 
    FROM net.http_request_queue 
    ORDER BY created_at DESC 
    LIMIT 20
  ) r;
  RETURN res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
