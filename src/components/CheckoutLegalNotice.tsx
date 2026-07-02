import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Pflicht-Rechtshinweise am Checkout (BGB § 312j Abs. 3 "Button-Lösung"
 * ist durch Stripe-Button automatisch erfüllt; hier ergänzen wir AGB,
 * Widerruf und Datenschutz gut sichtbar oberhalb des Zahlbuttons).
 */
export function CheckoutLegalNotice() {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground space-y-2">
      <div className="flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p>
            Mit dem Klick auf <strong className="text-foreground">„Zahlungspflichtig bestellen"</strong> schließt du
            einen kostenpflichtigen Vertrag mit dem Anbieter (siehe{" "}
            <Link to="/impressum" target="_blank" className="text-primary hover:underline">Impressum</Link>) ab.
          </p>
          <p>
            Es gelten unsere{" "}
            <Link to="/agb" target="_blank" className="text-primary hover:underline">AGB</Link>,{" "}
            <Link to="/datenschutz" target="_blank" className="text-primary hover:underline">Datenschutzerklärung</Link>{" "}
            und die{" "}
            <Link to="/widerruf" target="_blank" className="text-primary hover:underline">Widerrufsbelehrung</Link>.
          </p>
          <p className="text-[11px] leading-relaxed">
            <strong>Widerrufshinweis für digitale Dienste (§ 356 Abs. 5 BGB):</strong> Du erhältst sofortigen Zugriff auf
            ImmonIQ. Wenn du der sofortigen Ausführung zustimmst, erlischt dein 14-Tage-Widerrufsrecht mit vollständiger
            Vertragserfüllung. Bis dahin kannst du jederzeit widerrufen.
          </p>
        </div>
      </div>
    </div>
  );
}
