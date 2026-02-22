-- supabase/migrations/20260222140000_add_actions_update_policy.sql

-- Add policy to allow updating actions

DROP POLICY IF EXISTS actions_update ON actions;

CREATE POLICY actions_update ON actions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_id = auth.uid()
      AND (
        p.role = 'admin'
        OR actions.author_id = p.id
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_id = auth.uid()
      AND (
        p.role = 'admin'
        OR actions.author_id = p.id
      )
    )
  );
