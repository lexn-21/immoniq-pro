
-- Erweitere units
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS persons_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS heating_share_pct numeric;

-- Erweitere expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS nka_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nka_distribution_key text,
  ADD COLUMN IF NOT EXISTS nka_period_id uuid;

-- Stammtabelle Kostenarten (BetrKV § 2)
CREATE TABLE IF NOT EXISTS public.nka_cost_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  default_distribution_key text NOT NULL DEFAULT 'qm',
  betrkv_ref text,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.nka_cost_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nka_cost_categories public read"
  ON public.nka_cost_categories FOR SELECT USING (true);

INSERT INTO public.nka_cost_categories(code,label,default_distribution_key,betrkv_ref,sort_order) VALUES
('grundsteuer','Grundsteuer','qm','§2 Nr.1 BetrKV',1),
('wasser','Wasserversorgung','verbrauch_manual','§2 Nr.2 BetrKV',2),
('entwaesserung','Entwässerung','verbrauch_manual','§2 Nr.3 BetrKV',3),
('heizung','Heizung','verbrauch_manual','§2 Nr.4 BetrKV / HeizkostenV',4),
('warmwasser','Warmwasser','verbrauch_manual','§2 Nr.5 BetrKV',5),
('aufzug','Aufzug','qm','§2 Nr.7 BetrKV',6),
('strassenreinigung','Straßenreinigung','qm','§2 Nr.8 BetrKV',7),
('muellabfuhr','Müllbeseitigung','personen','§2 Nr.8 BetrKV',8),
('hausreinigung','Hausreinigung','qm','§2 Nr.9 BetrKV',9),
('gartenpflege','Gartenpflege','qm','§2 Nr.10 BetrKV',10),
('beleuchtung','Beleuchtung','qm','§2 Nr.11 BetrKV',11),
('schornsteinreinigung','Schornsteinreinigung','qm','§2 Nr.12 BetrKV',12),
('versicherung','Sach- und Haftpflichtversicherung','qm','§2 Nr.13 BetrKV',13),
('hausmeister','Hausmeister','qm','§2 Nr.14 BetrKV',14),
('antenne','Gemeinschafts-Antenne / Kabel','einheiten','§2 Nr.15 BetrKV',15),
('waschraum','Waschraum / Waschmaschine','verbrauch_manual','§2 Nr.16 BetrKV',16),
('sonstige','Sonstige Betriebskosten','qm','§2 Nr.17 BetrKV',17)
ON CONFLICT (code) DO NOTHING;

-- NKA Perioden
CREATE TABLE IF NOT EXISTS public.nka_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL,
  year integer NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, year)
);
ALTER TABLE public.nka_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nka_periods own all" ON public.nka_periods
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nka_periods_updated
  BEFORE UPDATE ON public.nka_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NKA Kostenpositionen
CREATE TABLE IF NOT EXISTS public.nka_cost_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.nka_periods(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category_code text NOT NULL,
  label text,
  amount numeric NOT NULL DEFAULT 0,
  distribution_key text NOT NULL DEFAULT 'qm',
  umlagefaehig boolean NOT NULL DEFAULT true,
  source_expense_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nka_cost_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nka_cost_items own all" ON public.nka_cost_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nka_cost_items_updated
  BEFORE UPDATE ON public.nka_cost_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_nka_cost_items_period ON public.nka_cost_items(period_id);

-- NKA Verteilungen pro Mieter
CREATE TABLE IF NOT EXISTS public.nka_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.nka_periods(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  vorauszahlung_summe numeric NOT NULL DEFAULT 0,
  ist_summe numeric NOT NULL DEFAULT 0,
  saldo numeric NOT NULL DEFAULT 0,
  pdf_path text,
  sent_at timestamptz,
  payment_id uuid,
  breakdown jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, tenant_id)
);
ALTER TABLE public.nka_distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nka_distributions own all" ON public.nka_distributions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nka_distributions_updated
  BEFORE UPDATE ON public.nka_distributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_nka_distributions_period ON public.nka_distributions(period_id);
