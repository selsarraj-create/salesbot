-- Add priority scoring and shoot date columns
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS priority_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS shoot_date TIMESTAMPTZ;

COMMENT ON COLUMN public.leads.priority_score IS 'AI-predicted intent to book (0-100)';
COMMENT ON COLUMN public.leads.shoot_date IS 'Scheduled date of the assessment shoot';
