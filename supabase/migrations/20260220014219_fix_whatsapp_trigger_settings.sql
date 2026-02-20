-- supabase/migrations/20260220014219_fix_whatsapp_trigger_settings.sql

-- Drop the function before modifying it
DROP FUNCTION IF EXISTS notify_whatsapp_status_changed() CASCADE;

-- Recreate the notify function to fix current_setting missing_ok parameter
CREATE OR REPLACE FUNCTION notify_whatsapp_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  author_phone text;
  tutor_phone text;
  student_name text;
  resolution_text text;
  req_url text;
  req_auth text;
BEGIN
  -- Only trigger on updates where status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

    -- Fetch Author WhatsApp
    SELECT whatsapp_number INTO author_phone
    FROM profiles
    WHERE id = NEW.author_id;

    -- Fetch Tutor WhatsApp
    SELECT whatsapp_number INTO tutor_phone
    FROM profiles
    WHERE id = NEW.tutor_id;

    -- Fetch Student Name
    SELECT name INTO student_name
    FROM students
    WHERE id = NEW.student_id;
    
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
      PERFORM net.http_post(
        url := req_url || '/functions/v1/send-whatsapp',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(req_auth, '')
        ),
        body := jsonb_build_object(
          'event', 'STATUS_CHANGED',
          'occurrence_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'author_phone', author_phone,
          'tutor_phone', tutor_phone,
          'student_name', student_name,
          'resolution_text', resolution_text
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trg_occurrence_status_changed_notify
  AFTER UPDATE OF status ON occurrences
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_status_changed();
