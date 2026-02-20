-- supabase/migrations/20260220012738_fix_profile_deletion_fk.sql

-- For occurrences
ALTER TABLE occurrences DROP CONSTRAINT IF EXISTS occurrences_author_id_fkey;
ALTER TABLE occurrences ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE occurrences ADD CONSTRAINT occurrences_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- For actions
ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_author_id_fkey;
ALTER TABLE actions ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE actions ADD CONSTRAINT actions_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;
