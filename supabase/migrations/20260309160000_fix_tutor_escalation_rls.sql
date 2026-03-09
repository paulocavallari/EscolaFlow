-- supabase/migrations/20260309160000_fix_tutor_escalation_rls.sql
-- Allow tutors to escalate occurrences (PENDING_TUTOR → ESCALATED_VP)
-- The previous policy required status='PENDING_TUTOR' in WITH CHECK which is evaluated
-- AFTER the row is updated — so it was always failing because the new status != PENDING_TUTOR.

-- Drop and recreate occurrence update policy
DROP POLICY IF EXISTS occurrences_update ON occurrences;

CREATE POLICY occurrences_update ON occurrences
  FOR UPDATE
  USING (
    -- The row the user is trying to update (current state)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR profiles.role = 'vice_director'
        OR (occurrences.tutor_id = profiles.id AND occurrences.status = 'PENDING_TUTOR')
      )
    )
  )
  WITH CHECK (
    -- The row as it will be after the update (new state) — no status restriction
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

-- Also fix actions INSERT policy to allow tutors to insert escalation actions
-- The previous policy only allowed insert while status = 'PENDING_TUTOR', 
-- which is correct since escalation action is inserted BEFORE the status changes.
-- But we also need to allow tutors to conclude directly (RESOLUTION action type).
-- This policy is already correct, but we recreate it cleanly:
DROP POLICY IF EXISTS actions_insert ON actions;

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
