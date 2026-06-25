// Legal sources sync — checks gesetze-im-internet for changes via Firecrawl,
// summarizes diffs with Lovable AI, stores updates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function scrapeMarkdown(url: string, apiKey: string): Promise<string | null> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.markdown ?? data?.markdown ?? null;
}

async function summarizeDiff(title: string, paragraph: string, oldText: string, newText: string, lovableKey: string): Promise<{ summary: string; impact: string }> {
  const prompt = `Du bist Jurist und prüfst Änderungen in deutschen Gesetzen für Privatvermieter.
Vergleiche ALT und NEU vom Paragraph "${paragraph} – ${title}" und antworte als JSON:
{ "summary": "<1-2 Sätze: was hat sich konkret geändert?>", "impact": "<1 Satz: was bedeutet das für private Vermieter?>" }
Wenn keine inhaltliche Änderung erkennbar (nur Formatierung), antworte mit summary "Redaktionelle Anpassung" und impact "Keine inhaltliche Auswirkung".

ALT:
${oldText.slice(0, 4000)}

NEU:
${newText.slice(0, 4000)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return { summary: "Inhalt aktualisiert", impact: "Bitte Quelle prüfen." };
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return { summary: parsed.summary || "Inhalt aktualisiert", impact: parsed.impact || "" };
  } catch {
    return { summary: "Inhalt aktualisiert", impact: "" };
  }
}

function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expectedCron = Deno.env.get("CRON_SECRET") || "";
  const providedCron = req.headers.get("x-cron-secret") || "";
  if (!expectedCron || !providedCron || !ctEq(expectedCron, providedCron)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const FIRECRAWL = Deno.env.get("FIRECRAWL_API_KEY");
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!FIRECRAWL) return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!LOVABLE) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: sources, error } = await sb.from("legal_sources").select("*").eq("active", true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const results: any[] = [];
  for (const src of sources || []) {
    try {
      const md = await scrapeMarkdown(src.url, FIRECRAWL);
      if (!md) { results.push({ url: src.url, status: "fetch_failed" }); continue; }
      const hash = await sha256(md);
      const checked_at = new Date().toISOString();

      if (src.last_hash && src.last_hash !== hash) {
        // changed → summarize
        const { summary, impact } = await summarizeDiff(src.title, src.paragraph, src.last_hash_text || "(kein Vergleichstext)", md, LOVABLE);
        await sb.from("legal_updates").insert({
          source_id: src.id,
          summary,
          impact,
          prev_hash: src.last_hash,
          new_hash: hash,
        });
        results.push({ url: src.url, status: "changed", summary });
      } else if (!src.last_hash) {
        results.push({ url: src.url, status: "initial" });
      } else {
        results.push({ url: src.url, status: "unchanged" });
      }

      await sb.from("legal_sources").update({ last_hash: hash, last_checked_at: checked_at }).eq("id", src.id);
    } catch (e) {
      results.push({ url: src.url, status: "error", error: String(e) });
    }
  }

  return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
