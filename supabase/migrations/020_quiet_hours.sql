-- Add quiet hours columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quiet_hours_tz TEXT DEFAULT 'Europe/London';
