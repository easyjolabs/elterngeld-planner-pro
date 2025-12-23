-- First drop dependent objects
DROP FUNCTION IF EXISTS public.match_document_chunks(vector, integer);
ALTER TABLE public.document_chunks DROP COLUMN IF EXISTS embedding;

-- Drop and recreate extension in extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS vector CASCADE;
CREATE EXTENSION vector WITH SCHEMA extensions;

-- Recreate the embedding column
ALTER TABLE public.document_chunks ADD COLUMN embedding extensions.vector(768);

-- Recreate index
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks 
USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Fix: Add search_path to trigger function
CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate match function with proper search path
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding extensions.vector(768),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  JOIN public.documents d ON dc.document_id = d.id
  WHERE d.status = 'ready'
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;