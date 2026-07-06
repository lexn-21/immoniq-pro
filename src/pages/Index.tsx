import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Shield, Lock, MapPin } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";
import HeroStage from "@/components/HeroStage";
import { trackCta } from "@/lib/analytics";
import { motion } from "framer-motion";

// Preise werden 1:1 aus Pricing.tsx gespiegelt — sichtbar, aber bewusst leise.
const PLANS = [
  { name: "Privat",      price: "0 €",       note: "für immer" },
  { name: "Verwalten+",  price: "7,90 €/Mo", note: "jährlich 6,58 €/Mo" },
  { name: "Pro",         price: "19,90 €/Mo", note: "jährlich 16,58 €/Mo" },
];

export default function Index() {
  usePageSeo({
    title: "ImmonIQ — Deine Immobilie. Ein Ort. Ein Blick.",
    description: "Die deutsche Immobilien-App: Tresor, Marktwert, Vermieten, Steuer. Privat kostenlos, Verwalten ab 7,90 €. DSGVO, verschlüsselt, made in Germany.",
    canonicalPath: "/",
    ogDescription: "Die deutsche Immobilien-App: Tresor, Marktwert, Vermieten, Steuer. Privat kostenlos, Verwalten ab 7,90 €.",
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
      {/* NAV — whisper thin */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/40">
        <div className="container flex h-14 items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-10 text-[13px] text-muted-foreground">
            <a href="#produkt" className="hover:text-foreground transition">Produkt</a>
            <a href="#preise" className="hover:text-foreground transition">Preise</a>
            <Link to="/markt" className="hover:text-foreground transition">Markt</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-[13px]"><Link to="/auth">Anmelden</Link></Button>
            <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-4 text-[13px] font-medium">
              <Link to="/auth">Starten</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO — one screen, one message, one wow */}
      <section className="relative">
        <div className="container relative pt-12 md:pt-24 pb-14 md:pb-28">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-16 items-center">
            {/* Left: type only */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-6 md:mb-8">
                <span className="h-1 w-1 rounded-full bg-primary" />
                Made in Germany
              </div>
              <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.95] md:leading-[0.92] text-[clamp(2.5rem,11vw,6rem)]">
                Deine Immobilie.
                <br />
                <span className="text-gradient-gold">Ein Ort.</span>
                <br />
                Ein Blick.
              </h1>
              <p className="mt-6 md:mt-8 text-base md:text-xl text-muted-foreground max-w-md leading-relaxed">
                Verwalten, verstehen, versteuern — verschlüsselt in Deutschland.
              </p>
              <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 md:px-7 h-12 text-[15px] font-medium">
                  <Link
                    to="/auth"
                    onClick={() => trackCta("hero_signup", { source: "index_hero" })}
                  >
                    Kostenlos starten <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Link
                  to="/markt"
                  onClick={() => trackCta("hero_market", { source: "index_hero" })}
                  className="text-[15px] text-foreground/80 hover:text-foreground story-link"
                >
                  Markt ansehen
                </Link>
              </div>
              <p className="mt-5 md:mt-6 text-[11px] md:text-xs text-muted-foreground">
                Privat 0 € · Keine Kreditkarte · 60 Sekunden
              </p>
            </div>

            {/* Right: interactive 3D globe — lazy + WebGL/reduced-motion aware */}
            <div className="relative">
              <PropertyGlobeLazy />
            </div>
          </div>
        </div>
      </section>

      {/* USP — drei Worte, drei Zeilen, viel Luft */}
      <section id="produkt" className="border-t border-border/40">
        <div className="container py-20 md:py-40 max-w-4xl">
          <p className="text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-14 md:mb-20 text-center">
            Was ImmonIQ ist
          </p>
          <ul className="divide-y divide-border/40">
            {[
              { h: "Ein Tresor.",   s: "Verträge, Grundbuch, Rechnungen. Ende-zu-Ende verschlüsselt." },
              { h: "Ein Marktwert.", s: "Live-Daten für jede deutsche PLZ. Mietspiegel, Rendite, Vergleich." },
              { h: "Ein Handgriff.", s: "Vermieten ohne Excel. Anlage V ohne Steuerberater-Stress." },
            ].map((f) => (
              <li key={f.h} className="py-8 md:py-14 flex flex-col md:flex-row md:items-baseline md:gap-12">
                <h3 className="font-display font-medium tracking-[-0.03em] leading-[0.95] text-[clamp(2rem,9vw,4.5rem)] md:w-[52%]">
                  {f.h}
                </h3>
                <p className="mt-3 md:mt-0 text-[15px] md:text-base text-muted-foreground max-w-md leading-relaxed">
                  {f.s}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
