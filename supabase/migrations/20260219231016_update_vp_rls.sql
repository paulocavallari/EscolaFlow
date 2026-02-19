-- Update occurrences_update policy to allow vice_director anytime
DROP POLICY IF EXISTS occurrences_update ON occurrences;
CREATE POLICY occurrences_update ON occurrences
  FOR UPDATE USING (
    get_my_role() = 'admin'
    OR get_my_role() = 'vice_director'
    OR (tutor_id = get_my_profile_id() AND status = 'PENDING_TUTOR')
  );

-- Update actions_insert policy to allow vice_director to act on any occurrence
DROP POLICY IF EXISTS actions_insert ON actions;
CREATE POLICY actions_insert ON actions
  FOR INSERT WITH CHECK (
    author_id = get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM occurrences o
      WHERE o.id = actions.occurrence_id
      AND (
        get_my_role() = 'admin'
        OR get_my_role() = 'vice_director'
        OR (o.tutor_id = get_my_profile_id() AND o.status = 'PENDING_TUTOR')
      )
    )
  );
