-- Create chat_history table for conversation context
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_sender CHECK (sender IN ('lead', 'bot'))
);

-- Create composite index for efficient context retrieval
CREATE INDEX idx_chat_history_phone_timestamp ON chat_history(phone, timestamp DESC);

-- Create index on lead_id for foreign key lookups
CREATE INDEX idx_chat_history_lead_id ON chat_history(lead_id);

-- Add comments
COMMENT ON TABLE chat_history IS 'Stores conversation history for context-aware AI responses';
COMMENT ON COLUMN chat_history.sender IS 'Either "lead" (customer) or "bot" (AI assistant)';
