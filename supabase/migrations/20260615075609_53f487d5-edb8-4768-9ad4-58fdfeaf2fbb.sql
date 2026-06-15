
-- 1. Extend properties with key building info
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS build_year int,
  ADD COLUMN IF NOT EXISTS last_renovation_year int,
  ADD COLUMN IF NOT EXISTS energy_class text,
  ADD COLUMN IF NOT EXISTS energy_consumption_kwh numeric,
  ADD COLUMN IF NOT EXISTS heating_type text,
  ADD COLUMN IF NOT EXISTS listed_building boolean DEFAULT false;

-- 2. Component kind enum
DO $$ BEGIN
  CREATE TYPE public.component_kind AS ENUM (
    'roof','facade','windows','doors','heating','boiler','solar_pv','solar_thermal',
    'electrical','plumbing','insulation','smoke_detector','elevator','garage_door',
    'gate','intercom','ventilation','chimney','oil_tank','water_tank','sewage',
    'kitchen','bathroom','flooring','paint','garden','fence','driveway','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. property_components table
CREATE TABLE IF NOT EXISTS public.property_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  kind public.component_kind NOT NULL,
  label text,
  installed_on date,
  last_maintenance_on date,
  next_check_on date,
  expected_lifespan_years int,
  warranty_until date,
  manufacturer text,
  model text,
  serial_number text,
  cost_cents bigint,
  supplier text,
  notes text,
  document_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pc_property ON public.property_components(property_id);
CREATE INDEX IF NOT EXISTS idx_pc_user ON public.property_components(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_components TO authenticated;
GRANT ALL ON public.property_components TO service_role;

ALTER TABLE public.property_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages components"
  ON public.property_components FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Advisor reads components"
  ON public.property_components FOR SELECT
  USING (public.is_advisor_for(user_id, false));

CREATE TRIGGER trg_pc_updated_at
  BEFORE UPDATE ON public.property_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Default lifespan helper (German DIN/norm averages)
CREATE OR REPLACE FUNCTION public.default_component_lifespan(_kind public.component_kind)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _kind
    WHEN 'roof' THEN 40
    WHEN 'facade' THEN 40
    WHEN 'windows' THEN 30
    WHEN 'doors' THEN 30
    WHEN 'heating' THEN 20
    WHEN 'boiler' THEN 15
    WHEN 'solar_pv' THEN 25
    WHEN 'solar_thermal' THEN 20
    WHEN 'electrical' THEN 40
    WHEN 'plumbing' THEN 40
    WHEN 'insulation' THEN 40
    WHEN 'smoke_detector' THEN 10
    WHEN 'elevator' THEN 25
    WHEN 'garage_door' THEN 20
    WHEN 'gate' THEN 25
    WHEN 'intercom' THEN 15
    WHEN 'ventilation' THEN 20
    WHEN 'chimney' THEN 30
    WHEN 'oil_tank' THEN 30
    WHEN 'water_tank' THEN 20
    WHEN 'sewage' THEN 40
    WHEN 'kitchen' THEN 20
    WHEN 'bathroom' THEN 25
    WHEN 'flooring' THEN 20
    WHEN 'paint' THEN 8
    WHEN 'garden' THEN 5
    WHEN 'fence' THEN 20
    WHEN 'driveway' THEN 25
    ELSE 15
  END;
$$;

-- 5. Auto-fill lifespan + create reminder task
CREATE OR REPLACE FUNCTION public.tg_component_autofill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _eol date;
  _label text;
  _legal_ref text;
  _legal_url text;
BEGIN
  IF NEW.expected_lifespan_years IS NULL THEN
    NEW.expected_lifespan_years := public.default_component_lifespan(NEW.kind);
  END IF;

  _label := COALESCE(NEW.label, NEW.kind::text);

  -- legal hints
  _legal_ref := CASE NEW.kind
    WHEN 'smoke_detector' THEN 'DIN 14676'
    WHEN 'heating' THEN '§ 72 GEG (Heizungstausch)'
    WHEN 'oil_tank' THEN 'AwSV §46 (Tankprüfung)'
    WHEN 'chimney' THEN 'KÜO (Kehr- und Überprüfungsordnung)'
    WHEN 'elevator' THEN 'BetrSichV §16'
    ELSE NULL
  END;
  _legal_url := CASE NEW.kind
    WHEN 'heating' THEN 'https://www.gesetze-im-internet.de/geg/__72.html'
    WHEN 'oil_tank' THEN 'https://www.gesetze-im-internet.de/awsv/'
    WHEN 'elevator' THEN 'https://www.gesetze-im-internet.de/betrsichv_2015/'
    ELSE NULL
  END;

  -- End-of-life reminder
  IF NEW.installed_on IS NOT NULL AND NEW.expected_lifespan_years IS NOT NULL THEN
    _eol := NEW.installed_on + (NEW.expected_lifespan_years || ' years')::interval;
    INSERT INTO public.tasks(user_id, property_id, title, description, category, due_date, legal_ref, legal_url)
    VALUES (
      NEW.user_id, NEW.property_id,
      _label || ' – Lebensdauer prüfen',
      'Bauteil "' || _label || '" erreicht die typische Lebensdauer von ' || NEW.expected_lifespan_years
        || ' Jahren. Zustand prüfen und ggf. Austausch planen.',
      'Instandhaltung',
      _eol::date,
      _legal_ref, _legal_url
    );
  END IF;

  -- Next check reminder
  IF NEW.next_check_on IS NOT NULL THEN
    INSERT INTO public.tasks(user_id, property_id, title, description, category, due_date, legal_ref, legal_url)
    VALUES (
      NEW.user_id, NEW.property_id,
      _label || ' – Wartung/Prüfung fällig',
      'Geplante Wartung oder Prüfung für "' || _label || '".',
      'Wartung',
      NEW.next_check_on,
      _legal_ref, _legal_url
    );
  END IF;

  -- Warranty expiry reminder
  IF NEW.warranty_until IS NOT NULL THEN
    INSERT INTO public.tasks(user_id, property_id, title, description, category, due_date)
    VALUES (
      NEW.user_id, NEW.property_id,
      _label || ' – Garantie läuft ab',
      'Garantie für "' || _label || '" endet. Vor Ablauf prüfen, ob Mängel bestehen.',
      'Recht',
      NEW.warranty_until - INTERVAL '30 days'
    );
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pc_autofill ON public.property_components;
CREATE TRIGGER trg_pc_autofill
  BEFORE INSERT ON public.property_components
  FOR EACH ROW EXECUTE FUNCTION public.tg_component_autofill();
