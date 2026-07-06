import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Lock, TrendingUp, MapPin, FileText } from "lucide-react";

/**
 * HeroStage — premium, on-brand landing visual.
 * Ersetzt den generischen 3D-Globus. Keine THREE-Abhängigkeit im Hero.
 * Radar-Grid + pulsierende Deutschland-Pins + schwebende Data-Cards + Parallax.
 */

// Vereinfachte relative Positionen (x%, y%) deutscher Städte auf dem Radar.
const PINS = [
  { name: "Hamburg",   x: 44, y: 18, size: 12 },
  { name: "Berlin",    x: 66, y: 26, size: 16 },
  { name: "Köln",      x: 26, y: 46, size: 10 },
  { name: "Frankfurt", x: 36, y: 54, size: 11 },
  { name: "Leipzig",   x: 58, y: 44, size: 9  },
  { name: "München",   x: 52, y: 74, size: 14 },
  { name: "Stuttgart", x: 34, y: 68, size: 9  },
  { name: "Dresden",   x: 70, y: 48, size: 8  },
];

const CARDS = [
  { icon: Lock,       label: "Tresor",     value: "AES-256", top: "10%",  left: "4%"  },
  { icon: TrendingUp, label: "Marktwert",  value: "+4,2 %", top: "62%",  left: "0%"  },
  { icon: MapPin,     label: "PLZ 10115",  value: "Berlin", top: "18%",  right: "2%" },
  { icon: FileText,   label: "Anlage V",   value: "bereit", top: "70%",  right: "4%" },
] as const;

export default function HeroStage() {
  const prefersReduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (prefersReduced) return;
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ x: py * -6, y: px * 8 });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [prefersReduced]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full aspect-square max-w-[560px] mx-auto select-none"
      style={{ perspective: "1400px" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-70"
           style={{
             background:
               "radial-gradient(60% 60% at 50% 45%, rgba(230,194,116,0.18), transparent 70%), radial-gradient(40% 40% at 70% 70%, rgba(120,140,255,0.10), transparent 70%)",
           }}
      />

      {/* Radar stage */}
      <motion.div
        className="absolute inset-0 rounded-[32px] overflow-hidden border border-border/40 bg-gradient-to-br from-background/60 to-background/20 backdrop-blur-sm"
        style={{
          transformStyle: "preserve-3d",
          rotateX: tilt.x,
          rotateY: tilt.y,
          transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Grid lines */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-40">
          <defs>
            <radialGradient id="rg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              <stop offset="70%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#rg)" />
          {[10, 20, 30, 40].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="0.15" className="text-border" />
          ))}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={50}
                y1={50}
                x2={50 + Math.cos(a) * 46}
                y2={50 + Math.sin(a) * 46}
                stroke="currentColor"
                strokeWidth="0.1"
                className="text-border"
              />
            );
          })}
        </svg>

        {/* Sweep beam */}
        {!prefersReduced && (
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0deg, hsl(var(--primary) / 0.18) 20deg, transparent 60deg, transparent 360deg)",
              maskImage: "radial-gradient(circle at 50% 50%, black 46%, transparent 50%)",
              WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 46%, transparent 50%)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Connection arcs */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
          {PINS.slice(0, 5).map((p, i) => {
            const q = PINS[(i + 3) % PINS.length];
            const mx = (p.x + q.x) / 2;
            const my = Math.min(p.y, q.y) - 8;
            const d = `M ${p.x} ${p.y} Q ${mx} ${my} ${q.x} ${q.y}`;
            return (
              <motion.path
                key={i}
                d={d}
                fill="none"
                stroke="url(#lg)"
                strokeWidth="0.35"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={prefersReduced ? { pathLength: 1, opacity: 0.7 } : { pathLength: [0, 1, 1], opacity: [0, 0.8, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
              />
            );
          })}
        </svg>

        {/* Pins */}
        {PINS.map((p, i) => (
          <motion.div
            key={p.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `translate3d(-50%,-50%,${p.size}px)` }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 220, damping: 18 }}
          >
            <div className="relative">
              {!prefersReduced && (
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: "hsl(var(--primary) / 0.35)", animationDuration: `${2 + (i % 3)}s` }}
                />
              )}
              <span
                className="block rounded-full shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
                style={{
                  width: p.size,
                  height: p.size,
                  background: "radial-gradient(circle at 30% 30%, #fff2c7, hsl(var(--primary)) 60%, #8a6a24)",
                }}
              />
              <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 text-[9px] tracking-[0.14em] uppercase text-muted-foreground whitespace-nowrap">
                {p.name}
              </span>
            </div>
          </motion.div>
        ))}

        {/* Center core */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={prefersReduced ? {} : { scale: [1, 1.05, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className="w-16 h-16 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #fff5d0, hsl(var(--primary)) 55%, rgba(230,194,116,0) 78%)",
              filter: "blur(0.4px)",
            }}
          />
          <div className="mt-2 text-center text-[10px] tracking-[0.28em] uppercase text-muted-foreground">
            DE · Live
          </div>
        </motion.div>
      </motion.div>

      {/* Floating data cards */}
      {CARDS.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            className="absolute z-10 rounded-2xl border border-border/60 bg-background/80 backdrop-blur-md shadow-[0_10px_40px_-20px_rgba(0,0,0,0.5)] px-3 py-2 min-w-[124px]"
            style={{
              top: (c as any).top,
              left: (c as any).left,
              right: (c as any).right,
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={prefersReduced ? {} : { y: [0, -4, 0] }}
              transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
              className="flex items-center gap-2.5"
            >
              <div className="h-7 w-7 rounded-lg grid place-items-center bg-primary/10 border border-primary/20">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground">{c.label}</div>
                <div className="text-[12px] font-medium tabular-nums">{c.value}</div>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
