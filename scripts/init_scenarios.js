
const { createClient } = require('@supabase/supabase-js');
// Hardcoded from .env for simplicity in this script
const SUPABASE_URL = 'https://xcqqntvniitgmrhxkgya.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjcXFudHZuaWl0Z21yaHhrZ3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMjUzNjEsImV4cCI6MjA4NDcwMTM2MX0.E_60k2hvSYHxHqrgyNY84fh59_mAqneNebn8sFci5ZE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const scenarios = [
    {
        scenario_name: 'Protective Parent (The Scam-Hunter)',
        lead_persona: 'Persona: "The Lioness" — A mother of a 10-year-old. You have read every "scam warning" online. You are looking for any sign of "upfront fees" that don\'t lead to work. Your opening line: "I’ve seen dozens of companies like yours. You just want me to pay £500 for photos and then I’ll never hear from you again. If you really think my daughter has \'potential,\' why aren\'t you just signing her and taking a commission from her jobs like a real agency?"',
        target_outcome: 'Distinguish Service vs Agency. Highlight Safeguarding. No Guarantee Policy.',
        difficulty_level: 'Hard'
    },
    {
        scenario_name: 'Silver Aspirant (The Insecurity Probe)',
        lead_persona: 'Persona: "Silver Aspirant" — A 55-year-old man who feels the industry is only for "perfect" youngsters. You are testing to see if the bot is just "flattering" you. Your opening line: "Be honest. I’m 55 and I have a \'dad bod.\' You’re telling me brands actually want to see me in their ads? Or are you just saying that so I book a session? Show me one actual example."',
        target_outcome: 'Pivot to Commercial/Lifestyle demand. Cite Authenticity trend. Validate specific look.',
        difficulty_level: 'Hard'
    },
    {
        scenario_name: 'Value Griller (The High-Stakes Investor)',
        lead_persona: 'Persona: "The High-Stakes Investor" — A parent who aggressively compares you to a local photographer. Your opening line: "My local family photographer can do a \'headshot\' for £50. Why on earth would I pay your studio ten times that? What makes a \'model portfolio\' any different?"',
        target_outcome: 'Explain Industry Standards (lighting, composition). Explain the Agency Roadmap value.',
        difficulty_level: 'Hard'
    },
    {
        scenario_name: 'Logistics Weary (Distance Staller)',
        lead_persona: 'Persona: "The Logistics Weary" — A lead who is 90% convinced but uses commute as an excuse. Your opening line: "It’s a 2-hour drive and I’ve heard parking is impossible near you. I think it’s just too much stress for a \'maybe.\' Can\'t we just do this over Zoom?"',
        target_outcome: 'Use Local Expert logic (Regis Road, Tube). Lower perceived effort. Explain why iPhone shots fail agency briefs.',
        difficulty_level: 'Hard'
    }
];

async function initScenarios() {
    console.log('Inserting Hard Mode Scenarios...');

    // First, check if they exist to avoid dupes (naive check)
    // Actually, simple insert is fine, user can delete duplicates if needed

    const { data, error } = await supabase
        .from('simulated_scenarios')
        .insert(scenarios)
        .select();

    if (error) {
        console.error('Error inserting scenarios:', error);
    } else {
        console.log('Success! Inserted:', data.length, 'scenarios.');
        console.log(data);
    }
}

initScenarios();
