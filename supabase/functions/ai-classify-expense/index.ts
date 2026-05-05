import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { enforceAiQuota } from "../_shared/ai-quota.ts";

const CATEGORIES = [
  { code: "grundsteuer", label: "Grundsteuer", key: "qm" },
  { code: "wasser", label: "Wasserversorgung", key: "verbrauch_manual" },
  { code: "entwaesserung", label: "Entwässerung", key: "verbrauch_manual" },
  { code: "heizung", label: "Heizung (HeizkostenV: 50% qm + 50% Verbrauch)", key: "verbrauch_manual" },
  { code: "warmwasser", label: "Warmwasser", key: "verbrauch_manual" },
  { code: "aufzug", label: "Aufzug", key: "qm" },
  { code: "strassenreinigung", label: "Straßenreinigung", key: "qm" },
  { code: "muellabfuhr", label: "Müllbeseitigung", key: "personen" },
  { code: "hausreinigung", label: "Hausreinigung", key: "qm" },
  { code: "gartenpflege", label: "Gartenpflege", key: "qm" },
  { code: "beleuchtung", label: "Beleuchtung Allgemein", key: "qm" },
  { code: "schornsteinreinigung", label: "Schornsteinreinigung", key: "qm" },
  { code: "versicherung", label: "Sach-/Haftpflichtversicherung", key: "qm" },
  { code: "hausmeister", label: "Hausmeister", key: "qm" },
  { code: "antenne", label: "Gemeinschafts-Antenne / Kabel", key: "einheiten" },
  { code: "waschraum", label: "Waschraum", key: "verbrauch_manual" },
  { code: "sonstige", label: "Sonstige Betriebskosten (BetrKV-konform)", key: "qm" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { description, vendor, amount } = await req.json();
    if (!description && !vendor) {
      return new Response(JSON.stringify({ error: "description oder vendor erforderlich" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const quota = await enforceAiQuota(req, "ai-classify-expense");
    if (!quota.ok) {
      return new Response(JSON.stringify({ error: quota.error }), {
        status: quota.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const catList = CATEGORIES.map(c => `- ${c.code}: ${c.label}`).join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `Du klassifizierst Vermieter-Belege in BetrKV-Nebenkostenkategorien.
Verfügbare Kategorien:\n${catList}\n
Verteilungsschlüssel: qm | personen | einheiten | verbrauch_manual | direkt_zuordnung
Wenn nicht umlagefähig (Reparaturen, Instandhaltung, Verwaltung, Eigentümerkosten) → umlagefaehig=false, category_code="sonstige".` },
          { role: "user", content: `Beleg: ${description ?? ""} | Lieferant: ${vendor ?? ""} | Betrag: ${amount ?? "?"} €` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify",
            description: "Klassifiziere den Beleg",
            parameters: {
              type: "object",
              properties: {
                category_code: { type: "string", enum: CATEGORIES.map(c => c.code) },
                distribution_key: { type: "string", enum: ["qm","personen","einheiten","verbrauch_manual","direkt_zuordnung"] },
                umlagefaehig: { type: "boolean" },
                reasoning: { type: "string" },
              },
              required: ["category_code","distribution_key","umlagefaehig","reasoning"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Credits aufgebraucht" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const json = await resp.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    if (!parsed) return new Response(JSON.stringify({ error: "no result" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
