import { Link } from "react-router-dom";
import { usePageSeo } from "@/hooks/usePageSeo";
import { LegalFooter } from "@/components/LegalFooter";

export default function AGB() {
  usePageSeo({
    title: "Allgemeine Geschäftsbedingungen · ImmonIQ",
    description: "AGB von ImmonIQ: Vertragsschluss, 30-Tage-Testphase, monatliche Laufzeit, Kündigung und Nutzungsbedingungen für Privatvermieter.",
    canonicalPath: "/agb",
    ogDescription: "AGB von ImmonIQ: Vertragsschluss, 30-Tage-Testphase, monatliche Laufzeit und Kündigung für Privatvermieter.",
  });
  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Zurück</Link>
        <h1 className="text-3xl font-bold">Allgemeine Geschäftsbedingungen</h1>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 1 Geltungsbereich</h2>
          <p>Diese AGB gelten für die Nutzung von ImmonIQ (Anbieter: Leon Boomgaarden / ENTERVENTUS).</p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 2 Vertragsschluss & Testphase</h2>
          <p>Der Vertrag kommt mit Registrierung zustande. Die ersten <strong>30 Tage sind kostenlos</strong>. Danach gilt der gewählte Tarif.</p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 3 Preise, Zahlung & Fälligkeit</h2>
          <p>
            Alle Preise verstehen sich in Euro inkl. der jeweils gesetzlichen Umsatzsteuer (derzeit
            19 % MwSt). Die Zahlung erfolgt monatlich oder jährlich im Voraus per SEPA-Lastschrift,
            Kreditkarte oder anderen von unserem Zahlungsdienstleister <strong>Stripe Payments
            Europe Ltd.</strong> (Dublin, IE) angebotenen Verfahren. Rechnungen werden elektronisch
            im Kundenbereich bereitgestellt. Bei Zahlungsverzug behalten wir uns die Sperrung des
            Zugangs nach vorheriger Mahnung vor.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 4 Laufzeit & Kündigung</h2>
          <p>Monatliche Laufzeit, kündbar zum Monatsende ohne Angabe von Gründen — direkt in den App-Einstellungen. Jahresabonnements verlängern sich um jeweils einen Monat, sofern nicht bis zum Ende der Laufzeit gekündigt wird (§ 309 Nr. 9 BGB).</p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 5 Leistungsumfang</h2>
          <p>
            ImmonIQ ist ein Werkzeug zur Selbstverwaltung. Wir <strong>geben keine Steuer- oder Rechtsberatung</strong>.
            Generierte Reports sind Arbeitshilfen — die rechtliche/steuerliche Bewertung erfolgt
            durch einen qualifizierten Berater.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 6 Haftung</h2>
          <p>Haftung nur bei Vorsatz und grober Fahrlässigkeit. Für leichte Fahrlässigkeit nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) und begrenzt auf den vorhersehbaren, vertragstypischen Schaden. Die Haftung nach dem Produkthaftungsgesetz und für Schäden aus der Verletzung von Leben, Körper oder Gesundheit bleibt unberührt.</p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 7 Datenexport bei Kündigung</h2>
          <p>Nach Kündigung können alle Daten 30 Tage lang als CSV/PDF exportiert werden. Danach werden sie gelöscht (Ausnahme: gesetzliche Aufbewahrungspflichten, insb. § 147 AO).</p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 8 Änderungen der AGB</h2>
          <p>Änderungen werden mind. 30 Tage vorher per E-Mail angekündigt. Widerspruch möglich = Sonderkündigungsrecht.</p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 9 Auftragsverarbeitung (AVV) für Vermieter</h2>
          <p>
            Soweit der Nutzer (Vermieter) im Rahmen von ImmonIQ personenbezogene Daten Dritter
            (insb. Mieter, Bewerber, Handwerker) verarbeitet, ist der Nutzer datenschutzrechtlich
            <strong> Verantwortlicher</strong> i.S.d. Art. 4 Nr. 7 DSGVO. ImmonIQ verarbeitet
            diese Daten weisungsgebunden als <strong>Auftragsverarbeiter</strong> nach Art. 28 DSGVO.
          </p>
          <p>
            Mit Abschluss dieser AGB schließen die Parteien zugleich einen Auftragsverarbeitungs­vertrag
            (AVV) auf Grundlage der EU-Standardvertragsklauseln. Die vollständigen AVV-Bedingungen
            (Gegenstand, Dauer, Art und Zweck, Datenkategorien, TOMs nach Art. 32 DSGVO,
            Sub-Auftragsverarbeiter: Supabase EU, Stripe, Mailgun, Enable Banking, Lovable AI Gateway)
            sind in der <Link to="/datenschutz" className="text-primary underline">Datenschutzerklärung</Link>{" "}
            ausgewiesen und können jederzeit unter{" "}
            <a href="mailto:leonboomgaarden@gmail.com" className="text-primary underline">leonboomgaarden@gmail.com</a>{" "}
            in unterzeichneter Form angefordert werden.
          </p>
          <p>
            Der Vermieter ist verpflichtet, eine eigene Rechtsgrundlage für die Verarbeitung
            (z.&nbsp;B. Mietvertrag, Einwilligung) sicherzustellen und Betroffene gem. Art. 13/14 DSGVO
            zu informieren.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 10 Widerrufsrecht</h2>
          <p>
            Verbrauchern steht ein 14-tägiges Widerrufsrecht zu. Details und Muster-Widerrufsformular
            in der <Link to="/widerruf" className="text-primary underline">Widerrufsbelehrung</Link>.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 11 Streitbeilegung</h2>
          <p>
            Plattform der EU zur Online-Streitbeilegung:{" "}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              ec.europa.eu/consumers/odr/
            </a>. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 12 Anwendbares Recht & Gerichtsstand</h2>
          <p>
            Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Für
            Verbraucher gilt diese Rechtswahl nur, soweit dadurch der durch zwingende Bestimmungen
            des Staates des gewöhnlichen Aufenthaltes gewährte Schutz nicht entzogen wird.
            Gerichtsstand für Kaufleute, juristische Personen des öffentlichen Rechts und
            öffentlich-rechtliche Sondervermögen ist Ennigerloh, Deutschland.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">§ 13 Salvatorische Klausel</h2>
          <p>Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</p>
        </section>

        <p className="text-xs text-muted-foreground pt-4">
          Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
        </p>
      </div>
      <LegalFooter />
      </div>
  );
}
