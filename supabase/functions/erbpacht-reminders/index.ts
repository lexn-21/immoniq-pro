// Scans land_parcels + properties for upcoming Erbpacht / lease endings
// and auto-creates tasks at T-180, T-90, T-30 days.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const THRESHOLDS = [180, 90, 30]

function daysUntil(iso: string): number {
  const d = new Date(iso + 'T00:00:00Z').getTime()
  return Math.round((d - Date.now()) / 86400000)
}

function ctEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const expected = Deno.env.get('CRON_SECRET') || ''
  const provided = req.headers.get('x-cron-secret') || ''
  if (!expected || !provided || !ctEq(expected, provided)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)


  let created = 0
  const skipped: string[] = []

  // 1) land_parcels with lease_end_date
  const { data: parcels } = await sb
    .from('land_parcels')
    .select('id,user_id,name,lease_end_date,lease_type,lease_annual_eur')
    .not('lease_end_date', 'is', null)

  for (const p of parcels || []) {
    const d = daysUntil(p.lease_end_date as string)
    const hit = THRESHOLDS.find((t) => d <= t && d > t - 7)
    if (!hit) continue
    const title = `Erbpacht/Pacht endet in ${d} Tagen · ${p.name}`
    const { data: existing } = await sb.from('tasks').select('id')
      .eq('user_id', p.user_id).eq('title', title).limit(1).maybeSingle()
    if (existing) { skipped.push(p.id); continue }
    await sb.from('tasks').insert({
      user_id: p.user_id,
      title,
      description: `Grundstück „${p.name}" — Pachtende am ${p.lease_end_date}. Jetzt verlängern, neu verhandeln oder Heimfall prüfen.`,
      category: 'erbpacht',
      due_date: p.lease_end_date,
    })
    created++
  }

  // 2) properties with erbpacht_ende
  const { data: props } = await sb
    .from('properties')
    .select('id,user_id,name,erbpacht_ende,erbpacht_zins_jaehrlich')
    .not('erbpacht_ende', 'is', null)

  for (const pr of props || []) {
    const d = daysUntil(pr.erbpacht_ende as string)
    const hit = THRESHOLDS.find((t) => d <= t && d > t - 7)
    if (!hit) continue
    const title = `Erbbaurecht endet in ${d} Tagen · ${pr.name}`
    const { data: existing } = await sb.from('tasks').select('id')
      .eq('user_id', pr.user_id).eq('title', title).limit(1).maybeSingle()
    if (existing) { skipped.push(pr.id); continue }
    await sb.from('tasks').insert({
      user_id: pr.user_id,
      title,
      description: `Objekt „${pr.name}" — Erbbaurecht läuft am ${pr.erbpacht_ende} aus. Verlängerung / Ankauf jetzt anstoßen.`,
      category: 'erbpacht',
      due_date: pr.erbpacht_ende,
      property_id: pr.id,
    })
    created++
  }

  return new Response(JSON.stringify({ ok: true, created, skipped: skipped.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
