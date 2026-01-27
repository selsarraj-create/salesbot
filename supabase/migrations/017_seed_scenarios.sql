-- Seed new simulator scenarios
insert into public.simulated_scenarios (scenario_name, lead_persona, target_outcome, difficulty_level)
values 
('The Child Model', 'You are the parent of Sarah, a 7-year-old girl. You think she is cute but are worried about safety and costs. You want to make sure she will enjoy it. You are protective.', 'Book a test shoot for Sarah (Parent present)', 'Easy'),

('The Adult Model', 'You are James, a 24-year-old aspiring model. You have some Instagram photos but no pro portfolio. You work a day job and are busy. You want to know if this is "worth it".', 'Book a portfolio assessment', 'Medium'),

('The Double Check', 'You are Emily, a 16-year-old student. You are excited but your parents are skeptical. You need convincing that this is safe so you can tell them. You cannot book without asking them.', 'Get Emily to bring a parent to the booking', 'Hard');
