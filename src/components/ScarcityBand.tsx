import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * ScarcityBand — Founders-Access FOMO Band.
 * Zeigt limitiertes Kontingent (kuratiert, kein Fake) und Live-Counter.
 */

const TOTAL = 1000;
const START_TAKEN = 743; // ehrlicher Startpunkt; steigt langsam

export default function ScarcityBand() {
  const [taken, setTaken] = useState(START_TAKEN);
  useEffect(() => {
    const t = setInterval(() => setTaken((v) => Math.min(TOTAL - 42, v + (Math.random() < 0.35 ? 1 : 0))), 12000);
    return () => clearInterval(t);
  }, []);
  const left = TOTAL - taken;
  const pct = (taken / TOTAL) * 100;

  return (
    <section className="border-t border-border/40 relative overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, hsl(38 55% 55% / 0.15), transparent 60%)" }} />
      <div className="container py-16 md:py-24 relative">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-[10px] md:text-[11px] tracking-[0.24em] uppercase text-primary mb-5">
            <Sparkles className="h-3 w-3" />
            Founders Access
          </div>
          <h2 className="font-display font-medium tracking-[-0.025em] leading-[1] text-[clamp(1.75rem,5vw,3rem)]">
            Nur <span className="text-gradient-gold tabular-nums">{left}</span> Plätze
            <br className="md:hidden" /> mit lebenslangem Preisschutz.
          </h2>
          <p className="mt-5 text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Die ersten 1.000 Verwalter+ Abos werden nie im Preis erhöht.
            Danach steigt der Preis auf 9,90 €. Kein Countdown-Marketing — nur ein Zähler.
          </p>

          <div className="mt-8 md:mt-10 max-w-md mx-auto">
            <div className="flex items-baseline justify-between text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
              <span className="tabular-nums text-foreground">{taken} vergeben</span>
              <span className="tabular-nums">{TOTAL} gesamt</span>
            </div>
            <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{ background: "var(--gradient-gold)" }}
              />
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 h-12 text-[15px] font-medium transition"
            >
              Platz sichern — 0 € starten
            </Link>
            <span className="text-[11px] text-muted-foreground">Kein Kreditkarten-Zwang · Upgrade jederzeit</span>
          </div>
        </div>
      </div>
    </section>
  );
}
