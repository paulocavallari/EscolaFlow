-- supabase/migrations/20260220010935_fix_class_unique_name.sql

-- Drop the existing UNIQUE constraint on name+year if it exists (assuming some constraint might exist, though we check to be safe)
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_name_key;

-- Create a partial unique index, allowing multiple null or inactive classes to exist with the same name
CREATE UNIQUE INDEX IF NOT EXISTS classes_name_active_unique_idx ON classes (name) WHERE active = true;
