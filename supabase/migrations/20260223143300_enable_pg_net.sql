-- supabase/migrations/20260223143300_enable_pg_net.sql
-- Enable the "pg_net" extension
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
