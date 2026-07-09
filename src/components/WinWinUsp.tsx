import { motion } from "framer-motion";
import { Check, TrendingUp, Clock, Users, Zap, Lock, HelpCircle, Shield, FileText, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";
import SavingsCalculator from "@/components/SavingsCalculator";

/**
 * WinWinUsp — der Kern-Pitch.
 * Erklärt das USP als echtes Win-Win (Vermieter ↔ Mieter ↔ Steuer)
 * und aktiviert FOMO ohne billige Countdowns:
 * — was du gewinnst wenn du jetzt startest
 * — was du verlierst wenn du wartest
 */

const WINS = [
  {
    role: "Vermieter",
    color: "from-primary/20 to-transparent",
    gains: [
      "12 h/Monat weniger Bürokratie",
      "Cashflow live statt Excel-Rätsel",
      "Rendite pro m² auf Knopfdruck",
      "DATEV-Export für den Steuerberater",
    ],
  },
  {
    role: "Mieter",
    color: "from-primary/15 to-transparent",
    gains: [
      "Ein Portal statt E-Mail-Ping-Pong",
      "Nebenkosten transparent nachvollziehbar",
      "Anliegen dokumentiert, nicht vergessen",
      "Kaution + Verträge sicher hinterlegt",
    ],
  },
  {
    role: "Beide",
    color: "from-primary/25 to-transparent",
    gains: [
      "Rechtssicher nach BGB + DSGVO",
      "Kommunikation revisionssicher",
      "Weniger Streit, mehr Vertrauen",
      "Made in Germany, verschlüsselt",
    ],
  },
];

const LandlordMath = () => (
  <div className="mt-6 pt-5 border-t border-border/40">
    <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
      Konkrete Vermieter-Ersparnis
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-3">
      {[
        { units: 5, hours: 4, euros: 180 },
        { units: 15, hours: 12, euros: 540 },
        { units: 30, hours: 25, euros: 1125 },
      ].map((ex) => (
        <div
          key={ex.units}
          className="rounded-xl bg-background/80 border border-border/40 p-2.5 md:p-3 text-center"
        >
          <div className="font-display text-base md:text-lg font-medium tracking-tight">
            {ex.units} WE
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {ex.hours} h/Monat
          </div>
          <div className="text-[12px] md:text-[13px] text-primary font-medium mt-0.5">
            ≈ {ex.euros.toLocaleString("de-DE")} €
          </div>
        </div>
      ))}
    </div>
    <p className="text-[10px] text-muted-foreground leading-relaxed">
      Annahmen: 30 min/Objekt/Monat Verwaltung + 1 h/Objekt/Quartal Nebenkosten; bewertet mit 45 €/h (eigener Zeitwert oder Steuerberater). Ergebnis ohne Gewähr.
    </p>
  </div>
);

const TaxAdvisorMath = () => {
  const examples = [
    { clients: 10, hoursMonth: 1.7, eurosMonth: 200 },
    { clients: 25, hoursMonth: 4.2, eurosMonth: 500 },
    { clients: 50, hoursMonth: 8.3, eurosMonth: 1000 },
  ];

  return (
    <div className="mt-6 pt-5 border-t border-border/40">
      <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
        Konkrete Steuerberater-Ersparnis
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-3">
        {examples.map((ex) => (
          <div
            key={ex.clients}
            className="rounded-xl bg-background/80 border border-border/40 p-2.5 md:p-3 text-center"
          >
            <div className="font-display text-base md:text-lg font-medium tracking-tight">
              {ex.clients} Mandanten
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {ex.hoursMonth.toLocaleString("de-DE", { minimumFractionDigits: 1 })} h/Monat
            </div>
            <div className="text-[12px] md:text-[13px] text-primary font-medium mt-0.5">
              ≈ {ex.eurosMonth.toLocaleString("de-DE")} €/Monat
            </div>
            <div className="text-[10px] text-muted-foreground/80 mt-0.5">
              ≈ {(ex.eurosMonth * 12).toLocaleString("de-DE")} €/Jahr
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Annahmen: 20 min/Mandant/Monat manueller Abstimmungsaufwand (Belege, DATEV-Vorbereitung, Rückfragen); 50 % Zeitersparnis durch strukturierte Daten und DATEV-Export; bewertet mit 120 €/h Fachstundensatz. Ergebnis ohne Gewähr.
      </p>
    </div>
  );
};

const FOMO = [
  {
    icon: TrendingUp,
    k: "Preisvorteil",
    d: "Founders-Accounts nutzen die Privat-Version dauerhaft kostenlos. Sobald der Pro-Plan startet, fallen für neue Nutzer Gebühren an.",
    milestone: "Meilenstein: Pro-Plan startet nach Abschluss der Beta-Phase (geplant Q3 2026).",
    source: "Grundlage: Der 0-€-Preis ist eine Early-Adopter-Prämie, keine dauerhafte Subvention.",
  },
  {
    icon: Users,
    k: "Marktplatz-Listing",
    d: "Der ImmonIQ-Marktplatz listet verifizierte Anbieter nach Qualität und Aktualität. Frühe Listings sammeln Bewertungen und Sichtbarkeit.",
    milestone: "Meilenstein: Listings öffnen ab 10.000 gepflegten Objekten.",
    source: "Vergleich: Marktplätze wie Airbnb oder Immoscout zeigen etablierte Profile bevorzugt (Relevanz-Algorithmus).",
  },
  {
    icon: Clock,
    k: "Steuer-Historie",
    d: "Steuerlich relevante Belege und AfA-Berechnungen brauchen lückenlose Daten. Lücken lassen sich nachträglich nur mit erheblichem Aufwand schließen.",
    milestone: "Meilenstein: Steuererklärung 2026 fällt im Sommer 2026 an.",
    source: "Grundlage: § 147 AO schreibt eine ordnungsgemäße Aufbewahrung von Geschäftsunterlagen vor.",
  },
  {
    icon: Zap,
    k: "Finanzierungsvorteil",
    d: "Banken bewerten bei Immobilienfinanzierungen bestehende Miet-Cashflows. Ohne saubere Historie muss der Sachbearbeiter schätzen.",
    milestone: "Meilenstein: 12–24 Monate belegte Cashflow-Historie verbessern die Kreditwürdigkeit.",
    source: "Grundlage: Kreditprüfungspraxis nach Basel-III-/EBA-Leitlinien; siehe auch BVR-Richtlinien.",
  },
];

const FAQS = [
  {
    value: "rechtssicher",
    icon: Shield,
    q: "Ist ImmonIQ rechtssicher?",
    a: "ImmonIQ ist nach geltendem Mietrecht (BGB) und der DSGVO aufgebaut: Vertragsvorlagen und Kündigungsformulare enthalten Pflichtfelder, damit rechtliche Mindestanforderungen nicht vergessen werden. Alle Daten werden in Deutschland gehostet, verschlüsselt übertragen und regelmäßig gesichert. Bei komplexen Einzelfällen ersetzt die Software keine anwaltliche Beratung, schafft aber eine deutlich bessere Ausgangslage.",
  },
  {
    value: "revisionssicher",
    icon: FileText,
    q: "Was bedeutet revisionssichere Dokumentation?",
    a: "Jede Nachricht, jede Zahlung und jedes Dokument wird mit Zeitstempel und Beteiligten abgelegt, sodass eine lückenlose Nachweiskette entsteht. Das hilft dir bei Mieterwechseln, Instandhaltungsstreitigkeiten oder Prüfungen durch das Finanzamt. Statt lose E-Mails und Notizen liegen alle Belege zentral, sortiert und jederzeit abrufbar vor.",
  },
  {
    value: "datev",
    icon: Download,
    q: "Wie funktioniert der DATEV-Export?",
    a: "Du exportierst deine Buchungsdaten mit einem Klick als DATEV-kompatible CSV-Datei. Dein Steuerberater kann die Datei direkt in seine Kanzleisoftware importieren, ohne sie manuell umzutippen. Das spart Stunden, reduziert Tippfehler und sorgt dafür, dass Umsatzsteuer, Mieteinnahmen und Werbungskosten sauber gebucht werden.",
  },
];

export default function WinWinUsp() {
  return (
    <section className="relative border-t border-border/40 overflow-hidden">
      {/* subtle ambient gold */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(1200px 500px at 50% -10%, hsl(38 55% 55% / 0.12), transparent 60%)",
        }}
      />

      <div className="container relative py-20 md:py-32 max-w-6xl">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
          <p className="text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-4">
            Warum ImmonIQ
          </p>
          <h2 className="font-display font-medium tracking-[-0.03em] leading-[0.95] text-[clamp(2rem,7vw,4.5rem)]">
            Der einzige Ort, an dem
            <br />
            <span className="text-gradient-gold">alle gewinnen.</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Verwaltungs-Software ist meistens ein Kompromiss: entweder Vermieter-Cockpit oder Mieter-Portal.
            ImmonIQ ist beides — plus Steuer, plus Markt. <span className="text-foreground">Ein System. Drei Gewinner.</span>
          </p>
        </div>

        {/* WIN-WIN-WIN Trio */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-5 mb-20 md:mb-28">
          {WINS.map((w, i) => (
            <motion.div
              key={w.role}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl p-6 md:p-8 overflow-hidden group hover:border-primary/40 transition-colors"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-b ${w.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`}
              />
              <div className="relative">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-[10px] tabular-nums tracking-[0.28em] uppercase text-muted-foreground">
                    0{i + 1} · gewinnt
                  </span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl tracking-[-0.02em] font-medium mb-6">
                  {w.role === "Beide" ? (
                    <span className="text-gradient-gold">Beide</span>
                  ) : (
                    w.role
                  )}
                </h3>
                <ul className="space-y-3">
                  {w.gains.map((g) => (
                    <li key={g} className="flex items-start gap-3 text-[13px] md:text-sm leading-relaxed">
                      <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" strokeWidth={2.5} />
                      <span className="text-foreground/85">{g}</span>
                    </li>
                  ))}
                </ul>
                {w.role === "Vermieter" && <LandlordMath />}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Steuerberater-Mathe */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto mb-20 md:mb-28 rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl p-6 md:p-8"
        >
          <div className="text-center mb-5">
            <p className="text-[10px] tracking-[0.28em] uppercase text-muted-foreground mb-2">
              Auch für Kanzleien
            </p>
            <h3 className="font-display text-2xl md:text-3xl tracking-[-0.02em] font-medium">
              Steuerberater sparen <span className="text-gradient-gold">Stunden pro Mandant.</span>
            </h3>
          </div>
          <TaxAdvisorMath />
        </motion.div>

        {/* FOMO — was verlierst du wenn du wartest */}
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <p className="text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-4">
            Warum jetzt
          </p>
          <h3 className="font-display font-medium tracking-[-0.02em] leading-[1] text-[clamp(1.6rem,5vw,2.75rem)]">
            Jeder Monat ohne ImmonIQ
            <br />
            <span className="text-gradient-gold">kostet dich echtes Geld.</span>
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
          {FOMO.map((f, i) => (
            <motion.div
              key={f.k}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-4 rounded-2xl border border-border/40 bg-background/40 backdrop-blur-sm p-5 md:p-6 hover:border-primary/30 hover:bg-background/70 transition-all"
            >
              <div className="shrink-0 h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <f.icon className="h-4.5 w-4.5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <div className="font-display text-base md:text-lg font-medium tracking-tight mb-1">
                  {f.k}
                </div>
                <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">
                  {f.d}
                </p>
                <div className="mt-3 text-[11px] md:text-xs font-medium text-foreground">
                  {f.milestone}
                </div>
                <p className="mt-1 text-[10px] md:text-[11px] text-muted-foreground/80 leading-relaxed">
                  {f.source}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-16 md:mt-24">
          <div className="text-center mb-10 md:mb-12">
            <p className="text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-4">
              Häufige Fragen
            </p>
            <h3 className="font-display font-medium tracking-[-0.02em] leading-[1] text-[clamp(1.6rem,5vw,2.75rem)]">
              Rechtssicherheit & Dokumentation
            </h3>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f) => (
              <AccordionItem key={f.value} value={f.value} className="border-border/40">
                <AccordionTrigger className="text-left text-[13px] md:text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-3">
                    <f.icon className="h-4 w-4 text-primary shrink-0" />
                    {f.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Savings Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 md:mt-24"
        >
          <SavingsCalculator />
        </motion.div>

        {/* Annahmen & Disclaimer */}
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          aria-labelledby="assumptions-heading"
          className="max-w-4xl mx-auto mt-8 md:mt-10 rounded-2xl border border-border/40 bg-background/40 backdrop-blur-sm p-6 md:p-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-4 w-4 text-primary" />
            <h4
              id="assumptions-heading"
              className="text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground"
            >
              Annahmen & Disclaimer
            </h4>
          </div>
          <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed mb-5">
            Alle Zahlen in den Beispielrechnungen und im Rechner sind{" "}
            <span className="text-foreground font-medium">unverbindliche Beispielwerte</span>, um eine Größenordnung zu vermitteln. Deine tatsächliche Ersparnis hängt von Portfolio, Prozessen und deinem Steuerberater ab.
          </p>
          <ul className="space-y-2.5 text-[12px] md:text-[13px] text-muted-foreground leading-relaxed">
            <li className="flex gap-3">
              <span className="text-primary shrink-0">·</span>
              <span>
                <span className="text-foreground">Vermieter-Beispiele:</span> 30 min/Objekt/Monat Verwaltung + 1 h/Objekt/Quartal Nebenkosten, bewertet mit 45 €/h.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary shrink-0">·</span>
              <span>
                <span className="text-foreground">Steuerberater-Beispiele:</span> 20 min/Mandant/Monat manueller Abstimmungsaufwand, 50 % Zeitersparnis, 120 €/h Fachstundensatz.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary shrink-0">·</span>
              <span>
                <span className="text-foreground">Rechner:</span> 60 % weniger Verwaltungszeit durch Automatisierung; deine Slider-Werte werden linear hochgerechnet.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary shrink-0">·</span>
              <span>
                Keine Garantie auf Rendite, Ersparnis oder Steuerwirkung. ImmonIQ ersetzt keine steuerliche oder rechtliche Beratung.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary shrink-0">·</span>
              <span>
                Preise können sich nach der Founders-Phase ändern. Der 0-€-Zugang ist eine Early-Adopter-Prämie.
              </span>
            </li>
          </ul>
        </motion.aside>


        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 md:mt-20 flex flex-col items-center text-center gap-5"
        >
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Founders-Fenster offen
          </div>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-8 h-12 text-[15px] font-medium"
          >
            <Link to="/auth">
              Jetzt Platz sichern — 0 € <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-[11px] text-muted-foreground inline-flex items-center gap-2">
            <Lock className="h-3 w-3" /> 60 Sekunden · Keine Kreditkarte · Jederzeit löschbar
          </p>
        </motion.div>
      </div>
    </section>
  );
}
