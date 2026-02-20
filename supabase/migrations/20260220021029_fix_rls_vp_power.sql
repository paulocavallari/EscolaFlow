-- supabase/migrations/20260220021029_fix_rls_vp_power.sql

-- Drop the occurrences update policy completely to rebuild it
DROP POLICY IF EXISTS occurrences_update ON occurrences;

-- ============================================================
-- 1. OCCURRENCES UPDATE POLICY REWRITE FOR VP
-- ============================================================
-- VPs shouldn't be restricted by the status of the occurrence. They should be able
-- to intervene and Conclude any occurrence, even if it has not been escalated to them yet.
-- This fulfills the user request: "O tutor ou o vice diretor podem marcar como concluida"

CREATE POLICY occurrences_update ON occurrences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR profiles.role = 'vice_director'
        OR (occurrences.tutor_id = profiles.id AND occurrences.status = 'PENDING_TUTOR')
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR profiles.role = 'vice_director'
        OR occurrences.tutor_id = profiles.id
      )
    )
  );
