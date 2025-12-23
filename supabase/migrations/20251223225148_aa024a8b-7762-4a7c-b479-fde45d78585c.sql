-- Add content_tsv column for full-text search (German configuration)
ALTER TABLE public.document_chunks 
ADD COLUMN IF NOT EXISTS content_tsv tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS document_chunks_content_tsv_idx 
ON public.document_chunks USING GIN (content_tsv);

-- Create trigger to automatically update tsvector on insert/update
CREATE OR REPLACE FUNCTION public.update_document_chunks_tsv()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.content_tsv := to_tsvector('german', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_chunks_tsv_trigger ON public.document_chunks;
CREATE TRIGGER document_chunks_tsv_trigger
BEFORE INSERT OR UPDATE OF content ON public.document_chunks
FOR EACH ROW
EXECUTE FUNCTION public.update_document_chunks_tsv();

-- Create full-text search function
CREATE OR REPLACE FUNCTION public.search_document_chunks(
  search_query text,
  match_count integer DEFAULT 5
)
RETURNS TABLE(id uuid, content text, rank real)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    ts_rank(dc.content_tsv, websearch_to_tsquery('german', search_query)) AS rank
  FROM public.document_chunks dc
  JOIN public.documents d ON dc.document_id = d.id
  WHERE d.status = 'ready'
    AND dc.content_tsv @@ websearch_to_tsquery('german', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;