// Mock-Bonitätscheck (1-Klick) — erstellt einen Eintrag in bonitaets_checks.
// In Produktion durch echten Provider (z.B. SCHUFA B2B, CRIF, infoscore) ersetzen.
// Wichtig: Mieter muss vorab eingewilligt haben (snapshot_profile.schufa_consent oder seeker_profiles.schufa_status).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { application_id } = await req.json();
    if (!application_id) {
      return new Response(JSON.stringify({ error: "application_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response("unauthorized", { status: 401, headers: corsHeaders });
    const user = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user: u } } = await user.auth.getUser();
    if (!u) return new Response("unauthorized", { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: app } = await admin
      .from("applications")
      .select("id, seeker_user_id, owner_user_id, listings(price)")
      .eq("id", application_id).maybeSingle();
    if (!app) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
    if (app.owner_user_id !== u.id) return new Response("forbidden", { status: 403, headers: corsHeaders });

    // Einwilligung prüfen
    const { data: seeker } = await admin.from("seeker_profiles")
      .select("schufa_status, net_income_monthly").eq("user_id", app.seeker_user_id).maybeSingle();
    if (!seeker || (seeker.schufa_status !== "self_declared" && seeker.schufa_status !== "document_uploaded")) {
      return new Response(JSON.stringify({ error: "Mieter hat noch keine Einwilligung erteilt (SCHUFA-Status fehlt)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mock-Score: leitet sich aus Einkommen/Miete + leichter Streuung ab
    const inc = Number(seeker.net_income_monthly ?? 0);
    const rent = Number((app as any).listings?.price ?? 0);
    const ratio = rent > 0 ? inc / rent : 3;
    let score = Math.max(120, Math.min(700, 400 + Math.round((ratio - 3) * 60) + Math.floor(Math.random() * 60 - 30)));
    const rating = score >= 600 ? "A" : score >= 500 ? "B" : score >= 400 ? "C" : score >= 300 ? "D" : "E";

    const { data: rec, error } = await admin.from("bonitaets_checks").insert({
      application_id, seeker_user_id: app.seeker_user_id, owner_user_id: u.id,
      provider: "mock", status: "completed", score, rating,
      paid_amount: 0, completed_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify(rec), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
