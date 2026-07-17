
-- 1) Rolle 'verwalter' zum enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'verwalter';

-- 2) property_type + Erweiterungen
DO $$ BEGIN
  CREATE TYPE public.property_type AS ENUM ('wohnung','haus','gewerbe','grundstueck','ferienobjekt','weg');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_type public.property_type NOT NULL DEFAULT 'wohnung',
  ADD COLUMN IF NOT EXISTS mea_total numeric,       -- Summe MEA (WEG)
  ADD COLUMN IF NOT EXISTS verwalter_managed boolean NOT NULL DEFAULT false;

-- 3) unit nutzungsart
DO $$ BEGIN
  CREATE TYPE public.unit_usage AS ENUM ('langzeit','kurzzeit','gewerbe','eigennutz','leer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS nutzungsart public.unit_usage NOT NULL DEFAULT 'langzeit',
  ADD COLUMN IF NOT EXISTS mea numeric,             -- Miteigentumsanteile
  ADD COLUMN IF NOT EXISTS str_max_guests int,      -- short-term-rental
  ADD COLUMN IF NOT EXISTS str_min_nights int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS str_base_price_night numeric,
  ADD COLUMN IF NOT EXISTS str_cleaning_fee numeric,
  ADD COLUMN IF NOT EXISTS str_deposit numeric,
  ADD COLUMN IF NOT EXISTS str_checkin_from time,
  ADD COLUMN IF NOT EXISTS str_checkout_until time,
  ADD COLUMN IF NOT EXISTS str_house_rules text,
  ADD COLUMN IF NOT EXISTS str_active boolean NOT NULL DEFAULT false;

-- 4) Verwalter-Mandate (analog zu advisor_mandates)
CREATE TABLE IF NOT EXISTS public.verwalter_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,           -- Eigentümer
  verwalter_user_id uuid NOT NULL,       -- Hausverwalter-Account
  verwalter_name text,
  verwalter_email text,
  scope text NOT NULL DEFAULT 'full',    -- full | weg_only | str_only
  can_write boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active', -- active | revoked
  monthly_fee_cents int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  UNIQUE (owner_user_id, verwalter_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verwalter_mandates TO authenticated;
GRANT ALL ON public.verwalter_mandates TO service_role;
ALTER TABLE public.verwalter_mandates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages own mandates"
  ON public.verwalter_mandates FOR ALL TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "verwalter reads own mandates"
  ON public.verwalter_mandates FOR SELECT TO authenticated
  USING (auth.uid() = verwalter_user_id);

CREATE TRIGGER trg_verwalter_mandates_updated
  BEFORE UPDATE ON public.verwalter_mandates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: hat der aktuelle User ein aktives Verwalter-Mandat für _owner?
CREATE OR REPLACE FUNCTION public.is_verwalter_for(_owner uuid, _require_write boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verwalter_mandates
    WHERE owner_user_id = _owner
      AND verwalter_user_id = auth.uid()
      AND status = 'active'
      AND (NOT _require_write OR can_write = true)
  );
$$;

-- Verwalter dürfen properties/units des Mandanten lesen
CREATE POLICY "verwalter reads mandant properties"
  ON public.properties FOR SELECT TO authenticated
  USING (public.is_verwalter_for(user_id, false));

CREATE POLICY "verwalter writes mandant properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (public.is_verwalter_for(user_id, true))
  WITH CHECK (public.is_verwalter_for(user_id, true));

CREATE POLICY "verwalter reads mandant units"
  ON public.units FOR SELECT TO authenticated
  USING (public.is_verwalter_for(user_id, false));

CREATE POLICY "verwalter writes mandant units"
  ON public.units FOR UPDATE TO authenticated
  USING (public.is_verwalter_for(user_id, true))
  WITH CHECK (public.is_verwalter_for(user_id, true));

-- 5) Zentraler Belegungskalender
DO $$ BEGIN
  CREATE TYPE public.calendar_source AS ENUM (
    'longterm_lease','str_booking','ical_airbnb','ical_booking','ical_vrbo','ical_other',
    'owner_block','maintenance','cleaning'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.unit_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                 -- Eigentümer (für RLS)
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at   timestamptz NOT NULL,
  source public.calendar_source NOT NULL,
  external_uid text,                     -- iCal UID für Dedup
  external_feed_id uuid,                 -- FK auf ical_feeds (Stufe 4, nullable jetzt)
  booking_id uuid,                       -- FK auf bookings (Stufe 3)
  tenant_id uuid,                        -- bei longterm
  title text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_unit_calendar_unit_range
  ON public.unit_calendar (unit_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_unit_calendar_user
  ON public.unit_calendar (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_unit_calendar_ext
  ON public.unit_calendar (unit_id, source, external_uid)
  WHERE external_uid IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_calendar TO authenticated;
GRANT ALL ON public.unit_calendar TO service_role;
ALTER TABLE public.unit_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages calendar"
  ON public.unit_calendar FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verwalter reads mandant calendar"
  ON public.unit_calendar FOR SELECT TO authenticated
  USING (public.is_verwalter_for(user_id, false));

CREATE POLICY "verwalter writes mandant calendar"
  ON public.unit_calendar FOR ALL TO authenticated
  USING (public.is_verwalter_for(user_id, true))
  WITH CHECK (public.is_verwalter_for(user_id, true));

CREATE TRIGGER trg_unit_calendar_updated
  BEFORE UPDATE ON public.unit_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helfer: Verfügbarkeitscheck (überlappt irgendein Eintrag?)
CREATE OR REPLACE FUNCTION public.unit_is_available(_unit uuid, _from timestamptz, _to timestamptz)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.unit_calendar
    WHERE unit_id = _unit
      AND starts_at < _to
      AND ends_at   > _from
  );
$$;
