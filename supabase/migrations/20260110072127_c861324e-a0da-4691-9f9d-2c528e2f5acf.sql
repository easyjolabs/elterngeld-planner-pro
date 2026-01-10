-- Add full-text search column for FAQs
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS content_tsv tsvector;

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS faqs_content_tsv_idx ON public.faqs USING gin(content_tsv);

-- Create trigger to auto-update tsv on insert/update
CREATE OR REPLACE FUNCTION public.update_faqs_tsv()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.content_tsv := 
    setweight(to_tsvector('english', COALESCE(NEW.question_en, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.answer_en, '')), 'B') ||
    setweight(to_tsvector('german', COALESCE(NEW.question_de, '')), 'A') ||
    setweight(to_tsvector('german', COALESCE(NEW.answer_de, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'A');
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_faqs_tsv_trigger
BEFORE INSERT OR UPDATE ON public.faqs
FOR EACH ROW
EXECUTE FUNCTION public.update_faqs_tsv();

-- Create keyword search function (no embeddings needed)
CREATE OR REPLACE FUNCTION public.search_faqs_keyword(
  search_query TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id TEXT,
  category TEXT,
  question_de TEXT,
  question_en TEXT,
  answer_de TEXT,
  answer_en TEXT,
  tags TEXT[],
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.category,
    f.question_de,
    f.question_en,
    f.answer_de,
    f.answer_en,
    f.tags,
    ts_rank(f.content_tsv, websearch_to_tsquery('english', search_query))::REAL AS rank
  FROM public.faqs f
  WHERE f.content_tsv @@ websearch_to_tsquery('english', search_query)
     OR f.content_tsv @@ websearch_to_tsquery('german', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;