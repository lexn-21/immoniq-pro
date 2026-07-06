CREATE TABLE public.download_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  slug text NOT NULL,
  source text,
  referrer text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_download_events_slug_created ON public.download_events (slug, created_at DESC);
GRANT INSERT ON public.download_events TO anon, authenticated;
GRANT ALL ON public.download_events TO service_role;
ALTER TABLE public.download_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a download" ON public.download_events FOR INSERT TO anon, authenticated WITH CHECK (true);