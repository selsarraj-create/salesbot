-- Add lead_metadata column to leads table
alter table public.leads add column if not exists lead_metadata jsonb default '{}'::jsonb;

comment on column public.leads.lead_metadata is 'Stores additional lead context like age, preferences, etc.';
