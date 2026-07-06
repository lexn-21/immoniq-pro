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
            Leon Boomgaarden (ENTERVENTUS)<br />
            Kastanienallee 13<br />
            59320 Ennigerloh<br />
            Deutschland<br />
            Telefon: +49 152 28943502<br />
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

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">Muster-Widerrufsformular</h2>
          <p className="text-muted-foreground">
            (Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden es zurück.)
          </p>
          <div className="bg-muted p-4 rounded-md space-y-2 whitespace-pre-line">
            {`An:
Leon Boomgaarden (ENTERVENTUS)
Kastanienallee 13
59320 Ennigerloh
E-Mail: leonboomgaarden@gmail.com

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über
die Erbringung der folgenden Dienstleistung (*):

ImmonIQ — Nutzung der Software als Dienstleistung (SaaS)

Bestellt am (*) / erhalten am (*): __________________________
Name des/der Verbraucher(s):     __________________________
Anschrift des/der Verbraucher(s): __________________________
Unterschrift (nur bei Mitteilung auf Papier): __________________________
Datum:                            __________________________

(*) Unzutreffendes streichen.`}
          </div>
        </section>
      </div>
      <LegalFooter />
      </div>
  );
}
