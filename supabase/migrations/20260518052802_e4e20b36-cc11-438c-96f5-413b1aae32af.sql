-- Add scope to vault_documents
ALTER TABLE public.vault_documents
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'immo';

ALTER TABLE public.vault_documents
  DROP CONSTRAINT IF EXISTS vault_documents_scope_check;
ALTER TABLE public.vault_documents
  ADD CONSTRAINT vault_documents_scope_check CHECK (scope IN ('immo','personal'));

CREATE INDEX IF NOT EXISTS vault_docs_scope_idx ON public.vault_documents(user_id, scope);

-- Add new personal categories to the enum (safe ADD VALUE)
ALTER TYPE public.vault_category ADD VALUE IF NOT EXISTS 'ausweis';
ALTER TYPE public.vault_category ADD VALUE IF NOT EXISTS 'fuehrerschein';
ALTER TYPE public.vault_category ADD VALUE IF NOT EXISTS 'gesundheit';
ALTER TYPE public.vault_category ADD VALUE IF NOT EXISTS 'arbeit';
ALTER TYPE public.vault_category ADD VALUE IF NOT EXISTS 'bank';
ALTER TYPE public.vault_category ADD VALUE IF NOT EXISTS 'vertrag';
ALTER TYPE public.vault_category ADD VALUE IF NOT EXISTS 'kfz';
ALTER TYPE public.vault_category ADD VALUE IF NOT EXISTS 'familie';
ALTER TYPE public.vault_category ADD VALUE IF NOT EXISTS 'schule';