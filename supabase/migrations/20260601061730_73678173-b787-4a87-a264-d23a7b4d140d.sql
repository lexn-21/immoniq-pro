CREATE OR REPLACE FUNCTION public.avm_estimate(_zip text, _living_space numeric, _annual_rent numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase numeric;
  v_rent     numeric;
  v_yield    numeric;
  v_util     numeric;
  v_vacancy  numeric;
  v_sqm      numeric;
  v_inc      numeric;
  v_blend    numeric;
  v_match    text := 'exact';
BEGIN
  -- exact
  SELECT avg_purchase_sqm, avg_rent_sqm, yield_factor, avg_utilities_sqm, vacancy_rate
    INTO v_purchase, v_rent, v_yield, v_util, v_vacancy
  FROM market_index WHERE zip = _zip LIMIT 1;

  IF v_purchase IS NULL THEN
    -- 3-digit prefix
    SELECT avg(avg_purchase_sqm), avg(avg_rent_sqm), avg(yield_factor), avg(avg_utilities_sqm), avg(vacancy_rate)
      INTO v_purchase, v_rent, v_yield, v_util, v_vacancy
    FROM market_index WHERE substr(zip,1,3) = substr(_zip,1,3);
    v_match := 'prefix3';
  END IF;

  IF v_purchase IS NULL THEN
    -- 2-digit prefix
    SELECT avg(avg_purchase_sqm), avg(avg_rent_sqm), avg(yield_factor), avg(avg_utilities_sqm), avg(vacancy_rate)
      INTO v_purchase, v_rent, v_yield, v_util, v_vacancy
    FROM market_index WHERE substr(zip,1,2) = substr(_zip,1,2);
    v_match := 'prefix2';
  END IF;

  IF v_purchase IS NULL THEN
    -- national avg
    SELECT avg(avg_purchase_sqm), avg(avg_rent_sqm), avg(yield_factor), avg(avg_utilities_sqm), avg(vacancy_rate)
      INTO v_purchase, v_rent, v_yield, v_util, v_vacancy
    FROM market_index;
    v_match := 'national';
  END IF;

  v_sqm   := COALESCE(v_purchase, 0) * COALESCE(_living_space, 0);
  v_inc   := COALESCE(_annual_rent, 0) * COALESCE(v_yield, 0);
  v_blend := (v_sqm * 0.4) + (v_inc * 0.6);

  RETURN jsonb_build_object(
    'zip', _zip,
    'match', v_match,
    'avg_purchase_sqm', v_purchase,
    'avg_rent_sqm', v_rent,
    'yield_factor', v_yield,
    'avg_utilities_sqm', v_util,
    'vacancy_rate', v_vacancy,
    'value_sqm_method', v_sqm,
    'value_income_method', v_inc,
    'value_blended', v_blend
  );
END
$$;