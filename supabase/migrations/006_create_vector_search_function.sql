-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_knowledge_vectors(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_content_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  metadata JSONB,
  critique JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_vectors.id,
    knowledge_vectors.content,
    knowledge_vectors.content_type,
    knowledge_vectors.metadata,
    knowledge_vectors.critique,
    1 - (knowledge_vectors.embedding <=> query_embedding) AS similarity
  FROM knowledge_vectors
  WHERE 
    (filter_content_type IS NULL OR knowledge_vectors.content_type = filter_content_type)
    AND 1 - (knowledge_vectors.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_vectors.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function for searching Gold Standard examples
CREATE OR REPLACE FUNCTION match_gold_standards(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  ai_response TEXT,
  manager_correction TEXT,
  objection_type TEXT,
  confidence_score FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    training_feedback.id,
    training_feedback.ai_response,
    training_feedback.manager_correction,
    training_feedback.objection_type,
    training_feedback.confidence_score,
    1 - (training_feedback.embedding <=> query_embedding) AS similarity
  FROM training_feedback
  WHERE 
    training_feedback.is_gold_standard = true
    AND training_feedback.embedding IS NOT NULL
    AND 1 - (training_feedback.embedding <=> query_embedding) > match_threshold
  ORDER BY training_feedback.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_knowledge_vectors IS 'Performs vector similarity search on knowledge_vectors table';
COMMENT ON FUNCTION match_gold_standards IS 'Finds similar Gold Standard examples from training_feedback';
