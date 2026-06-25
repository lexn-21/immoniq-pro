// Einmal-Skript: setzt SaaS-Tax-Code (txcd_10103001) auf alle Stripe-Produkte.
// Nur für Admins (app_admins).
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin } = await admin.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { environment } = (await req.json()) as { environment: StripeEnv };
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");
    const stripe = createStripeClient(environment);

    const out: Array<{ id: string; name: string; tax_code: string }> = [];
    let starting_after: string | undefined;
    while (true) {
      const page = await stripe.products.list({ limit: 100, ...(starting_after && { starting_after }) });
      for (const p of page.data) {
        const taxCode = "txcd_10103001";
        if (p.tax_code !== taxCode) {
          await stripe.products.update(p.id, { tax_code: taxCode });
        }
        out.push({ id: p.id, name: p.name, tax_code: taxCode });
      }
      if (!page.has_more) break;
      starting_after = page.data[page.data.length - 1].id;
    }
    return new Response(JSON.stringify({ updated: out.length, products: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-set-tax-codes error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
