// Fetches live mortgage interest rates from Deutsche Bundesbank (BBSIS) and
// writes them into market_pulse. Free public API, no key required.
// Series: Effektivzinssatz Wohnungsbaukredite an priv. Haushalte,
// anfängliche Zinsbindung über 5 bis 10 Jahre.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SERIES = "M.DE.N.A.AR.R.A.5B.A.R.A.A._Z._Z.A";
const URL = `https://api.statistiken.bundesbank.de/rest/data/BBSIS/${SERIES}?format=csv&lastNObservations=2`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const res = await fetch(URL, { headers: { Accept: "text/csv" } });
    if (!res.ok) throw new Error(`Bundesbank ${res.status}`);
    const csv = await res.text();
    // Parse: first non-header lines; columns vary, find date + value heuristically.
    const lines = csv.trim().split(/\r?\n/);
    const rows = lines.slice(1).map((l) => l.split(/[,;]/));
    // Bundesbank CSV: TIME_PERIOD ; OBS_VALUE typically last two non-empty cols
    const parsed = rows
      .map((cols) => {
        const date = cols.find((c) => /^\d{4}-\d{2}/.test(c));
        const numCol = [...cols].reverse().find((c) => /^-?\d+([.,]\d+)?$/.test(c.trim()));
        if (!date || !numCol) return null;
        return { date, value: parseFloat(numCol.replace(",", ".")) };
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

    const { error } = await supabase.from("market_pulse").insert({
      week_start: weekStart,
      city: null,
      zip_prefix: null,
      metric: "mortgage_rate_10y",
      value: latest.value,
      delta_pct: delta,
      caption: `Bundesbank · ${latest.date}`,
    });
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
