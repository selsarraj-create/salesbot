-- 1. Update AI Config for Thinking Control
ALTER TABLE ai_config
ADD COLUMN thinking_budget INTEGER NOT NULL DEFAULT 0, -- Default 0 (Fast/Disabled)
ADD COLUMN show_thoughts BOOLEAN NOT NULL DEFAULT false; -- Toggle for UI

-- 2. Update Messages to store reasoning
ALTER TABLE messages
ADD COLUMN thought_content TEXT; -- Stores the 'thought' part from Gemini 2.5

-- 3. Update RLS (if needed - assuming open for now based on previous files)
-- No new policies needed as existing ones cover the table.
