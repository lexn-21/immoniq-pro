
-- Bank connections (GoCardless Bank Account Data — PSD2 read-only)
CREATE TABLE public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gocardless_bad',
  requisition_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  institution_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, linked, expired, revoked
  valid_until TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bank connections" ON public.bank_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bank accounts (one per IBAN under a connection)
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL, -- GoCardless account id
  iban TEXT,
  owner_name TEXT,
  currency TEXT DEFAULT 'EUR',
  balance_cents BIGINT,
  balance_updated_at TIMESTAMPTZ,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bank accounts" ON public.bank_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bank transactions
CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  booking_date DATE NOT NULL,
  value_date DATE,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  counterparty_name TEXT,
  counterparty_iban TEXT,
  purpose TEXT,
  category TEXT, -- income, expense, transfer
  match_status TEXT NOT NULL DEFAULT 'unmatched', -- unmatched, auto_matched, user_matched, ignored
  matched_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  matched_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  matched_expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  match_confidence NUMERIC(3,2),
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, external_id)
);
CREATE INDEX idx_bank_tx_user_date ON public.bank_transactions(user_id, booking_date DESC);
CREATE INDEX idx_bank_tx_match ON public.bank_transactions(user_id, match_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bank transactions" ON public.bank_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tenant payment mandates (Stripe SEPA — Phase 2)
CREATE TABLE public.tenant_payment_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  stripe_account_id TEXT, -- Connected account (landlord)
  stripe_customer_id TEXT,
  stripe_mandate_id TEXT,
  stripe_subscription_id TEXT,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, paused, canceled, failed
  next_charge_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_payment_mandates TO authenticated;
GRANT ALL ON public.tenant_payment_mandates TO service_role;
ALTER TABLE public.tenant_payment_mandates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mandates" ON public.tenant_payment_mandates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Connected Stripe accounts (landlord side, for Stripe Connect — Phase 2)
CREATE TABLE public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  country TEXT DEFAULT 'DE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connected_accounts TO authenticated;
GRANT ALL ON public.connected_accounts TO service_role;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own connected account" ON public.connected_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
