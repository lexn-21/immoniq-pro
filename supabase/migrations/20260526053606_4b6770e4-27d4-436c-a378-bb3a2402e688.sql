
-- 1) AVM with ZIP-prefix fallback so neighboring PLZs ohne exakten Eintrag trotzdem Werte liefern
CREATE OR REPLACE FUNCTION public.avm_estimate(_zip text, _living_space numeric, _annual_rent numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row market_index%ROWTYPE;
  v_sqm numeric;
  v_inc numeric;
  v_blend numeric;
  match_kind text := 'exact';
BEGIN
  -- exact
  SELECT * INTO row FROM market_index WHERE zip = _zip LIMIT 1;
  IF NOT FOUND THEN
    -- 3-digit prefix avg
    SELECT NULL::uuid, _zip, NULL::text,
      avg(avg_purchase_sqm)::numeric,
      avg(avg_rent_sqm)::numeric,
      avg(yield_factor)::numeric,
      avg(avg_utilities_sqm)::numeric,
      avg(vacancy_rate)::numeric,
      0, now()
    INTO row
    FROM market_index WHERE substr(zip,1,3) = substr(_zip,1,3);
    match_kind := 'prefix3';
    IF row.avg_purchase_sqm IS NULL THEN
      -- 2-digit prefix avg
      SELECT NULL::uuid, _zip, NULL::text,
        avg(avg_purchase_sqm)::numeric,
        avg(avg_rent_sqm)::numeric,
        avg(yield_factor)::numeric,
        avg(avg_utilities_sqm)::numeric,
        avg(vacancy_rate)::numeric,
        0, now()
      INTO row
      FROM market_index WHERE substr(zip,1,2) = substr(_zip,1,2);
      match_kind := 'prefix2';
    END IF;
    IF row.avg_purchase_sqm IS NULL THEN
      -- national avg
      SELECT NULL::uuid, _zip, NULL::text,
        avg(avg_purchase_sqm)::numeric,
        avg(avg_rent_sqm)::numeric,
        avg(yield_factor)::numeric,
        avg(avg_utilities_sqm)::numeric,
        avg(vacancy_rate)::numeric,
        0, now()
      INTO row FROM market_index;
      match_kind := 'national';
    END IF;
  END IF;

  v_sqm := COALESCE(row.avg_purchase_sqm,0) * COALESCE(_living_space,0);
  v_inc := COALESCE(_annual_rent,0) * COALESCE(row.yield_factor,0);
  v_blend := (v_sqm * 0.4) + (v_inc * 0.6);

  RETURN jsonb_build_object(
    'zip', _zip,
    'match', match_kind,
    'avg_purchase_sqm', row.avg_purchase_sqm,
    'avg_rent_sqm', row.avg_rent_sqm,
    'yield_factor', row.yield_factor,
    'value_sqm_method', v_sqm,
    'value_income_method', v_inc,
    'value_blended', v_blend
  );
END
$$;

-- 2) In-App-Vorlagen pro User
CREATE TABLE IF NOT EXISTS public.user_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text,
  body_md text NOT NULL DEFAULT '',
  source_template_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_templates all" ON public.user_templates FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_templates_user ON public.user_templates(user_id);

CREATE OR REPLACE FUNCTION public.touch_user_templates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS user_templates_touch ON public.user_templates;
CREATE TRIGGER user_templates_touch BEFORE UPDATE ON public.user_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_templates();
