// Einmal-Skript: setzt SaaS-Tax-Code (txcd_10103001) auf alle Stripe-Produkte.
// Aufruf via: supabase.functions.invoke("admin-set-tax-codes", { body: { environment: "sandbox" } })
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { environment } = (await req.json()) as { environment: StripeEnv };
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");
    const stripe = createStripeClient(environment);

    const out: Array<{ id: string; name: string; tax_code: string }> = [];
    let starting_after: string | undefined;
    while (true) {
      const page = await stripe.products.list({ limit: 100, ...(starting_after && { starting_after }) });
      for (const p of page.data) {
        // SaaS / digitale Dienstleistung — passt für alle ImmonIQ-Pläne und Werbeplätze
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
