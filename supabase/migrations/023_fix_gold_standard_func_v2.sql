-- Fix match_gold_standards to correctly use training_feedback table
-- and handle the vector(3072) size from migration 021/022

-- Drop old signatures first to allow return type change
DROP FUNCTION IF EXISTS match_gold_standards(vector, float, int);
DROP FUNCTION IF EXISTS match_gold_standards(vector, float, int, text);

CREATE OR REPLACE FUNCTION match_gold_standards(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3,
  filter_lead_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, 
  ai_response text, 
  manager_correction text, 
  objection_type text, 
  confidence_score float, 
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tf.id, 
    tf.ai_response, 
    tf.manager_correction, 
    tf.objection_type,
    tf.confidence_score,
    1 - (tf.embedding <=> query_embedding) as similarity
  FROM training_feedback tf
  WHERE 
    tf.is_gold_standard = true
    AND tf.embedding IS NOT NULL
    AND 1 - (tf.embedding <=> query_embedding) > match_threshold
  ORDER BY tf.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
