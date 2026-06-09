
-- 1) Rollen
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('landlord','tenant','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own roles read" ON public.user_roles;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
  ORDER BY (role='admin') DESC, (role='landlord') DESC, (role='tenant') DESC LIMIT 1
$$;

-- 2) Mieter-Claim
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS claimed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_tenants_claimed_by ON public.tenants(claimed_by_user_id);

-- 3) RLS: angemeldeter Mieter sieht eigene Daten
DROP POLICY IF EXISTS "tenant reads own row" ON public.tenants;
CREATE POLICY "tenant reads own row" ON public.tenants FOR SELECT TO authenticated
  USING (claimed_by_user_id = auth.uid());

DROP POLICY IF EXISTS "tenant reads own messages" ON public.tenant_messages;
CREATE POLICY "tenant reads own messages" ON public.tenant_messages FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = tenant_messages.tenant_id AND t.claimed_by_user_id = auth.uid()));

DROP POLICY IF EXISTS "tenant inserts own messages" ON public.tenant_messages;
CREATE POLICY "tenant inserts own messages" ON public.tenant_messages FOR INSERT TO authenticated
  WITH CHECK (
    direction = 'in' AND channel = 'portal'
    AND EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = tenant_messages.tenant_id AND t.claimed_by_user_id = auth.uid() AND t.user_id = tenant_messages.user_id)
  );

DROP POLICY IF EXISTS "tenant marks own read" ON public.tenant_messages;
CREATE POLICY "tenant marks own read" ON public.tenant_messages FOR UPDATE TO authenticated
  USING (
    direction = 'out'
    AND EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = tenant_messages.tenant_id AND t.claimed_by_user_id = auth.uid())
  )
  WITH CHECK (
    direction = 'out'
    AND EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = tenant_messages.tenant_id AND t.claimed_by_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant reads own documents" ON public.tenant_documents;
CREATE POLICY "tenant reads own documents" ON public.tenant_documents FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = tenant_documents.tenant_id AND t.claimed_by_user_id = auth.uid()));

DROP POLICY IF EXISTS "tenant uploads own documents" ON public.tenant_documents;
CREATE POLICY "tenant uploads own documents" ON public.tenant_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = tenant_documents.tenant_id AND t.claimed_by_user_id = auth.uid() AND t.user_id = tenant_documents.user_id)
  );

DROP POLICY IF EXISTS "tenant reads own issues" ON public.tenant_issues;
CREATE POLICY "tenant reads own issues" ON public.tenant_issues FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = tenant_issues.tenant_id AND t.claimed_by_user_id = auth.uid()));

DROP POLICY IF EXISTS "tenant creates own issues" ON public.tenant_issues;
CREATE POLICY "tenant creates own issues" ON public.tenant_issues FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = tenant_issues.tenant_id AND t.claimed_by_user_id = auth.uid() AND t.user_id = tenant_issues.user_id));

DROP POLICY IF EXISTS "tenant reads own units" ON public.units;
CREATE POLICY "tenant reads own units" ON public.units FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenants t WHERE t.unit_id = units.id AND t.claimed_by_user_id = auth.uid()));

DROP POLICY IF EXISTS "tenant reads own property" ON public.properties;
CREATE POLICY "tenant reads own property" ON public.properties FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenants t WHERE t.property_id = properties.id AND t.claimed_by_user_id = auth.uid()));

DROP POLICY IF EXISTS "tenant reads own nka distributions" ON public.nka_distributions;
CREATE POLICY "tenant reads own nka distributions" ON public.nka_distributions FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = nka_distributions.tenant_id AND t.claimed_by_user_id = auth.uid()) AND sent_at IS NOT NULL);

DROP POLICY IF EXISTS "tenant reads own payments" ON public.payments;
CREATE POLICY "tenant reads own payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenants t WHERE t.id = payments.tenant_id AND t.claimed_by_user_id = auth.uid()));

-- 4) Claim RPC
CREATE OR REPLACE FUNCTION public.tenant_claim(_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _link RECORD; _uid uuid; _existing uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT * INTO _link FROM public.tenant_portal_links
   WHERE token = _token AND revoked = false AND expires_at > now() LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid token'; END IF;

  SELECT claimed_by_user_id INTO _existing FROM public.tenants WHERE id = _link.tenant_id;
  IF _existing IS NOT NULL AND _existing <> _uid THEN
    RAISE EXCEPTION 'already claimed';
  END IF;

  UPDATE public.tenants
     SET claimed_by_user_id = _uid, claimed_at = COALESCE(claimed_at, now())
   WHERE id = _link.tenant_id;

  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'tenant')
    ON CONFLICT DO NOTHING;

  RETURN _link.tenant_id;
END $$;
GRANT EXECUTE ON FUNCTION public.tenant_claim(text) TO authenticated;

-- 5) Vermieter-Rolle automatisch zuweisen wenn jemand eine Property anlegt
CREATE OR REPLACE FUNCTION public.assign_landlord_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.user_id, 'landlord')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tg_assign_landlord ON public.properties;
CREATE TRIGGER tg_assign_landlord AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.assign_landlord_role();

-- Backfill: existierende Vermieter
INSERT INTO public.user_roles(user_id, role)
SELECT DISTINCT user_id, 'landlord'::public.app_role FROM public.properties
ON CONFLICT DO NOTHING;

-- 6) Storage: documents bucket — Mieter darf in tenants/<tenant_id>/... lesen+schreiben
DROP POLICY IF EXISTS "tenant read own files" ON storage.objects;
CREATE POLICY "tenant read own files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'tenants'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[2]
        AND t.claimed_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant upload own files" ON storage.objects;
CREATE POLICY "tenant upload own files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'tenants'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[2]
        AND t.claimed_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant delete own files" ON storage.objects;
CREATE POLICY "tenant delete own files" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'tenants'
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id::text = (storage.foldername(name))[2]
        AND t.claimed_by_user_id = auth.uid()
    )
  );
