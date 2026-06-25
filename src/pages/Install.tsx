import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Apple, Chrome, Share, Plus, Download, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageSeo } from "@/hooks/usePageSeo";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: any;
  }
}

const Install = () => {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  usePageSeo({
    title: "App installieren — iPhone, Android, Desktop · ImmonIQ",
    description: "ImmonIQ als App auf dem Homescreen installieren — iOS, Android, Chrome, Safari. In wenigen Sekunden eingerichtet, ohne App-Store.",
    canonicalPath: "/install",
  });

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/15 text-primary">
            <Download className="h-3 w-3" /> App-Installation
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            ImmonIQ als App installieren
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Auf dem Homescreen wie eine echte App — funktioniert offline, lädt sofort, ohne App Store.
          </p>
        </div>

        {installed ? (
          <Card className="p-8 text-center border-primary/40 bg-primary/5">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
            <p className="text-lg font-semibold">App ist installiert ✨</p>
            <p className="text-sm text-muted-foreground mt-1">Du kannst dieses Fenster jetzt schließen.</p>
            <Button asChild className="mt-4"><Link to="/app">Zum Dashboard</Link></Button>
          </Card>
        ) : deferred ? (
          <Card className="p-8 text-center border-primary/40">
            <p className="text-lg font-semibold mb-3">1-Klick Installation verfügbar</p>
            <Button size="lg" onClick={install} className="h-12 px-8">
              <Download className="mr-2 h-5 w-5" /> Jetzt installieren
            </Button>
          </Card>
        ) : null}

        <div className="grid md:grid-cols-2 gap-4">
          <Card className={`p-6 ${isIOS ? "border-primary/40 ring-2 ring-primary/20" : ""}`}>
            <div className="flex items-center gap-2 mb-3">
              <Apple className="h-5 w-5" />
              <h2 className="font-semibold">iPhone / iPad</h2>
              {isIOS && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">DEIN GERÄT</span>}
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3"><span className="font-mono text-primary">1.</span> Safari öffnen (nicht Chrome)</li>
              <li className="flex gap-3"><span className="font-mono text-primary">2.</span> Auf <Share className="inline h-4 w-4 mx-1" /> <strong>Teilen</strong> tippen</li>
              <li className="flex gap-3"><span className="font-mono text-primary">3.</span> <Plus className="inline h-4 w-4 mx-1" /> <strong>„Zum Home-Bildschirm"</strong></li>
              <li className="flex gap-3"><span className="font-mono text-primary">4.</span> Fertig — Icon ist auf dem Homescreen</li>
            </ol>
          </Card>

          <Card className={`p-6 ${isAndroid ? "border-primary/40 ring-2 ring-primary/20" : ""}`}>
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-5 w-5" />
              <h2 className="font-semibold">Android</h2>
              {isAndroid && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">DEIN GERÄT</span>}
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3"><span className="font-mono text-primary">1.</span> Chrome öffnen</li>
              <li className="flex gap-3"><span className="font-mono text-primary">2.</span> Menü <strong>⋮</strong> oben rechts</li>
              <li className="flex gap-3"><span className="font-mono text-primary">3.</span> <strong>„App installieren"</strong> oder <strong>„Zum Startbildschirm"</strong></li>
              <li className="flex gap-3"><span className="font-mono text-primary">4.</span> Fertig</li>
            </ol>
          </Card>

          <Card className="p-6 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="h-5 w-5" />
              <h2 className="font-semibold">Desktop (Windows / Mac / Linux)</h2>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3"><span className="font-mono text-primary">1.</span> Chrome, Edge oder Brave öffnen</li>
              <li className="flex gap-3"><span className="font-mono text-primary">2.</span> Rechts in der Adressleiste auf das <Download className="inline h-4 w-4 mx-1" /> <strong>Installieren-Symbol</strong> klicken</li>
              <li className="flex gap-3"><span className="font-mono text-primary">3.</span> ImmonIQ läuft als eigenständiges Fenster — wie eine native Desktop-App</li>
            </ol>
          </Card>
        </div>

        <Card className="p-6 bg-muted/30 border-dashed">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Chrome className="h-4 w-4" /> Was du bekommst
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>App-Icon direkt auf dem Homescreen</li>
            <li>Vollbild ohne Browser-Leiste</li>
            <li>Schneller Start, auch bei schlechter Verbindung</li>
            <li>Push-Benachrichtigungen für neue Bewerbungen (kommt)</li>
            <li>Keine App-Store-Genehmigung, kein Warten</li>
          </ul>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Native iOS/Android-Apps (App Store / Google Play) und eine eigenständige Desktop-App (.exe / .dmg) sind möglich —
          Code dafür ist im Repo unter <code className="px-1.5 py-0.5 bg-muted rounded text-[11px]">electron/</code> vorbereitet. Kontaktiere uns für die fertige Distribution.
        </p>
      </div>
    </main>
  );
};

export default Install;
