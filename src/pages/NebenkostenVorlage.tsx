import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePageSeo } from "@/hooks/usePageSeo";
import { Download, CheckCircle2, FileSpreadsheet, Scale, Sparkles, ArrowRight } from "lucide-react";

const DOWNLOAD_PATH = "/downloads/nebenkostenabrechnung-vorlage-immoniq.xlsx";
const CANONICAL = "/nebenkostenabrechnung-vorlage";

export default function NebenkostenVorlage() {
  usePageSeo({
    title: "Nebenkostenabrechnung Vorlage 2026 — kostenlos (Excel, § 556 BGB) · ImmonIQ",
    description:
      "Kostenlose Nebenkostenabrechnung-Vorlage 2026 als Excel — rechtssicher nach § 556 BGB & BetrKV. Sofort-Download, mit Formeln, Umlageschlüsseln & Anleitung.",
    canonicalPath: CANONICAL,
    ogDescription:
      "Kostenlose Excel-Vorlage für die Nebenkostenabrechnung 2026 — rechtssicher nach § 556 BGB. Sofort-Download, mit Formeln & Anleitung.",
    jsonLdId: "nk-vorlage",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "Nebenkostenabrechnung erstellen — Schritt für Schritt",
        description:
          "Rechtssichere Nebenkostenabrechnung nach § 556 BGB und BetrKV in 5 Schritten erstellen.",
        totalTime: "PT30M",
        supply: [{ "@type": "HowToSupply", name: "Excel-Vorlage (kostenlos)" }],
        step: [
          { "@type": "HowToStep", name: "Abrechnungszeitraum festlegen", text: "Zeitraum (max. 12 Monate) und Objektdaten eintragen." },
          { "@type": "HowToStep", name: "Umlagefähige Kosten sammeln", text: "Nur Kosten aus § 2 BetrKV — Grundsteuer, Wasser, Heizung, Müll, Versicherung, Hauswart …" },
          { "@type": "HowToStep", name: "Umlageschlüssel wählen", text: "Wohnfläche (Standard), Personen, Verbrauch oder Wohneinheiten." },
          { "@type": "HowToStep", name: "Vorauszahlungen abziehen", text: "Geleistete Vorauszahlungen eintragen — Vorlage berechnet Saldo automatisch." },
          { "@type": "HowToStep", name: "Fristgerecht zustellen", text: "Innerhalb von 12 Monaten nach Ende des Abrechnungszeitraums an den Mieter (§ 556 Abs. 3 BGB)." },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Ist die Nebenkostenabrechnungs-Vorlage kostenlos?",
            acceptedAnswer: { "@type": "Answer", text: "Ja. Die Excel-Vorlage von ImmonIQ ist zu 100 % kostenlos, ohne Registrierung und ohne Login herunterladbar." },
          },
          {
            "@type": "Question",
            name: "Ist die Vorlage rechtssicher?",
            acceptedAnswer: { "@type": "Answer", text: "Die Vorlage orientiert sich an § 556 BGB und § 2 BetrKV und enthält alle 17 umlagefähigen Kostenarten sowie die vier gängigen Umlageschlüssel." },
          },
          {
            "@type": "Question",
            name: "Bis wann muss die Nebenkostenabrechnung beim Mieter sein?",
            acceptedAnswer: { "@type": "Answer", text: "Spätestens 12 Monate nach Ende des Abrechnungszeitraums (§ 556 Abs. 3 BGB). Danach entfällt der Nachzahlungsanspruch des Vermieters." },
          },
          {
            "@type": "Question",
            name: "Kann ich das auch automatisch machen lassen?",
            acceptedAnswer: { "@type": "Answer", text: "Ja — ImmonIQ erstellt Nebenkostenabrechnungen automatisch, verschickt sie DSGVO-konform per E-Mail und archiviert PDF + Belege. 30 Tage kostenlos testen." },
          },
        ],
      },
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-bold text-lg">ImmonIQ</Link>
          <Link to="/preise" className="text-sm text-muted-foreground hover:text-foreground">Preise</Link>
        </div>
      </header>

      {/* HERO */}
      <section className="container py-16 md:py-24 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Kostenlose Vorlage · 2026</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Nebenkostenabrechnung Vorlage — kostenlos, rechtssicher, in Excel
        </h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Die einzige Excel-Vorlage für die Nebenkostenabrechnung, die alle{" "}
          <strong>17 umlagefähigen Kostenarten (§ 2 BetrKV)</strong>, vier{" "}
          <strong>Umlageschlüssel</strong> und automatische Saldo-Berechnung nach{" "}
          <strong>§ 556 BGB</strong> enthält. Ohne Registrierung. Sofort-Download.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link to="/nebenkostenabrechnung-vorlage/download?src=hero">
            <Button size="lg" className="gap-2">
              <Download className="w-5 h-5" />
              Vorlage kostenlos herunterladen (Excel)
            </Button>
          </Link>
          <Link to="/preise">
            <Button size="lg" variant="outline" className="gap-2">
              <Sparkles className="w-5 h-5" />
              Oder: automatisch mit ImmonIQ
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {["100 % kostenlos", "Ohne E-Mail", "Formeln inklusive", "§ 556 BGB / BetrKV"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t}
            </span>
          ))}
        </div>
      </section>

      {/* WAS IST DRIN */}
      <section className="container py-12 max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold mb-8">Was ist in der Vorlage enthalten?</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: FileSpreadsheet, title: "3 vorbereitete Tabellenblätter", text: "Deckblatt · Kostenpositionen · Ergebnis mit Saldo-Auswertung." },
            { icon: Scale, title: "17 Kostenarten nach § 2 BetrKV", text: "Grundsteuer, Wasser, Heizung, Müll, Aufzug, Hauswart, Versicherung u. v. m." },
            { icon: CheckCircle2, title: "4 Umlageschlüssel eingebaut", text: "Wohnfläche · Personen · Verbrauch · Wohneinheiten — automatisch verrechnet." },
            { icon: Sparkles, title: "Formeln, keine Taschenrechnerei", text: "Anteil je Mieter, Summen und Saldo (Nachzahlung/Guthaben) werden automatisch berechnet." },
          ].map((f) => (
            <Card key={f.title} className="p-5">
              <f.icon className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* GUIDE */}
      <section className="container py-12 max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold mb-8">
          Nebenkostenabrechnung erstellen — in 5 Schritten
        </h2>

        <ol className="space-y-8">
          {[
            {
              t: "1. Abrechnungszeitraum festlegen",
              d: "Max. 12 Monate — üblich ist das Kalenderjahr. Vermieter, Mieter, Objekt und Wohnfläche gehören aufs Deckblatt.",
            },
            {
              t: "2. Nur umlagefähige Kosten sammeln",
              d: "Umlagefähig sind ausschließlich Kosten aus § 2 BetrKV: Grundsteuer, Wasser/Entwässerung, Heizung, Warmwasser, Aufzug, Müll, Gartenpflege, Hauswart, Versicherungen, Antenne/Kabel, Allgemeinstrom. Verwaltungs- und Instandhaltungskosten sind NICHT umlagefähig.",
            },
            {
              t: "3. Umlageschlüssel wählen",
              d: (
                <>
                  <strong>Wohnfläche</strong> ist Standard (§ 556a BGB), wenn nichts anderes vereinbart.{" "}
                  <strong>Verbrauch</strong> ist bei Heizung/Warmwasser Pflicht (HeizkostenV).{" "}
                  <strong>Personen</strong> oder <strong>Wohneinheiten</strong> nur, wenn im Mietvertrag festgelegt.
                </>
              ),
            },
            {
              t: "4. Vorauszahlungen abziehen",
              d: "Geleistete monatliche Vorauszahlungen des Mieters eintragen — die Vorlage errechnet automatisch Nachzahlung oder Guthaben.",
            },
            {
              t: "5. Fristgerecht zustellen",
              d: "Innerhalb von 12 Monaten nach Ende des Abrechnungszeitraums schriftlich an den Mieter (§ 556 Abs. 3 BGB). Nach Fristablauf entfällt der Nachzahlungsanspruch — Guthaben muss der Vermieter trotzdem auszahlen.",
            },
          ].map((s) => (
            <li key={s.t}>
              <h3 className="font-semibold text-lg mb-2">{s.t}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="container py-16 max-w-3xl">
        <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Excel ist der Anfang. ImmonIQ ist das Ende.
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Die Vorlage ist gut. Aber: ImmonIQ erstellt Deine Nebenkostenabrechnung{" "}
            <strong>automatisch</strong> aus Deinen Belegen, verteilt Kosten auf alle Mieter, versendet{" "}
            <strong>PDFs DSGVO-konform per E-Mail</strong> und archiviert alles rechtssicher —{" "}
            in unter 5 Minuten pro Jahr statt 3 Stunden mit Excel.
          </p>
          <div className="flex flex-wrap gap-6 text-sm mb-6">
            {[
              "Automatische Verteilung auf Mieter",
              "PDF-Versand per Klick",
              "Belege archiviert & DSGVO-konform",
              "30 Tage kostenlos testen",
            ].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/preise">
              <Button size="lg" className="gap-2">
                30 Tage kostenlos testen <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/nebenkostenabrechnung-vorlage/download?src=cta">
              <Button size="lg" variant="outline" className="gap-2">
                <Download className="w-5 h-5" />
                Erst mal die Vorlage
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* FAQ */}
      <section className="container py-12 max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold mb-8">Häufige Fragen</h2>
        <div className="space-y-6">
          {[
            {
              q: "Ist die Nebenkostenabrechnungs-Vorlage kostenlos?",
              a: "Ja, 100 %. Kein Login, keine E-Mail, keine versteckten Kosten.",
            },
            {
              q: "Ist die Vorlage rechtssicher?",
              a: "Sie orientiert sich an § 556 BGB und § 2 BetrKV. Für Sonderfälle (Gewerbe, Sondereigentum, Sonderumlagen) empfiehlt sich zusätzlich eine Rechtsberatung.",
            },
            {
              q: "Was, wenn ich mehrere Mieter im Haus habe?",
              a: "Die Vorlage rechnet einen Mieter ab. Für mehrere Mieter: Vorlage kopieren oder ImmonIQ nutzen — dort werden alle Mieter parallel abgerechnet.",
            },
            {
              q: "Kann ich Heizkosten pauschal abrechnen?",
              a: "Nein. Heizung und Warmwasser müssen laut HeizkostenV verbrauchsabhängig abgerechnet werden (min. 50 %, max. 70 %). Bei Verstoß darf der Mieter 15 % kürzen.",
            },
          ].map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold mb-2">{f.q}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t mt-16">
        <div className="container py-8 text-sm text-muted-foreground flex flex-wrap gap-4 justify-between">
          <span>© {new Date().getFullYear()} ImmonIQ · ENTERVENTUS</span>
          <div className="flex gap-4">
            <Link to="/impressum" className="hover:text-foreground">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
            <Link to="/agb" className="hover:text-foreground">AGB</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
