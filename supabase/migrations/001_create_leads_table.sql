-- Create enhanced leads table with status enum and manual mode
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT,
    lead_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    is_manual_mode BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN (
        'New', 
        'Qualifying', 
        'Booking_Offered', 
        'Booked', 
        'Objection_Distance', 
        'Human_Required'
    )),
    CONSTRAINT valid_lead_code CHECK (lead_code ~ '^#.*')
);

-- Create indexes for fast lookups
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_lead_code ON leads(lead_code);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_manual_mode ON leads(is_manual_mode);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE leads IS 'Stores lead information for photography studio sales bot with enhanced status tracking';
COMMENT ON COLUMN leads.lead_code IS 'Unique lead tracking code for generation attribution, must start with # symbol';
COMMENT ON COLUMN leads.status IS 'Lead progression: New → Qualifying → Booking_Offered → Booked, or Objection_Distance/Human_Required';
COMMENT ON COLUMN leads.is_manual_mode IS 'True when human agent has taken over conversation, pauses AI responses';
