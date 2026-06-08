// Enable Banking — PSD2 Account Information + Auto-Matching (Mieten & Ausgaben)
// Actions: list_banks | start_auth | complete_auth | sync | rematch
//          | confirm_match | unmatch
//          | book_expense | learn_rule | list_rules | delete_rule
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

      return json({
        synced: totalInserted,
        auto_matched: matched.autoIn,
        auto_expenses: matched.autoOut,
        suggested: matched.suggested,
      });
    }

    if (action === "rematch") {
      const matched = await autoMatch(supabase, user.id);
      return json({
        auto_matched: matched.autoIn,
        auto_expenses: matched.autoOut,
        suggested: matched.suggested,
      });
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
        matched_expense_id: null,
        match_confidence: null,
      }).eq("id", transaction_id).eq("user_id", user.id);
      return json({ ok: true });
    }

    // ── EXPENSES ───────────────────────────────────────────
    if (action === "book_expense") {
      const {
        transaction_id,
        property_id,
        unit_id,
        category = "immediate",
        classification = "maintenance",
        vendor,
        description,
        nka_eligible = false,
        learn = true,
      } = params;
      if (!transaction_id) throw new Error("Missing transaction_id");
      const { data: tx } = await supabase.from("bank_transactions").select("*")
        .eq("id", transaction_id).eq("user_id", user.id).single();
      if (!tx) throw new Error("Transaction not found");
      if (tx.amount_cents >= 0) throw new Error("Transaction is not a debit");

      const expenseId = await bookExpense(supabase, user.id, tx, {
        property_id, unit_id, category, classification, vendor, description, nka_eligible,
      });

      if (learn) {
        await learnRule(supabase, user.id, tx, {
          target_kind: "expense",
          property_id, unit_id, category, classification, vendor, description, nka_eligible,
        });
      }
      return json({ ok: true, expense_id: expenseId });
    }

    if (action === "learn_rule") {
      const { match_kind, match_value, ...rest } = params;
      if (!match_kind || !match_value) throw new Error("Missing match_kind/value");
      const { data, error } = await supabase.from("bank_rules").insert({
        user_id: user.id,
        match_kind, match_value: String(match_value).toLowerCase().trim(),
        target_kind: rest.target_kind ?? "expense",
        expense_category: rest.expense_category ?? "immediate",
        expense_classification: rest.expense_classification ?? "maintenance",
        property_id: rest.property_id ?? null,
        unit_id: rest.unit_id ?? null,
        vendor: rest.vendor ?? null,
        description: rest.description ?? null,
        nka_eligible: !!rest.nka_eligible,
        auto_book: rest.auto_book !== false,
      }).select().single();
      if (error) throw error;
      return json({ ok: true, rule: data });
    }

    if (action === "list_rules") {
      const { data } = await supabase.from("bank_rules").select("*").order("hit_count", { ascending: false });
      return json({ rules: data ?? [] });
    }

    if (action === "delete_rule") {
      const { rule_id } = params;
      await supabase.from("bank_rules").delete().eq("id", rule_id).eq("user_id", user.id);
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
    .eq("user_id", userId).eq("match_status", "unmatched");
  if (!txs?.length) return { autoIn: 0, autoOut: 0, suggested: 0, autoLinked: 0 };

  // Belege/Ausgaben der letzten 30 Tage laden — für Anti-Doppelbuchung
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [tenantsRes, unitsRes, propsRes, rulesRes, expRes] = await Promise.all([
    supabase.from("tenants").select("id,full_name,iban,unit_id,property_id").eq("user_id", userId),
    supabase.from("units").select("id,property_id,rent_cold,utilities").eq("user_id", userId),
    supabase.from("properties").select("id,name").eq("user_id", userId),
    supabase.from("bank_rules").select("*").eq("user_id", userId),
    supabase.from("expenses").select("id,amount,spent_on,vendor,property_id,category")
      .eq("user_id", userId).gte("spent_on", since30),
  ]);
  const tenants = tenantsRes.data ?? [];
  const units = unitsRes.data ?? [];
  const properties = propsRes.data ?? [];
  const rules = rulesRes.data ?? [];
  const existingExpenses = expRes.data ?? [];
  const unitById: Record<string, any> = {};
  units.forEach((u: any) => { unitById[u.id] = u; });
  // Auto-property fallback: nur 1 Immobilie → immer diese
  const soleProperty = properties.length === 1 ? properties[0].id : null;

  let autoIn = 0, autoOut = 0, suggested = 0, autoLinked = 0;

  for (const tx of txs) {
    const credit = tx.amount_cents > 0;

    // ── EINGÄNGE (Miete) ─────────────────────────────────
    if (credit) {
      const ibanNorm = (tx.counterparty_iban ?? "").replace(/\s/g, "").toUpperCase();
      const name = (tx.counterparty_name ?? "").toLowerCase();
      const purpose = (tx.purpose ?? "").toLowerCase();
      const amt = tx.amount_cents;
      let best: { tenant: any; confidence: number } | null = null;

      if (ibanNorm) {
        const t = tenants.find((t: any) =>
          (t.iban ?? "").replace(/\s/g, "").toUpperCase() === ibanNorm);
        if (t) best = { tenant: t, confidence: 1.0 };
      }
      if (!best) {
        for (const t of tenants) {
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
        for (const t of tenants) {
          const lastName = (t.full_name ?? "").split(" ").pop()?.toLowerCase() ?? "";
          if (lastName.length > 2 && (name.includes(lastName) || purpose.includes(lastName))) {
            best = { tenant: t, confidence: 0.5 };
            break;
          }
        }
      }
      if (!best) continue;

      if (best.confidence >= 0.9) {
        try { await bookPayment(supabase, userId, tx, best.tenant.id, best.confidence); autoIn++; }
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
      continue;
    }

    // ── AUSGABEN ─────────────────────────────────────────
    // 0) Anti-Doppelbuchung: existiert bereits eine manuell erfasste Ausgabe
    //    mit gleichem Betrag (±0,02 €) und Datum ±5 Tage → verlinken statt neu anlegen
    {
      const txAmt = Math.abs(tx.amount_cents / 100);
      const txDate = new Date(tx.booking_date).getTime();
      const vendorNorm = (tx.counterparty_name ?? "").toLowerCase();
      const matchExp = existingExpenses.find((e: any) => {
        if (Math.abs(parseFloat(e.amount) - txAmt) > 0.02) return false;
        const diff = Math.abs(new Date(e.spent_on).getTime() - txDate) / 86400000;
        if (diff > 5) return false;
        // Bonus wenn vendor übereinstimmt
        return true;
      });
      if (matchExp) {
        await supabase.from("bank_transactions").update({
          match_status: "auto",
          matched_expense_id: matchExp.id,
          matched_property_id: matchExp.property_id,
          match_confidence: 0.95,
          category: matchExp.category,
        }).eq("id", tx.id);
        autoLinked++;
        continue;
      }
    }

    // 1) Gelernte Regel (höchste Priorität)
    const rule = findMatchingRule(tx, rules);
    if (rule) {
      if (rule.target_kind === "ignore") {
        await supabase.from("bank_transactions").update({
          match_status: "ignored", match_confidence: 1.0,
        }).eq("id", tx.id);
        await bumpRule(supabase, rule.id);
        continue;
      }
      if (rule.auto_book) {
        try {
          await bookExpense(supabase, userId, tx, {
            property_id: rule.property_id ?? soleProperty,
            unit_id: rule.unit_id,
            category: rule.expense_category,
            classification: rule.expense_classification,
            vendor: rule.vendor ?? tx.counterparty_name,
            description: rule.description,
            nka_eligible: rule.nka_eligible,
          }, 1.0);
          await bumpRule(supabase, rule.id);
          autoOut++;
          continue;
        } catch (e) { console.error("rule bookExpense err", e); }
      }
    }

    // 2) Heuristik (Vendor-Keywords)
    const guess = guessCategory(tx);
    if (guess) {
      await supabase.from("bank_transactions").update({
        match_status: "suggested",
        matched_property_id: soleProperty,
        match_confidence: guess.confidence,
        category: guess.category,
      }).eq("id", tx.id);
      suggested++;
    }
  }
  return { autoIn, autoOut, suggested, autoLinked };
}

// ── Vendor-Heuristik ─────────────────────────────────────────────────
type Guess = { category: string; classification: string; nka_eligible: boolean; confidence: number };
function guessCategory(tx: any): Guess | null {
  const hay = `${tx.counterparty_name ?? ""} ${tx.purpose ?? ""}`.toLowerCase();
  if (!hay.trim()) return null;
  const rules: { keys: string[]; out: Guess }[] = [
    { keys: ["versicher", "allianz", "huk", "axa", "ergo", "wgv"],
      out: { category: "immediate", classification: "maintenance", nka_eligible: true, confidence: 0.85 } },
    { keys: ["stadtwerke", "vattenfall", "e.on", "eon ", "ewe", "rwe", "enbw", " strom", "gas ", "fernwärme"],
      out: { category: "utilities_passthrough", classification: "maintenance", nka_eligible: true, confidence: 0.9 } },
    { keys: ["wasser", "abwasser", "stadtentwässer", "stadtwerk"],
      out: { category: "utilities_passthrough", classification: "maintenance", nka_eligible: true, confidence: 0.9 } },
    { keys: ["grundsteuer", "finanzamt"],
      out: { category: "immediate", classification: "maintenance", nka_eligible: false, confidence: 0.9 } },
    { keys: ["hausverwaltung", "hausmeister", "schornsteinfeger"],
      out: { category: "immediate", classification: "maintenance", nka_eligible: true, confidence: 0.85 } },
    { keys: ["handwerk", "reparatur", "sanitär", "elektro", "klempner", "heizung", "maler"],
      out: { category: "immediate", classification: "maintenance", nka_eligible: false, confidence: 0.7 } },
    { keys: ["darlehen", "kredit", "zins", "tilgung", "annuit", " kfw"],
      out: { category: "financing", classification: "maintenance", nka_eligible: false, confidence: 0.85 } },
    { keys: ["müll", "abfall", "entsorg"],
      out: { category: "utilities_passthrough", classification: "maintenance", nka_eligible: true, confidence: 0.9 } },
  ];
  for (const r of rules) if (r.keys.some(k => hay.includes(k))) return r.out;
  return null;
}

function findMatchingRule(tx: any, rules: any[]): any | null {
  const iban = (tx.counterparty_iban ?? "").replace(/\s/g, "").toLowerCase();
  const name = (tx.counterparty_name ?? "").toLowerCase();
  const purpose = (tx.purpose ?? "").toLowerCase();
  // IBAN exakt > Name contains > Purpose contains
  for (const r of rules) {
    if (r.match_kind === "iban" && iban && r.match_value === iban) return r;
  }
  for (const r of rules) {
    if (r.match_kind === "name" && r.match_value && name.includes(r.match_value)) return r;
  }
  for (const r of rules) {
    if (r.match_kind === "purpose" && r.match_value && purpose.includes(r.match_value)) return r;
  }
  return null;
}

async function bumpRule(supabase: any, ruleId: string) {
  // best-effort
  await supabase.rpc("noop").catch(() => null);
  await supabase.from("bank_rules").update({
    last_hit_at: new Date().toISOString(),
  }).eq("id", ruleId);
  // increment via SQL (rpc not present) — fallback two-step:
  const { data } = await supabase.from("bank_rules").select("hit_count").eq("id", ruleId).single();
  if (data) await supabase.from("bank_rules").update({ hit_count: (data.hit_count ?? 0) + 1 }).eq("id", ruleId);
}

async function learnRule(supabase: any, userId: string, tx: any, opts: any) {
  // Bevorzugt IBAN, sonst Counterparty-Name
  const iban = (tx.counterparty_iban ?? "").replace(/\s/g, "").toLowerCase();
  const name = (tx.counterparty_name ?? "").toLowerCase().trim();
  let match_kind: "iban" | "name" | null = null;
  let match_value = "";
  if (iban) { match_kind = "iban"; match_value = iban; }
  else if (name.length >= 3) { match_kind = "name"; match_value = name; }
  if (!match_kind) return;

  // Dedupe: gleicher User + Kind + Value → update statt insert
  const { data: existing } = await supabase.from("bank_rules").select("id")
    .eq("user_id", userId).eq("match_kind", match_kind).eq("match_value", match_value).maybeSingle();
  if (existing) {
    await supabase.from("bank_rules").update({
      target_kind: opts.target_kind ?? "expense",
      expense_category: opts.category,
      expense_classification: opts.classification,
      property_id: opts.property_id ?? null,
      unit_id: opts.unit_id ?? null,
      vendor: opts.vendor ?? null,
      description: opts.description ?? null,
      nka_eligible: !!opts.nka_eligible,
    }).eq("id", existing.id);
  } else {
    await supabase.from("bank_rules").insert({
      user_id: userId,
      match_kind, match_value,
      target_kind: opts.target_kind ?? "expense",
      expense_category: opts.category,
      expense_classification: opts.classification,
      property_id: opts.property_id ?? null,
      unit_id: opts.unit_id ?? null,
      vendor: opts.vendor ?? null,
      description: opts.description ?? null,
      nka_eligible: !!opts.nka_eligible,
      auto_book: true,
    });
  }
}

async function bookExpense(supabase: any, userId: string, tx: any, opts: any, confidence = 1.0) {
  const amount = Math.abs(tx.amount_cents / 100).toFixed(2);
  // Dedupe: gleiche Transaktion nicht doppelt verbuchen
  if (tx.matched_expense_id) return tx.matched_expense_id;

  const { data: exp, error } = await supabase.from("expenses").insert({
    user_id: userId,
    property_id: opts.property_id ?? null,
    unit_id: opts.unit_id ?? null,
    spent_on: tx.booking_date,
    amount,
    vendor: opts.vendor ?? tx.counterparty_name ?? null,
    description: opts.description ?? tx.purpose ?? null,
    category: opts.category ?? "immediate",
    classification: opts.classification ?? "maintenance",
    nka_eligible: !!opts.nka_eligible,
  }).select("id").single();
  if (error) throw error;

  await supabase.from("bank_transactions").update({
    match_status: confidence >= 1.0 ? "auto" : "confirmed",
    matched_expense_id: exp.id,
    matched_property_id: opts.property_id ?? null,
    match_confidence: confidence,
    category: opts.category ?? "immediate",
  }).eq("id", tx.id);
  return exp.id;
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
