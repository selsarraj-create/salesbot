-- Create messages table for conversation history with Realtime support
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_sender_type CHECK (sender_type IN ('bot', 'lead', 'human'))
);

-- Create indexes for efficient queries
CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_lead_timestamp ON messages(lead_id, timestamp DESC);

-- Enable Realtime for this table
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Add comments
COMMENT ON TABLE messages IS 'Stores conversation messages with Realtime enabled for live dashboard updates';
COMMENT ON COLUMN messages.sender_type IS 'Message sender: "bot" (AI), "lead" (customer), or "human" (manual agent)';
COMMENT ON COLUMN messages.lead_id IS 'Foreign key to leads table, cascades on delete';

-- Note: After running this migration, enable Realtime in Supabase Dashboard:
-- Database → Replication → Enable for 'messages' table
