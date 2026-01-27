-- Migration: Add Quality Control Columns to Leads Table

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manual_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS judge_rationale TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_gold_truth BOOLEAN DEFAULT FALSE;

-- Add index for filtering failures
CREATE INDEX IF NOT EXISTS idx_leads_quality_score ON leads(quality_score);
