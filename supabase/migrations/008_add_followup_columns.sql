-- Add follow-up tracking columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS follow_up_count INT DEFAULT 0;

COMMENT ON COLUMN public.leads.last_contacted_at IS 'Timestamp of the last message sent to the lead (manual or bot)';
COMMENT ON COLUMN public.leads.follow_up_count IS 'Number of automated follow-ups sent (0-3)';
