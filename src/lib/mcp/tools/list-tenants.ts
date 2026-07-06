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
  name: "list_tenants",
  title: "Mieter auflisten",
  description: "Listet Mieter des angemeldeten Vermieters. Optional nach Objekt-ID gefiltert.",
  inputSchema: {
    property_id: z.string().uuid().optional().describe("Optional: nur Mieter dieses Objekts"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ property_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = client(ctx)
      .from("tenants")
      .select("id,full_name,email,phone,lease_start,lease_end,deposit,property_id")
      .order("full_name");
    if (property_id) q = q.eq("property_id", property_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tenants: data ?? [] },
    };
  },
});
