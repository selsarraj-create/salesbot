-- Add is_test flag to leads table for Testing Sandbox feature
-- This allows safe testing without triggering production Twilio SMS

ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering test vs production leads
CREATE INDEX IF NOT EXISTS idx_leads_is_test ON leads(is_test);

-- Add comment
COMMENT ON COLUMN leads.is_test IS 'True for test leads created in Testing Sandbox. Prevents Twilio SMS sends.';

-- Update existing leads to ensure they are marked as production
UPDATE leads SET is_test = false WHERE is_test IS NULL;
