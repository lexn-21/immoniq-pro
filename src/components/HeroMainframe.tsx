import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { trackCta } from "@/lib/analytics";

/**
 * HeroMainframe — cinematic split hero mit Video-Scrubbing (Desktop),
 * Typewriter-Headline, interaktivem Service-Picker & Mobile-Menu-Overlay.
 * Adaption des "Mainframe"-Patterns im ImmonIQ Obsidian & Gold Stil.
 */

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260601_110537_3a579fa0-7bbc-4d94-9d25-0e816c7840f5.mp4";

const HEADLINE = "Jeder m² Deutschlands.\nin einer App.";

const SERVICE_OPTIONS = ["Vermieten", "Verwalten", "Analysieren", "Sonstiges"];

function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    const t = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          if (interval) clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(t);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay]);
  return { displayed, done };
}

export default function HeroMainframe() {
  const prefersReduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const { displayed, done } = useTypewriter(HEADLINE, 42, 500);

  // Desktop mouse-scrubbing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (typeof window === "undefined") return;

    if (window.innerWidth < 1024) {
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      const play = () => video.play().catch(() => {});
      play();
      return;
    }

    let prevX: number | null = null;
    let target = 0;
    let ready = false;
    const onMeta = () => {
      ready = true;
      target = 0;
      try {
        video.currentTime = 0;
      } catch {}
    };
    if (video.readyState >= 1) onMeta();
    else video.addEventListener("loadedmetadata", onMeta, { once: true });

    const onMove = (e: MouseEvent) => {
      if (!ready || !video.duration || window.innerWidth < 1024) return;
      if (prevX === null) {
        prevX = e.clientX;
        return;
      }
      const delta = e.clientX - prevX;
      prevX = e.clientX;
      target += (delta / window.innerWidth) * 0.8 * video.duration;
      target = Math.max(0, Math.min(video.duration, target));
      try {
        video.currentTime = target;
      } catch {}
    };

    const onSeeked = () => {
      // continuity — nothing to do, but keep hook per spec
    };
    video.pause();
    window.addEventListener("mousemove", onMove);
    video.addEventListener("seeked", onSeeked);
    return () => {
      window.removeEventListener("mousemove", onMove);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const toggle = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <div className="relative bg-[#f7f6f2] text-neutral-900 selection:bg-[#EAECE9] selection:text-[#1C2E1E] antialiased overflow-x-hidden flex flex-col lg:block lg:min-h-screen">
      {/* Background Video */}
      <div className="order-last lg:order-none relative lg:absolute lg:inset-0 lg:z-0 overflow-hidden pointer-events-none w-full aspect-square md:aspect-video lg:aspect-auto lg:h-full bg-neutral-50 lg:bg-transparent">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover object-right lg:object-right-bottom"
        />
        {/* Gold vignette overlay — ImmonIQ tonality */}
        <div
          aria-hidden
          className="absolute inset-0 hidden lg:block pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(247,246,242,0.92) 0%, rgba(247,246,242,0.75) 30%, rgba(247,246,242,0.25) 55%, transparent 75%), radial-gradient(60% 60% at 78% 55%, rgba(201,168,76,0.14), transparent 65%)",
          }}
        />
      </div>

      {/* Navbar */}
      <header className="relative z-20 w-full">
        <div className="flex items-center justify-between px-6 md:px-10 pt-6 md:pt-8">
          <Link to="/" className="flex flex-row gap-2 items-baseline">
            <span className="text-[21px] sm:text-[26px] tracking-tight text-black font-medium select-none font-display">
              Immon<span className="text-[#c9a84c]">IQ</span>
              <sup className="text-[10px] align-super ml-0.5 text-neutral-500">®</sup>
            </span>
            <span className="text-[25px] sm:text-[30px] text-[#c9a84c] select-none tracking-[-0.02em] font-medium leading-none">
              ✱
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-[18px] text-black">
            <a href="#produkt" className="hover:opacity-60 transition-opacity">Produkt</a>
            <span className="text-neutral-400">,</span>
            <a href="#preise" className="hover:opacity-60 transition-opacity">Preise</a>
            <span className="text-neutral-400">,</span>
            <Link to="/markt" className="hover:opacity-60 transition-opacity">Markt</Link>
            <span className="text-neutral-400">,</span>
            <Link to="/auth" className="hover:opacity-60 transition-opacity">Anmelden</Link>
          </nav>

          <Link
            to="/auth"
            onClick={() => trackCta("hero_nav_cta", { source: "index_hero_nav" })}
            className="hidden md:inline text-[18px] text-black underline underline-offset-4 decoration-[#c9a84c] hover:opacity-60 transition-opacity"
          >
            Jetzt starten
          </Link>

          {/* Hamburger */}
          <button
            aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden relative w-8 h-8 flex flex-col justify-center items-center gap-[5px]"
          >
            <span
              className={`w-6 h-[2px] bg-black transition-all duration-300 ${
                mobileOpen ? "rotate-45 translate-y-[7px]" : ""
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-black transition-all duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`w-6 h-[2px] bg-black transition-all duration-300 ${
                mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-[9] bg-[#f7f6f2]/95 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col items-start gap-6 px-8 pt-28 text-3xl font-display">
          {[
            { label: "Produkt", to: "#produkt" },
            { label: "Preise", to: "#preise" },
            { label: "Markt", to: "/markt" },
            { label: "Anmelden", to: "/auth" },
            { label: "Jetzt starten", to: "/auth" },
          ].map((l) =>
            l.to.startsWith("#") ? (
              <a key={l.label} href={l.to} onClick={() => setMobileOpen(false)} className="hover:text-[#c9a84c]">
                {l.label}
              </a>
            ) : (
              <Link key={l.label} to={l.to} onClick={() => setMobileOpen(false)} className="hover:text-[#c9a84c]">
                {l.label}
              </Link>
            )
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 md:px-10 lg:px-16 pt-10 md:pt-16 lg:pt-24 pb-16 lg:pb-24 lg:min-h-[calc(100vh-96px)] flex items-start">
        <div className="w-full max-w-xl lg:max-w-2xl">
          {/* Kicker */}
          <div className="inline-flex items-center gap-3 mb-8">
            <span className="h-px w-8 bg-[#c9a84c]" />
            <span className="text-[10px] tracking-[0.32em] uppercase text-[#8a6d2b] font-medium">
              All in One · Made in Germany
            </span>
          </div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[0.95] text-neutral-900 font-display whitespace-pre-line">
              {displayed}
              {!done && !prefersReduced && (
                <span className="animate-blink text-[#c9a84c]">|</span>
              )}
            </h1>
          </motion.div>

          {/* Subhead */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="mt-8 text-lg md:text-xl text-[#5A635A] leading-relaxed font-normal mb-12 max-w-2xl">
              Grundstück, Wohnung, Mieter, Bürokratie und Steuer — komplett in einer App.
              Verschlüsselt in Deutschland. Privat für immer kostenlos.
            </p>
          </motion.div>

          {/* Service picker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl font-medium tracking-tight mb-2 font-display">
              Was willst du zuerst lösen?
            </h2>
            <p className="opacity-85 text-[#738273] mb-6 text-sm">
              Wähle alles, was passt — dein Start wird darauf zugeschnitten.
            </p>

            <div className="flex flex-wrap gap-3">
              {SERVICE_OPTIONS.map((opt) => {
                const active = services.includes(opt);
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    whileTap={{ scale: 0.96 }}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-200 ${
                      active
                        ? "bg-[#1C2E1E] text-white shadow-md shadow-emerald-950/5"
                        : "bg-white text-[#1C2E1E] border border-[#F1F3F1] hover:bg-[#F1F3F1]/55"
                    }`}
                  >
                    <AnimatePresence initial={false}>
                      {active && (
                        <motion.span
                          key="check"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="flex"
                        >
                          <Check className="h-4 w-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {opt}
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback banner */}
            <div className="mt-6">
              <AnimatePresence mode="wait">
                {services.length === 0 ? (
                  <motion.p
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    className="italic text-xs text-neutral-600"
                  >
                    Bitte oben mindestens einen Bereich auswählen.
                  </motion.p>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 240, damping: 26 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#FAFBF9] border border-[#E7EAE5] rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-sm text-[#1C2E1E]">
                        Bereit für:{" "}
                        <span className="font-medium">{services.join(", ")}</span>
                      </p>
                      <Link
                        to="/auth"
                        onClick={() =>
                          trackCta("hero_service_picker", {
                            source: "index_hero",
                            services: services.join(","),
                          })
                        }
                        className="inline-flex items-center gap-2 text-[#4D6D47] uppercase text-xs font-medium tracking-widest hover:text-[#1C2E1E] transition-colors"
                      >
                        Los geht's
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex items-center gap-5 text-[10px] tracking-[0.24em] uppercase text-neutral-500"
          >
            <span>Privat 0 €</span>
            <span className="h-px w-4 bg-neutral-300" />
            <span>Keine Kreditkarte</span>
            <span className="h-px w-4 bg-neutral-300" />
            <span>60 Sekunden</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
