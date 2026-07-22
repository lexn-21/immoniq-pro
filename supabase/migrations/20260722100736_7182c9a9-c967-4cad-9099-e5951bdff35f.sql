
-- 1. DEPOSIT ACCOUNTS
CREATE TABLE public.deposit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  interest_rate_bps INT DEFAULT 0 CHECK (interest_rate_bps >= 0 AND interest_rate_bps < 10000),
  account_kind TEXT NOT NULL DEFAULT 'immoniq_trust' CHECK (account_kind IN ('immoniq_trust','sparbuch','bankburgschaft','barkaution','sonstiges')),
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen','verwahrt','teilverrechnet','ausgezahlt','streitig')),
  custodian TEXT,
  iban_masked TEXT,
  received_on DATE,
  released_on DATE,
  contract_pdf_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deposit_accounts TO authenticated;
GRANT ALL ON public.deposit_accounts TO service_role;
ALTER TABLE public.deposit_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "landlord manages own deposits" ON public.deposit_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tenant reads own deposit" ON public.deposit_accounts
  FOR SELECT USING (
    tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenants t
       WHERE t.id = deposit_accounts.tenant_id AND t.claimed_by_user_id = auth.uid()
    )
  );
CREATE TRIGGER trg_deposit_accounts_updated
  BEFORE UPDATE ON public.deposit_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_deposit_accounts_user ON public.deposit_accounts(user_id);
CREATE INDEX idx_deposit_accounts_tenant ON public.deposit_accounts(tenant_id);

-- 2. CRAFTSMEN CONTACTS
CREATE TABLE public.craftsmen_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  rating NUMERIC,
  rating_count INT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  notes TEXT,
  favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.craftsmen_contacts TO authenticated;
GRANT ALL ON public.craftsmen_contacts TO service_role;
ALTER TABLE public.craftsmen_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own craftsmen" ON public.craftsmen_contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_craftsmen_contacts_updated
  BEFORE UPDATE ON public.craftsmen_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_craftsmen_user ON public.craftsmen_contacts(user_id);

-- 3. LANDLORD RATINGS (public — network effect)
CREATE TABLE public.landlord_ratings_public (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  category_communication INT CHECK (category_communication BETWEEN 1 AND 5),
  category_maintenance INT CHECK (category_maintenance BETWEEN 1 AND 5),
  category_fairness INT CHECK (category_fairness BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (landlord_user_id, rated_by_user_id)
);
GRANT SELECT ON public.landlord_ratings_public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landlord_ratings_public TO authenticated;
GRANT ALL ON public.landlord_ratings_public TO service_role;
ALTER TABLE public.landlord_ratings_public ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads ratings" ON public.landlord_ratings_public
  FOR SELECT USING (true);
CREATE POLICY "rater inserts own" ON public.landlord_ratings_public
  FOR INSERT WITH CHECK (
    auth.uid() = rated_by_user_id
    AND rated_by_user_id <> landlord_user_id
    AND EXISTS (
      SELECT 1 FROM public.tenants t
       WHERE t.claimed_by_user_id = auth.uid()
         AND t.user_id = landlord_ratings_public.landlord_user_id
    )
  );
CREATE POLICY "rater updates own" ON public.landlord_ratings_public
  FOR UPDATE USING (auth.uid() = rated_by_user_id) WITH CHECK (auth.uid() = rated_by_user_id);
CREATE POLICY "rater deletes own" ON public.landlord_ratings_public
  FOR DELETE USING (auth.uid() = rated_by_user_id);
CREATE TRIGGER trg_landlord_ratings_updated
  BEFORE UPDATE ON public.landlord_ratings_public
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_landlord_ratings_landlord ON public.landlord_ratings_public(landlord_user_id);

-- 4. API KEYS
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read']::text[],
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own api keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_api_keys_updated
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
