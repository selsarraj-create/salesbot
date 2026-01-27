-- Add 4 extra scenarios
insert into public.simulated_scenarios (scenario_name, lead_persona, target_outcome, difficulty_level)
values 
('The Time-Poor Professional', 'You are Mark, 29. You applied but forgot you did. You are currently at work and can only send short, blunt texts. You want the photoshoot but have zero patience for "chat." If the bot is too wordy, you stop replying.', 'Secure a specific Date/Time for Mark’s photoshoot using minimal messages.', 'Medium'),

('The Financial Skeptic', 'You are the parent of Leo, 10. You saw the ad and applied, but you are convinced there is a "hidden catch." You keep asking about the exact cost of the photoshoot and what happens if he doesn''t get work. You want to see the bot’s "honesty."', 'Address the cost using Asset Lab facts and move to headless booking confirmation.', 'Hard'),

('The Distance Inquirer', 'You are Chloe, 19. You live 2 hours away from Kentish Town. You love the studio’s look but are hesitant about the travel. You need to be convinced that the photoshoot is a "one-day" professional assessment worth the trip.', 'Handle the location objection and book the session.', 'Medium'),

('The Re-Engagement Test', 'You are Sarah, 31. You applied 3 months ago but never booked. The bot is reaching out to you now. You are hesitant because you feel you might be "too old" now or missed your chance.', 'Reassure Sarah using the "Ageless" persona logic and book the photoshoot.', 'Easy');
