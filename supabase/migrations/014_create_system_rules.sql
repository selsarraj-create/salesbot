-- Create system_rules table for dynamic prompt injection
create table if not exists public.system_rules (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    rule_text text not null,
    category text not null check (category in ('behavior', 'constraint')),
    is_active boolean default true,
    is_locked boolean default false -- True implies this is a Critical Legal/Safety rule that cannot be deleted by managers
);

comment on table public.system_rules is 'Dynamic instructions and constraints injected into the AI system prompt.';
comment on column public.system_rules.is_locked is 'If true, this rule contains critical keywords (e.g. Agency, Guarantee) and cannot be removed via the UI.';

-- Add index for active rules fetching
create index if not exists system_rules_active_idx on public.system_rules (is_active);

-- RLS Policies (Open for now as this is an internal dashboard tool, similar to other tables)
alter table public.system_rules enable row level security;

create policy "Enable all access for authenticated users" 
on public.system_rules for all 
to authenticated 
using (true) 
with check (true);

create policy "Enable all access for anon (dev mode)" 
on public.system_rules for all 
to anon 
using (true) 
with check (true);
