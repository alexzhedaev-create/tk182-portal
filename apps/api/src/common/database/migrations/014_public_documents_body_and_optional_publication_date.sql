ALTER TABLE public_documents
  ADD COLUMN IF NOT EXISTS body TEXT;

ALTER TABLE public_documents
  ALTER COLUMN publication_date DROP NOT NULL;
