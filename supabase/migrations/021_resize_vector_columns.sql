
-- Upgrade vector dimensions to 3072 to match gemini-embedding-001 output
-- MUST TRUNCATE existing data as dimensions cannot be cast automatically
TRUNCATE TABLE knowledge_vectors;
TRUNCATE TABLE gold_standards;

ALTER TABLE knowledge_vectors 
ALTER COLUMN embedding TYPE vector(3072);

ALTER TABLE gold_standards 
ALTER COLUMN embedding TYPE vector(3072);

-- Also update the matching functions to accept the new dimension
CREATE OR REPLACE FUNCTION match_knowledge_vectors(
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  filter_content_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kv.id,
    kv.content,
    kv.metadata,
    1 - (kv.embedding <=> query_embedding) as similarity
  FROM knowledge_vectors kv
  WHERE 1 - (kv.embedding <=> query_embedding) > match_threshold
  AND (filter_content_type IS NULL OR kv.content_type = filter_content_type)
  ORDER BY kv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_gold_standards(
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  scenario_type text,
  input_text text,
  ideal_response text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gs.id,
    gs.scenario_type,
    gs.input_text,
    gs.ideal_response,
    1 - (gs.embedding <=> query_embedding) as similarity
  FROM gold_standards gs
  WHERE 1 - (gs.embedding <=> query_embedding) > match_threshold
  ORDER BY gs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
