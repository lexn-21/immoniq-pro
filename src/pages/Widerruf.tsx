import { Link } from "react-router-dom";
import { usePageSeo } from "@/hooks/usePageSeo";
import { LegalFooter } from "@/components/LegalFooter";

export default function Widerruf() {
  usePageSeo({
    title: "Widerrufsbelehrung · ImmonIQ",
    description: "14-tägiges Widerrufsrecht für Verbraucher bei ImmonIQ — Belehrung, Form, Fristen und Muster-Widerrufsformular.",
    canonicalPath: "/widerruf",
    ogDescription: "14-tägiges Widerrufsrecht bei ImmonIQ: Belehrung, Fristen und Muster-Widerrufsformular für Verbraucher.",
  });
  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Zurück</Link>
        <h1 className="text-3xl font-bold">Widerrufsbelehrung</h1>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">Widerrufsrecht für Verbraucher</h2>
          <p>
            Verbraucher haben das Recht, binnen <strong>14 Tagen</strong> ohne Angabe von Gründen
            diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses
            (Registrierung).
          </p>
          <p>
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung
            (z.&nbsp;B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss,
            diesen Vertrag zu widerrufen, informieren:
          </p>
          <p className="bg-muted p-4 rounded-md">
            Leon Boomgaarden / ENTERVENTUS<br />
            Ennigerloh, NRW<br />
            E-Mail: <a href="mailto:leonboomgaarden@gmail.com" className="underline">leonboomgaarden@gmail.com</a>
          </p>
          <p>
            Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung
            des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">Folgen des Widerrufs</h2>
          <p>
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen
            erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen,
            an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">Vorzeitiges Erlöschen des Widerrufsrechts</h2>
          <p>
            Bei einem Vertrag über die Lieferung von nicht auf einem körperlichen Datenträger
            befindlichen digitalen Inhalten (SaaS) erlischt das Widerrufsrecht, wenn Sie der
            Vertragsausführung vor Ablauf der Widerrufsfrist <strong>ausdrücklich zugestimmt</strong>
            haben und gleichzeitig bestätigt haben, dass Sie damit Ihr Widerrufsrecht verlieren.
          </p>
          <p className="text-muted-foreground">
            Hinweis: Ihre kostenlose 30-Tage-Testphase ist davon nicht betroffen — diese ist jederzeit
            beendbar, ohne dass Kosten entstehen.
          </p>
        </section>
      </div>
      <LegalFooter />
      </div>
  );
}
