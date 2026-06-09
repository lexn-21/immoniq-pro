
CREATE TABLE IF NOT EXISTS public.tenant_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'other',
  path text NOT NULL,
  size_bytes bigint,
  mime text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_vault_user ON public.tenant_vault(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_vault TO authenticated;
GRANT ALL ON public.tenant_vault TO service_role;

ALTER TABLE public.tenant_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vault owner all" ON public.tenant_vault;
CREATE POLICY "vault owner all" ON public.tenant_vault
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage policies for tenant-vault bucket
DROP POLICY IF EXISTS "tenant vault read own" ON storage.objects;
CREATE POLICY "tenant vault read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tenant-vault' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "tenant vault write own" ON storage.objects;
CREATE POLICY "tenant vault write own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-vault' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "tenant vault update own" ON storage.objects;
CREATE POLICY "tenant vault update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-vault' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "tenant vault delete own" ON storage.objects;
CREATE POLICY "tenant vault delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-vault' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RPC: tenant connects to landlord by email (no token, no invitation)
CREATE OR REPLACE FUNCTION public.tenant_connect_by_landlord_email(_email text, _my_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _landlord uuid;
  _tid uuid;
  _name text := coalesce(nullif(trim(_my_name), ''), 'Mieter');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF coalesce(trim(_email), '') = '' THEN RAISE EXCEPTION 'email required'; END IF;

  SELECT id INTO _landlord FROM auth.users
   WHERE lower(email) = lower(trim(_email)) LIMIT 1;

  IF _landlord IS NULL THEN
    RAISE EXCEPTION 'Vermieter mit dieser E-Mail wurde nicht gefunden. Bitte prüfen oder Vermieter zur Registrierung einladen.';
  END IF;
  IF _landlord = _uid THEN
    RAISE EXCEPTION 'Du kannst dich nicht mit dir selbst verbinden.';
  END IF;

  SELECT id INTO _tid FROM public.tenants
   WHERE claimed_by_user_id = _uid AND user_id = _landlord AND archived_at IS NULL
   LIMIT 1;
  IF _tid IS NOT NULL THEN RETURN _tid; END IF;

  INSERT INTO public.tenants(user_id, full_name, claimed_by_user_id, claimed_at)
  VALUES (_landlord, _name, _uid, now())
  RETURNING id INTO _tid;

  INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'tenant')
    ON CONFLICT DO NOTHING;

  RETURN _tid;
END $$;

GRANT EXECUTE ON FUNCTION public.tenant_connect_by_landlord_email(text, text) TO authenticated;
