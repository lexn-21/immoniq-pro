import { MapPin } from "lucide-react";

/**
 * WebGL-freier Fallback für den 3D-Globus.
 * Pure CSS/SVG, respektiert prefers-reduced-motion (Animation wird per CSS pausiert).
 * Kein Three.js-Bundle, kein Canvas — läuft auf jedem Gerät.
 */
export default function PropertyGlobeFallback({ reason = "loading" }: { reason?: "loading" | "no-webgl" | "reduced-motion" }) {
  const CITIES = [
    { name: "Berlin", x: 62, y: 30 },
    { name: "Hamburg", x: 50, y: 22 },
    { name: "München", x: 55, y: 62 },
    { name: "Köln", x: 32, y: 42 },
    { name: "Frankfurt", x: 42, y: 48 },
    { name: "Leipzig", x: 58, y: 40 },
    { name: "Stuttgart", x: 44, y: 58 },
    { name: "Dresden", x: 66, y: 42 },
  ];

  const label =
    reason === "no-webgl"
      ? "Statische Ansicht · WebGL nicht verfügbar"
      : reason === "reduced-motion"
        ? "Ruhige Ansicht · Reduzierte Bewegung"
        : "Deutschland live";

  return (
    <div className="relative w-full aspect-square max-w-[560px] mx-auto">
      {/* Ambient glow */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.25),transparent_60%)] blur-3xl" />

      <div className="absolute inset-4 rounded-full border border-primary/20 bg-[radial-gradient(circle_at_35%_30%,#1a1a1a,#050505_70%)] overflow-hidden shadow-2xl">
        {/* Longitude / latitude lines */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full text-primary/25"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="rim" cx="50%" cy="50%" r="50%">
              <stop offset="80%" stopColor="transparent" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            </radialGradient>
          </defs>
          {/* latitudes */}
          {[20, 35, 50, 65, 80].map((y) => (
            <ellipse key={y} cx="50" cy={y} rx="45" ry={Math.max(2, 45 - Math.abs(50 - y))} fill="none" stroke="currentColor" strokeWidth="0.3" />
          ))}
          {/* longitudes */}
          {[-60, -30, 0, 30, 60].map((deg) => (
            <ellipse
              key={deg}
              cx="50"
              cy="50"
              rx={Math.max(3, 45 * Math.cos((deg * Math.PI) / 180))}
              ry="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.3"
            />
          ))}
          <circle cx="50" cy="50" r="49" fill="url(#rim)" />

          {/* City pins */}
          {CITIES.map((c, i) => (
            <g
              key={c.name}
              style={{
                transformOrigin: `${c.x}px ${c.y}px`,
                animation: `pgf-pulse 2.8s ease-in-out ${i * 0.25}s infinite`,
              }}
            >
              <circle cx={c.x} cy={c.y} r="1.6" fill="hsl(var(--primary))" />
              <circle cx={c.x} cy={c.y} r="3" fill="hsl(var(--primary))" opacity="0.25" />
            </g>
          ))}
        </svg>
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <div className="px-4 py-2 rounded-full bg-background/60 backdrop-blur-md border border-primary/20 text-[11px] tracking-[0.2em] uppercase text-muted-foreground flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          {label}
        </div>
      </div>

      <style>{`
        @keyframes pgf-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-pgf] g { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
