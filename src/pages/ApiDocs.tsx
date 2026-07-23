import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LegalFooter } from "@/components/LegalFooter";
import { usePageSeo } from "@/hooks/usePageSeo";
import { Code2, KeyRound, ArrowRight } from "lucide-react";

const BASE = "https://ikgwsdviewtvaitlpijg.supabase.co/functions/v1/public-api";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-zinc-950 text-zinc-100 rounded-md p-4 text-xs md:text-sm overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiDocs() {
  usePageSeo({
    title: "ImmonIQ Open API · Dokumentation",
    description: "Read-only REST API für Properties, Tenants und Payments. Zapier, n8n, DATEV oder eigene Skripte anbinden.",
    canonicalPath: "/api-docs",
  });
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold tracking-tight">ImmonIQ</Link>
          <Button asChild size="sm" className="gap-2">
            <Link to="/app/api-keys"><KeyRound className="h-4 w-4" /> API-Key erstellen</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <section>
          <Badge variant="outline" className="mb-3">v1 · Read-only</Badge>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Code2 className="h-8 w-8 text-primary" /> ImmonIQ Open API
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Zieh deine Immobiliendaten in Zapier, n8n, Excel, DATEV oder eigene Tools.
            Read-only REST-Endpoints, JSON-Response, geschützt per API-Key.
          </p>
        </section>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold text-lg">Authentifizierung</h2>
          <p className="text-sm text-muted-foreground">
            Jeder Request braucht deinen Key im Header <code className="bg-muted px-1 rounded">x-api-key</code>.
            Erstelle Keys im <Link className="text-primary underline" to="/app/api-keys">API-Key-Manager</Link>.
          </p>
          <CodeBlock>{`curl "${BASE}/v1/properties" \\
  -H "x-api-key: ilk_live_..."`}</CodeBlock>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-lg">Endpoints</h2>
          <div className="space-y-4 text-sm">
            <Endpoint method="GET" path="/v1/properties" desc="Liste aller Immobilien des Kontos." />
            <Endpoint method="GET" path="/v1/tenants" desc="Aktive Mieter mit Bezug zur Einheit." />
            <Endpoint method="GET" path="/v1/payments?from=2026-01-01&to=2026-12-31" desc="Zahlungseingänge im Zeitraum." />
            <Endpoint method="GET" path="/v1/expenses?from=…&to=…" desc="Belege inkl. Kategorie & Betrag." />
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold text-lg">Antwort-Format</h2>
          <CodeBlock>{`{
  "data": [
    { "id": "…", "name": "MFH Hauptstraße 12", "type": "wohnung", ... }
  ],
  "count": 1
}`}</CodeBlock>
          <p className="text-xs text-muted-foreground">
            Fehler: HTTP 401 (Key ungültig / widerrufen), 429 (Ratelimit), 400 (Parameter).
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold text-lg">Ratelimit & Sicherheit</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>60 Requests / Minute pro Key.</li>
            <li>Keys werden nur als SHA-256-Hash gespeichert.</li>
            <li>Zugriffe werden protokolliert und im Konto angezeigt.</li>
            <li>Widerruf sofort wirksam.</li>
          </ul>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <h2 className="font-semibold mb-2">Bereit?</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Erstelle deinen ersten Key und verbinde ImmonIQ mit deinem Workflow.
          </p>
          <Button asChild className="gap-2">
            <Link to="/app/api-keys">API-Key erstellen <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
      </main>
      <LegalFooter />
    </div>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 border-b last:border-0 pb-3 last:pb-0">
      <Badge className="font-mono">{method}</Badge>
      <div className="flex-1 min-w-0">
        <code className="text-xs md:text-sm break-all">{path}</code>
        <div className="text-xs text-muted-foreground mt-1">{desc}</div>
      </div>
    </div>
  );
}
