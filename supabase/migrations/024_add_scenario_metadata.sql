-- Add metadata columns to simulated_scenarios
ALTER TABLE simulated_scenarios 
ADD COLUMN IF NOT EXISTS lead_name text,
ADD COLUMN IF NOT EXISTS lead_age int;

-- Update existing scenarios with correct metadata
UPDATE simulated_scenarios 
SET lead_name = 'Sarah', lead_age = 7 
WHERE scenario_name = 'The Child Model';

UPDATE simulated_scenarios 
SET lead_name = 'James', lead_age = 24 
WHERE scenario_name = 'The Adult Model';

UPDATE simulated_scenarios 
SET lead_name = 'Emily', lead_age = 16 
WHERE scenario_name = 'The Double Check';

-- Fallback for any others
UPDATE simulated_scenarios 
SET lead_name = 'Alex', lead_age = 25 
WHERE lead_name IS NULL;
