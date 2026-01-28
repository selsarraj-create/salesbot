-- Fix match_gold_standards to accept vector(3072)
CREATE OR REPLACE FUNCTION match_gold_standards(
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  filter_lead_type text DEFAULT NULL
)
RETURNS TABLE (id uuid, ai_response text, manager_correction text, similarity float)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.id, 
    gs.ai_response, 
    gs.manager_correction, 
    1 - (gs.embedding <=> query_embedding) as similarity
  FROM gold_standards gs
  WHERE 1 - (gs.embedding <=> query_embedding) > match_threshold
  ORDER BY gs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update AI Config to reflect correct model
UPDATE ai_config 
SET model = 'gemini-2.5-flash'
WHERE id = 1;
