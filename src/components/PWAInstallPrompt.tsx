import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone } from "lucide-react";

// PWA-Install-Prompt — zeigt einen unaufdringlichen Banner, wenn der Browser
// Installation unterstützt. iOS hat kein Event, daher Hinweis manuell.
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "immoniq.pwa.dismissed.v1";

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    // bereits installiert?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP as EventListener);

    // iOS Safari erkennen (kein beforeinstallprompt)
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    if (isIos && isSafari) {
      // delay leicht, damit nicht direkt beim Reload poppt
      const t = setTimeout(() => { setIosHint(true); setVisible(true); }, 4000);
      return () => clearTimeout(t);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBIP as EventListener);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-4">
      <Card className="glass border-primary/30 shadow-2xl">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">ImmonIQ als App installieren</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {iosHint
                ? "Tippe auf „Teilen" und „Zum Home-Bildschirm" — schneller Start, Offline-Tresor, Push."
                : "Schneller Start, Offline-Tresor, Push-Benachrichtigungen."}
            </p>
            {!iosHint && (
              <Button size="sm" className="mt-2" onClick={install}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Installieren
              </Button>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={dismiss}>
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
