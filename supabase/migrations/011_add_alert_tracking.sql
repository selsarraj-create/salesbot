-- Add alert tracking timestamp to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.leads.alert_sent_at IS 'Timestamp of the last concierge alert sent to this lead';
