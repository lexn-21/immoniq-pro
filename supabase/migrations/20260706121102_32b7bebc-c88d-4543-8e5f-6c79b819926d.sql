
DROP POLICY IF EXISTS "msgs sender update" ON public.listing_messages;
CREATE POLICY "msgs sender update"
  ON public.listing_messages
  FOR UPDATE
  USING (auth.uid() = sender_user_id AND is_app_participant(application_id, auth.uid()))
  WITH CHECK (auth.uid() = sender_user_id AND is_app_participant(application_id, auth.uid()));

DROP POLICY IF EXISTS "ad_events anyone insert" ON public.ad_events;
DROP POLICY IF EXISTS "ad_events authenticated insert" ON public.ad_events;
CREATE POLICY "ad_events authenticated insert"
  ON public.ad_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    event_type = ANY (ARRAY['impression'::text, 'click'::text])
    AND EXISTS (
      SELECT 1 FROM public.ad_slots s
      WHERE s.id = ad_events.ad_id
        AND s.active = true
        AND COALESCE(s.moderation_status, 'approved') = 'approved'
        AND (s.starts_at IS NULL OR s.starts_at <= now())
        AND (s.ends_at IS NULL OR s.ends_at > now())
    )
  );
