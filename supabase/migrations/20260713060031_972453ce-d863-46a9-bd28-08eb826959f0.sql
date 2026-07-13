
DROP POLICY IF EXISTS "Anyone can log a download" ON public.download_events;
CREATE POLICY "Anyone can log a download"
  ON public.download_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(slug) BETWEEN 1 AND 200
    AND length(file_path) BETWEEN 1 AND 500
    AND (source     IS NULL OR length(source)     <= 100)
    AND (referrer   IS NULL OR length(referrer)   <= 2000)
    AND (user_agent IS NULL OR length(user_agent) <= 1000)
  );

DROP POLICY IF EXISTS "Anyone can log an analytics event" ON public.analytics_events;
CREATE POLICY "Anyone can log an analytics event"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(event_type) BETWEEN 1 AND 100
    AND length(event_name) BETWEEN 1 AND 200
    AND (path       IS NULL OR length(path)       <= 500)
    AND (source     IS NULL OR length(source)     <= 100)
    AND (referrer   IS NULL OR length(referrer)   <= 2000)
    AND (user_agent IS NULL OR length(user_agent) <= 1000)
    AND (session_id IS NULL OR length(session_id) <= 100)
    AND (metadata   IS NULL OR pg_column_size(metadata) <= 8192)
  );
