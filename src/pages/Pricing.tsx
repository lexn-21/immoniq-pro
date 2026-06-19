import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, ArrowLeft, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Checkbox } from "@/components/ui/checkbox";

const FREE_FEATURES = [
  "1 selbstgenutzte Immobilie",
  "Belege & Dokumente ablegen",
  "Tresor (Basis)",
  "Renditen-Rechner",
  "Steuer-Light: Anlage V Vorbereitung",
];

const VERWALTEN_FEATURES = [
  "Bis zu 5 vermietete Objekte",
  "Mieter & Mietverträge verwalten",
  "Zahlungen & SEPA-Tracking",
  "Mahnwesen mit KI-Briefen",
  "Nebenkosten-Abrechnung",
  "Steuer-Export (Anlage V)",
  "Tresor verschlüsselt",
  "Mieter-Portal (Schadensmeldung)",
];

const PRO_FEATURES = [
  "Alles aus Verwalten+",
  "Unbegrenzt Objekte",
  "Markt: Inserieren & Bewerber-Scoring",
  "KI-Copilot (Steuer, Recht, Optimierung)",
  "AVM Wert-Schätzung & Markt-Benchmark",
  "Bonitäts-Check & Mieter-Pass",
  "Banking-Anbindung (PSD2)",
  "Berater-Zugriff (Steuerberater)",
  "Dokumenten-Scanner (OCR)",
  "Priorisierter Support",
];

type Cycle = "monthly" | "yearly";
type CheckoutTarget = { priceId: string; label: string } | null;

// Preise in Cent für Monatsanzeige
const PRICES = {
  verwalten_plus: {
    monthly: { id: "verwalten_plus_monthly_v2", cents: 790 },
    yearly: { id: "verwalten_plus_yearly", cents: 7900, perMonthCents: 658 },
  },
  pro: {
    monthly: { id: "pro_monthly_v2", cents: 1990 },
    yearly: { id: "pro_yearly", cents: 19900, perMonthCents: 1658 },
  },
};

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Pricing() {
  const { user } = useAuth();
  const { hasManageAccess, isTrial, trialDaysLeft, hasActiveSubscription, tier } = useSubscription();
  const navigate = useNavigate();
  const [target, setTarget] = useState<CheckoutTarget>(null);
  const [waiverConsent, setWaiverConsent] = useState(false);
  const [cycle, setCycle] = useState<Cycle>("yearly");

  const start = (priceId: string, label: string) => {
    if (!user) {
      navigate("/auth?next=/pricing");
      return;
    }
    setWaiverConsent(false);
    setTarget({ priceId, label });
  };

  const vp = PRICES.verwalten_plus[cycle];
  const pro = PRICES.pro[cycle];

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Drei Pläne. Klar geschnitten.</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Free für Selbstnutzer. Verwalten+ für Vermieter. Pro für alles — inkl. Vermarktung, KI & Banking.
            30 Tage Pro-Trial automatisch nach Registrierung.
          </p>
          {isTrial && (
            <p className="mt-4 inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              🎁 Du bist im Pro-Trial · noch {trialDaysLeft} Tag{trialDaysLeft === 1 ? "" : "e"}
            </p>
          )}
        </div>

        {/* Cycle Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center bg-muted rounded-full p-1 text-sm">
            <button
              onClick={() => setCycle("monthly")}
              className={`px-4 py-1.5 rounded-full transition ${
                cycle === "monthly" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
              }`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={`px-4 py-1.5 rounded-full transition flex items-center gap-2 ${
                cycle === "yearly" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
              }`}
            >
              Jährlich
              <span className="bg-success/15 text-success text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                −17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* FREE */}
          <Card className="p-7 flex flex-col">
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Home className="h-5 w-5 text-muted-foreground" /> Free
              </h2>
              <p className="text-sm text-muted-foreground">Eigene Immobilie, selbstgenutzt</p>
            </div>
            <div className="mb-5">
              <span className="text-4xl font-bold">0 €</span>
              <span className="text-muted-foreground">/Monat</span>
            </div>
            <ul className="space-y-2.5 mb-7 text-sm flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" disabled className="w-full">
              {tier === "free" && user ? "Aktueller Plan" : "Mit Free starten"}
            </Button>
          </Card>

          {/* VERWALTEN+ */}
          <Card className="p-7 flex flex-col">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Verwalten+</h2>
              <p className="text-sm text-muted-foreground">Für Vermieter</p>
            </div>
            <div className="mb-5">
              {cycle === "yearly" ? (
                <>
                  <span className="text-4xl font-bold">{fmt(vp.perMonthCents!)} €</span>
                  <span className="text-muted-foreground">/Monat</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fmt(vp.cents)} € jährlich · inkl. MwSt · 2 Monate gratis
                  </p>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">{fmt(vp.cents)} €</span>
                  <span className="text-muted-foreground">/Monat · inkl. MwSt</span>
                </>
              )}
            </div>
            <ul className="space-y-2.5 mb-7 text-sm flex-1">
              {VERWALTEN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            {tier === "verwalten_plus" && hasActiveSubscription ? (
              <Button variant="outline" className="w-full" onClick={() => navigate("/app/settings")}>
                Aktueller Plan
              </Button>
            ) : tier === "pro" && hasActiveSubscription ? (
              <Button variant="outline" disabled className="w-full">In Pro enthalten</Button>
            ) : (
              <Button
                onClick={() => start(vp.id, `Verwalten+ (${cycle === "yearly" ? "Jahr" : "Monat"})`)}
                className="w-full"
                variant="outline"
              >
                Verwalten+ abonnieren
              </Button>
            )}
          </Card>

          {/* PRO */}
          <Card className="p-7 flex flex-col border-primary/40 ring-1 ring-primary/20 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
              Empfohlen
            </span>
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Pro
              </h2>
              <p className="text-sm text-muted-foreground">Alles. Auch Vermarktung, KI & Banking.</p>
            </div>
            <div className="mb-5">
              {cycle === "yearly" ? (
                <>
                  <span className="text-4xl font-bold">{fmt(pro.perMonthCents!)} €</span>
                  <span className="text-muted-foreground">/Monat</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fmt(pro.cents)} € jährlich · inkl. MwSt · 2 Monate gratis
                  </p>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">{fmt(pro.cents)} €</span>
                  <span className="text-muted-foreground">/Monat · inkl. MwSt</span>
                </>
              )}
            </div>
            <ul className="space-y-2.5 mb-7 text-sm flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            {tier === "pro" && hasActiveSubscription ? (
              <Button variant="outline" className="w-full" onClick={() => navigate("/app/settings")}>
                Aktueller Plan
              </Button>
            ) : (
              <Button onClick={() => start(pro.id, `Pro (${cycle === "yearly" ? "Jahr" : "Monat"})`)} className="w-full">
                {hasManageAccess ? "Auf Pro upgraden" : "Pro abonnieren"}
              </Button>
            )}
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8 max-w-2xl mx-auto">
          Monatlich oder jährlich kündbar zum Laufzeitende. Trial endet automatisch — kein automatischer Übergang in ein
          bezahltes Abo. Steuern werden korrekt berechnet und abgeführt. Free ist auf 1 selbstgenutzte Immobilie begrenzt.
        </p>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>ImmonIQ {target?.label} abonnieren</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2">
            <label className="flex items-start gap-3 text-xs leading-relaxed cursor-pointer rounded-md border p-3 bg-muted/30">
              <Checkbox
                checked={waiverConsent}
                onCheckedChange={(c) => setWaiverConsent(c === true)}
                className="mt-0.5"
              />
              <span className="text-muted-foreground">
                Ich verlange ausdrücklich, dass ImmonIQ vor Ablauf der 14-tägigen Widerrufsfrist
                mit der Ausführung des Vertrages beginnt. Mir ist bekannt, dass ich mit
                vollständiger Vertragserfüllung mein <Link to="/widerruf" className="underline">Widerrufsrecht</Link> verliere
                (§ 356 Abs. 5 BGB). Ich habe die <Link to="/agb" className="underline">AGB</Link> und{" "}
                <Link to="/datenschutz" className="underline">Datenschutzerklärung</Link> gelesen und akzeptiert.
              </span>
            </label>
          </div>
          <div className="px-2 pb-4">
            {target && user && waiverConsent && (
              <StripeEmbeddedCheckout
                priceId={target.priceId}
                customerEmail={user.email ?? undefined}
                userId={user.id}
                returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
              />
            )}
            {target && !waiverConsent && (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                Bitte bestätige die Einwilligung oben, um zur Bezahlung fortzufahren.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
