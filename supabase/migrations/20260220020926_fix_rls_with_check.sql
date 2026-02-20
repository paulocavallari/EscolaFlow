-- supabase/migrations/20260220020926_fix_rls_with_check.sql

-- Drop the occurrences update policy completely to rebuild it
DROP POLICY IF EXISTS occurrences_update ON occurrences;

-- Drop actions insert policy to rebuild it
DROP POLICY IF EXISTS actions_insert ON actions;

-- ============================================================
-- 1. OCCURRENCES UPDATE POLICY REWRITE
-- ============================================================
-- Note: 'USING' checks the OLD row (before update)
--       'WITH CHECK' checks the NEW row (after update)
-- If we put "status = 'PENDING_TUTOR'" in WITH CHECK, the tutor CANNOT resolve the occurrence
-- to 'CONCLUDED' or 'ESCALATED_VP', because the NEW status won't be 'PENDING_TUTOR'. 
-- We only need to restrict WHICH occurrences they can edit (USING), and optionally WHAT they can change it to (WITH CHECK).
-- We will allow updating if the OLD row was pending for tutor/escalated for VP.

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
        OR profiles.role = 'vice_director'
        OR occurrences.tutor_id = profiles.id
      )
    )
  );

-- ============================================================
-- 2. ACTIONS INSERT POLICY REWRITE
-- ============================================================
-- Similarly, when inserting an Action, the occurrence might ALREADY be updated in the same transaction 
-- if the frontend sends the requests out of order, or if the user sends parallel requests.
-- But logically, Actions are just inserted pointing to an occurrence.
-- We allow insertion if the user is the Tutor or VP of the target occurrence.

CREATE POLICY actions_insert ON actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM occurrences o
      JOIN profiles p ON p.auth_id = auth.uid()
      WHERE o.id = actions.occurrence_id
      AND actions.author_id = p.id
      AND (
        p.role = 'admin'
        OR p.role = 'vice_director'
        OR o.tutor_id = p.id
      )
    )
  );
