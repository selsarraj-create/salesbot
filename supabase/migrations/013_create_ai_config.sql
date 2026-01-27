-- Create table for global AI configuration
create table if not exists ai_config (
    id int primary key default 1, -- Enforce singleton row
    check (id = 1),
    
    model text not null default 'gemini-2.0-flash',
    temperature float not null default 0.3,
    top_p float not null default 0.95,
    frequency_penalty float not null default 0.5,
    max_tokens int not null default 250,
    
    -- Context Caching / Full Context Mode Toggle
    -- If true: Full Context Mode (No Caching, Fresh Injection)
    -- If false: Optimized/Cached (Legacy)
    full_context_mode boolean not null default true,
    
    updated_at timestamptz default now()
);

-- Enable RLS (though for internal tool we might keep it open for now, but good practice)
alter table ai_config enable row level security;

-- Create policy to allow read/write for authenticated users (or anon for dev simplicity if Supabase rules allow)
-- For this project, assuming mostly server-side or internal usage.
create policy "Allow all access to ai_config" on ai_config for all using (true) with check (true);

-- Insert default config if not exists
insert into ai_config (id, temperature, top_p, frequency_penalty, max_tokens, full_context_mode)
values (1, 0.3, 0.95, 0.5, 250, true)
on conflict do nothing;
