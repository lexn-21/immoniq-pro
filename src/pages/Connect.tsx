import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ExternalLink, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const MCP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

export default function Connect() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = "ImmonIQ mit ChatGPT & Claude verbinden";
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    toast.success("URL kopiert");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/40">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold tracking-tight">ImmonIQ</Link>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" /> AI-Anbindung
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            ImmonIQ mit ChatGPT & Claude verbinden
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Verbinde deinen ImmonIQ-Account mit ChatGPT oder Claude und frag direkt im Chat
            nach Mieten, Ausgaben, Aufgaben oder Objekten — mit echten Daten aus deinem Cockpit.
          </p>
        </div>

        {/* URL Block */}
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Deine ImmonIQ MCP-Server-URL
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="flex-1 min-w-0 font-mono text-sm bg-background border rounded-md px-3 py-2 overflow-x-auto whitespace-nowrap">
              {MCP_URL}
            </code>
            <Button onClick={copy} className="gap-2 shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Kopiert" : "Kopieren"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Beim Verbinden loggst du dich mit deinem ImmonIQ-Account ein (OAuth). Die AI sieht
            nur deine eigenen Daten — Zugriff jederzeit widerrufbar.
          </p>
        </Card>

        {/* ChatGPT */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold">In ChatGPT verbinden</h2>
            <Button variant="outline" size="sm" asChild className="gap-1">
              <a
                href="https://chatgpt.com/#settings/Connectors/Advanced"
                target="_blank"
                rel="noreferrer"
              >
                ChatGPT-Einstellungen <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
          <ol className="space-y-3 text-sm">
            <Step n={1}>
              Öffne <span className="font-mono text-xs">chatgpt.com → Einstellungen → Connectors → Advanced</span> und
              aktiviere den <strong>Developer Mode</strong> (Hinweis lesen).
            </Step>
            <Step n={2}>
              Im Chat unten auf <strong>„+"</strong> klicken → <strong>Developer Mode</strong> einschalten.
            </Step>
            <Step n={3}>
              <strong>„Add sources"</strong> → <strong>„Connect more"</strong> wählen.
            </Step>
            <Step n={4}>
              Name z. B. <em>ImmonIQ</em> vergeben und die oben kopierte URL einfügen. Mit
              ImmonIQ-Account einloggen und bestätigen.
            </Step>
            <Step n={5}>
              Frage ChatGPT z. B.: <em>„Wieviel Miete ist diesen Monat schon eingegangen?"</em>
            </Step>
          </ol>
        </Card>

        {/* Claude */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold">In Claude verbinden</h2>
            <Button variant="outline" size="sm" asChild className="gap-1">
              <a
                href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                target="_blank"
                rel="noreferrer"
              >
                Claude-Connector öffnen <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
          <ol className="space-y-3 text-sm">
            <Step n={1}>
              Öffne <span className="font-mono text-xs">claude.ai → Settings → Connectors → Add custom connector</span>.
            </Step>
            <Step n={2}>
              Name z. B. <em>ImmonIQ</em> vergeben und die oben kopierte URL einfügen. Mit
              ImmonIQ-Account einloggen.
            </Step>
            <Step n={3}>
              Im Chat den Connector aktivieren und Claude direkt fragen, z. B.:
              <em> „Trag 320 € Heizungswartung für heute in ImmonIQ ein."</em>
            </Step>
          </ol>
        </Card>

        {/* What you can do */}
        <Card className="p-6 bg-muted/30">
          <h3 className="font-semibold mb-2">Was du im AI-Chat machen kannst</h3>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            <li>• Mieten, Zahlungen und Salden in Echtzeit abfragen</li>
            <li>• Ausgaben eintragen — direkt live in deiner Immobilien-DB</li>
            <li>• Offene Aufgaben, Mieter und Objekte durchsuchen</li>
            <li>• Zusammenfassungen, PDFs und Reports von der AI erstellen lassen</li>
          </ul>
          <Button asChild variant="default" className="mt-4 gap-2">
            <Link to="/app">Zurück ins Cockpit <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Probleme mit der Verbindung? Schreib uns über den Support-Chat im Cockpit.
        </p>
      </main>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold grid place-items-center">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
