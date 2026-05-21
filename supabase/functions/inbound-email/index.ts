// Inbound email webhook + AI extraction for Smart Inbox
// Accepts POST with JSON: { to, from, from_name?, subject, text, attachments? }
// Routes by recipient local-part (= profiles.inbox_alias) and runs AI extraction.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function parseAlias(to: string): string | null {
  if (!to) return null
  // Handle "Name <user@inbox.immoniq.xyz>" and bare addresses
  const m = to.match(/<([^>]+)>/)
  const addr = (m ? m[1] : to).trim().toLowerCase()
  const local = addr.split('@')[0]
  return local || null
}

async function extract(apiKey: string, subject: string, body: string) {
  const prompt = `Du bekommst eine eingehende E-Mail (deutsch). Extrahiere strukturiert die wichtigsten Felder.
Antworte NUR mit JSON in diesem Schema:
{
  "category": "rechnung|vertrag|versicherung|behoerde|miete|bank|sonstiges",
  "sender": "kurzer Absendername / Firma",
  "amount": null oder Zahl in EUR,
  "due_date": null oder ISO yyyy-mm-dd (Fälligkeit/Zahlfrist),
  "contract_end": null oder ISO yyyy-mm-dd (Vertragsende falls erkennbar),
  "summary": "max 140 Zeichen, was zu tun ist",
  "confidence": 0..1
}

Betreff: ${subject || '(kein)'}
Text:
${(body || '').slice(0, 4000)}`

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Du bist ein präziser Datenextraktor. Antworte nur mit gültigem JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const txt = data.choices?.[0]?.message?.content || '{}'
  try { return JSON.parse(txt) } catch { return {} }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const aiKey = Deno.env.get('LOVABLE_API_KEY')!
    const sb = createClient(url, svc)

    const payload = await req.json().catch(() => ({}))
    const to = String(payload.to || payload.recipient || '')
    const from = String(payload.from || payload.sender || '')
    const from_name = payload.from_name || null
    const subject = String(payload.subject || '')
    const text = String(payload.text || payload.body || payload.html || '')
    const attachments = payload.attachments || []

    const alias = parseAlias(to)
    if (!alias) {
      return new Response(JSON.stringify({ error: 'no_alias' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: profile } = await sb.from('profiles').select('user_id').eq('inbox_alias', alias).maybeSingle()
    if (!profile) {
      return new Response(JSON.stringify({ error: 'unknown_recipient', alias }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let ai: any = {}
    try { ai = await extract(aiKey, subject, text) } catch (e) { console.error('AI extract failed', e) }

    const { data: inserted, error } = await sb.from('inbox_items').insert({
      user_id: profile.user_id,
      source: 'email',
      from_email: from,
      from_name,
      subject,
      body_text: text.slice(0, 50000),
      attachments,
      raw: payload,
      ai_category: ai.category || null,
      ai_sender: ai.sender || from_name || from,
      ai_amount: typeof ai.amount === 'number' ? ai.amount : null,
      ai_due_date: ai.due_date || null,
      ai_contract_end: ai.contract_end || null,
      ai_summary: ai.summary || null,
      ai_confidence: typeof ai.confidence === 'number' ? ai.confidence : null,
      ai_processed_at: new Date().toISOString(),
    }).select('id').single()

    if (error) throw error

    // Auto-Task wenn Fälligkeit oder Vertragsende erkannt
    if (ai.due_date || ai.contract_end) {
      const due = ai.due_date || ai.contract_end
      const title = ai.summary?.slice(0, 80) || subject?.slice(0, 80) || 'E-Mail prüfen'
      const { data: task } = await sb.from('tasks').insert({
        user_id: profile.user_id,
        title,
        description: `Aus Smart Inbox · ${ai.sender || from}`,
        category: ai.category || 'inbox',
        due_date: due,
      }).select('id').single()
      if (task) await sb.from('inbox_items').update({ task_id: task.id }).eq('id', inserted.id)
    }

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('inbound-email error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
