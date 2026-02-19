-- ============================================================
-- EscolaFlow - Database Schema Migration
-- Supabase PostgreSQL with RLS (Row Level Security)
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('professor', 'vice_director', 'admin');
CREATE TYPE occurrence_status AS ENUM ('PENDING_TUTOR', 'ESCALATED_VP', 'CONCLUDED');
CREATE TYPE action_type AS ENUM ('resolution', 'escalation', 'vp_resolution');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Profiles: extends auth.users with app-specific data
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'professor',
  whatsapp_number TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Classes: school classes/turmas
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Students: linked to a class and a tutor
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  matricula TEXT UNIQUE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  tutor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Occurrences: the core entity with state machine
CREATE TABLE occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  tutor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  description_original TEXT NOT NULL, -- raw transcription from Whisper
  description_formal TEXT NOT NULL,   -- AI-rewritten formal version
  status occurrence_status NOT NULL DEFAULT 'PENDING_TUTOR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Actions: treatment records on occurrences
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id UUID NOT NULL REFERENCES occurrences(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  action_type action_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_profiles_auth_id ON profiles(auth_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_tutor_id ON students(tutor_id);
CREATE INDEX idx_occurrences_student_id ON occurrences(student_id);
CREATE INDEX idx_occurrences_author_id ON occurrences(author_id);
CREATE INDEX idx_occurrences_tutor_id ON occurrences(tutor_id);
CREATE INDEX idx_occurrences_status ON occurrences(status);
CREATE INDEX idx_occurrences_created_at ON occurrences(created_at DESC);
CREATE INDEX idx_actions_occurrence_id ON actions(occurrence_id);

-- ============================================================
-- 4. HELPER FUNCTIONS
-- ============================================================

-- Get the current user's profile ID from the JWT
CREATE OR REPLACE FUNCTION get_my_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get the current user's role from the JWT
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. TRIGGERS - updated_at
-- ============================================================

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_occurrences_updated_at
  BEFORE UPDATE ON occurrences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----

-- Everyone can read profiles (needed for tutor names, etc.)
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (true);

-- Only admins can insert/update/delete profiles
CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (get_my_role() = 'admin' OR auth_id = auth.uid());

CREATE POLICY profiles_delete ON profiles
  FOR DELETE USING (get_my_role() = 'admin');

-- ---- CLASSES ----

-- Everyone can read classes
CREATE POLICY classes_select ON classes
  FOR SELECT USING (true);

-- Only admins can CUD classes
CREATE POLICY classes_insert ON classes
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY classes_update ON classes
  FOR UPDATE USING (get_my_role() = 'admin');

CREATE POLICY classes_delete ON classes
  FOR DELETE USING (get_my_role() = 'admin');

-- ---- STUDENTS ----

-- Everyone can read students
CREATE POLICY students_select ON students
  FOR SELECT USING (true);

-- Only admins can CUD students
CREATE POLICY students_insert ON students
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY students_update ON students
  FOR UPDATE USING (get_my_role() = 'admin');

CREATE POLICY students_delete ON students
  FOR DELETE USING (get_my_role() = 'admin');

-- ---- OCCURRENCES ----

-- Professors can see occurrences where they are the tutor OR the author
-- Vice-directors and admins can see all
CREATE POLICY occurrences_select ON occurrences
  FOR SELECT USING (
    get_my_role() IN ('admin', 'vice_director')
    OR author_id = get_my_profile_id()
    OR tutor_id = get_my_profile_id()
  );

-- Any authenticated user (professor+) can create occurrences
CREATE POLICY occurrences_insert ON occurrences
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = get_my_profile_id()
  );

-- Tutors can update occurrences assigned to them (for treatment)
-- Vice-directors can update escalated occurrences
-- Admins can update any
CREATE POLICY occurrences_update ON occurrences
  FOR UPDATE USING (
    get_my_role() = 'admin'
    OR (get_my_role() = 'vice_director' AND status = 'ESCALATED_VP')
    OR (tutor_id = get_my_profile_id() AND status = 'PENDING_TUTOR')
  );

-- Only admins can delete occurrences
CREATE POLICY occurrences_delete ON occurrences
  FOR DELETE USING (get_my_role() = 'admin');

-- ---- ACTIONS ----

-- Users can see actions on occurrences they can see
CREATE POLICY actions_select ON actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM occurrences o
      WHERE o.id = actions.occurrence_id
      AND (
        get_my_role() IN ('admin', 'vice_director')
        OR o.author_id = get_my_profile_id()
        OR o.tutor_id = get_my_profile_id()
      )
    )
  );

-- Authenticated users can insert actions on occurrences they can treat
CREATE POLICY actions_insert ON actions
  FOR INSERT WITH CHECK (
    author_id = get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM occurrences o
      WHERE o.id = actions.occurrence_id
      AND (
        get_my_role() = 'admin'
        OR (get_my_role() = 'vice_director' AND o.status = 'ESCALATED_VP')
        OR (o.tutor_id = get_my_profile_id() AND o.status = 'PENDING_TUTOR')
      )
    )
  );

-- ============================================================
-- 7. NOTIFICATION TRIGGERS (call Edge Functions)
-- ============================================================

-- Function to invoke the send-whatsapp Edge Function via pg_net
-- Note: pg_net must be enabled in Supabase dashboard
CREATE OR REPLACE FUNCTION notify_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Read from Supabase vault or hardcode URL (set via Supabase dashboard)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'WhatsApp notification skipped: missing supabase_url or service_role_key settings';
    RETURN NEW;
  END IF;

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
    url := supabase_url || '/functions/v1/send-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the transaction if notification fails
    RAISE WARNING 'WhatsApp notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_occurrence_created_notify
  AFTER INSERT ON occurrences
  FOR EACH ROW EXECUTE FUNCTION notify_whatsapp();

CREATE TRIGGER trg_occurrence_status_changed_notify
  AFTER UPDATE OF status ON occurrences
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_whatsapp();

-- ============================================================
-- 8. AUTO-CREATE PROFILE ON AUTH SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (auth_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'professor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 9. VIEWS (for dashboard queries)
-- ============================================================

CREATE OR REPLACE VIEW occurrence_stats AS
SELECT
  p.id AS author_id,
  p.full_name AS author_name,
  COUNT(*) AS total_occurrences,
  COUNT(*) FILTER (WHERE o.status = 'PENDING_TUTOR') AS pending,
  COUNT(*) FILTER (WHERE o.status = 'ESCALATED_VP') AS escalated,
  COUNT(*) FILTER (WHERE o.status = 'CONCLUDED') AS concluded
FROM occurrences o
JOIN profiles p ON p.id = o.author_id
GROUP BY p.id, p.full_name;
