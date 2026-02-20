-- supabase/migrations/20260220020000_rewrite_rls.sql

-- Drop existing occurrences RLS policies
DROP POLICY IF EXISTS occurrences_select ON occurrences;
DROP POLICY IF EXISTS occurrences_insert ON occurrences;
DROP POLICY IF EXISTS occurrences_update ON occurrences;
DROP POLICY IF EXISTS occurrences_delete ON occurrences;

-- Drop existing actions RLS policies
DROP POLICY IF EXISTS actions_select ON actions;
DROP POLICY IF EXISTS actions_insert ON actions;

-- ============================================================
-- 1. OCCURRENCES POLICIES
-- ============================================================

-- SELECT: Admins/VPs see all. Tutors/Professors see if they are author or tutor.
CREATE POLICY occurrences_select ON occurrences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_id = auth.uid()
      AND (
        profiles.role IN ('admin', 'vice_director')
        OR occurrences.author_id = profiles.id
        OR occurrences.tutor_id = profiles.id
      )
    )
  );

-- INSERT: Anyone with a profile can insert, but must be as author
CREATE POLICY occurrences_insert ON occurrences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_id = auth.uid()
      AND occurrences.author_id = profiles.id
    )
  );

-- UPDATE: Admins can update any. Authors/Tutors can update if PENDING_TUTOR. VPs if ESCALATED_VP.
CREATE POLICY occurrences_update ON occurrences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (profiles.role = 'vice_director' AND occurrences.status = 'ESCALATED_VP')
        OR (occurrences.tutor_id = profiles.id AND occurrences.status = 'PENDING_TUTOR')
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (profiles.role = 'vice_director' AND occurrences.status = 'ESCALATED_VP')
        OR (occurrences.tutor_id = profiles.id AND occurrences.status = 'PENDING_TUTOR')
      )
    )
  );

-- DELETE: Only admins
CREATE POLICY occurrences_delete ON occurrences
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 2. ACTIONS POLICIES
-- ============================================================

-- SELECT: Actions can be seen if you can see the occurrence
CREATE POLICY actions_select ON actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM occurrences o
      JOIN profiles p ON p.auth_id = auth.uid()
      WHERE o.id = actions.occurrence_id
      AND (
        p.role IN ('admin', 'vice_director')
        OR o.author_id = p.id
        OR o.tutor_id = p.id
      )
    )
  );

-- INSERT: Actions can be inserted if you can treat the occurrence, and you are the author
CREATE POLICY actions_insert ON actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM occurrences o
      JOIN profiles p ON p.auth_id = auth.uid()
      WHERE o.id = actions.occurrence_id
      AND actions.author_id = p.id
      AND (
        p.role = 'admin'
        OR (p.role = 'vice_director' AND o.status = 'ESCALATED_VP')
        OR (o.tutor_id = p.id AND o.status = 'PENDING_TUTOR')
      )
    )
  );
