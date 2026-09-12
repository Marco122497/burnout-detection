-- ============================================================
-- PHASE 12: RAG knowledge base (pgvector) + AI recommendations
-- Run in the Supabase SQL editor after prior phases.
--
-- Embedding dimension is 384 to match local BAAI/bge-small-en-v1.5 (fastembed).
-- If you already ran an older copy with vector(1536), also run
-- supabase/phase13-rag-local-embeddings.sql.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ------------------------------------------------------------
-- Knowledge chunks + embeddings
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rag_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  chunk_number INTEGER,
  embedding vector(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_documents_source_chunk
  ON public.rag_documents (source, chunk_number)
  WHERE source IS NOT NULL AND chunk_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rag_documents_category
  ON public.rag_documents (category);

CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding
  ON public.rag_documents
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guidance read rag documents" ON public.rag_documents;
CREATE POLICY "Guidance read rag documents"
ON public.rag_documents FOR SELECT
TO authenticated
USING (public.current_user_role() = 'Guidance Counselor');

-- ------------------------------------------------------------
-- Vector search: cosine similarity
-- similarity = 1 - cosine distance
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.match_rag_documents (
  query_embedding vector(384),
  match_threshold DOUBLE PRECISION DEFAULT 0.2,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  category TEXT,
  content TEXT,
  source TEXT,
  chunk_number INTEGER,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    rag_documents.id,
    rag_documents.title,
    rag_documents.category,
    rag_documents.content,
    rag_documents.source,
    rag_documents.chunk_number,
    (1 - (rag_documents.embedding <=> query_embedding))::DOUBLE PRECISION AS similarity
  FROM public.rag_documents
  WHERE rag_documents.embedding IS NOT NULL
    AND 1 - (rag_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY rag_documents.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_rag_documents_by_category (
  query_embedding vector(384),
  filter_category TEXT,
  match_count INTEGER DEFAULT 2
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  category TEXT,
  content TEXT,
  source TEXT,
  chunk_number INTEGER,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    rag_documents.id,
    rag_documents.title,
    rag_documents.category,
    rag_documents.content,
    rag_documents.source,
    rag_documents.chunk_number,
    (1 - (rag_documents.embedding <=> query_embedding))::DOUBLE PRECISION AS similarity
  FROM public.rag_documents
  WHERE rag_documents.embedding IS NOT NULL
    AND rag_documents.category = filter_category
  ORDER BY rag_documents.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_rag_documents(vector, DOUBLE PRECISION, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.match_rag_documents_by_category(vector, TEXT, INTEGER)
  TO service_role;

-- ------------------------------------------------------------
-- Per-student RAG/LLM recommendation + audit trail
-- Distinct from catalog table public.recommendations
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rag_recommendations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  monitoring_id BIGINT REFERENCES public.weekly_monitoring(monitoring_id) ON DELETE CASCADE,
  mfbi_id BIGINT REFERENCES public.mfbi_results(mfbi_id) ON DELETE SET NULL,
  prediction_id BIGINT REFERENCES public.ml_predictions(prediction_id) ON DELETE SET NULL,
  mfbi_score NUMERIC(6,4),
  risk_level VARCHAR(20)
    CHECK (risk_level IS NULL OR risk_level IN ('Low', 'Moderate', 'High', 'Severe')),
  prediction_model TEXT,
  llm_model TEXT,
  used_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  assessment_summary TEXT,
  contributing_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  human_support TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  retrieved_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  retrieved_chunks JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_recommendations_monitoring
  ON public.rag_recommendations (monitoring_id)
  WHERE monitoring_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rag_recommendations_student_created
  ON public.rag_recommendations (student_id, created_at DESC);

ALTER TABLE public.rag_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read rag recommendations by access" ON public.rag_recommendations;
CREATE POLICY "Read rag recommendations by access"
ON public.rag_recommendations FOR SELECT
TO authenticated
USING (public.can_access_student(student_id));

DROP POLICY IF EXISTS "Students insert own rag recommendations" ON public.rag_recommendations;
CREATE POLICY "Students insert own rag recommendations"
ON public.rag_recommendations FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() = 'Student'
  AND student_id = auth.uid()
);

DROP POLICY IF EXISTS "Students update own rag recommendations" ON public.rag_recommendations;
CREATE POLICY "Students update own rag recommendations"
ON public.rag_recommendations FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'Student'
  AND student_id = auth.uid()
)
WITH CHECK (
  public.current_user_role() = 'Student'
  AND student_id = auth.uid()
);

COMMENT ON TABLE public.rag_documents IS
  'Chunked evidence-based knowledge with pgvector embeddings for RAG retrieval.';

COMMENT ON TABLE public.rag_recommendations IS
  'Personalized RAG+LLM recommendations generated after MFBI + ML prediction. Does not store or alter the burnout classifier output.';
