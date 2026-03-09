-- supabase/migrations/20260223081800_fix_whatsapp_status_payload.sql

-- Recreate the notify function to fix payload mismatch with send-whatsapp Edge Function
CREATE OR REPLACE FUNCTION notify_whatsapp_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  resolution_text text;
  req_url text;
  req_auth text;
BEGIN
  -- Only trigger on updates where status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Fetch the latest action description
    SELECT description INTO resolution_text
    FROM actions
    WHERE occurrence_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Get settings safely
    req_url := current_setting('app.settings.supabase_url', true);
    req_auth := current_setting('app.settings.supabase_anon_key', true);

    -- Only proceed if URL is available
    IF req_url IS NOT NULL AND req_url != '' THEN
      -- Invoke the edge function using pg_net POST
      -- Payload now matches Expected NotificationPayload exactly
      PERFORM net.http_post(
        url := req_url || '/functions/v1/send-whatsapp',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(req_auth, '')
        ),
        body := jsonb_build_object(
          'event', 'status_changed',
          'occurrence_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'author_id', NEW.author_id,
          'tutor_id', NEW.tutor_id,
          'student_id', NEW.student_id,
          'resolution_text', resolution_text
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
