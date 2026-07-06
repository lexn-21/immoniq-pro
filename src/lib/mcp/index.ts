import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProperties from "./tools/list-properties";
import listTenants from "./tools/list-tenants";
import listPayments from "./tools/list-payments";
import createExpense from "./tools/create-expense";
import listTasks from "./tools/list-tasks";

// Direct Supabase host, built from the project ref (Vite inlines this at build).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "immoniq-mcp",
  title: "ImmonIQ",
  version: "0.1.0",
  instructions:
    "Tools für ImmonIQ, das digitale Vermieter-Cockpit. Lies Immobilien, Mieter, Zahlungen und Aufgaben oder erfasse Ausgaben im Namen des angemeldeten Nutzers.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProperties, listTenants, listPayments, createExpense, listTasks],
});
