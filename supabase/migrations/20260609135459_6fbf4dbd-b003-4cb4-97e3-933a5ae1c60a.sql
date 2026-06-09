
-- ====================== TYPES ======================
DO $$ BEGIN
  CREATE TYPE public.conversation_kind AS ENUM ('direct','group','house');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====================== TABLES ======================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.conversation_kind NOT NULL DEFAULT 'direct',
  title text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  last_sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_last ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_property ON public.conversations(property_id);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  display_name text,
  muted boolean NOT NULL DEFAULT false,
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cm_user ON public.conversation_members(user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON public.messages(conversation_id, created_at DESC);

-- ====================== GRANTS ======================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_members, public.messages TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ====================== SECURITY HELPER ======================
CREATE OR REPLACE FUNCTION public.is_conv_member(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = _conv AND user_id = _user);
$$;
GRANT EXECUTE ON FUNCTION public.is_conv_member(uuid, uuid) TO authenticated;

-- ====================== POLICIES ======================
DROP POLICY IF EXISTS "conv member read" ON public.conversations;
CREATE POLICY "conv member read" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conv_member(id, auth.uid()));

DROP POLICY IF EXISTS "conv creator update" ON public.conversations;
CREATE POLICY "conv creator update" ON public.conversations FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Inserts/Updates of last_message_* happen via SECURITY DEFINER functions, but allow creator to insert too
DROP POLICY IF EXISTS "conv self insert" ON public.conversations;
CREATE POLICY "conv self insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- members: anyone who is a member of the conv can see all members; user can read own row
DROP POLICY IF EXISTS "cm member read" ON public.conversation_members;
CREATE POLICY "cm member read" ON public.conversation_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_conv_member(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "cm self update" ON public.conversation_members;
CREATE POLICY "cm self update" ON public.conversation_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- inserts/deletes via RPCs only (no direct policy → blocked except service_role)

-- messages
DROP POLICY IF EXISTS "msg member read" ON public.messages;
CREATE POLICY "msg member read" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conv_member(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "msg member insert" ON public.messages;
CREATE POLICY "msg member insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conv_member(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "msg sender edit" ON public.messages;
CREATE POLICY "msg sender edit" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

-- ====================== REALTIME ======================
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversations';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversation_members';
  IF NOT FOUND THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members; END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ====================== TRIGGER: bump conversation on message ======================
CREATE OR REPLACE FUNCTION public.tg_messages_bump_conv()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
     SET last_message_at = NEW.created_at,
         last_message_preview = left(NEW.body, 140),
         last_sender_id = NEW.sender_id
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS messages_bump_conv ON public.messages;
CREATE TRIGGER messages_bump_conv AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_messages_bump_conv();

-- ====================== RPCs ======================

-- Start (or find) a 1:1 conversation with another user
CREATE OR REPLACE FUNCTION public.messenger_start_direct(_other uuid, _other_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _conv uuid;
  _my_name text;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _other IS NULL OR _other = _me THEN RAISE EXCEPTION 'invalid recipient'; END IF;

  -- find existing direct conv with exactly these two members
  SELECT c.id INTO _conv
    FROM public.conversations c
   WHERE c.kind = 'direct'
     AND EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = c.id AND user_id = _me)
     AND EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = c.id AND user_id = _other)
     AND (SELECT count(*) FROM public.conversation_members WHERE conversation_id = c.id) = 2
   LIMIT 1;

  IF _conv IS NOT NULL THEN RETURN _conv; END IF;

  INSERT INTO public.conversations(kind, created_by) VALUES ('direct', _me) RETURNING id INTO _conv;
  SELECT COALESCE(p.display_name, u.email) INTO _my_name FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id WHERE u.id = _me;
  INSERT INTO public.conversation_members(conversation_id, user_id, role, display_name) VALUES (_conv, _me, 'owner', _my_name);
  INSERT INTO public.conversation_members(conversation_id, user_id, role, display_name) VALUES (_conv, _other, 'member', _other_name);
  RETURN _conv;
END $$;
GRANT EXECUTE ON FUNCTION public.messenger_start_direct(uuid, text) TO authenticated;

-- Create a group / house conversation
CREATE OR REPLACE FUNCTION public.messenger_create_group(_title text, _user_ids uuid[], _property_id uuid DEFAULT NULL, _kind public.conversation_kind DEFAULT 'group')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _me uuid := auth.uid();
  _conv uuid;
  _uid uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF coalesce(trim(_title), '') = '' THEN RAISE EXCEPTION 'title required'; END IF;

  INSERT INTO public.conversations(kind, title, property_id, created_by)
  VALUES (_kind, trim(_title), _property_id, _me) RETURNING id INTO _conv;

  INSERT INTO public.conversation_members(conversation_id, user_id, role) VALUES (_conv, _me, 'owner');
  FOREACH _uid IN ARRAY coalesce(_user_ids, ARRAY[]::uuid[]) LOOP
    IF _uid IS NOT NULL AND _uid <> _me THEN
      INSERT INTO public.conversation_members(conversation_id, user_id, role)
      VALUES (_conv, _uid, 'member') ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN _conv;
END $$;
GRANT EXECUTE ON FUNCTION public.messenger_create_group(text, uuid[], uuid, public.conversation_kind) TO authenticated;

-- Mark a conversation as read for the current user
CREATE OR REPLACE FUNCTION public.messenger_mark_read(_conv uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.conversation_members
     SET last_read_at = now()
   WHERE conversation_id = _conv AND user_id = auth.uid();
END $$;
GRANT EXECUTE ON FUNCTION public.messenger_mark_read(uuid) TO authenticated;

-- Add / remove members (creator only)
CREATE OR REPLACE FUNCTION public.messenger_add_members(_conv uuid, _user_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT created_by INTO _owner FROM public.conversations WHERE id = _conv;
  IF _owner <> auth.uid() THEN RAISE EXCEPTION 'only owner'; END IF;
  FOREACH _uid IN ARRAY coalesce(_user_ids, ARRAY[]::uuid[]) LOOP
    IF _uid IS NOT NULL THEN
      INSERT INTO public.conversation_members(conversation_id, user_id, role)
      VALUES (_conv, _uid, 'member') ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.messenger_add_members(uuid, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.messenger_leave(_conv uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  DELETE FROM public.conversation_members WHERE conversation_id = _conv AND user_id = auth.uid();
END $$;
GRANT EXECUTE ON FUNCTION public.messenger_leave(uuid) TO authenticated;

-- List conversations for current user with unread counts and peer info
CREATE OR REPLACE FUNCTION public.messenger_list()
RETURNS TABLE(
  id uuid,
  kind public.conversation_kind,
  title text,
  property_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid,
  unread_count bigint,
  member_count bigint,
  peer_user_id uuid,
  peer_name text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH mine AS (
    SELECT cm.conversation_id, cm.last_read_at
      FROM public.conversation_members cm
     WHERE cm.user_id = auth.uid()
  )
  SELECT
    c.id, c.kind, c.title, c.property_id,
    c.last_message_at, c.last_message_preview, c.last_sender_id,
    (SELECT count(*) FROM public.messages m
       WHERE m.conversation_id = c.id
         AND m.created_at > coalesce((SELECT last_read_at FROM mine WHERE conversation_id = c.id), 'epoch'::timestamptz)
         AND m.sender_id IS DISTINCT FROM auth.uid()) AS unread_count,
    (SELECT count(*) FROM public.conversation_members cm2 WHERE cm2.conversation_id = c.id) AS member_count,
    (SELECT cm3.user_id FROM public.conversation_members cm3
       WHERE cm3.conversation_id = c.id AND cm3.user_id <> auth.uid() LIMIT 1) AS peer_user_id,
    (SELECT COALESCE(cm4.display_name, p.display_name, 'Chat') FROM public.conversation_members cm4
       LEFT JOIN public.profiles p ON p.user_id = cm4.user_id
       WHERE cm4.conversation_id = c.id AND cm4.user_id <> auth.uid() LIMIT 1) AS peer_name
  FROM public.conversations c
  WHERE c.id IN (SELECT conversation_id FROM mine)
  ORDER BY c.last_message_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.messenger_list() TO authenticated;

-- Get full conversation details (members + property) for current user
CREATE OR REPLACE FUNCTION public.messenger_get(_conv uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _result jsonb;
BEGIN
  IF NOT public.is_conv_member(_conv, auth.uid()) THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'conversation', (SELECT to_jsonb(c) FROM public.conversations c WHERE c.id = _conv),
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', cm.user_id,
        'role', cm.role,
        'display_name', COALESCE(cm.display_name, p.display_name, 'Unbekannt'),
        'joined_at', cm.joined_at,
        'last_read_at', cm.last_read_at
      ))
      FROM public.conversation_members cm
      LEFT JOIN public.profiles p ON p.user_id = cm.user_id
      WHERE cm.conversation_id = _conv
    ), '[]'::jsonb),
    'property', (SELECT to_jsonb(p) FROM public.properties p
                  WHERE p.id = (SELECT property_id FROM public.conversations WHERE id = _conv))
  ) INTO _result;
  RETURN _result;
END $$;
GRANT EXECUTE ON FUNCTION public.messenger_get(uuid) TO authenticated;

-- ====================== AUTO-CREATE DM ON TENANT CONNECT ======================
CREATE OR REPLACE FUNCTION public.tg_tenant_autocreate_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _conv uuid; _exists uuid;
BEGIN
  IF NEW.claimed_by_user_id IS NULL OR NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.claimed_by_user_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT c.id INTO _exists
    FROM public.conversations c
   WHERE c.kind = 'direct'
     AND EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = c.id AND user_id = NEW.claimed_by_user_id)
     AND EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = c.id AND user_id = NEW.user_id)
     AND (SELECT count(*) FROM public.conversation_members WHERE conversation_id = c.id) = 2
   LIMIT 1;

  IF _exists IS NOT NULL THEN RETURN NEW; END IF;

  INSERT INTO public.conversations(kind, created_by) VALUES ('direct', NEW.user_id) RETURNING id INTO _conv;
  INSERT INTO public.conversation_members(conversation_id, user_id, role, display_name)
  VALUES (_conv, NEW.user_id, 'owner', NULL);
  INSERT INTO public.conversation_members(conversation_id, user_id, role, display_name)
  VALUES (_conv, NEW.claimed_by_user_id, 'member', NEW.full_name);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tenant_autocreate_chat_ins ON public.tenants;
CREATE TRIGGER tenant_autocreate_chat_ins AFTER INSERT ON public.tenants
  FOR EACH ROW WHEN (NEW.claimed_by_user_id IS NOT NULL)
  EXECUTE FUNCTION public.tg_tenant_autocreate_chat();

DROP TRIGGER IF EXISTS tenant_autocreate_chat_upd ON public.tenants;
CREATE TRIGGER tenant_autocreate_chat_upd AFTER UPDATE OF claimed_by_user_id ON public.tenants
  FOR EACH ROW WHEN (NEW.claimed_by_user_id IS NOT NULL AND (OLD.claimed_by_user_id IS DISTINCT FROM NEW.claimed_by_user_id))
  EXECUTE FUNCTION public.tg_tenant_autocreate_chat();
