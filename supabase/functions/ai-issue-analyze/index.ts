// Authenticated endpoint. Requires either:
// - a Supabase Bearer JWT (Authorization header), or
// - a valid tenant-portal token (x-portal-token header).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

async function authorize(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await sb.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (!error && data?.claims?.sub) return true;
    } catch { /* fallthrough */ }
  }
  const portalToken = req.headers.get('x-portal-token');
  if (portalToken && portalToken.length >= 16 && portalToken.length <= 256) {
    try {
      const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await svc
        .from('tenant_portal_links')
        .select('id')
        .eq('token', portalToken)
        .eq('revoked', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (!error && data) return true;
    } catch { /* fallthrough */ }
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!(await authorize(req))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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
