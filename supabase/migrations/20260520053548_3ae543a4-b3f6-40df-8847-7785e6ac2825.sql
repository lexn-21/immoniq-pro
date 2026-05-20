-- =========================================================
-- 1) Grundstücke / Flurstücke
-- =========================================================
CREATE TYPE public.parcel_type AS ENUM ('bauland','bauerwartung','acker','wald','wiese','garten','gewerbe','sonstige');
CREATE TYPE public.lease_type AS ENUM ('eigentum','erbpacht_geber','erbpacht_nehmer','pacht','miete','sonstige');

CREATE TABLE public.land_parcels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  org_unit_id UUID NULL,
  name TEXT NOT NULL,
  gemarkung TEXT,
  flur TEXT,
  flurstueck TEXT,
  zip TEXT,
  city TEXT,
  area_sqm NUMERIC,
  bodenrichtwert_eur_sqm NUMERIC,
  parcel_type parcel_type NOT NULL DEFAULT 'sonstige',
  lease_type lease_type NOT NULL DEFAULT 'eigentum',
  lease_holder TEXT,
  lease_annual_eur NUMERIC,
  lease_end_date DATE,
  lat NUMERIC,
  lng NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.land_parcels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own land_parcels all" ON public.land_parcels
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_land_parcels_user ON public.land_parcels(user_id);
CREATE TRIGGER trg_land_parcels_updated_at
  BEFORE UPDATE ON public.land_parcels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) Org-Hierarchie (Kirche / Stiftung / Verwaltung)
-- =========================================================
CREATE TYPE public.org_level AS ENUM ('bistum','landeskirche','dekanat','gemeinde','stiftung','verwaltung','sonstige');

CREATE TABLE public.org_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parent_id UUID NULL REFERENCES public.org_units(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  level org_level NOT NULL DEFAULT 'sonstige',
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own org_units all" ON public.org_units
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_org_units_user ON public.org_units(user_id);
CREATE INDEX idx_org_units_parent ON public.org_units(parent_id);
CREATE TRIGGER trg_org_units_updated_at
  BEFORE UPDATE ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Properties: optional an Org-Einheit hängen + Erbpacht + Denkmal
ALTER TABLE public.properties
  ADD COLUMN org_unit_id UUID NULL,
  ADD COLUMN erbpacht_zins_jaehrlich NUMERIC NULL,
  ADD COLUMN erbpacht_ende DATE NULL,
  ADD COLUMN denkmalschutz BOOLEAN NOT NULL DEFAULT false;

-- =========================================================
-- 3) ImmonIQ-Pass (persistentes Mieter-Profil)
-- =========================================================
CREATE TABLE public.tenant_pass (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  pass_code TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(9), 'hex'),
  display_name TEXT,
  headline TEXT,
  verified_income JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_schufa JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_mietschuldenfrei JSONB NOT NULL DEFAULT '{}'::jsonb,
  rental_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  landlord_ratings JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_pass ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_pass own all" ON public.tenant_pass
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_pass public read shared" ON public.tenant_pass
  FOR SELECT USING (is_public = true);

CREATE TRIGGER trg_tenant_pass_updated_at
  BEFORE UPDATE ON public.tenant_pass
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();