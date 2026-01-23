-- Add review_reason column to leads table for flagging leads that need human review
ALTER TABLE leads
ADD COLUMN review_reason TEXT;
