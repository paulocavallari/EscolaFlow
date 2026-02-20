-- supabase/migrations/20260220010856_fix_student_unique_matricula.sql

-- Drop the existing UNIQUE constraint on matricula
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_matricula_key;

-- Create a partial unique index, allowing multiple null or inactive students to exist with the same matricula (for soft-deleted records)
-- This ensures that only ACTIVE students have a unique matricula
CREATE UNIQUE INDEX IF NOT EXISTS students_matricula_active_unique_idx ON students (matricula) WHERE active = true AND matricula IS NOT NULL;
