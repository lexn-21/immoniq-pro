
-- Legal sources to monitor + detected updates
CREATE TABLE public.legal_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph text NOT NULL,
  title text NOT NULL,
  url text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'gesetz',
  active boolean NOT NULL DEFAULT true,
  last_hash text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.legal_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.legal_sources(id) ON DELETE CASCADE,
  detected_at timestamptz NOT NULL DEFAULT now(),
  summary text NOT NULL,
  impact text,
  prev_hash text,
  new_hash text NOT NULL
);

ALTER TABLE public.legal_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_sources public read" ON public.legal_sources FOR SELECT USING (active = true);
CREATE POLICY "legal_updates public read" ON public.legal_updates FOR SELECT USING (true);

CREATE POLICY "legal_sources service all" ON public.legal_sources FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "legal_updates service all" ON public.legal_updates FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_legal_updates_detected ON public.legal_updates(detected_at DESC);

-- Seed core sources for private landlords
INSERT INTO public.legal_sources (paragraph, title, url, category) VALUES
  ('§ 556 BGB',     'Vereinbarungen über Betriebskosten', 'https://www.gesetze-im-internet.de/bgb/__556.html', 'gesetz'),
  ('§ 558 BGB',     'Mieterhöhung bis zur Vergleichsmiete', 'https://www.gesetze-im-internet.de/bgb/__558.html', 'gesetz'),
  ('§ 21 EStG',     'Einkünfte aus Vermietung und Verpachtung', 'https://www.gesetze-im-internet.de/estg/__21.html', 'gesetz'),
  ('§ 7 EStG',      'Absetzung für Abnutzung (AfA)', 'https://www.gesetze-im-internet.de/estg/__7.html', 'gesetz'),
  ('BetrKV',        'Betriebskostenverordnung', 'https://www.gesetze-im-internet.de/betrkv/', 'gesetz'),
  ('HeizkostenV',   'Heizkostenverordnung', 'https://www.gesetze-im-internet.de/heizkostenv/', 'gesetz'),
  ('GEG',           'Gebäudeenergiegesetz', 'https://www.gesetze-im-internet.de/geg/', 'gesetz'),
  ('§ 573 BGB',     'Ordentliche Kündigung des Vermieters', 'https://www.gesetze-im-internet.de/bgb/__573.html', 'gesetz');

-- Enable scheduling extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
