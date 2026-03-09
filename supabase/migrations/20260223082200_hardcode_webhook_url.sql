-- supabase/migrations/20260223082200_hardcode_webhook_url.sql
-- Replace current_setting with hardcoded public environment variables

CREATE OR REPLACE FUNCTION notify_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  req_url TEXT := 'https://pwhjjsxqoogmcairesub.supabase.co';
  req_auth TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDY5OTUsImV4cCI6MjA4NzAyMjk5NX0.pF9Chqbex0EUqPg8BeN2uHmofCqswHVXcQMQi8Jz1u4';
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'event', 'occurrence_created',
      'occurrence_id', NEW.id,
      'student_id', NEW.student_id,
      'author_id', NEW.author_id,
      'tutor_id', NEW.tutor_id,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    payload := jsonb_build_object(
      'event', 'status_changed',
      'occurrence_id', NEW.id,
      'student_id', NEW.student_id,
      'author_id', NEW.author_id,
      'tutor_id', NEW.tutor_id,
      'old_status', OLD.status,
      'new_status', NEW.status
    );
  ELSE
    RETURN NEW; -- No notification needed
  END IF;

  -- Call the Edge Function via pg_net (non-blocking HTTP)
  PERFORM net.http_post(
    url := req_url || '/functions/v1/send-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || req_auth
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'WhatsApp notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION notify_whatsapp_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  resolution_text text;
  req_url TEXT := 'https://pwhjjsxqoogmcairesub.supabase.co';
  req_auth TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDY5OTUsImV4cCI6MjA4NzAyMjk5NX0.pF9Chqbex0EUqPg8BeN2uHmofCqswHVXcQMQi8Jz1u4';
BEGIN
  -- Only trigger on updates where status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Fetch the latest action description
    SELECT description INTO resolution_text
    FROM actions
    WHERE occurrence_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    -- Invoke the edge function using pg_net POST
    PERFORM net.http_post(
      url := req_url || '/functions/v1/send-whatsapp',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || req_auth
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
