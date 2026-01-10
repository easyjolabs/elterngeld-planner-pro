-- FAQs Tabelle für RAG-Chat
CREATE TABLE public.faqs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  question_de TEXT NOT NULL,
  question_en TEXT NOT NULL,
  answer_de TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index für Vektor-Suche mit IVFFlat
CREATE INDEX faqs_embedding_idx ON public.faqs 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS aktivieren
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Public read faqs" ON public.faqs 
FOR SELECT USING (true);

-- Such-Funktion für Cosine Similarity
CREATE OR REPLACE FUNCTION public.search_faqs(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id TEXT,
  category TEXT,
  question_de TEXT,
  question_en TEXT,
  answer_de TEXT,
  answer_en TEXT,
  tags TEXT[],
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
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
    (1 - (f.embedding <=> query_embedding))::float AS similarity
  FROM public.faqs f
  WHERE f.embedding IS NOT NULL
    AND 1 - (f.embedding <=> query_embedding) > similarity_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;