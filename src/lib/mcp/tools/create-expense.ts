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
  name: "create_expense",
  title: "Ausgabe erfassen",
  description: "Erfasst eine neue Ausgabe (Handwerker, Versicherung, Zinsen etc.) für ein Objekt.",
  inputSchema: {
    property_id: z.string().uuid().describe("Objekt-ID (aus list_properties)"),
    spent_on: z.string().describe("Datum YYYY-MM-DD"),
    amount: z.number().positive().describe("Betrag in Euro"),
    description: z.string().min(1).describe("Kurzbeschreibung"),
    vendor: z.string().optional().describe("Rechnungssteller"),
    category: z
      .enum(["immediate", "depreciable", "financing", "utilities_passthrough", "other"])
      .optional()
      .describe("Steuerkategorie"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await client(ctx)
      .from("expenses")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Ausgabe erfasst: ${data.id}` }],
      structuredContent: { expense: data },
    };
  },
});
