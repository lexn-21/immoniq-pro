import { motion } from "framer-motion";
import { Check, TrendingUp, Clock, Users, Zap, Lock, HelpCircle, Shield, FileText, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";

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


const FOMO = [
  { icon: TrendingUp, k: "Preis steigt", d: "Founders-Preis 0 € Privat gilt nur für die ersten 10.000 Accounts." },
  { icon: Users,      k: "Marktplatz",   d: "Wer früh startet, wird zuerst gelistet — sichtbar für Millionen Suchen." },
  { icon: Clock,      k: "Historie",     d: "Jeder Tag ohne ImmonIQ = ein Tag ohne Belege, ohne AfA-Track, ohne Rendite-Historie." },
  { icon: Zap,        k: "Zinsvorteil",  d: "Banken fragen Cashflow-Historien. Ohne Track-Record: schlechtere Konditionen." },
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
              </div>
            </motion.div>
          ))}
        </div>

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
