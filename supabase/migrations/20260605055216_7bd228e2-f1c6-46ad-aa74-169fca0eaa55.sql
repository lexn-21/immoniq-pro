CREATE TABLE public.financings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  bank_name TEXT NOT NULL,
  loan_amount NUMERIC(14,2) NOT NULL,
  interest_rate NUMERIC(6,3) NOT NULL,
  amortization_rate NUMERIC(6,3) DEFAULT 2.0,
  fixed_until DATE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  monthly_rate NUMERIC(12,2),
  current_balance NUMERIC(14,2),
  special_repayment_allowed NUMERIC(6,3) DEFAULT 5.0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financings TO authenticated;
GRANT ALL ON public.financings TO service_role;

ALTER TABLE public.financings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own financings"
  ON public.financings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER financings_updated_at
  BEFORE UPDATE ON public.financings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_financings_user ON public.financings(user_id);
CREATE INDEX idx_financings_property ON public.financings(property_id);