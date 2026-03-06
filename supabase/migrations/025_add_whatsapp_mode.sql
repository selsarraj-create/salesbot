-- Add whatsapp_mode flag to leads table
-- When true, test leads will be processed through the full AI + Twilio WhatsApp pipeline
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_mode BOOLEAN DEFAULT false;
