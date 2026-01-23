-- Add sentiment tracking to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS sentiment_score FLOAT,
ADD COLUMN IF NOT EXISTS sentiment_label TEXT;

COMMENT ON COLUMN public.messages.sentiment_score IS 'Sentiment score from -1.0 (Negative) to 1.0 (Positive)';
COMMENT ON COLUMN public.messages.sentiment_label IS 'Label derived from score (Positive, Neutral, Negative)';
