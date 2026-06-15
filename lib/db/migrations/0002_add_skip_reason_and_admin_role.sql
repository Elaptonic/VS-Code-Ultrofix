-- Add skip_reason column to lead_dispatch_attempts
ALTER TABLE lead_dispatch_attempts ADD COLUMN IF NOT EXISTS skip_reason text;

-- Extend user_role enum with admin value (support/ops use)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
