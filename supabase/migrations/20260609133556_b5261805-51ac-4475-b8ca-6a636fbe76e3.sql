
-- Add 'portal' channel + 'read_at'
ALTER TABLE public.tenant_messages DROP CONSTRAINT IF EXISTS tenant_messages_channel_check;
ALTER TABLE public.tenant_messages ADD CONSTRAINT tenant_messages_channel_check
  CHECK (channel = ANY (ARRAY['whatsapp','sms','email','note','portal']));
ALTER TABLE public.tenant_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Realtime
ALTER TABLE public.tenant_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tenant_messages';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_messages';
  END IF;
END $$;

-- Portal: list messages for tenant via token
CREATE OR REPLACE FUNCTION public.tenant_portal_list_messages(_token text)
RETURNS SETOF public.tenant_messages
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _link RECORD;
BEGIN
  SELECT * INTO _link FROM public.tenant_portal_links
  WHERE token = _token AND revoked = false AND expires_at > now() LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM public.tenant_messages
    WHERE tenant_id = _link.tenant_id
    ORDER BY sent_at ASC LIMIT 500;
END $$;

-- Portal: send message (tenant -> landlord)
CREATE OR REPLACE FUNCTION public.tenant_portal_send_message(_token text, _body text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _link RECORD; _id uuid;
BEGIN
  IF coalesce(length(trim(_body)),0) = 0 THEN RAISE EXCEPTION 'empty'; END IF;
  SELECT * INTO _link FROM public.tenant_portal_links
  WHERE token = _token AND revoked = false AND expires_at > now() LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid token'; END IF;
  INSERT INTO public.tenant_messages(user_id, tenant_id, direction, channel, body, status)
  VALUES (_link.user_id, _link.tenant_id, 'in', 'portal', _body, 'delivered')
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Portal: mark landlord messages as read
CREATE OR REPLACE FUNCTION public.tenant_portal_mark_read(_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _link RECORD;
BEGIN
  SELECT * INTO _link FROM public.tenant_portal_links
  WHERE token = _token AND revoked = false AND expires_at > now() LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.tenant_messages SET read_at = now(), status = 'read'
   WHERE tenant_id = _link.tenant_id AND direction = 'out' AND read_at IS NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.tenant_portal_list_messages(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_portal_send_message(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_portal_mark_read(text) TO anon, authenticated;
