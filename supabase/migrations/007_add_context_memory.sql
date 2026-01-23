-- Add context_memory to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS context_memory JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.leads.context_memory IS 'Stores summarized context about the lead (concerns, goals, sentiment history)';
