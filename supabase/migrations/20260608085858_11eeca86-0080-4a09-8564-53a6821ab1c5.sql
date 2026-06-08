
CREATE TABLE public.bank_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_kind text NOT NULL CHECK (match_kind IN ('iban','name','purpose')),
  match_value text NOT NULL,
  target_kind text NOT NULL DEFAULT 'expense' CHECK (target_kind IN ('expense','ignore')),
  expense_category expense_category DEFAULT 'immediate',
  expense_classification expense_classification DEFAULT 'maintenance',
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  vendor text,
  description text,
  nka_eligible boolean NOT NULL DEFAULT false,
  auto_book boolean NOT NULL DEFAULT true,
  hit_count int NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_rules_user_kind ON public.bank_rules(user_id, match_kind);
CREATE INDEX idx_bank_rules_value ON public.bank_rules(user_id, match_value);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_rules TO authenticated;
GRANT ALL ON public.bank_rules TO service_role;

ALTER TABLE public.bank_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own bank_rules all" ON public.bank_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_bank_rules_updated
  BEFORE UPDATE ON public.bank_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
