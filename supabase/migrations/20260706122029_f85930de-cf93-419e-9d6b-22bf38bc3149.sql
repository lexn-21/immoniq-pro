
-- 1) tenant_pass erweitern
ALTER TABLE public.tenant_pass
  ADD COLUMN IF NOT EXISTS score integer,
  ADD COLUMN IF NOT EXISTS score_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS dsgvo_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS dsgvo_consent_version text,
  ADD COLUMN IF NOT EXISTS dsgvo_consent_withdrawn_at timestamptz;

-- 2) Consent-Log
CREATE TABLE IF NOT EXISTS public.tenant_pass_consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pass_id uuid NOT NULL REFERENCES public.tenant_pass(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('granted','withdrawn')),
  consent_version text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.tenant_pass_consent_log TO authenticated;
GRANT ALL ON public.tenant_pass_consent_log TO service_role;

ALTER TABLE public.tenant_pass_consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_consent_log_select" ON public.tenant_pass_consent_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_consent_log_insert" ON public.tenant_pass_consent_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3) Score-Berechnung (deterministisch, transparent, DSGVO Art. 22)
CREATE OR REPLACE FUNCTION public.compute_immoniq_score(_pass_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p RECORD;
  _score int := 300; -- baseline
  _bd jsonb := '{}'::jsonb;
  _income_pts int := 0;
  _schufa_pts int := 0;
  _msf_pts int := 0;
  _hist_pts int := 0;
  _rate_pts int := 0;
  _income_verified boolean;
  _schufa_score int;
  _msf_verified boolean;
  _hist_years int;
  _avg_rating numeric;
BEGIN
  SELECT * INTO _p FROM public.tenant_pass WHERE id = _pass_id;
  IF _p IS NULL THEN RAISE EXCEPTION 'pass not found'; END IF;
  IF _p.user_id <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _p.dsgvo_consent_at IS NULL OR _p.dsgvo_consent_withdrawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'DSGVO-Einwilligung fehlt (Art. 22 DSGVO)';
  END IF;

  -- Einkommen (max 250)
  _income_verified := COALESCE((_p.verified_income->>'verified')::boolean, false);
  IF _income_verified THEN
    _income_pts := LEAST(250, GREATEST(0, COALESCE((_p.verified_income->>'net_monthly')::int, 0) / 20));
  END IF;

  -- SCHUFA (max 200)
  _schufa_score := COALESCE((_p.verified_schufa->>'score')::int, 0);
  IF _schufa_score > 0 THEN
    _schufa_pts := LEAST(200, GREATEST(0, (_schufa_score - 500) / 2));
  END IF;

  -- Mietschuldenfreiheit (max 100)
  _msf_verified := COALESCE((_p.verified_mietschuldenfrei->>'verified')::boolean, false);
  IF _msf_verified THEN _msf_pts := 100; END IF;

  -- Mieterhistorie (max 100, 20 pro Jahr, gedeckelt)
  _hist_years := COALESCE(jsonb_array_length(_p.rental_history), 0) * 2;
  _hist_pts := LEAST(100, _hist_years * 10);

  -- Vermieter-Bewertungen (max 50)
  IF jsonb_array_length(COALESCE(_p.landlord_ratings, '[]'::jsonb)) > 0 THEN
    SELECT AVG((r->>'stars')::numeric) INTO _avg_rating
    FROM jsonb_array_elements(_p.landlord_ratings) r;
    _rate_pts := LEAST(50, GREATEST(0, (COALESCE(_avg_rating, 0)::int * 10)));
  END IF;

  _score := 300 + _income_pts + _schufa_pts + _msf_pts + _hist_pts + _rate_pts;
  _score := LEAST(1000, GREATEST(0, _score));

  _bd := jsonb_build_object(
    'baseline', 300,
    'income_pts', _income_pts,
    'schufa_pts', _schufa_pts,
    'mietschuldenfrei_pts', _msf_pts,
    'history_pts', _hist_pts,
    'ratings_pts', _rate_pts,
    'total', _score,
    'method', 'immoniq_v1_transparent',
    'computed_at', now()
  );

  UPDATE public.tenant_pass
    SET score = _score, score_breakdown = _bd, score_computed_at = now()
    WHERE id = _pass_id;

  RETURN _bd;
END $$;

REVOKE ALL ON FUNCTION public.compute_immoniq_score(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_immoniq_score(uuid) TO authenticated;

-- 4) Einwilligung erteilen
CREATE OR REPLACE FUNCTION public.grant_score_consent(_pass_id uuid, _ip text DEFAULT NULL, _ua text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _p RECORD; _version text := 'v1.2026-07';
BEGIN
  SELECT * INTO _p FROM public.tenant_pass WHERE id = _pass_id;
  IF _p IS NULL OR _p.user_id <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.tenant_pass
    SET dsgvo_consent_at = now(),
        dsgvo_consent_version = _version,
        dsgvo_consent_withdrawn_at = NULL
    WHERE id = _pass_id;
  INSERT INTO public.tenant_pass_consent_log(user_id, pass_id, action, consent_version, ip_address, user_agent)
  VALUES (auth.uid(), _pass_id, 'granted', _version, _ip, _ua);
END $$;

REVOKE ALL ON FUNCTION public.grant_score_consent(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_score_consent(uuid, text, text) TO authenticated;

-- 5) Widerruf
CREATE OR REPLACE FUNCTION public.withdraw_score_consent(_pass_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _p RECORD;
BEGIN
  SELECT * INTO _p FROM public.tenant_pass WHERE id = _pass_id;
  IF _p IS NULL OR _p.user_id <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.tenant_pass
    SET dsgvo_consent_withdrawn_at = now(),
        score = NULL,
        score_breakdown = NULL,
        score_computed_at = NULL
    WHERE id = _pass_id;
  INSERT INTO public.tenant_pass_consent_log(user_id, pass_id, action, consent_version, ip_address)
  VALUES (auth.uid(), _pass_id, 'withdrawn', COALESCE(_p.dsgvo_consent_version, 'v1'), NULL);
END $$;

REVOKE ALL ON FUNCTION public.withdraw_score_consent(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.withdraw_score_consent(uuid) TO authenticated;
