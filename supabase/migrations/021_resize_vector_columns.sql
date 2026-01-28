
-- Upgrade vector dimensions to 3072 to match gemini-embedding-001 output
-- Note: We must TRUNCATE existing data as dimensions cannot be cast automatically

-- 1. Critical Update: Drop ALL potential indexes
DROP INDEX IF EXISTS knowledge_vectors_embedding_idx;      -- IVFFlat
DROP INDEX IF EXISTS knowledge_vectors_embedding_hnsw_idx; -- HNSW (The likely culprit)
DROP INDEX IF EXISTS training_feedback_embedding_idx;      -- IVFFlat
DROP INDEX IF EXISTS training_feedback_embedding_hnsw_idx; -- HNSW

TRUNCATE TABLE knowledge_vectors;
ALTER TABLE knowledge_vectors ALTER COLUMN embedding TYPE vector(3072);

-- Also resize training_feedback if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'training_feedback' AND column_name = 'embedding') THEN
        TRUNCATE TABLE training_feedback;
        ALTER TABLE training_feedback ALTER COLUMN embedding TYPE vector(3072);
    END IF;
END $$;

-- 2. Optional Update (Safe Check)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gold_standards') THEN
        DROP INDEX IF EXISTS gold_standards_embedding_idx;
        TRUNCATE TABLE gold_standards;
        ALTER TABLE gold_standards ALTER COLUMN embedding TYPE vector(3072);
    END IF;
END $$;

-- 3. Update Matching Functions (Safe Replace)
-- DROP first to allow return type change
DROP FUNCTION IF EXISTS match_knowledge_vectors(vector, float, int, text);
DROP FUNCTION IF EXISTS match_gold_standards(vector, float, int);

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

-- Only modify gold_standards function if likely needed or used
-- Safe to define even if table missing? No, function body checks table.
-- We'll wrap function creation in DO block just in case, or just define it knowing it might fail if table missing.
-- safer strategy: Create dummy if missing? No, let's just make the function. 
-- Actually, if table missing, function create will fail. Let's wrap function in checks.

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gold_standards') THEN
        EXECUTE '
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
        AS $func$
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
        $func$;';
    END IF;
END $$;
