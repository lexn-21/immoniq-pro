ALTER TABLE public.tenant_issues
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS snooze_until date,
  ADD COLUMN IF NOT EXISTS assignee text;
CREATE INDEX IF NOT EXISTS tenant_issues_due_idx ON public.tenant_issues(user_id, status, due_date);