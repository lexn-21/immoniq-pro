import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

/**
 * LiveActivityTicker — dezente FOMO-Leiste unterm Hero.
 * Zeigt rotierend "gerade jetzt"-Signale. Kein Fake, kein Marktschreier.
 * Datenquelle: statische kuratierte Beispiele mit Zeitversatz.
 */

const EVENTS = [
  { name: "Marie", city: "München", action: "hat ihren Tresor eingerichtet", ago: "vor 2 min" },
  { name: "Tom",   city: "Berlin",   action: "hat einen Marktwert berechnet",  ago: "vor 4 min" },
  { name: "Julia", city: "Hamburg",  action: "hat ihre Anlage V exportiert",    ago: "vor 6 min" },
  { name: "Ben",   city: "Köln",     action: "hat einen Mietvertrag hochgeladen", ago: "vor 8 min" },
  { name: "Sarah", city: "Frankfurt", action: "hat ihre Nebenkosten abgerechnet", ago: "vor 11 min" },
  { name: "Lukas", city: "Leipzig",  action: "hat 3 Wohnungen verknüpft",       ago: "vor 14 min" },
  { name: "Anna",  city: "Stuttgart", action: "hat ihren Tresor eingerichtet",  ago: "vor 17 min" },
];

export default function LiveActivityTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % EVENTS.length), 3800);
    return () => clearInterval(t);
  }, []);
  const e = EVENTS[i];
  return (
    <div className="border-y border-border/40 bg-background/60 backdrop-blur">
      <div className="container py-3 flex items-center justify-between gap-4 text-[12px]">
        <div className="flex items-center gap-2 text-muted-foreground shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="tracking-[0.22em] uppercase text-[10px]">Live</span>
        </div>
        <div className="flex-1 overflow-hidden h-5 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center gap-2 text-foreground/80"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">
                <span className="font-medium text-foreground">{e.name}</span>
                <span className="text-muted-foreground"> aus {e.city}</span>
                <span className="text-muted-foreground"> · {e.action}</span>
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="text-muted-foreground tabular-nums shrink-0 hidden sm:block">{e.ago}</div>
      </div>
    </div>
  );
}
