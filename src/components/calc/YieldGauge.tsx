import { motion } from "framer-motion";

type Props = {
  /** Netto-Rendite in % */
  value: number;
  label?: string;
};

/**
 * Halbkreis-Tacho für Rendite. Skala 0–8 %.
 * Farbe wechselt: rot < 2 %, gelb 2–4 %, grün > 4 %.
 */
export function YieldGauge({ value, label }: Props) {
  const max = 8;
  const v = Math.max(0, Math.min(max, value));
  const angle = -90 + (v / max) * 180; // -90° (links) bis +90° (rechts)
  const color =
    v < 2 ? "hsl(var(--destructive))" : v < 4 ? "hsl(var(--warning))" : "hsl(var(--success))";

  // Bogen-Pfad (Halbkreis von 10,60 bis 90,60)
  const arc = "M 10 60 A 40 40 0 0 1 90 60";

  // Fortschritts-Bogen (gleicher Pfad, gestrichelt nach Fortschritt)
  const circumference = Math.PI * 40; // halber Umfang
  const dash = (v / max) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 70" className="w-40 h-28">
        {/* Hintergrund-Bogen */}
        <path d={arc} fill="none" stroke="hsl(var(--muted))" strokeOpacity="0.4" strokeWidth="8" strokeLinecap="round" />
        {/* Fortschritts-Bogen */}
        <motion.path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          initial={false}
          animate={{ strokeDasharray: `${dash} ${circumference}` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
        {/* Nadel */}
        <motion.line
          x1="50"
          y1="60"
          x2="50"
          y2="22"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ transformOrigin: "50px 60px" }}
          initial={false}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 80, damping: 14 }}
        />
        <circle cx="50" cy="60" r="3" fill="hsl(var(--foreground))" />
        <text x="50" y="55" textAnchor="middle" style={{ fontSize: 10 }} className="fill-foreground font-semibold">
          {v.toFixed(2)} %
        </text>
      </svg>
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
    </div>
  );
}
