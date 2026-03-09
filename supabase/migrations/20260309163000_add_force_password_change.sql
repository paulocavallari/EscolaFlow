-- Migration to add force_password_change flag to profiles

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT true;

-- Update existing profiles (except admin) to not force password change if they are already active
-- Wait, if this is a fresh database, everyone is forced except the main admin.
-- We can set it to false for everyone currently, so existing users don't get locked out unexpectedly, 
-- but moving forward new users get true by default (via the app code passing true).
UPDATE profiles SET force_password_change = false;
