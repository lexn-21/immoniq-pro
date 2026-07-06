import { Link } from "react-router-dom";
import { usePageSeo } from "@/hooks/usePageSeo";
import { LegalFooter } from "@/components/LegalFooter";

export default function Datenschutz() {
  usePageSeo({
    title: "Datenschutzerklärung · ImmonIQ",
    description: "Datenschutzerklärung von ImmonIQ — wie wir Daten von Privatvermietern verarbeiten. DSGVO-konform, transparent, mit Auftragsverarbeitern aus der EU.",
    canonicalPath: "/datenschutz",
    ogDescription: "DSGVO-konforme Datenschutzerklärung von ImmonIQ: transparente Verarbeitung, EU-Auftragsverarbeiter, Rechte der Betroffenen.",
  });
  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Zurück</Link>
        <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>
        <p className="text-xs text-muted-foreground">Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</p>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">1. Verantwortlicher</h2>
          <p>
            Leon Boomgaarden (ENTERVENTUS)<br />
            Kastanienallee 13, 59320 Ennigerloh, Deutschland<br />
            Telefon: +49 152 28943502 · E-Mail:{" "}
            <a href="mailto:leonboomgaarden@gmail.com" className="text-primary underline">leonboomgaarden@gmail.com</a><br />
            USt-IdNr.: DE365353142
          </p>
          <p className="text-muted-foreground">
            Ein Datenschutzbeauftragter ist gesetzlich nicht erforderlich; Anfragen richte bitte
            an die oben genannte E-Mail-Adresse.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">2. Verarbeitete Daten</h2>
          <p>
            Wir verarbeiten die bei Registrierung angegebenen Daten (E-Mail, gehashtes Passwort) sowie
            alle Daten, die du in der App eingibst (Objekte, Mieter, Zahlungen, Belege, Dokumente, Bankumsätze,
            Marktdaten, KI-Eingaben). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung),
            ergänzt durch lit. a (Einwilligung, z. B. Bankanbindung) und lit. f (berechtigtes Interesse,
            z. B. Betrugsprävention, Logs).
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">3. Auftragsverarbeiter (Art. 28 DSGVO)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase Inc.</strong> — Hosting, Datenbank, Auth, Storage. Server-Region EU (Irland). TLS 1.3, AES-256 at-rest. AVV abgeschlossen.</li>
            <li><strong>Stripe Payments Europe Ltd.</strong> — Abo-Zahlungen. Wir speichern keine Kartendaten. AVV/SCCs vorhanden.</li>
            <li><strong>Mailgun Technologies Inc.</strong> — Transaktions-E-Mails. EU-Region. SCCs.</li>
            <li><strong>Google Ireland Ltd. (Places API)</strong> — Adress-Autocomplete. Nur Eingabe-Suchbegriff, keine personenbezogenen Daten.</li>
            <li><strong>Lovable AI Gateway (inkl. Google Gemini / OpenAI)</strong> — KI-Funktionen (OCR von Belegen, Klassifizierung, Schaden-Analyse, Sprachnotiz, Inserat-Generator). Eingaben werden NICHT zum Modelltraining verwendet (Zero-Retention-Verträge). Verarbeitung in EU oder via SCCs.</li>
            <li><strong>Firecrawl</strong> — Markt-Scraping öffentlicher Inseratsdaten (nur aggregierte Marktindex-Werte, keine Mieterdaten).</li>
            <li><strong>Enable Banking Oy (Helsinki, FI)</strong> — siehe Abschnitt 4 (Bankanbindung).</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">4. Bankkonto-Anbindung (PSD2 / Open Banking)</h2>
          <p>
            Für die optionale Funktion „Bankanbindung" nutzen wir <strong>Enable Banking Oy</strong>
            (Itämerenkatu 5, 00180 Helsinki, Finnland) als regulierten <strong>Kontoinformationsdienstleister
            (AISP) gemäß Richtlinie (EU) 2015/2366 (PSD2)</strong>, zugelassen und beaufsichtigt durch die
            finnische Finanzaufsicht (Finanssivalvonta, Lizenznummer 3088215-7).
          </p>
          <p>
            <strong>Ablauf:</strong> Du erteilst über die offizielle Login-Seite deiner Bank eine
            ausdrückliche Einwilligung (Strong Customer Authentication, SCA) für maximal 180 Tage. Die
            Zugangsdaten gibst du ausschließlich bei deiner Bank ein — wir und Enable Banking sehen
            sie nie. Übertragen werden nur lesende Kontoinformationen (IBAN, Saldo, Umsätze).
            Zahlungen können über diesen Weg <strong>nicht</strong> ausgelöst werden.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) i. V. m. Art. 67
            PSD2. Du kannst die Einwilligung jederzeit widerrufen — in der App unter „Bank → Trennen"
            oder direkt bei deiner Bank.
          </p>
          <p>
            <strong>Zweck:</strong> Automatische Zuordnung von Mietzahlungen, Belegerfassung,
            Buchhaltung — keine Bonitätsbewertung, kein Scoring, keine Weitergabe an Dritte, keine
            Werbung.
          </p>
          <p>
            <strong>Speicherdauer:</strong> Bankumsätze werden bis zur Trennung der Verbindung bzw.
            Kündigung gespeichert. Steuerlich relevante Buchungen können bis zu 10 Jahre aufbewahrt
            werden (§ 147 AO).
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">5. KI-Funktionen</h2>
          <p>
            Optionale KI-Funktionen (z. B. Beleg-OCR, Schaden-Foto-Analyse, Sprach-zu-Text,
            Inserat-Generator, Markt-Bewertung) verarbeiten deine Eingaben über das Lovable AI Gateway.
            Es werden ausschließlich die für die jeweilige Funktion notwendigen Daten übermittelt. Die
            Anbieter haben sich vertraglich verpflichtet, Eingaben <strong>nicht für Modelltraining</strong>
            zu nutzen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">6. Mieter-Daten & Bonitätscheck</h2>
          <p>
            Bonitätschecks (SCHUFA-Selbstauskunft, Bürgschaft) erfolgen nur mit ausdrücklicher
            Einwilligung des Mieters (Art. 6 Abs. 1 lit. a DSGVO, Art. 22 DSGVO – keine automatisierte
            Einzelfallentscheidung). Mieter erhalten einen separaten Link und können jederzeit
            widerrufen.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">7. Deine Rechte</h2>
          <p>
            Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch
            (Art. 15–22 DSGVO) sowie Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft.
            Beschwerden an die zuständige Aufsichtsbehörde (z. B. LDI NRW) sind möglich. Anfragen
            bitte an: leonboomgaarden@gmail.com.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">8. Registrierung & Login (inkl. Google OAuth)</h2>
          <p>
            Die Registrierung erfolgt per E-Mail + Passwort oder optional über den Login-Anbieter
            <strong> Google (Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland)</strong>.
            Bei Nutzung von „Mit Google anmelden" übermittelt Google an uns Name, E-Mail und
            Profilbild. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) bzw. lit. a
            (Einwilligung). Details zur Datenverarbeitung durch Google:{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              policies.google.com/privacy
            </a>.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">9. Server-Logs</h2>
          <p>
            Beim Aufruf der Anwendung werden technisch notwendige Zugriffsdaten in Server-Logs
            gespeichert (IP-Adresse gekürzt, Zeitstempel, User-Agent, aufgerufene URL, Referrer,
            HTTP-Status). Zweck: Betrieb, Sicherheit, Missbrauchsabwehr. Rechtsgrundlage:
            Art. 6 Abs. 1 lit. f DSGVO. Speicherdauer: max. 30 Tage, anschließend Löschung oder
            Anonymisierung.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">10. Cookies, Speicher & Reichweitenmessung</h2>
          <p>
            <strong>Technisch notwendig (ohne Einwilligung):</strong> Session-Token (Auth),
            Consent-Speicher, CSRF-Schutz. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG, Art. 6 Abs. 1
            lit. f DSGVO.
          </p>
          <p>
            <strong>Nur mit Einwilligung („Analyse" im Cookie-Banner):</strong> Wir erfassen
            pseudonyme Ereignisse (Seitenaufrufe, Klicks auf Call-to-Action-Buttons, Formular-Starts)
            in unserer eigenen Tabelle <em>analytics_events</em> auf Servern in der EU. Es werden
            keine IP-Adressen im Klartext gespeichert. Optional werden diese Events an ein
            selbstgehostetes/EU-basiertes Analytics-Tool (z.&nbsp;B. Plausible, Umami, GA4 via GTM)
            weitergegeben – aber ausschließlich, wenn du zuvor eingewilligt hast. Rechtsgrundlage:
            Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG. Widerruf jederzeit über den Link
            „Cookie-Einstellungen" im Footer.
          </p>
          <p>
            <strong>Kein Marketing-Tracking, kein Profiling, keine Werbe-Cookies, keine
            Social-Plugins.</strong>
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">11. Speicherdauer</h2>
          <p>
            Daten bleiben bis zur Kündigung gespeichert. Danach 30 Tage Export-Möglichkeit, anschließend
            Löschung. Steuerlich relevante Daten bis zu 10 Jahre (§ 147 AO). Bank-Einwilligungen max.
            180 Tage (PSD2). Server-Logs max. 30 Tage.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">12. Drittland-Übermittlung</h2>
          <p>
            Soweit Auftragsverarbeiter Server in Drittländern (insb. USA) nutzen, erfolgt die
            Übermittlung auf Basis EU-Standardvertragsklauseln (SCCs, Durchführungsbeschluss (EU)
            2021/914) und – wo verfügbar – auf Grundlage des EU-US Data Privacy Framework (DPF).
            Der überwiegende Datenverkehr bleibt auf EU-Servern (Supabase EU, Stripe EU, Mailgun EU,
            Enable Banking FI).
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">13. Aufsichtsbehörde</h2>
          <p>
            Zuständige Aufsichtsbehörde: Landesbeauftragte für Datenschutz und Informationsfreiheit
            Nordrhein-Westfalen (LDI NRW), Kavalleriestraße 2–4, 40213 Düsseldorf,{" "}
            <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer" className="text-primary underline">ldi.nrw.de</a>.
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">9. Speicherdauer</h2>
          <p>
            Daten bleiben bis zur Kündigung gespeichert. Danach 30 Tage Export-Möglichkeit, anschließend
            Löschung. Steuerlich relevante Daten bis zu 10 Jahre (§ 147 AO). Bank-Einwilligungen max.
            180 Tage (PSD2).
          </p>
        </section>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">10. Drittland-Übermittlung</h2>
          <p>
            Soweit Auftragsverarbeiter Server in Drittländern (USA) nutzen, erfolgt die Übermittlung
            auf Basis EU-Standardvertragsklauseln (SCCs) und ggf. Data Privacy Framework (DPF).
          </p>
        </section>
      </div>
      <LegalFooter />
      </div>
  );
}
