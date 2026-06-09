import { motion } from "framer-motion";

type Props = {
  /** 0..1 — wieviel ist bereits getilgt / erreicht */
  progress: number;
  label?: string;
  caption?: string;
};

/**
 * Visuelles Haus, das sich mit dem Tilgungsfortschritt füllt.
 * Psychologisch: "Wieviel gehört mir schon?" greifbarer als nackte Zahlen.
 */
export function HouseFill({ progress, label, caption }: Props) {
  const p = Math.max(0, Math.min(1, progress));
  const pct = Math.round(p * 100);
  // Haus-Innenraum: y von 80 (Boden) bis 30 (Spitze des Dachs-Innenraum)
  const fillY = 80 - p * 50;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 100" className="w-40 h-40">
        <defs>
          <clipPath id="house-clip">
            {/* Dach + Wände als Maske */}
            <path d="M 50 12 L 88 42 L 88 82 L 12 82 L 12 42 Z" />
          </clipPath>
          <linearGradient id="house-fill-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Leeres Haus (Outline) */}
        <path
          d="M 50 12 L 88 42 L 88 82 L 12 82 L 12 42 Z"
          fill="hsl(var(--muted))"
          fillOpacity="0.25"
          stroke="hsl(var(--border))"
          strokeWidth="1.2"
        />

        {/* Füllung (animiert) */}
        <g clipPath="url(#house-clip)">
          <motion.rect
            x="0"
            width="100"
            initial={false}
            animate={{ y: fillY, height: 100 - fillY }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
            fill="url(#house-fill-grad)"
          />
          {/* Wasserlinie */}
          <motion.line
            x1="0"
            x2="100"
            initial={false}
            animate={{ y1: fillY, y2: fillY }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
            stroke="hsl(var(--primary))"
            strokeWidth="0.6"
            strokeOpacity="0.8"
          />
        </g>

        {/* Tür */}
        <rect x="44" y="62" width="12" height="20" fill="hsl(var(--background))" fillOpacity="0.85" stroke="hsl(var(--border))" strokeWidth="0.6" />
        {/* Fenster */}
        <rect x="22" y="50" width="12" height="10" fill="hsl(var(--background))" fillOpacity="0.85" stroke="hsl(var(--border))" strokeWidth="0.6" />
        <rect x="66" y="50" width="12" height="10" fill="hsl(var(--background))" fillOpacity="0.85" stroke="hsl(var(--border))" strokeWidth="0.6" />

        {/* Outline drüber */}
        <path
          d="M 50 12 L 88 42 L 88 82 L 12 82 L 12 42 Z"
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeOpacity="0.35"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Prozent in der Mitte */}
        <text
          x="50"
          y="32"
          textAnchor="middle"
          className="fill-foreground font-semibold"
          style={{ fontSize: 9 }}
        >
          {pct}%
        </text>
      </svg>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      {caption && <p className="text-xs text-muted-foreground text-center max-w-[180px]">{caption}</p>}
    </div>
  );
}
