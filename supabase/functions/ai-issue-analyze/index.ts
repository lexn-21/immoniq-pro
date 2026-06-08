// Public endpoint (Tenant Portal). Analyses an image or audio describing a
// damage report and returns structured fields (title, description, severity, category).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const SYSTEM = `Du bist ein Assistent für Schadensmeldungen einer Mieter-Hausverwaltungs-App.
Analysiere das Bild oder die Sprachnotiz und gib NUR JSON zurück mit den Feldern:
{
  "title": string (max 60 Zeichen, prägnant, deutsch),
  "description": string (2-4 Sätze, was zu sehen/hören ist, mögliche Ursache),
  "severity": "info" | "minor" | "major" | "urgent",
  "category": "sanitaer" | "elektrik" | "heizung" | "fenster" | "schimmel" | "laerm" | "sonstiges",
  "estimated_cost_eur": number | null
}
Schwere-Einschätzung:
- "urgent": Wassereinbruch, Stromausfall, Heizungsausfall im Winter, Schimmel großflächig, Sicherheitsrisiko
- "major": defekte Heizung, größerer Wasserschaden, kaputte Fenster
- "minor": tropfender Wasserhahn, kleine kosmetische Schäden
- "info": reine Frage / Hinweis ohne Schaden`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { imageBase64, audioBase64, mimeType } = body ?? {};
    if (!imageBase64 && !audioBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 or audioBase64 required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userContent: any[] = [{ type: 'text', text: 'Analysiere und gib JSON zurück.' }];
    if (imageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}` },
      });
    }
    if (audioBase64) {
      userContent.push({
        type: 'input_audio',
        input_audio: { data: audioBase64, format: (mimeType?.includes('wav') ? 'wav' : 'mp3') },
      });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI error', detail: txt.slice(0, 300) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await aiRes.json();
    const raw = json?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { title: 'Schaden gemeldet', description: raw, severity: 'minor', category: 'sonstiges' }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
