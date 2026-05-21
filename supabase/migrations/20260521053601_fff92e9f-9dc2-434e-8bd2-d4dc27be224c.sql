
-- Add inbox alias to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inbox_alias text UNIQUE;

-- Generate alias for existing profiles
UPDATE public.profiles SET inbox_alias = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)) WHERE inbox_alias IS NULL;

-- Inbox items
CREATE TABLE IF NOT EXISTS public.inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'email',
  from_email text,
  from_name text,
  subject text,
  body_text text,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new',
  ai_category text,
  ai_sender text,
  ai_amount numeric,
  ai_due_date date,
  ai_contract_end date,
  ai_summary text,
  ai_confidence numeric,
  ai_processed_at timestamptz,
  task_id uuid,
  vault_item_id uuid,
  property_id uuid,
  attachments jsonb DEFAULT '[]'::jsonb,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own inbox all" ON public.inbox_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service inbox all" ON public.inbox_items
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_inbox_user_received ON public.inbox_items(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_status ON public.inbox_items(user_id, status);

CREATE TRIGGER trg_inbox_items_updated
  BEFORE UPDATE ON public.inbox_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create alias on new profile
CREATE OR REPLACE FUNCTION public.ensure_inbox_alias()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.inbox_alias IS NULL THEN
    NEW.inbox_alias := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_inbox_alias ON public.profiles;
CREATE TRIGGER trg_profiles_inbox_alias
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_inbox_alias();
