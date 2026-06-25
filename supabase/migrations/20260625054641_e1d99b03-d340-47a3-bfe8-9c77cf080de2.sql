
-- 1) Tighten policies on sensitive/public tables

-- advisor_directory: require auth
DROP POLICY IF EXISTS "advisor_directory public read" ON public.advisor_directory;
CREATE POLICY "advisor_directory authenticated read"
  ON public.advisor_directory FOR SELECT TO authenticated
  USING (active = true);

-- community_wins: require auth
DROP POLICY IF EXISTS "wins public read" ON public.community_wins;
CREATE POLICY "wins authenticated read"
  ON public.community_wins FOR SELECT TO authenticated
  USING (true);

-- user_stats: require auth
DROP POLICY IF EXISTS "user_stats public read pseudonym" ON public.user_stats;
CREATE POLICY "user_stats authenticated read"
  ON public.user_stats FOR SELECT TO authenticated
  USING (true);

-- tenant_pass: require auth even for shared
DROP POLICY IF EXISTS "tenant_pass public read shared" ON public.tenant_pass;
CREATE POLICY "tenant_pass authenticated read shared"
  ON public.tenant_pass FOR SELECT TO authenticated
  USING (is_public = true);

-- win_reactions insert: restrict to authenticated role
DROP POLICY IF EXISTS "reactions own insert" ON public.win_reactions;
CREATE POLICY "reactions own insert"
  ON public.win_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reactions public read" ON public.win_reactions;
CREATE POLICY "reactions authenticated read"
  ON public.win_reactions FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "reactions own delete" ON public.win_reactions;
CREATE POLICY "reactions own delete"
  ON public.win_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2) Storage: drop broad SELECT on listing-photos (bucket stays public via CDN).
DROP POLICY IF EXISTS "listing photos public read" ON storage.objects;
DROP POLICY IF EXISTS "listing-photos read individual" ON storage.objects;
CREATE POLICY "listing-photos authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-photos');

-- 3) Fix mutable search_path on public funcs
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.default_component_lifespan(public.component_kind) SET search_path = public;

-- 4) Lock down SECURITY DEFINER function execution.
-- Revoke from PUBLIC (covers anon), then grant to authenticated on all.
-- Grant anon only on functions intentionally callable without login (token-based RPCs + public marketplace helpers).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant anon EXECUTE on token-based / intentionally public RPCs
GRANT EXECUTE ON FUNCTION public.advisor_owner_for_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.advisor_touch_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.advisor_get_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.listing_inc_view(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.ad_track_event(uuid, text, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.tenant_portal_resolve(text) TO anon;
GRANT EXECUTE ON FUNCTION public.tenant_portal_get_nka(text) TO anon;
GRANT EXECUTE ON FUNCTION public.tenant_portal_list_messages(text) TO anon;
GRANT EXECUTE ON FUNCTION public.tenant_portal_mark_read(text) TO anon;
GRANT EXECUTE ON FUNCTION public.tenant_portal_nka_pdf_path(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.tenant_portal_report_issue(text, text, public.issue_severity, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.tenant_portal_send_message(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.wg_casting_resolve(text) TO anon;
