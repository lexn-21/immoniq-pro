// Enable Banking integration — PSD2 Account Information + Auto-Matching
// Actions: list_banks | start_auth | complete_auth | sync | rematch | confirm_match | unmatch
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EB_BASE = "https://api.enablebanking.com";
const APP_ID = Deno.env.get("ENABLE_BANKING_APP_ID")!;
const PRIVATE_KEY_PEM = Deno.env.get("ENABLE_BANKING_PRIVATE_KEY")!;

function b64url(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") bytes = new TextEncoder().encode(data);
  else if (data instanceof Uint8Array) bytes = data;
  else bytes = new Uint8Array(data);
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedKey: CryptoKey | null = null;
async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    "pkcs8", pemToArrayBuffer(PRIVATE_KEY_PEM),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  return cachedKey;
}

async function makeJWT(): Promise<string> {
  const header = { typ: "JWT", alg: "RS256", kid: APP_ID };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + 3600 };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await getKey(), new TextEncoder().encode(signingInput));
  return `${signingInput}.${b64url(sig)}`;
}

async function ebFetch(path: string, init: RequestInit = {}): Promise<any> {
  const jwt = await makeJWT();
  const res = await fetch(`${EB_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  if (!res.ok) { console.error(`EB ${path} ${res.status}: ${text}`); throw new Error(`Enable Banking API ${res.status}: ${text}`); }
  return text ? JSON.parse(text) : {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Unauthorized");

    const { action, ...params } = await req.json();

    if (action === "list_banks") {
      const country = params.country || "DE";
      const data = await ebFetch(`/aspsps?country=${country}`);
      return json({ banks: data.aspsps ?? [] });
    }

    if (action === "start_auth") {
      const { bank_name, country, redirect_url } = params;
      if (!bank_name || !country || !redirect_url) throw new Error("Missing params");
      const valid_until = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString();
      const body = {
        access: { valid_until },
        aspsp: { name: bank_name, country },
        state: crypto.randomUUID(),
        redirect_url,
        psu_type: "personal",
      };
      const data = await ebFetch(`/auth`, { method: "POST", body: JSON.stringify(body) });
      return json({ url: data.url, state: body.state, bank_name, country });
    }

    if (action === "complete_auth") {
      const { code, bank_name, country } = params;
      if (!code) throw new Error("Missing code");
      const session = await ebFetch(`/sessions`, { method: "POST", body: JSON.stringify({ code }) });
      const { data: conn, error: connErr } = await supabase.from("bank_connections").insert({
        user_id: user.id,
        provider: "enable_banking",
        requisition_id: session.session_id,
        institution_id: bank_name || session.aspsp?.name || "unknown",
        institution_name: session.aspsp?.name || bank_name,
        status: "active",
        valid_until: session.access?.valid_until ?? null,
      }).select().single();
      if (connErr) throw connErr;

      const accountRows = (session.accounts ?? []).map((a: any) => ({
        user_id: user.id,
        connection_id: conn.id,
        external_id: a.uid,
        iban: a.account_id?.iban ?? null,
        owner_name: a.name ?? null,
        currency: a.currency ?? "EUR",
      }));
      if (accountRows.length) {
        const { error: accErr } = await supabase.from("bank_accounts").insert(accountRows);
        if (accErr) throw accErr;
      }
      return json({ connection_id: conn.id, accounts: accountRows.length });
    }

    if (action === "sync") {
      const { connection_id } = params;
      if (!connection_id) throw new Error("Missing connection_id");
      const { data: conn } = await supabase.from("bank_connections").select("*")
        .eq("id", connection_id).eq("user_id", user.id).single();
      if (!conn) throw new Error("Connection not found");

      const { data: accounts } = await supabase.from("bank_accounts").select("*").eq("connection_id", connection_id);

      let totalInserted = 0;
      const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);

      for (const acc of accounts ?? []) {
        try {
          const bal = await ebFetch(`/accounts/${acc.external_id}/balances`);
          const main = bal.balances?.find((b: any) => b.balance_type === "CLBD") ?? bal.balances?.[0];
          if (main?.balance_amount?.amount) {
            await supabase.from("bank_accounts").update({
              balance_cents: Math.round(parseFloat(main.balance_amount.amount) * 100),
              balance_updated_at: new Date().toISOString(),
            }).eq("id", acc.id);
          }
        } catch (e) { console.error("balance err", e); }

        let continuation: string | null = null;
        do {
          const qs = new URLSearchParams({ date_from: since });
          if (continuation) qs.set("continuation_key", continuation);
          const tx: any = await ebFetch(`/accounts/${acc.external_id}/transactions?${qs}`);
          const rows = (tx.transactions ?? []).map((t: any) => {
            const amt = parseFloat(t.transaction_amount?.amount ?? "0");
            const credit = t.credit_debit_indicator === "CRDT";
            return {
              user_id: user.id,
              account_id: acc.id,
              external_id: t.entry_reference || t.transaction_id || `${t.booking_date}-${amt}-${crypto.randomUUID()}`,
              booking_date: t.booking_date,
              value_date: t.value_date ?? null,
              amount_cents: Math.round((credit ? amt : -amt) * 100),
              currency: t.transaction_amount?.currency ?? "EUR",
              counterparty_name: credit ? (t.debtor?.name ?? null) : (t.creditor?.name ?? null),
              counterparty_iban: credit ? (t.debtor_account?.iban ?? null) : (t.creditor_account?.iban ?? null),
              purpose: t.remittance_information?.join(" ") ?? null,
              raw: t,
            };
          });
          if (rows.length) {
            const { error, count } = await supabase.from("bank_transactions")
              .upsert(rows, { onConflict: "account_id,external_id", ignoreDuplicates: true, count: "exact" });
            if (error) console.error("tx upsert err", error);
            totalInserted += count ?? rows.length;
          }
          continuation = tx.continuation_key ?? null;
        } while (continuation);
      }

      const matched = await autoMatch(supabase, user.id);

      await supabase.from("bank_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", connection_id);

      return json({ synced: totalInserted, auto_matched: matched.auto, suggested: matched.suggested });
    }

    if (action === "rematch") {
      const matched = await autoMatch(supabase, user.id);
      return json({ auto_matched: matched.auto, suggested: matched.suggested });
    }

    if (action === "confirm_match") {
      const { transaction_id, tenant_id } = params;
      if (!transaction_id) throw new Error("Missing transaction_id");
      const { data: tx } = await supabase.from("bank_transactions").select("*")
        .eq("id", transaction_id).eq("user_id", user.id).single();
      if (!tx) throw new Error("Transaction not found");
      const tId = tenant_id ?? tx.matched_tenant_id;
      if (!tId) throw new Error("No tenant to assign");
      const pid = await bookPayment(supabase, user.id, tx, tId, 1.0);
      return json({ ok: true, payment_id: pid });
    }

    if (action === "unmatch") {
      const { transaction_id } = params;
      await supabase.from("bank_transactions").update({
        match_status: "ignored",
        matched_tenant_id: null,
        matched_property_id: null,
        match_confidence: null,
      }).eq("id", transaction_id).eq("user_id", user.id);
      return json({ ok: true });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e: any) {
    console.error("enable-banking error", e);
    return json({ error: e.message ?? String(e) }, 400);
  }
});

// ── Auto-Matching ────────────────────────────────────────────────────
async function autoMatch(supabase: any, userId: string) {
  const { data: txs } = await supabase
    .from("bank_transactions").select("*")
    .eq("user_id", userId).eq("match_status", "unmatched")
    .gt("amount_cents", 0);
  if (!txs?.length) return { auto: 0, suggested: 0 };

  const { data: tenants } = await supabase
    .from("tenants").select("id,full_name,iban,unit_id,property_id").eq("user_id", userId);
  const { data: units } = await supabase
    .from("units").select("id,property_id,rent_cold,utilities").eq("user_id", userId);
  const unitById: Record<string, any> = {};
  (units ?? []).forEach((u: any) => { unitById[u.id] = u; });

  let auto = 0, suggested = 0;
  for (const tx of txs) {
    const ibanNorm = (tx.counterparty_iban ?? "").replace(/\s/g, "").toUpperCase();
    const name = (tx.counterparty_name ?? "").toLowerCase();
    const purpose = (tx.purpose ?? "").toLowerCase();
    const amt = tx.amount_cents;

    let best: { tenant: any; confidence: number } | null = null;

    if (ibanNorm) {
      const t = (tenants ?? []).find((t: any) =>
        (t.iban ?? "").replace(/\s/g, "").toUpperCase() === ibanNorm);
      if (t) best = { tenant: t, confidence: 1.0 };
    }

    if (!best) {
      for (const t of tenants ?? []) {
        const u = unitById[t.unit_id];
        if (!u) continue;
        const cold = Math.round((u.rent_cold ?? 0) * 100);
        const warm = cold + Math.round((u.utilities ?? 0) * 100);
        if (amt === cold || amt === warm) {
          const lastName = (t.full_name ?? "").split(" ").pop()?.toLowerCase() ?? "";
          const nameHit = lastName.length > 2 && (name.includes(lastName) || purpose.includes(lastName));
          best = { tenant: t, confidence: nameHit ? 0.95 : 0.7 };
          if (nameHit) break;
        }
      }
    }

    if (!best && (name || purpose)) {
      for (const t of tenants ?? []) {
        const lastName = (t.full_name ?? "").split(" ").pop()?.toLowerCase() ?? "";
        if (lastName.length > 2 && (name.includes(lastName) || purpose.includes(lastName))) {
          best = { tenant: t, confidence: 0.5 };
          break;
        }
      }
    }

    if (!best) continue;

    if (best.confidence >= 0.9) {
      try { await bookPayment(supabase, userId, tx, best.tenant.id, best.confidence); auto++; }
      catch (e) { console.error("bookPayment err", e); }
    } else {
      await supabase.from("bank_transactions").update({
        match_status: "suggested",
        matched_tenant_id: best.tenant.id,
        matched_property_id: best.tenant.property_id,
        match_confidence: best.confidence,
      }).eq("id", tx.id);
      suggested++;
    }
  }
  return { auto, suggested };
}

async function bookPayment(supabase: any, userId: string, tx: any, tenantId: string, confidence = 1.0) {
  const { data: t } = await supabase
    .from("tenants").select("unit_id,property_id").eq("id", tenantId).single();
  const amount = (tx.amount_cents / 100).toFixed(2);
  const { data: existing } = await supabase
    .from("payments").select("id")
    .eq("user_id", userId).eq("tenant_id", tenantId)
    .eq("paid_on", tx.booking_date).eq("amount", amount)
    .maybeSingle();
  let paymentId = existing?.id;
  if (!paymentId) {
    const { data: pay, error } = await supabase.from("payments").insert({
      user_id: userId,
      tenant_id: tenantId,
      unit_id: t?.unit_id ?? null,
      property_id: t?.property_id ?? null,
      paid_on: tx.booking_date,
      amount,
      kind: "rent_cold",
      type: "rent",
      status: "paid",
      note: `Auto-Verbuchung Bank · ${tx.counterparty_name ?? ""} ${tx.purpose ?? ""}`.trim().slice(0, 250),
    }).select("id").single();
    if (error) throw error;
    paymentId = pay.id;
  }
  await supabase.from("bank_transactions").update({
    match_status: confidence >= 1.0 ? "auto" : "confirmed",
    matched_tenant_id: tenantId,
    matched_property_id: t?.property_id ?? null,
    match_confidence: confidence,
  }).eq("id", tx.id);
  return paymentId;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
