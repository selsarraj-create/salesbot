-- Create training_feedback table for RLHF
create table if not exists public.training_feedback (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    message_id uuid references public.messages(id), -- Optional link to original message
    original_prompt text not null,
    ai_response text not null,
    manager_correction text,
    objection_type text,
    confidence_score float,
    is_gold_standard boolean default false
);

comment on table public.training_feedback is 'Stores RLHF data: AI responses and manager corrections.';

-- Create simulated_scenarios table for Flight Simulator
create table if not exists public.simulated_scenarios (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    scenario_name text not null,
    lead_persona text not null, -- The prompt defining the "Attacker" AI
    target_outcome text,
    difficulty_level text default 'Medium' -- Easy, Medium, Hard, Impossible
);

comment on table public.simulated_scenarios is 'Definitions for AI vs AI roleplay scenarios.';

-- Add some default scenarios
insert into public.simulated_scenarios (scenario_name, lead_persona, target_outcome, difficulty_level)
values 
('The Skeptic', 'You are a skeptical potential customer who has been burned by modeling scams before. You ask many questions about hidden fees, the legitimacy of the studio, and why you have to travel. You are polite but very guarded.', 'Build trust and book the assessment', 'Hard'),
('Price Conscious Student', 'You are a university student with very limited budget. You are interested but terrifed of costs. You ask repeatedly if it is truly free and what the catch is.', 'Reassure about free assessment and book', 'Medium'),
('The Flake', 'You are interested but very non-committal. You keep saying "maybe next week" or "I need to check my schedule". You are easily distracted.', 'Create urgency and lock in a specific slot', 'Medium');
