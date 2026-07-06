import { Link } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Shield, Lock, MapPin } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";

const PropertyGlobe = lazy(() => import("@/components/PropertyGlobe"));

const PLANS = [
  { name: "Privat", price: "0", unit: "€", note: "für immer", cta: "Kostenlos starten", to: "/auth", highlight: false },
  { name: "Verwalten+", price: "7,90", unit: "€/Mo", note: "jährlich 6,58 €", cta: "14 Tage testen", to: "/pricing", highlight: true },
  { name: "Pro", price: "19,90", unit: "€/Mo", note: "jährlich 16,58 €", cta: "Konditionen", to: "/pricing", highlight: false },
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
        <div className="container relative pt-16 md:pt-24 pb-16 md:pb-28">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-16 items-center">
            {/* Left: type only */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-8">
                <span className="h-1 w-1 rounded-full bg-primary" />
                Made in Germany
              </div>
              <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.92] text-[clamp(3rem,7.5vw,6rem)]">
                Deine Immobilie.
                <br />
                <span className="text-gradient-gold">Ein Ort.</span>
                <br />
                Ein Blick.
              </h1>
              <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-md leading-relaxed">
                Tresor. Marktwert. Vermieten. Steuer. Alles was zählt — in einer App, verschlüsselt in Deutschland.
              </p>
              <div className="mt-10 flex items-center gap-4">
                <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-7 h-12 text-[15px] font-medium">
                  <Link to="/auth">Kostenlos starten <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Link to="/markt" className="text-[15px] text-foreground/80 hover:text-foreground story-link">
                  Markt ansehen
                </Link>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Privat 0 € · Keine Kreditkarte · 60 Sekunden
              </p>
            </div>

            {/* Right: interactive 3D globe */}
            <div className="relative">
              <Suspense fallback={<div className="aspect-square max-w-[560px] mx-auto rounded-full bg-gradient-to-br from-primary/5 to-transparent animate-pulse" />}>
                <PropertyGlobe />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* USP — three lines, huge whitespace */}
      <section id="produkt" className="border-t border-border/40">
        <div className="container py-24 md:py-32">
          <p className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-10 text-center">Warum ImmonIQ</p>
          <div className="grid md:grid-cols-3 gap-12 md:gap-16 max-w-5xl mx-auto">
            {[
              { k: "01", h: "Ein Tresor.", s: "Kaufvertrag, Grundbuch, Rechnungen. Ende-zu-Ende verschlüsselt. Nur du hast den Schlüssel." },
              { k: "02", h: "Ein Marktwert.", s: "Live-Daten für jede deutsche PLZ. Mietspiegel, Vergleiche, Rendite — auf Knopfdruck." },
              { k: "03", h: "Ein Handgriff.", s: "Vermieten ohne Excel. Anlage V ohne Steuerberater-Stress. DATEV-Export in einem Klick." },
            ].map((f) => (
              <div key={f.k} className="group">
                <div className="text-[11px] tracking-[0.22em] text-primary mb-4">{f.k}</div>
                <h3 className="font-display text-2xl md:text-3xl font-medium tracking-tight mb-3">{f.h}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREISE — small, honest, no shouting */}
      <section id="preise" className="border-t border-border/40 bg-gradient-to-b from-background to-background/60">
        <div className="container py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-4">Preise</p>
            <h2 className="font-display text-4xl md:text-5xl font-medium tracking-[-0.02em]">
              Privat kostenlos. <span className="text-gradient-gold">Immer.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PLANS.map((p) => (
              <Link
                key={p.name}
                to={p.to}
                className={`group rounded-2xl p-6 border transition-all hover:-translate-y-0.5 ${
                  p.highlight
                    ? "border-primary/40 bg-gradient-to-b from-primary/5 to-transparent shadow-[0_0_60px_-20px_hsl(var(--primary)/0.4)]"
                    : "border-border/60 hover:border-primary/30"
                }`}
              >
                <div className="flex items-baseline justify-between mb-6">
                  <span className="text-sm font-medium tracking-tight">{p.name}</span>
                  {p.highlight && <span className="text-[10px] tracking-widest uppercase text-primary">Beliebt</span>}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-medium tracking-tight">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.unit}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{p.note}</p>
                <div className="mt-6 flex items-center text-[13px] font-medium text-foreground/80 group-hover:text-foreground transition">
                  {p.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            Alle Preise inkl. MwSt · Monatlich kündbar · 30 Tage Geld-zurück
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
