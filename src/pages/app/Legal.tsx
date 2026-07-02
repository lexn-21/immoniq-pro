import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import {
  FileText, Printer, ExternalLink, ShieldCheck, ClipboardList,
  Building2, CheckCircle2, Download, Scale, Info,
} from "lucide-react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "immoniq_legal_checklist_v1";

const CHECKLIST = [
  { group: "Gewerbe & Steuer", items: [
    { id: "gewa", label: "Gewerbeanmeldung beim Gewerbeamt Ennigerloh (GewA 1, ~20–40 €)", link: "https://www.ennigerloh.de/" },
    { id: "elster", label: "Fragebogen zur steuerlichen Erfassung (Elster) — Kleinunternehmer §19 UStG", link: "https://www.elster.de/eportal/formulare-leistungen/alleformulare/fsef" },
    { id: "ihk", label: "IHK-Zugehörigkeit prüfen (bei SaaS meist Pflicht, erste 2 Jahre oft beitragsfrei)", link: "https://www.ihk.de/" },
    { id: "insurance", label: "Berufshaftpflicht / Vermögensschaden-Haftpflicht (Hiscox, Exali, ~200–600 €/Jahr)", link: "https://www.hiscox.de/" },
  ]},
  { group: "DSGVO-Basispaket", items: [
    { id: "avv-supabase", label: "AVV Lovable Cloud / Supabase archivieren", link: null },
    { id: "avv-stripe", label: "AVV Stripe herunterladen (Settings → Legal → DPA)", link: "https://dashboard.stripe.com/settings/legal" },
    { id: "avv-mailgun", label: "AVV Mailgun archivieren", link: "https://www.mailgun.com/legal/dpa/" },
    { id: "avv-google", label: "AVV Google Cloud (Places API) archivieren", link: "https://cloud.google.com/terms/data-processing-addendum" },
    { id: "art30", label: "Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) ausfüllen — Vorlage unten", link: null },
    { id: "toms", label: "Technisch-organisatorische Maßnahmen (TOMs) dokumentieren — Vorlage unten", link: null },
    { id: "breach", label: "Data-Breach-Notfallplan schreiben (72h-Meldefrist LDI NRW)", link: "https://www.ldi.nrw.de/" },
  ]},
  { group: "Vor Live-Zahlungsstart", items: [
    { id: "descriptor", label: "Stripe Statement-Descriptor prüfen (\"ImmonIQ\", nicht \"LOVABLE\")", link: "https://dashboard.stripe.com/settings/public" },
    { id: "testkauf", label: "Testkauf mit eigener Karte im Live-Modus + sofortiger Refund", link: null },
    { id: "webhook", label: "Webhook-Event in DB prüfen (stripe_webhook_events)", link: null },
    { id: "email", label: "E-Mail-Empfang testen: Rechnung, Willkommen, Bestätigung", link: null },
  ]},
];

const Legal = () => {
  const { user } = useAuth();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [operatorName, setOperatorName] = useState("Leon Boomgaarden");

  useEffect(() => {
    document.title = "Legal-Zentrum · ImmonIQ";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const total = CHECKLIST.reduce((s, g) => s + g.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;
  const percent = Math.round((done / total) * 100);

  const printArt30 = () => openPrintable(art30Html(operatorName, user?.email ?? ""));
  const printToms = () => openPrintable(tomsHtml(operatorName, user?.email ?? ""));

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">Legal & Compliance</p>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-3">
          <Scale className="h-8 w-8 text-primary" /> Legal-<span className="text-gradient-gold">Zentrum</span>
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Alles was du brauchst, um ImmonIQ rechtlich sauber live zu bekommen — Dokumente, DSGVO-Vorlagen und
          Onboarding-Checkliste an einem Ort.
        </p>
      </header>

      <Card className="p-5 glass">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold">Launch-Readiness</p>
            <p className="text-xs text-muted-foreground">{done} von {total} Punkten erledigt</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-40 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-gold transition-all" style={{ width: `${percent}%` }} />
            </div>
            <Badge variant="outline" className="font-mono">{percent}%</Badge>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="docs" className="space-y-5">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="docs" className="py-2 text-xs md:text-sm"><FileText className="h-4 w-4 mr-1.5" />Dokumente</TabsTrigger>
          <TabsTrigger value="checklist" className="py-2 text-xs md:text-sm"><ClipboardList className="h-4 w-4 mr-1.5" />Checkliste</TabsTrigger>
          <TabsTrigger value="art30" className="py-2 text-xs md:text-sm"><ShieldCheck className="h-4 w-4 mr-1.5" />Art. 30</TabsTrigger>
          <TabsTrigger value="toms" className="py-2 text-xs md:text-sm"><Building2 className="h-4 w-4 mr-1.5" />TOMs</TabsTrigger>
        </TabsList>

        {/* Dokumente */}
        <TabsContent value="docs" className="space-y-3">
          {[
            { to: "/impressum", title: "Impressum", desc: "§ 5 TMG, § 55 RStV — Anbieterkennzeichnung" },
            { to: "/datenschutz", title: "Datenschutzerklärung", desc: "DSGVO-konform, mit Auftragsverarbeitern & KI-Nutzung" },
            { to: "/agb", title: "Allgemeine Geschäftsbedingungen", desc: "Nutzungsbedingungen für ImmonIQ" },
            { to: "/widerruf", title: "Widerrufsbelehrung", desc: "14-Tage-Widerrufsrecht für Verbraucher" },
          ].map((d) => (
            <Card key={d.to} className="p-4 glass interactive-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
                </div>
                <Link to={d.to} target="_blank" className="shrink-0">
                  <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4 mr-1.5" />Öffnen</Button>
                </Link>
              </div>
            </Card>
          ))}

          <Card className="p-4 glass bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">Empfehlung vor Live-Gang</p>
                <p className="text-muted-foreground mt-1">
                  Einmal 1–2 h Fachanwalt IT-Recht (~250–500 €) — deutlich billiger als eine Abmahnung.
                  Empfehlung: <a href="https://www.anwalt.de" target="_blank" rel="noopener" className="text-primary hover:underline">anwalt.de</a> oder lokaler Fachanwalt in Münster.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Checkliste */}
        <TabsContent value="checklist" className="space-y-4">
          {CHECKLIST.map((group) => (
            <Card key={group.group} className="p-5 glass">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                {group.group}
                <Badge variant="outline" className="text-[10px] font-mono">
                  {group.items.filter(i => checked[i.id]).length}/{group.items.length}
                </Badge>
              </h3>
              <div className="space-y-2.5">
                {group.items.map((item) => (
                  <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox
                      checked={!!checked[item.id]}
                      onCheckedChange={() => toggle(item.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${checked[item.id] ? "line-through text-muted-foreground" : ""}`}>
                        {item.label}
                      </span>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener" className="ml-2 text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                          Link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {checked[item.id] && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Art 30 */}
        <TabsContent value="art30" className="space-y-4">
          <Card className="p-5 glass">
            <h3 className="font-semibold mb-2">Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)</h3>
            <p className="text-sm text-muted-foreground">
              Pflicht für jeden Verantwortlichen. Die Vorlage ist bereits mit den echten
              ImmonIQ-Verarbeitungen (Auth, Zahlungen, Banking, KI, Bonität, Marketing-Mails) vorausgefüllt —
              du musst nur noch deine Kontaktdaten prüfen und drucken/als PDF speichern.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="flex-1 min-w-[200px] h-9 rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Verantwortlicher (dein Name)"
              />
              <Button onClick={printArt30} className="bg-gradient-gold text-primary-foreground shadow-gold">
                <Printer className="h-4 w-4 mr-1.5" />Drucken / PDF speichern
              </Button>
            </div>
          </Card>
          <Card className="p-4 glass text-xs text-muted-foreground">
            <p>
              <strong>Tipp:</strong> Ausdrucken (oder als PDF speichern → „Datei ▸ Drucken ▸ Ziel: Als PDF speichern")
              und in deinem AVV-Ordner ablegen. Bei einer LDI-Prüfung musst du das Verzeichnis innerhalb weniger Tage vorlegen können.
            </p>
          </Card>
        </TabsContent>

        {/* TOMs */}
        <TabsContent value="toms" className="space-y-4">
          <Card className="p-5 glass">
            <h3 className="font-semibold mb-2">Technisch-Organisatorische Maßnahmen (Art. 32 DSGVO)</h3>
            <p className="text-sm text-muted-foreground">
              Beschreibt, wie ImmonIQ personenbezogene Daten technisch schützt. Vorlage bereits mit
              den echten Maßnahmen (TLS 1.3, RLS pro Vermieter, verschlüsselter Tresor, Backups, 2FA-fähig) befüllt.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={printToms} className="bg-gradient-gold text-primary-foreground shadow-gold">
                <Printer className="h-4 w-4 mr-1.5" />Drucken / PDF speichern
              </Button>
              <a href="https://www.bfdi.bund.de/" target="_blank" rel="noopener">
                <Button variant="outline"><ExternalLink className="h-4 w-4 mr-1.5" />BfDI-Muster ansehen</Button>
              </a>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-4 glass">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Haftungsausschluss:</strong> Diese Vorlagen sind sorgfältig recherchiert, ersetzen aber keine Rechtsberatung.
          Für eine belastbare Freigabe empfehlen wir eine kurze anwaltliche Prüfung vor Live-Gang.
        </p>
      </Card>
    </div>
  );
};

// --- Printables ---
function openPrintable(html: string) {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function docShell(title: string, body: string) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:800px;margin:2rem auto;padding:0 2rem;color:#111;line-height:1.55}
    h1{font-size:1.6rem;border-bottom:2px solid #b8860b;padding-bottom:.4rem;margin-bottom:1rem}
    h2{font-size:1.15rem;margin-top:1.8rem;color:#7a5a00}
    table{width:100%;border-collapse:collapse;margin:.6rem 0 1.2rem;font-size:.86rem}
    th,td{border:1px solid #ccc;padding:.5rem .6rem;text-align:left;vertical-align:top}
    th{background:#f6f1e4;font-weight:600}
    .meta{font-size:.85rem;color:#555;margin-bottom:1.4rem}
    .foot{margin-top:2rem;padding-top:1rem;border-top:1px solid #ddd;font-size:.78rem;color:#666}
    @media print{body{margin:0;padding:1cm}}
  </style></head><body>${body}</body></html>`;
}

function art30Html(name: string, email: string) {
  const today = new Date().toLocaleDateString("de-DE");
  return docShell("Verzeichnis von Verarbeitungstätigkeiten – ImmonIQ", `
    <h1>Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)</h1>
    <div class="meta">
      <strong>Verantwortlicher:</strong> ${name}<br/>
      <strong>Kontakt:</strong> ${email || "leonboomgaarden@gmail.com"}<br/>
      <strong>Anschrift:</strong> Kastanienallee 13, 59320 Ennigerloh<br/>
      <strong>Anwendung:</strong> ImmonIQ (SaaS für Vermieter)<br/>
      <strong>Stand:</strong> ${today}
    </div>

    <h2>1. Nutzerkonten & Authentifizierung</h2>
    <table><tr><th>Zweck</th><td>Registrierung, Login, Sitzungsverwaltung</td></tr>
    <tr><th>Datenarten</th><td>E-Mail, Passwort-Hash, Anzeigename, IP, Zeitstempel</td></tr>
    <tr><th>Kategorien Betroffener</th><td>Vermieter (Nutzer), Berater</td></tr>
    <tr><th>Empfänger</th><td>Supabase (EU, AVV vorhanden)</td></tr>
    <tr><th>Löschfrist</th><td>Bei Kontolöschung sofort; Logs 30 Tage</td></tr>
    <tr><th>Rechtsgrundlage</th><td>Art. 6 Abs. 1 lit. b DSGVO (Vertrag)</td></tr></table>

    <h2>2. Objekt-, Mieter- & Zahlungsverwaltung</h2>
    <table><tr><th>Zweck</th><td>Kernfunktion — Verwaltung von Mietobjekten, Mietern, Zahlungen</td></tr>
    <tr><th>Datenarten</th><td>Adressen, Mieternamen, IBAN (teilweise), Mietbeträge, Zahlungshistorie</td></tr>
    <tr><th>Kategorien Betroffener</th><td>Mieter des Nutzers, ggf. Interessenten</td></tr>
    <tr><th>Empfänger</th><td>Supabase (EU); Row-Level-Security pro Vermieter</td></tr>
    <tr><th>Löschfrist</th><td>10 Jahre nach Vertragsende (§ 147 AO)</td></tr>
    <tr><th>Rechtsgrundlage</th><td>Art. 6 Abs. 1 lit. b + c DSGVO</td></tr></table>

    <h2>3. Zahlungsabwicklung (Abo ImmonIQ)</h2>
    <table><tr><th>Zweck</th><td>Abrechnung ImmonIQ-Abonnement</td></tr>
    <tr><th>Datenarten</th><td>Name, E-Mail, Zahlungsdaten (nur Token), Rechnungsbetrag</td></tr>
    <tr><th>Empfänger</th><td>Stripe Payments Europe Ltd. (Irland, AVV vorhanden)</td></tr>
    <tr><th>Löschfrist</th><td>10 Jahre (§ 147 AO)</td></tr>
    <tr><th>Rechtsgrundlage</th><td>Art. 6 Abs. 1 lit. b + c DSGVO</td></tr></table>

    <h2>4. Banking-Anbindung (optional, PSD2)</h2>
    <table><tr><th>Zweck</th><td>Automatischer Abgleich Mietzahlungen</td></tr>
    <tr><th>Datenarten</th><td>Kontoumsätze (read-only), Kontoinhaber</td></tr>
    <tr><th>Empfänger</th><td>Enable Banking (Finnland, PSD2-lizenziert, AVV)</td></tr>
    <tr><th>Löschfrist</th><td>Bei Trennung Bank-Link sofort; Umsatzdaten 10 J. (§ 147 AO)</td></tr>
    <tr><th>Rechtsgrundlage</th><td>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung Nutzer)</td></tr></table>

    <h2>5. KI-Funktionen (Copilot, Mahnungen, Klassifikation)</h2>
    <table><tr><th>Zweck</th><td>Textvorschläge, Ausgaben-Klassifikation, Bonitätsbewertung</td></tr>
    <tr><th>Datenarten</th><td>Fragen/Prompts des Nutzers, Belegtexte, ggf. Mieterdaten (pseudonymisiert wo möglich)</td></tr>
    <tr><th>Empfänger</th><td>Lovable AI Gateway (Anthropic Claude / Google Gemini, EU-Endpoints wo verfügbar)</td></tr>
    <tr><th>Löschfrist</th><td>Nicht gespeichert beim Anbieter (Zero-Retention-Modus)</td></tr>
    <tr><th>Rechtsgrundlage</th><td>Art. 6 Abs. 1 lit. b DSGVO + Einwilligung bei Mieterdaten</td></tr></table>

    <h2>6. Transaktionale E-Mails</h2>
    <table><tr><th>Zweck</th><td>Rechnungen, Mahnungen, Willkommensmails, Passwort-Reset</td></tr>
    <tr><th>Datenarten</th><td>E-Mail, Name, Inhalt</td></tr>
    <tr><th>Empfänger</th><td>Mailgun (Frankfurt/EU, AVV vorhanden)</td></tr>
    <tr><th>Löschfrist</th><td>Zustellprotokolle 30 Tage</td></tr>
    <tr><th>Rechtsgrundlage</th><td>Art. 6 Abs. 1 lit. b DSGVO</td></tr></table>

    <h2>7. Bonitätsprüfung (nur mit Einwilligung Mieter)</h2>
    <table><tr><th>Zweck</th><td>Bonitätsvorprüfung für Vermietung</td></tr>
    <tr><th>Datenarten</th><td>Name, Geburtsdatum, Adresse, ggf. Einkommen</td></tr>
    <tr><th>Empfänger</th><td>Auskunfteien (nur nach expliziter Einwilligung des Mieters)</td></tr>
    <tr><th>Löschfrist</th><td>Nach Vermietungsentscheidung, spät. 6 Monate</td></tr>
    <tr><th>Rechtsgrundlage</th><td>Art. 6 Abs. 1 lit. a DSGVO — kein Auto-Scoring (Art. 22)</td></tr></table>

    <h2>8. Standort- & Marktdaten (Places API)</h2>
    <table><tr><th>Zweck</th><td>Adressvervollständigung, Mietspiegel-Nachbarschaftsanalyse</td></tr>
    <tr><th>Datenarten</th><td>Objektadresse (kein Personenbezug), IP bei Abruf</td></tr>
    <tr><th>Empfänger</th><td>Google Cloud (EU-Region), OpenStreetMap</td></tr>
    <tr><th>Löschfrist</th><td>Ergebnisse werden nur temporär gecacht</td></tr>
    <tr><th>Rechtsgrundlage</th><td>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)</td></tr></table>

    <div class="foot">
      Dieses Verzeichnis wird mindestens jährlich sowie bei jeder wesentlichen Änderung der
      Verarbeitung überprüft und aktualisiert. Stand: ${today}.
    </div>
  `);
}

function tomsHtml(name: string, email: string) {
  const today = new Date().toLocaleDateString("de-DE");
  return docShell("Technisch-Organisatorische Maßnahmen – ImmonIQ", `
    <h1>Technisch-Organisatorische Maßnahmen (Art. 32 DSGVO)</h1>
    <div class="meta">
      <strong>Verantwortlicher:</strong> ${name}<br/>
      <strong>Kontakt:</strong> ${email || "leonboomgaarden@gmail.com"}<br/>
      <strong>Anwendung:</strong> ImmonIQ<br/>
      <strong>Stand:</strong> ${today}
    </div>

    <h2>1. Vertraulichkeit</h2>
    <table>
      <tr><th>Zutrittskontrolle</th><td>Server: Rechenzentren Supabase (EU-Frankfurt, ISO 27001, SOC 2). Kein physischer Zugriff für Betreiber.</td></tr>
      <tr><th>Zugangskontrolle</th><td>Passwort-Hashing (bcrypt), 2FA-fähig, Session-Rotation, Rate-Limiting</td></tr>
      <tr><th>Zugriffskontrolle</th><td>Row-Level-Security (RLS) in Postgres pro Vermieter — jeder Nutzer sieht ausschließlich seine eigenen Daten</td></tr>
      <tr><th>Trennungskontrolle</th><td>Getrennte Test-/Produktions-Umgebungen; Sandbox- und Live-Stripe-Konten getrennt</td></tr>
    </table>

    <h2>2. Integrität</h2>
    <table>
      <tr><th>Weitergabekontrolle</th><td>TLS 1.3 für alle Verbindungen (HTTPS erzwungen, HSTS)</td></tr>
      <tr><th>Eingabekontrolle</th><td>Änderungshistorie in DB (updated_at, created_at); kritische Aktionen geloggt</td></tr>
      <tr><th>Immo-Tresor</th><td>Vertrauliche Dokumente client-seitig AES-256-GCM verschlüsselt, Passphrase nur beim Nutzer</td></tr>
    </table>

    <h2>3. Verfügbarkeit & Belastbarkeit</h2>
    <table>
      <tr><th>Backups</th><td>Tägliche automatische Datenbank-Backups (Supabase), Point-in-Time-Recovery 7 Tage</td></tr>
      <tr><th>Wiederherstellung</th><td>Restore innerhalb weniger Stunden über Supabase-Dashboard möglich</td></tr>
      <tr><th>Verfügbarkeit</th><td>CDN + Multi-Region-Hosting (Lovable Cloud), Ziel: 99.5% Uptime</td></tr>
    </table>

    <h2>4. Verfahren zur regelmäßigen Überprüfung</h2>
    <table>
      <tr><th>Datenschutz-Management</th><td>Verzeichnis nach Art. 30 wird jährlich aktualisiert</td></tr>
      <tr><th>Vorfall-Reaktion</th><td>Data-Breach-Notfallplan; 72h-Meldefrist an LDI NRW dokumentiert</td></tr>
      <tr><th>Auftragskontrolle</th><td>AVV mit allen Auftragsverarbeitern (Supabase, Stripe, Mailgun, Enable Banking, Google) archiviert</td></tr>
      <tr><th>Datenschutz durch Voreinstellungen</th><td>Analytics standardmäßig aus; Cookie-Banner mit granularer Zustimmung</td></tr>
    </table>

    <h2>5. Pseudonymisierung & Verschlüsselung</h2>
    <table>
      <tr><th>At Rest</th><td>Postgres-Verschlüsselung on-disk (AES-256, Supabase)</td></tr>
      <tr><th>In Transit</th><td>TLS 1.3 zwingend</td></tr>
      <tr><th>Zahlungsdaten</th><td>Kartendaten werden nie in ImmonIQ gespeichert — ausschließlich Stripe-Tokens</td></tr>
    </table>

    <div class="foot">
      Diese TOM-Liste beschreibt den Ist-Zustand zum Stichtag ${today} und wird bei jeder wesentlichen
      technischen Änderung angepasst.
    </div>
  `);
}

export default Legal;
