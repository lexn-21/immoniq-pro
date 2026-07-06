CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_name text NOT NULL,
  path text,
  source text,
  referrer text,
  user_agent text,
  session_id text,
  consent_analytics boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_events_type_created ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX idx_analytics_events_name_created ON public.analytics_events (event_name, created_at DESC);
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log an analytics event"
  ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);