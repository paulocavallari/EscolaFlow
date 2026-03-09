-- Allow vice-directors to also delete occurrences alongside admins

-- 1. Drop the existing policy
DROP POLICY IF EXISTS occurrences_delete ON occurrences;

-- 2. Recreate it allowing both admin and vice_director
CREATE POLICY occurrences_delete ON occurrences
  FOR DELETE USING (
    get_my_role() IN ('admin', 'vice_director')
  );
