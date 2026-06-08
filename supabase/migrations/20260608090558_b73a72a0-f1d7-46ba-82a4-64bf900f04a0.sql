
CREATE OR REPLACE FUNCTION public.missing_rents(_grace_day int DEFAULT 5)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  unit_id uuid,
  property_id uuid,
  property_name text,
  expected_amount numeric,
  due_day int,
  days_overdue int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  active_tenants AS (
    SELECT t.id, t.full_name, t.unit_id, t.property_id,
           u.rent_cold, u.utilities,
           p.name AS prop_name
    FROM public.tenants t
    JOIN public.units u ON u.id = t.unit_id
    LEFT JOIN public.properties p ON p.id = t.property_id
    WHERE t.user_id = (SELECT uid FROM me)
      AND (t.lease_end IS NULL OR t.lease_end > current_date)
  ),
  paid_this_month AS (
    SELECT tenant_id
    FROM public.payments
    WHERE user_id = (SELECT uid FROM me)
      AND type = 'rent'
      AND paid_on >= date_trunc('month', current_date)
      AND paid_on < date_trunc('month', current_date) + interval '1 month'
  )
  SELECT
    at.id, at.full_name, at.unit_id, at.property_id, at.prop_name,
    (COALESCE(at.rent_cold,0) + COALESCE(at.utilities,0))::numeric,
    _grace_day,
    GREATEST(0, EXTRACT(day FROM current_date)::int - _grace_day)
  FROM active_tenants at
  WHERE at.id NOT IN (SELECT tenant_id FROM paid_this_month)
    AND EXTRACT(day FROM current_date)::int >= _grace_day
  ORDER BY 8 DESC, at.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.missing_rents(int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.missing_rents(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.recurring_transactions(_months int DEFAULT 6)
RETURNS TABLE (
  counterparty text,
  avg_amount_cents bigint,
  occurrences int,
  last_seen date,
  direction text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  base AS (
    SELECT
      lower(coalesce(counterparty_name, 'unbekannt')) AS cp,
      ((amount_cents / 500) * 500)::bigint AS bucket,
      booking_date,
      amount_cents,
      CASE WHEN amount_cents > 0 THEN 'in' ELSE 'out' END AS dir
    FROM public.bank_transactions
    WHERE user_id = (SELECT uid FROM me)
      AND booking_date > current_date - (_months || ' months')::interval
      AND counterparty_name IS NOT NULL
  )
  SELECT
    initcap(cp),
    avg(amount_cents)::bigint,
    count(DISTINCT date_trunc('month', booking_date))::int,
    max(booking_date),
    dir
  FROM base
  GROUP BY cp, bucket, dir
  HAVING count(DISTINCT date_trunc('month', booking_date)) >= 2
  ORDER BY 3 DESC, 4 DESC
  LIMIT 25;
$$;

REVOKE EXECUTE ON FUNCTION public.recurring_transactions(int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.recurring_transactions(int) TO authenticated;
