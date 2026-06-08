CREATE TABLE IF NOT EXISTS public.tenant_issue_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.tenant_issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_issue_notes TO authenticated;
GRANT ALL ON public.tenant_issue_notes TO service_role;

ALTER TABLE public.tenant_issue_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads issue notes"
  ON public.tenant_issue_notes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "owner inserts issue notes"
  ON public.tenant_issue_notes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.tenant_issues t WHERE t.id = issue_id AND t.user_id = auth.uid())
  );

CREATE POLICY "owner updates issue notes"
  ON public.tenant_issue_notes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner deletes issue notes"
  ON public.tenant_issue_notes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tenant_issue_notes_issue_idx
  ON public.tenant_issue_notes(issue_id, created_at DESC);