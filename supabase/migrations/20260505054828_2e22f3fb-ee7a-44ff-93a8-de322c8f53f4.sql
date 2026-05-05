ALTER TABLE public.units ADD COLUMN IF NOT EXISTS heating_share_pct numeric;

CREATE OR REPLACE FUNCTION public.check_user_quota(_user_id uuid, _resource text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tier text;
  _count int;
  _limit int;
BEGIN
  _tier := public.user_plan_tier(_user_id);

  IF _resource = 'property' THEN
    SELECT count(*) INTO _count FROM public.properties WHERE user_id = _user_id;
    _limit := CASE _tier WHEN 'pro' THEN 50 WHEN 'verwalten_plus' THEN 5 ELSE 1 END;
    IF _count >= _limit THEN
      RAISE EXCEPTION 'Maximal % Immobilie(n) erreicht. Upgrade auf einen höheren Plan für mehr.', _limit USING ERRCODE = 'check_violation';
    END IF;

  ELSIF _resource = 'listing_published' THEN
    SELECT count(*) INTO _count FROM public.listings WHERE user_id = _user_id AND status = 'published';
    _limit := CASE _tier WHEN 'pro' THEN 50 WHEN 'verwalten_plus' THEN 5 ELSE 1 END;
    IF _count >= _limit THEN
      RAISE EXCEPTION 'Maximal % aktive Inserate erreicht. Upgrade für mehr.', _limit USING ERRCODE = 'check_violation';
    END IF;

  ELSIF _resource = 'application_daily' THEN
    SELECT count(*) INTO _count FROM public.applications
      WHERE seeker_user_id = _user_id AND created_at > now() - interval '24 hours';
    _limit := CASE _tier WHEN 'pro' THEN 50 WHEN 'verwalten_plus' THEN 20 ELSE 3 END;
    IF _count >= _limit THEN
      RAISE EXCEPTION 'Tageslimit von % Bewerbungen erreicht. Morgen wieder neue Chancen!', _limit USING ERRCODE = 'check_violation';
    END IF;

  ELSIF _resource = 'ad_slot' THEN
    SELECT count(*) INTO _count FROM public.ad_slots
      WHERE advertiser_user_id = _user_id AND created_at > now() - interval '7 days';
    _limit := 10;
    IF _count >= _limit THEN
      RAISE EXCEPTION 'Maximal % Werbeplätze pro Woche.', _limit USING ERRCODE = 'check_violation';
    END IF;

  ELSIF _resource = 'nka_period' THEN
    SELECT count(*) INTO _count FROM public.nka_periods
      WHERE user_id = _user_id AND created_at > now() - interval '365 days';
    _limit := CASE _tier WHEN 'pro' THEN 50 WHEN 'verwalten_plus' THEN 5 ELSE 1 END;
    IF _count >= _limit THEN
      RAISE EXCEPTION 'Maximal % NK-Abrechnungen/Jahr im aktuellen Plan. Upgrade für mehr.', _limit USING ERRCODE = 'check_violation';
    END IF;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_quota_nka_period()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN PERFORM public.check_user_quota(NEW.user_id, 'nka_period'); RETURN NEW; END; $function$;

DROP TRIGGER IF EXISTS quota_nka_period ON public.nka_periods;
CREATE TRIGGER quota_nka_period BEFORE INSERT ON public.nka_periods
FOR EACH ROW EXECUTE FUNCTION public.tg_quota_nka_period();