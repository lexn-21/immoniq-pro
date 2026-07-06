import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_payments",
  title: "Zahlungen auflisten",
  description: "Listet die letzten Zahlungen (Mieteingänge, NK-Vorauszahlungen) des Vermieters.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Maximale Anzahl (Standard 50)"),
    since: z.string().optional().describe("Nur Zahlungen ab diesem Datum (YYYY-MM-DD)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, since }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = client(ctx)
      .from("payments")
      .select("id,paid_on,kind,amount,note,tenant_id,property_id")
      .order("paid_on", { ascending: false })
      .limit(limit ?? 50);
    if (since) q = q.gte("paid_on", since);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { payments: data ?? [] },
    };
  },
});
