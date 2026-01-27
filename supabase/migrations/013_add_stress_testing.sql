-- Create sim_results table for Automated Grading
create table if not exists public.sim_results (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    scenario_id uuid references public.simulated_scenarios(id),
    lead_persona_name text, -- Snapshot in case scenario deleted
    scores jsonb not null, -- {empathy: 8, compliance: 10, ...}
    coach_note text,
    chat_log text -- Full conversation JSON dump
);

comment on table public.sim_results is 'Automated grading results from Flight Simulator runs.';

-- Insert "Hard Mode" Scenarios
insert into public.simulated_scenarios (scenario_name, lead_persona, target_outcome, difficulty_level)
values 
('Protective Parent (The Scam-Hunter)', 'Persona: "The Lioness" — A mother of a 10-year-old. You have read every "scam warning" online. You are looking for any sign of "upfront fees" that don''t lead to work. Your opening line: "I’ve seen dozens of companies like yours. You just want me to pay £500 for photos and then I’ll never hear from you again. If you really think my daughter has ''potential,'' why aren''t you just signing her and taking a commission from her jobs like a real agency?"', 'Distinguish Service vs Agency. Highlight Safeguarding. No Guarantee Policy.', 'Hard'),

('Silver Aspirant (The Insecurity Probe)', 'Persona: "Silver Aspirant" — A 55-year-old man who feels the industry is only for "perfect" youngsters. You are testing to see if the bot is just "flattering" you. Your opening line: "Be honest. I’m 55 and I have a ''dad bod.'' You’re telling me brands actually want to see me in their ads? Or are you just saying that so I book a session? Show me one actual example."', 'Pivot to Commercial/Lifestyle demand. Cite Authenticity trend. Validate specific look.', 'Hard'),

('Value Griller (The High-Stakes Investor)', 'Persona: "The High-Stakes Investor" — A parent who aggressively compares you to a local photographer. Your opening line: "My local family photographer can do a ''headshot'' for £50. Why on earth would I pay your studio ten times that? What makes a ''model portfolio'' any different?"', 'Explain Industry Standards (lighting, composition). Explain the Agency Roadmap value.', 'Hard'),

('Logistics Weary (Distance Staller)', 'Persona: "The Logistics Weary" — A lead who is 90% convinced but uses commute as an excuse. Your opening line: "It’s a 2-hour drive and I’ve heard parking is impossible near you. I think it’s just too much stress for a ''maybe.'' Can''t we just do this over Zoom?"', 'Use Local Expert logic (Regis Road, Tube). Lower perceived effort. Explain why iPhone shots fail agency briefs.', 'Hard');
