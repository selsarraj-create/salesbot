-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_vectors table for multimodal knowledge storage
CREATE TABLE IF NOT EXISTS public.knowledge_vectors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT, -- 'audio_transcript', 'document', 'conversation'
    metadata JSONB, -- {filename, duration, speaker, file_size, etc}
    embedding VECTOR(768), -- Gemini text-embedding-004 produces 768-dim vectors
    critique JSONB -- {objection_quality, tone, closing_power, summary}
);

COMMENT ON TABLE public.knowledge_vectors IS 'Stores multimodal knowledge (audio transcripts, documents) with vector embeddings for similarity search';

-- Create index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS knowledge_vectors_embedding_idx 
ON public.knowledge_vectors 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for content_type filtering
CREATE INDEX IF NOT EXISTS knowledge_vectors_content_type_idx 
ON public.knowledge_vectors (content_type);

-- Add sentiment and embedding to training_feedback
ALTER TABLE public.training_feedback 
ADD COLUMN IF NOT EXISTS sentiment_score FLOAT,
ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

-- Create index for training_feedback embeddings
CREATE INDEX IF NOT EXISTS training_feedback_embedding_idx 
ON public.training_feedback 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMENT ON COLUMN public.training_feedback.sentiment_score IS 'Sentiment analysis score from -1 (negative) to +1 (positive)';
COMMENT ON COLUMN public.training_feedback.embedding IS 'Vector embedding for similarity search of Gold Standards';
