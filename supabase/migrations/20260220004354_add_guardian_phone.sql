-- supabase/migrations/20260220004354_add_guardian_phone.sql

ALTER TABLE students
ADD COLUMN guardian_phone TEXT;

COMMENT ON COLUMN students.guardian_phone IS 'WhatsApp number of the student''s guardian for notifications when occurrences are concluded';
