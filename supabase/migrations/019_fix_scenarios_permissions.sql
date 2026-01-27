-- Enable RLS on simulated_scenarios
alter table public.simulated_scenarios enable row level security;

-- Drop existing policy if it exists to avoid errors
drop policy if exists "Allow public read" on public.simulated_scenarios;

-- Create policy for public read access
create policy "Allow public read" 
on public.simulated_scenarios 
for select 
to public 
using (true);
