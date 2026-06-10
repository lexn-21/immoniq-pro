// Sends Web-Push notifications to all members of a conversation (except the sender)
// using VAPID keys stored in Supabase secrets.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@immoniq.xyz";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "auth" }, 401);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await sb.auth.getUser(token);
    const senderId = u?.user?.id;
    if (!senderId) return json({ error: "auth" }, 401);

    const { conversation_id, body, title, url } = await req.json();
    if (!conversation_id || typeof body !== "string") return json({ error: "bad payload" }, 400);

    // Verify sender is member
    const { data: mine } = await sb.from("conversation_members")
      .select("conversation_id").eq("conversation_id", conversation_id).eq("user_id", senderId).maybeSingle();
    if (!mine) return json({ error: "forbidden" }, 403);

    // Recipients: all other members
    const { data: members } = await sb.from("conversation_members")
      .select("user_id").eq("conversation_id", conversation_id).neq("user_id", senderId);
    const userIds = (members ?? []).map(m => m.user_id);
    if (userIds.length === 0) return json({ sent: 0 });

    const { data: subs } = await sb.from("push_subscriptions")
      .select("endpoint, p256dh, auth, id").in("user_id", userIds);
    if (!subs || subs.length === 0) return json({ sent: 0 });

    const payload = JSON.stringify({
      title: title || "Neue Nachricht",
      body: body.length > 140 ? body.slice(0, 140) + "…" : body,
      url: url || "/mein-immoniq/chat",
    });

    const dead: string[] = [];
    let ok = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        ok++;
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
        else console.error("[send-push]", code, e?.body);
      }
    }));
    if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);

    return json({ sent: ok, removed: dead.length });
  } catch (e: any) {
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
