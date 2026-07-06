import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Shield, Lock, MapPin, Check, Sparkles } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";
import HeroWorld from "@/components/HeroWorld";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import PropertyShowcase from "@/components/PropertyShowcase";
import ScarcityBand from "@/components/ScarcityBand";
import { trackCta } from "@/lib/analytics";
import { motion } from "framer-motion";
import QuickStartFlow from "@/components/QuickStartFlow";
import WinWinUsp from "@/components/WinWinUsp";

// Preise werden 1:1 aus Pricing.tsx gespiegelt — sichtbar, aber bewusst leise.
const PLANS = [
  { name: "Privat",      price: "0 €",       note: "für immer" },
  { name: "Verwalten+",  price: "7,90 €/Mo", note: "jährlich 6,58 €/Mo" },
  { name: "Pro",         price: "19,90 €/Mo", note: "jährlich 16,58 €/Mo" },
];

export default function Index() {
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
      {/* NOIR SHELL — Nav + Hero als eine cinematische Bühne (LVMH / Apple) */}
      <div className="relative bg-[#0d0d0d] text-[#f5f2ea]">
        {/* subtile Vignette + Gold-Glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(60% 45% at 78% 45%, rgba(201,168,76,0.18), transparent 60%), radial-gradient(90% 60% at 50% 100%, rgba(0,0,0,0.6), transparent 60%)",
          }}
        />
        {/* feine Gold-Hairline unten */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/40 to-transparent" />

        {/* NAV */}
        <header className="relative z-50">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="font-display text-[15px] tracking-[-0.01em] font-medium text-[#f5f2ea]">
              Immon<span className="text-[#c9a84c]">IQ</span>
            </Link>
            <nav className="hidden md:flex items-center gap-10 text-[12px] tracking-[0.14em] uppercase text-[#f5f2ea]/60">
              <a href="#produkt" className="hover:text-[#f5f2ea] transition">Produkt</a>
              <a href="#preise" className="hover:text-[#f5f2ea] transition">Preise</a>
              <Link to="/markt" className="hover:text-[#f5f2ea] transition">Markt</Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link to="/auth" className="text-[12px] tracking-[0.14em] uppercase text-[#f5f2ea]/70 hover:text-[#f5f2ea] transition">
                Anmelden
              </Link>
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-full border border-[#c9a84c]/60 bg-transparent px-5 h-9 text-[12px] tracking-[0.14em] uppercase text-[#f0d78c] hover:bg-[#c9a84c] hover:text-[#0d0d0d] transition-all duration-500"
              >
                Starten
              </Link>
            </div>
          </div>
        </header>

        {/* HERO — Maison Split: klare Content-Säule links, Globe schwebt frei rechts */}
        <section className="relative">
          <div className="container relative pt-10 md:pt-20 pb-16 md:pb-28 min-h-[calc(100vh-4rem)] flex items-center">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-12 lg:gap-20 items-center w-full">
              {/* Left: reine Typografie */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl"
              >
                <div className="inline-flex items-center gap-3 mb-8 md:mb-10">
                  <span className="h-px w-8 bg-[#c9a84c]" />
                  <span className="text-[10px] md:text-[11px] tracking-[0.32em] uppercase text-[#c9a84c]/90 font-medium">
                    All in One · Made in Germany
                  </span>
                </div>

                <h1 className="font-display font-light tracking-[-0.045em] leading-[0.92] text-[clamp(3rem,8.5vw,7rem)] text-[#f5f2ea]">
                  <motion.span
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="block"
                  >
                    Jeder m².
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="block italic font-extralight"
                    style={{
                      background: "linear-gradient(135deg, #f0d78c 0%, #c9a84c 55%, #8a6d2b 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Ein Ort.
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="block"
                  >
                    Ein Blick.
                  </motion.span>
                </h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.7 }}
                  className="mt-8 md:mt-10 text-[15px] md:text-[17px] leading-relaxed text-[#f5f2ea]/60 max-w-md font-light"
                >
                  Grundstück, Wohnung, Mieter, Vermieter, Bürokratie, Steuer —
                  komplett in einer App. Verschlüsselt in Deutschland.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-10 md:mt-12 flex flex-wrap items-center gap-x-8 gap-y-4"
                >
                  <Link
                    to="/auth"
                    onClick={() => trackCta("hero_signup", { source: "index_hero" })}
                    className="group relative inline-flex items-center gap-3 rounded-full bg-[#f5f2ea] text-[#0d0d0d] pl-7 pr-2 h-14 text-[14px] tracking-[0.06em] font-medium hover:bg-[#c9a84c] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-15px_rgba(201,168,76,0.55)]"
                  >
                    Kostenlos starten
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0d0d0d] text-[#f5f2ea] transition-transform duration-500 group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                  <Link
                    to="/markt"
                    onClick={() => trackCta("hero_market", { source: "index_hero" })}
                    className="group inline-flex items-center gap-2 text-[13px] tracking-[0.14em] uppercase text-[#f5f2ea]/70 hover:text-[#c9a84c] transition-colors"
                  >
                    Markt ansehen
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 1.1 }}
                  className="mt-10 md:mt-14 flex items-center gap-6 text-[10px] tracking-[0.24em] uppercase text-[#f5f2ea]/40"
                >
                  <span>Privat 0 €</span>
                  <span className="h-px w-4 bg-[#f5f2ea]/20" />
                  <span>Keine Kreditkarte</span>
                  <span className="h-px w-4 bg-[#f5f2ea]/20" />
                  <span>60 Sekunden</span>
                </motion.div>
              </motion.div>

              {/* Right: 3D-Globe in dünnem Gold-Rahmen (Vitrine) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                {/* Vitrine-Rahmen: 4 feine Ecken statt Vollrahmen */}
                <div aria-hidden className="pointer-events-none absolute -inset-4 md:-inset-8">
                  <span className="absolute top-0 left-0 h-6 w-6 border-l border-t border-[#c9a84c]/50" />
                  <span className="absolute top-0 right-0 h-6 w-6 border-r border-t border-[#c9a84c]/50" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 border-l border-b border-[#c9a84c]/50" />
                  <span className="absolute bottom-0 right-0 h-6 w-6 border-r border-b border-[#c9a84c]/50" />
                </div>
                <HeroWorld />
                {/* Signatur-Label unten */}
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] tracking-[0.28em] uppercase text-[#f5f2ea]/55">
                  <span className="h-1 w-1 rounded-full bg-[#c9a84c] animate-pulse" />
                  Live · 8.187 PLZ
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>


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
