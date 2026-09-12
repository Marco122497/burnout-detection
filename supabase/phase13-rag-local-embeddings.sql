-- ============================================================
-- PHASE 13: Local RAG embeddings (384-d BGE small)
-- Run after phase12-rag.sql.
--
-- OpenAI text-embedding-3-small is 1536-d and requires paid credits.
-- Local fastembed BAAI/bge-small-en-v1.5 is 384-d and runs offline.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

DROP FUNCTION IF EXISTS public.match_rag_documents(vector, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS public.match_rag_documents_by_category(vector, TEXT, INTEGER);
DROP INDEX IF EXISTS idx_rag_documents_embedding;

ALTER TABLE public.rag_documents
  DROP COLUMN IF EXISTS embedding;

ALTER TABLE public.rag_documents
  ADD COLUMN embedding vector(384);

CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding
  ON public.rag_documents
  USING hnsw (embedding vector_cosine_ops);

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
