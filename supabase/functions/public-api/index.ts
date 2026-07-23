// ImmonIQ Open API v1 — read-only, API-Key-authenticated.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Simple in-memory ratelimit: 60 req/min per key hash.
const bucket = new Map<string, { count: number; reset: number }>();
function rateLimited(hash: string): boolean {
  const now = Date.now();
  const cur = bucket.get(hash);
  if (!cur || cur.reset < now) {
    bucket.set(hash, { count: 1, reset: now + 60_000 });
    return false;
  }
  cur.count += 1;
  return cur.count > 60;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const rawKey = req.headers.get("x-api-key");
  if (!rawKey || !/^ilk_[a-z]+_[a-f0-9]{32,}$/i.test(rawKey)) {
    return json({ error: "missing_or_malformed_api_key" }, 401);
  }
  const hash = await sha256Hex(rawKey);
  if (rateLimited(hash)) return json({ error: "rate_limited" }, 429);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: keyRow, error: keyErr } = await admin
    .from("api_keys")
    .select("id,user_id,scopes,revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (keyErr || !keyRow || keyRow.revoked_at) {
    return json({ error: "invalid_api_key" }, 401);
  }
  const userId = keyRow.user_id as string;

  // Fire-and-forget: last_used_at.
  admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id).then(() => {});

  const url = new URL(req.url);
  // Path is /public-api/v1/<resource>. Strip both function name and any prefix.
  const parts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  const vIdx = parts.findIndex((p) => p === "v1");
  const resource = vIdx >= 0 ? parts[vIdx + 1] : parts[parts.length - 1];

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

  try {
    switch (resource) {
      case "properties": {
        const { data, error } = await admin
          .from("properties")
          .select("id,name,type,street,zip,city,created_at")
          .eq("user_id", userId)
          .limit(limit);
        if (error) throw error;
        return json({ data, count: data?.length ?? 0 });
      }
      case "tenants": {
        const { data, error } = await admin
          .from("tenants")
          .select("id,full_name,email,property_id,unit_id,lease_start,lease_end,deposit,since,created_at")
          .eq("user_id", userId)
          .limit(limit);
        if (error) throw error;
        return json({ data, count: data?.length ?? 0 });
      }
      case "payments": {
        let q = admin.from("payments")
          .select("id,tenant_id,property_id,unit_id,amount,paid_on,kind,status,note,created_at")
          .eq("user_id", userId)
          .order("paid_on", { ascending: false })
          .limit(limit);
        if (from) q = q.gte("paid_on", from);
        if (to) q = q.lte("paid_on", to);
        const { data, error } = await q;
        if (error) throw error;
        return json({ data, count: data?.length ?? 0 });
      }
      case "expenses": {
        let q = admin.from("expenses")
          .select("id,property_id,unit_id,amount,category,vendor,spent_on,description,created_at")
          .eq("user_id", userId)
          .order("spent_on", { ascending: false })
          .limit(limit);
        if (from) q = q.gte("spent_on", from);
        if (to) q = q.lte("spent_on", to);
        const { data, error } = await q;
        if (error) throw error;
        return json({ data, count: data?.length ?? 0 });
      }
      default:
        return json({ error: "unknown_resource", available: ["properties", "tenants", "payments", "expenses"] }, 404);
    }
  } catch (e: any) {
    console.error("[public-api] error", e);
    return json({ error: "internal_error", details: e?.message ?? String(e) }, 500);
  }
});
