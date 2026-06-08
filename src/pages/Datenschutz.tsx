import { Link } from "react-router-dom";

export default function Datenschutz() {
  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Zurück</Link>
        <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>
        <p className="text-xs text-muted-foreground">Stand: Juni 2026</p>

        <section className="space-y-2 text-sm">
          <h2 className="text-lg font-semibold">1. Verantwortlicher</h2>
          <p>Leon Boomgaarden, Kastanienallee 13, 59320 Ennigerloh — leonboomgaarden@gmail.com</p>
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
          <h2 className="text-lg font-semibold">8. Cookies & Tracking</h2>
          <p>Ausschließlich technisch notwendige Cookies (Session-Token). Kein Tracking, keine Werbe-Cookies, kein Profiling.</p>
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
    </div>
  );
}
