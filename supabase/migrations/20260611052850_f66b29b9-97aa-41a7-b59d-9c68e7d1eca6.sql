
-- 1) Add 'advisor' to app_role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'advisor' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'advisor';
  END IF;
END $$;

-- 2) advisor_mandates: link advisor <-> landlord (mandant)
CREATE TABLE IF NOT EXISTS public.advisor_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_user_id UUID NOT NULL,
  advisor_user_id UUID NOT NULL,
  advisor_name TEXT,
  advisor_email TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'revoked'
  can_write BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE (landlord_user_id, advisor_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_mandates TO authenticated;
GRANT ALL ON public.advisor_mandates TO service_role;
ALTER TABLE public.advisor_mandates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlord manages own mandates" ON public.advisor_mandates
  FOR ALL TO authenticated
  USING (landlord_user_id = auth.uid())
  WITH CHECK (landlord_user_id = auth.uid());

CREATE POLICY "Advisor sees own mandates" ON public.advisor_mandates
  FOR SELECT TO authenticated
  USING (advisor_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_advisor_mandates_advisor ON public.advisor_mandates(advisor_user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_advisor_mandates_landlord ON public.advisor_mandates(landlord_user_id);

-- 3) advisor_invites: magic-link invites
CREATE TABLE IF NOT EXISTS public.advisor_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_user_id UUID NOT NULL,
  advisor_name TEXT NOT NULL,
  advisor_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64'),
  can_write BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_invites TO authenticated;
GRANT ALL ON public.advisor_invites TO service_role;
ALTER TABLE public.advisor_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlord manages own invites" ON public.advisor_invites
  FOR ALL TO authenticated
  USING (landlord_user_id = auth.uid())
  WITH CHECK (landlord_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_advisor_invites_token ON public.advisor_invites(token) WHERE accepted_at IS NULL;

-- 4) advisor_audit_log
CREATE TABLE IF NOT EXISTS public.advisor_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_user_id UUID NOT NULL,
  advisor_user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'view' | 'expense.insert' | 'payment.insert' | 'doc.upload' | ...
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.advisor_audit_log TO authenticated;
GRANT ALL ON public.advisor_audit_log TO service_role;
ALTER TABLE public.advisor_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlord views own audit" ON public.advisor_audit_log
  FOR SELECT TO authenticated
  USING (landlord_user_id = auth.uid());

CREATE POLICY "Advisor inserts own audit" ON public.advisor_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (advisor_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_advisor_audit_landlord ON public.advisor_audit_log(landlord_user_id, created_at DESC);

-- 5) Source columns on expenses, payments, tenant_documents
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'landlord',
  ADD COLUMN IF NOT EXISTS advisor_user_id UUID,
  ADD COLUMN IF NOT EXISTS advisor_note TEXT;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'landlord',
  ADD COLUMN IF NOT EXISTS advisor_user_id UUID,
  ADD COLUMN IF NOT EXISTS advisor_note TEXT;

ALTER TABLE public.tenant_documents
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'landlord',
  ADD COLUMN IF NOT EXISTS advisor_user_id UUID,
  ADD COLUMN IF NOT EXISTS advisor_note TEXT;

-- 6) Helper: is current user advisor with active mandate for landlord?
CREATE OR REPLACE FUNCTION public.is_advisor_for(_landlord UUID, _need_write BOOLEAN DEFAULT false)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.advisor_mandates
    WHERE landlord_user_id = _landlord
      AND advisor_user_id = auth.uid()
      AND status = 'active'
      AND (NOT _need_write OR can_write = true)
  );
$$;

-- 7) Extend RLS on expenses/payments/tenant_documents for advisor read+write
DO $$ BEGIN
  CREATE POLICY "Advisor reads landlord expenses" ON public.expenses
    FOR SELECT TO authenticated
    USING (public.is_advisor_for(user_id, false));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Advisor writes landlord expenses" ON public.expenses
    FOR INSERT TO authenticated
    WITH CHECK (public.is_advisor_for(user_id, true) AND source = 'advisor' AND advisor_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Advisor updates own expenses" ON public.expenses
    FOR UPDATE TO authenticated
    USING (public.is_advisor_for(user_id, true) AND advisor_user_id = auth.uid())
    WITH CHECK (public.is_advisor_for(user_id, true) AND advisor_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Advisor reads landlord payments" ON public.payments
    FOR SELECT TO authenticated
    USING (public.is_advisor_for(user_id, false));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Advisor writes landlord payments" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_advisor_for(user_id, true) AND source = 'advisor' AND advisor_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Advisor reads tenant docs" ON public.tenant_documents
    FOR SELECT TO authenticated
    USING (public.is_advisor_for(user_id, false));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Advisor uploads tenant docs" ON public.tenant_documents
    FOR INSERT TO authenticated
    WITH CHECK (public.is_advisor_for(user_id, true) AND source = 'advisor' AND advisor_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Also let advisor read properties/units/tenants of landlord (read-only)
DO $$ BEGIN
  CREATE POLICY "Advisor reads landlord properties" ON public.properties
    FOR SELECT TO authenticated
    USING (public.is_advisor_for(user_id, false));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Advisor reads landlord units" ON public.units
    FOR SELECT TO authenticated
    USING (public.is_advisor_for(user_id, false));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Advisor reads landlord tenants" ON public.tenants
    FOR SELECT TO authenticated
    USING (public.is_advisor_for(user_id, false));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8) RPC: accept invite
CREATE OR REPLACE FUNCTION public.advisor_accept_invite(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _inv RECORD;
  _mid UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT * INTO _inv FROM public.advisor_invites
   WHERE token = _token AND accepted_at IS NULL AND expires_at > now()
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid or expired invite'; END IF;

  -- create or reactivate mandate
  INSERT INTO public.advisor_mandates(landlord_user_id, advisor_user_id, advisor_name, advisor_email, can_write, status)
  VALUES (_inv.landlord_user_id, _uid, _inv.advisor_name, _inv.advisor_email, _inv.can_write, 'active')
  ON CONFLICT (landlord_user_id, advisor_user_id) DO UPDATE
    SET status = 'active', can_write = EXCLUDED.can_write, revoked_at = NULL,
        advisor_name = COALESCE(public.advisor_mandates.advisor_name, EXCLUDED.advisor_name)
  RETURNING id INTO _mid;

  UPDATE public.advisor_invites
     SET accepted_at = now(), accepted_by = _uid
   WHERE id = _inv.id;

  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'advisor')
    ON CONFLICT DO NOTHING;

  RETURN _mid;
END $$;

-- 9) RPC: list mandates for current advisor (with landlord display name)
CREATE OR REPLACE FUNCTION public.advisor_list_mandates()
RETURNS TABLE(
  mandate_id UUID,
  landlord_user_id UUID,
  landlord_name TEXT,
  can_write BOOLEAN,
  status TEXT,
  created_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  property_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id, m.landlord_user_id,
         COALESCE(p.display_name, 'Mandant'),
         m.can_write, m.status, m.created_at, m.last_accessed_at,
         (SELECT count(*) FROM public.properties pr WHERE pr.user_id = m.landlord_user_id)
    FROM public.advisor_mandates m
    LEFT JOIN public.profiles p ON p.user_id = m.landlord_user_id
   WHERE m.advisor_user_id = auth.uid() AND m.status = 'active'
   ORDER BY m.created_at DESC;
$$;

-- 10) RPC: mark mandate as accessed (logs view)
CREATE OR REPLACE FUNCTION public.advisor_touch_mandate(_landlord UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_advisor_for(_landlord, false) THEN RAISE EXCEPTION 'no mandate'; END IF;
  UPDATE public.advisor_mandates
     SET last_accessed_at = now()
   WHERE landlord_user_id = _landlord AND advisor_user_id = auth.uid();
  INSERT INTO public.advisor_audit_log(landlord_user_id, advisor_user_id, action)
  VALUES (_landlord, auth.uid(), 'view');
END $$;
