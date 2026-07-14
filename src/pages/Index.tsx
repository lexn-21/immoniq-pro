import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Shield, Lock, MapPin, Check, Sparkles } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";
import HeroWorld from "@/components/HeroWorld";
import HeroMainframe from "@/components/HeroMainframe";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import PropertyShowcase from "@/components/PropertyShowcase";
import ScarcityBand from "@/components/ScarcityBand";
import { trackCta } from "@/lib/analytics";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import QuickStartFlow from "@/components/QuickStartFlow";
import WinWinUsp from "@/components/WinWinUsp";

// Preise werden 1:1 aus Pricing.tsx gespiegelt — sichtbar, aber bewusst leise.
const PLANS = [
  { name: "Privat",      price: "0 €",       note: "für immer" },
  { name: "Verwalten+",  price: "7,90 €/Mo", note: "jährlich 6,58 €/Mo" },
  { name: "Pro",         price: "19,90 €/Mo", note: "jährlich 16,58 €/Mo" },
];

// Silky premium easing (expo-out): langsame Bewegung mit langem Ausklang.
// Konsistent über alle Hero-Elemente → wirkt orchestriert, nicht zufällig.
const SILK = [0.19, 1, 0.22, 1] as const;

export default function Index() {
  const prefersReduced = useReducedMotion();

  // Bewegungsdistanz respektiert prefers-reduced-motion: nur Opacity, kein Transform.
  const rise = prefersReduced ? 0 : 28;
  const riseSm = prefersReduced ? 0 : 14;
  const dur = prefersReduced ? 0.5 : 1.15;
  const durSm = prefersReduced ? 0.4 : 0.9;

  const heroContainer: Variants = {
    hidden: {},
    show: {
      transition: {
        // Ein sanft gestaffelter Vorhang — kein "billiger" Kaskadeneffekt.
        staggerChildren: prefersReduced ? 0 : 0.09,
        delayChildren: prefersReduced ? 0 : 0.15,
      },
    },
  };

  const heroItem: Variants = {
    hidden: { opacity: 0, y: rise, filter: prefersReduced ? "none" : "blur(6px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: dur, ease: SILK },
    },
  };

  const heroItemSoft: Variants = {
    hidden: { opacity: 0, y: riseSm },
    show: { opacity: 1, y: 0, transition: { duration: durSm, ease: SILK, delay: prefersReduced ? 0 : 0.1 } },
  };

  usePageSeo({
    title: "ImmonIQ — Jeder m² Deutschlands. In einer App.",
    description: "All-in-One für Grundstück, Gebäude, Mieter, Vermieter, Bürokratie und Steuer. Live-Marktdaten für 8.187 PLZ. Privat kostenlos, verschlüsselt, made in Germany.",
    canonicalPath: "/",
    ogDescription: "All-in-One für Grundstück, Gebäude, Mieter, Vermieter, Bürokratie & Steuer. Privat 0 €. Verschlüsselt in Deutschland.",
    jsonLdId: "brand",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "ImmonIQ",
        legalName: "ENTERVENTUS — ImmonIQ",
        url: "https://immoniq.xyz",
        logo: "https://immoniq.xyz/favicon.png",
        email: "leonboomgaarden@gmail.com",
        telephone: "+49 152 28943502",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Kastanienallee 13",
          postalCode: "59320",
          addressLocality: "Ennigerloh",
          addressCountry: "DE",
        },
      },
      { "@context": "https://schema.org", "@type": "WebSite", name: "ImmonIQ", url: "https://immoniq.xyz", inLanguage: "de-DE" },
    ],
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Skip-Link — sichtbar bei Tab-Fokus, springt direkt zur Haupt-CTA */}
      <a
        href="#hero-cta"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-[#c9a84c] focus:text-[#0d0d0d] focus:px-5 focus:py-2.5 focus:text-[12px] focus:tracking-[0.14em] focus:uppercase focus:font-medium focus:shadow-[0_10px_40px_-10px_rgba(201,168,76,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5f2ea] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]"
      >
        Zum CTA springen
      </a>
      {/* Hero — Mainframe-inspired interactive shell im ImmonIQ-Stil */}
      <HeroMainframe />



      {/* FOMO Live-Ticker */}
      <LiveActivityTicker />

      {/* Apple-Scroll: 3D Immobilie */}
      <PropertyShowcase />

      {/* USP — drei Worte, drei Zeilen, viel Luft */}
      <section id="produkt" className="border-t border-border/40">
        <div className="container py-20 md:py-32 max-w-6xl">
          <div className="max-w-3xl mx-auto text-center mb-14 md:mb-20">
            <p className="text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-4">
              All in One
            </p>
            <h2 className="font-display font-medium tracking-[-0.03em] leading-[0.95] text-[clamp(2rem,7vw,4.5rem)]">
              Jeder m² Deutschlands.
              <br />
              <span className="text-gradient-gold">In einer App.</span>
            </h2>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Kein Excel. Kein Zettel-Ordner. Kein Portal-Zoo.
              Von der Grundstücksgrenze bis zur Anlage V — alles in einem Konto.
            </p>
          </div>

          {/* Scope-Grid: 8 Bereiche, kein Feature-Bingo, sondern Territorien */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/40 border border-border/40 rounded-2xl overflow-hidden">
            {[
              { k: "Grundstück",    d: "Grenzen, Grundbuch, Flurstück, Bodenrichtwert." },
              { k: "Gebäude",       d: "Wohnung, Haus, WEG, Mehrfamilien — beliebig viele." },
              { k: "Mieter",        d: "Verträge, Kaution, Kommunikation, Bonität, Portal." },
              { k: "Vermieter",     d: "Cockpit, Cashflow, Rendite, Übergaben, Termine." },
              { k: "Bürokratie",    d: "Nebenkosten, Mieterhöhung, Kündigung, Formulare." },
              { k: "Steuer",        d: "Anlage V, Belege, AfA, DATEV-ready Export." },
              { k: "Zahlungen",     d: "Miete, SEPA, Mahnungen, Rücklastschriften — automatisch." },
              { k: "Markt",         d: "Live-Daten für 8.187 PLZ. Vergleich, Trend, Alerts." },
            ].map((f, i) => (
              <motion.div
                key={f.k}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="bg-background p-6 md:p-8 hover:bg-primary/5 transition-colors group"
              >
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[10px] tabular-nums text-muted-foreground/60 tracking-[0.2em]">
                    0{i + 1}
                  </span>
                  <h3 className="font-display text-lg md:text-xl tracking-[-0.01em] font-medium">
                    {f.k}
                  </h3>
                </div>
                <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">
                  {f.d}
                </p>
              </motion.div>
            ))}
          </div>

          <p className="text-center mt-10 md:mt-14 text-[13px] md:text-sm text-muted-foreground">
            Ein Login. Ein Preis. Ein System.
            <span className="text-foreground"> Alles andere ist Zettelwirtschaft.</span>
          </p>
        </div>
      </section>


      {/* WIN-WIN + FOMO — der eigentliche Pitch */}
      <WinWinUsp />

      {/* SO GEHT'S — Live-Demo des Anmeldeprozesses */}
      <QuickStartFlow />

      {/* METRICS BAND — leiser Beweis, scrollt sanft rein */}
      <section className="border-t border-border/40 overflow-hidden">
        <div className="container py-16 md:py-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 md:gap-x-6">
            {[
              { k: "8.187", l: "PLZ-Gebiete live" },
              { k: "AES-256", l: "Verschlüsselung" },
              { k: "60 s", l: "bis zum ersten Tresor" },
              { k: "0 €", l: "Privat · für immer" },
            ].map((m, i) => (
              <motion.div
                key={m.l}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.7, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="text-center md:text-left"
              >
                <div className="font-display text-[clamp(1.8rem,4.5vw,2.75rem)] tracking-[-0.02em] tabular-nums text-gradient-gold">
                  {m.k}
                </div>
                <div className="mt-2 text-[10px] md:text-[11px] tracking-[0.24em] uppercase text-muted-foreground">
                  {m.l}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SCARCITY — Founders Access */}
      <ScarcityBand />


      {/* PREISE — bewusst klein, ehrlich, ohne Lautstärke */}
      <section id="preise" className="border-t border-border/40">
        <div className="container py-16 md:py-24 max-w-3xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-6 mb-8 md:mb-10">
            <div>
              <p className="text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-3">Preise</p>
              <h2 className="font-display text-[clamp(1.75rem,6vw,2.5rem)] font-medium tracking-[-0.02em] leading-[1.05]">
                Privat kostenlos. <span className="text-gradient-gold">Immer.</span>
              </h2>
            </div>
            <Link
              to="/pricing"
              onClick={() => trackCta("pricing_details", { source: "index_prices" })}
              className="text-[13px] text-foreground/70 hover:text-foreground story-link self-start md:self-auto"
            >
              Alle Details ansehen
            </Link>
          </div>

          {/* Drei Zeilen. Kein Karten-Marketing. Mobile: Note darunter, damit nichts umbricht. */}
          <dl className="divide-y divide-border/40 border-y border-border/40">
            {PLANS.map((p) => (
              <div key={p.name} className="py-5 md:py-4 flex items-baseline justify-between gap-4">
                <dt className="text-[15px] md:text-sm font-medium tracking-tight">{p.name}</dt>
                <dd className="flex flex-col md:flex-row md:items-baseline md:gap-3 text-right">
                  <span className="text-[15px] md:text-sm tabular-nums text-foreground/90 whitespace-nowrap">{p.price}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{p.note}</span>
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-[11px] text-muted-foreground mt-5 leading-relaxed">
            Alle Preise inkl. 19 % MwSt · monatlich kündbar · 30 Tage Geld-zurück
          </p>
        </div>
      </section>

      {/* TRUST — thin footer strip */}
      <section className="border-t border-border/40">
        <div className="container py-12">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-primary" /> Ende-zu-Ende verschlüsselt</span>
            <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Server in Deutschland</span>
            <span className="inline-flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-primary" /> DSGVO · BDSG · ISO</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40">
        <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <Logo />
            <span>© {new Date().getFullYear()} ENTERVENTUS</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/impressum" className="hover:text-foreground transition">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-foreground transition">Datenschutz</Link>
            <Link to="/agb" className="hover:text-foreground transition">AGB</Link>
            <Link to="/widerruf" className="hover:text-foreground transition">Widerruf</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
