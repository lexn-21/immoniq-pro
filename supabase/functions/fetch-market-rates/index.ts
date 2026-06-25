// Fetches live mortgage interest rates for Germany from the ECB Data Portal
// (MIR dataset, Bank interest rates for house purchase loans, DE) and
// writes the latest value into market_pulse. Free public API, no key.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SERIES = "M.DE.B.A2C.A.R.A.2250.EUR.R";
const URL = `https://data-api.ecb.europa.eu/service/data/MIR/${SERIES}?format=csvdata&lastNObservations=2`;

function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("CRON_SECRET") || "";
  const provided = req.headers.get("x-cron-secret") || "";
  if (!expected || !provided || !ctEq(expected, provided)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    const res = await fetch(URL, { headers: { Accept: "text/csv" } });
    if (!res.ok) throw new Error(`ECB ${res.status}`);
    const csv = await res.text();
    // ECB CSV with header. Use header indices for TIME_PERIOD and OBS_VALUE.
    const lines = csv.trim().split(/\r?\n/);
    const header = lines[0].split(",");
    const idxDate = header.indexOf("TIME_PERIOD");
    const idxVal = header.indexOf("OBS_VALUE");
    if (idxDate < 0 || idxVal < 0) throw new Error("unexpected CSV header");
    const parsed = lines.slice(1)
      .map((l) => {
        const cols = l.split(",");
        const date = cols[idxDate];
        const v = parseFloat((cols[idxVal] ?? "").replace(",", "."));
        if (!date || !isFinite(v)) return null;
        return { date, value: v };
      })
      .filter(Boolean) as { date: string; value: number }[];

    if (parsed.length === 0) throw new Error("no observations parsed");
    const latest = parsed[parsed.length - 1];
    const prev = parsed.length > 1 ? parsed[parsed.length - 2] : null;
    const delta = prev ? ((latest.value - prev.value) / prev.value) * 100 : null;
    const weekStart = new Date().toISOString().slice(0, 10);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("market_pulse").upsert({
      week_start: weekStart,
      city: null,
      zip_prefix: null,
      metric: "mortgage_rate_10y",
      value: latest.value,
      delta_pct: delta,
      caption: `EZB · ${latest.date}`,
    }, { onConflict: "week_start, metric, city, zip_prefix" });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, value: latest.value, date: latest.date }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
