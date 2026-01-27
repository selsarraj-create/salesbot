-- Enable HNSW indexing for faster vector search
-- We assume the 'vector' extension is already enabled.

-- 1. Index for Knowledge Vectors (768 dimensions for Gemini text-embedding-004)
create index if not exists knowledge_vectors_embedding_hnsw_idx 
on public.knowledge_vectors 
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);

-- 2. Index for Training Feedback (Gold Standards)
create index if not exists training_feedback_embedding_hnsw_idx 
on public.training_feedback 
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);

-- 3. Add composite indexes for common queries
create index if not exists messages_lead_timestamp_idx on public.messages (lead_id, timestamp desc);
create index if not exists leads_priority_score_idx on public.leads (priority_score desc);
