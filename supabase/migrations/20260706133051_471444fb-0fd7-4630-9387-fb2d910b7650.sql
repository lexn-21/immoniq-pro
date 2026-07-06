-- 1) Widerruf: alle Ausführungsrechte auf public-Funktionen für PUBLIC, anon, authenticated entziehen
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- 2) Service-Rolle behält vollen Zugriff (Edge Functions)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 3) Öffentliche/Token-basierte Flows: anon + authenticated dürfen aufrufen
--    (Mieter-Portal, Berater-Portal, WG-Casting, Marktplatz-Lookups)
GRANT EXECUTE ON FUNCTION public.advisor_accept_invite(text)                                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_get_data(text)                                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_owner_for_token(text)                                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_touch_token(text)                                       TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.tenant_portal_resolve(text)                                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_portal_get_nka(text)                                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_portal_list_messages(text)                               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_portal_mark_read(text)                                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_portal_send_message(text, text)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_portal_nka_pdf_path(text, uuid)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_portal_report_issue(text, text, issue_severity, text, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.wg_casting_resolve(text)                                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wg_casting_vote(text, uuid, text, text)                         TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.listings_nearby(numeric, numeric, numeric, text, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ad_slots_for(text, text, text, text, integer)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ad_track_event(uuid, text, text, text, uuid)                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listing_inc_view(uuid)                                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.avm_estimate(text, numeric, numeric)                            TO anon, authenticated;

-- 4) Nur angemeldete Nutzer: RPCs, die eingeloggte User vom Frontend rufen
GRANT EXECUTE ON FUNCTION public.advisor_list_mandates()                                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.advisor_touch_mandate(uuid)                                     TO authenticated;

GRANT EXECUTE ON FUNCTION public.calc_landlord_score(uuid)                                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_immoniq_score(uuid)                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_score_consent(uuid, text, text)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_score_consent(uuid)                                    TO authenticated;

GRANT EXECUTE ON FUNCTION public.ensure_default_unit(uuid)                                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_achievements()                                         TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_pro_access(uuid, text)                                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.trial_days_left(uuid)                                           TO authenticated;

GRANT EXECUTE ON FUNCTION public.messenger_list()                                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.messenger_get(uuid)                                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.messenger_mark_read(uuid)                                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.messenger_create_group(text, uuid[], uuid, conversation_kind)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.messenger_add_members(uuid, uuid[])                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.messenger_start_direct(uuid, text)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.messenger_leave(uuid)                                           TO authenticated;

GRANT EXECUTE ON FUNCTION public.missing_rents(integer)                                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.recurring_transactions(integer)                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_user_activity(text, numeric, text, text, text)           TO authenticated;

GRANT EXECUTE ON FUNCTION public.notify_get_ad_advertiser_email(uuid)                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_get_listing_owner_email(uuid)                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_get_application_seeker_email(uuid)                       TO authenticated;

GRANT EXECUTE ON FUNCTION public.tenant_claim(text)                                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_connect_by_landlord_email(text, text)                    TO authenticated;

-- 5) Helper-Funktionen, die RLS-Policies referenzieren, dürfen von authenticated
--    aufgerufen werden (Policies evaluieren im User-Kontext). SECURITY DEFINER
--    Body erzwingt die Rechte, aber PostgREST/RLS muss die Funktion sehen.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)                                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid)                                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_advisor_for(uuid, boolean)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conv_member(uuid, uuid)                                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_participant(uuid, uuid)                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_post_wins(uuid)                                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_seeker_profile(uuid, uuid)                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role()                                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_plan_tier(uuid)                                            TO authenticated;

-- Alles Übrige (tg_* Trigger, handle_new_user, assign_landlord_role, bump_win_reactions,
-- ensure_inbox_alias, check_user_quota, check_ai_quota, default_component_lifespan,
-- set_updated_at, update_updated_at_column, touch_user_templates, email_queue_*,
-- enqueue_email/delete_email/read_email_batch/move_to_dlq) bleibt bewusst OHNE
-- Grants für anon/authenticated. Trigger laufen im Owner-Kontext; Edge Functions
-- verwenden service_role und haben oben vollen Zugriff.
