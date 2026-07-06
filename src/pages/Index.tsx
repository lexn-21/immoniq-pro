import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  Building2, Calculator, Shield, FileText, TrendingUp, Receipt,
  CheckCircle2, ArrowRight, Sparkles, Lock, Zap, Users,
  Home, Search, KeyRound, Wrench, Bell, FolderLock, Wallet,
  HeartHandshake, Clock, MapPin, Star, UserPlus,
} from "lucide-react";
import QuickStartFlow from "@/components/QuickStartFlow";
import { usePageSeo } from "@/hooks/usePageSeo";

type PersonaKey = "owner" | "landlord" | "advisor" | "buyer" | "tenant" | "family";

type CTA = { label: string; sub?: string; to: string; icon?: any };

const PERSONAS: Record<PersonaKey, {
  label: string;
  icon: any;
  headline: string;
  sub: string;
  bullets: { icon: any; text: string }[];
  primary: CTA;
  secondary?: CTA;
  tertiary?: CTA;
}> = {
  owner: {
    label: "Ich wohne selbst",
    icon: Home,
    headline: "Endlich alles zu deinem Zuhause — an einem sicheren Ort.",
    sub: "Kaufvertrag, Grundbuch, Versicherung, Handwerker-Rechnungen, Energieausweis. Verschlüsselt im Tresor. Wir erinnern dich rechtzeitig an alles, was zählt — du musst nichts mehr im Kopf haben.",
    bullets: [
      { icon: FolderLock, text: "Tresor mit deiner PIN — niemand sonst kommt rein" },
      { icon: Bell, text: "Versicherung, Wartung, Steuer — wir melden uns" },
      { icon: TrendingUp, text: "Was ist deine Wohnung heute wert? Auf Knopfdruck." },
    ],
    primary: { label: "Kostenlos starten", sub: "In 60 Sekunden — ohne Kreditkarte", to: "/auth", icon: Sparkles },
    secondary: { label: "Marktwert ansehen", sub: "Für deine PLZ — gratis", to: "/markt", icon: TrendingUp },
    tertiary: { label: "Tresor-Demo öffnen", sub: "So sicher liegen deine Dokumente", to: "/auth?demo=vault", icon: FolderLock },
  },
  landlord: {
    label: "Verwalten +",
    icon: Building2,
    headline: "Schluss mit Excel, Schuhkarton und Quartals-Stress.",
    sub: "Mieten, Nebenkosten, Belege, Anlage V — 30 Minuten pro Quartal statt 15 Stunden im Jahr. Ohne Steuerberater-Honorar. Und du inserierst direkt — ohne Maklerprovision.",
    bullets: [
      { icon: Wallet, text: "Mietkonto & Mahnwesen — vollautomatisch" },
      { icon: Calculator, text: "DATEV-CSV für deinen Steuerberater" },
      { icon: Users, text: "Inserieren ohne Provision (Bestellerprinzip)" },
    ],
    primary: { label: "14 Tage gratis testen", sub: "Voller Vermieter-Funktionsumfang", to: "/auth", icon: Sparkles },
    secondary: { label: "Wohnung inserieren", sub: "Direkt — ohne Maklerprovision", to: "/auth", icon: KeyRound },
    tertiary: { label: "Anlage V Vorschau", sub: "DATEV-CSV-Export ansehen", to: "/pricing", icon: Receipt },
  },
  advisor: {
    label: "Ich bin Steuerberater",
    icon: FileText,
    headline: "Mandanten-Daten in 5 Minuten statt 5 Stunden.",
    sub: "Read-only Zugang zu deinen Mandanten: Anlage V, DATEV-CSV, Belege, Mieten — alles vorsortiert. Kein Excel-Pingpong, kein Belege-Chaos. Du bekommst saubere Daten, dein Mandant bleibt entspannt.",
    bullets: [
      { icon: FileText, text: "DATEV-CSV & Anlage V — ein Klick" },
      { icon: Shield, text: "Read-only Zugang — DSGVO-konform" },
      { icon: Clock, text: "Stundensatz schonen, mehr Mandanten" },
    ],
    primary: { label: "Demo-Mandant ansehen", sub: "Live-Beispiel ohne Anmeldung", to: "/advisor/demo", icon: Search },
    secondary: { label: "Berater-Konto anlegen", sub: "Kostenlos — pro Mandant abrechnen", to: "/auth", icon: UserPlus },
    tertiary: { label: "Preise & Konditionen", sub: "Faire Kanzlei-Lizenzen", to: "/pricing", icon: Receipt },
  },
  buyer: {
    label: "Ich kaufe / verkaufe",
    icon: KeyRound,
    headline: "Klar entscheiden. Fair handeln. Ohne Provision.",
    sub: "Echte Marktwerte aus Mietspiegel und Vergleichsobjekten. Inserate direkt zwischen Eigentümern. Du siehst, was andere übersehen — Rendite, Förderungen, Risiken.",
    bullets: [
      { icon: TrendingUp, text: "Marktwert für jede deutsche PLZ" },
      { icon: Search, text: "Privater Markt mit Umkreissuche" },
      { icon: Calculator, text: "Finanzierung & Rendite in einem Klick" },
    ],
    primary: { label: "Marktwert prüfen", sub: "Gratis — kein Konto nötig", to: "/markt", icon: TrendingUp },
    secondary: { label: "Privat-Markt entdecken", sub: "Direkt zwischen Eigentümern", to: "/markt", icon: Search },
    tertiary: { label: "Rendite-Rechner", sub: "Kaufpreis, Finanzierung, Cashflow", to: "/auth", icon: Calculator },
  },
  tenant: {
    label: "Ich miete / suche",
    icon: Search,
    headline: "Wohnung finden — direkt vom Eigentümer. Ohne Makler.",
    sub: "Keine Maklerprovision (Bestellerprinzip). Einmal Mieter-Profil pflegen, dann mit einem Klick bewerben. Deine Daten bleiben bei dir — du entscheidest, wer was sieht.",
    bullets: [
      { icon: Search, text: "Markt mit Umkreis & smarten Filtern" },
      { icon: Shield, text: "Mieter-Profil DSGVO-sicher — du kontrollierst alles" },
      { icon: FolderLock, text: "Mietvertrag, NK, SCHUFA — verschlüsselt im Tresor" },
    ],
    primary: { label: "Wohnung suchen", sub: "Kostenlos — ohne Anmeldung", to: "/markt", icon: Search },
    secondary: { label: "Mieter-Profil anlegen", sub: "Einmal pflegen, immer bewerben", to: "/auth", icon: UserPlus },
    tertiary: { label: "Tresor für Mietunterlagen", sub: "SCHUFA & Verträge sicher ablegen", to: "/auth", icon: FolderLock },
  },
  family: {
    label: "Erbschaft / Familie",
    icon: HeartHandshake,
    headline: "Ein Haus geerbt? Wir nehmen dich an die Hand.",
    sub: "Was muss wann zum Finanzamt? Welche Fristen laufen? Was ist das Haus wirklich wert — und lohnt sich Halten oder Verkaufen? ImmonIQ ordnet es Schritt für Schritt — verständlich, ohne Fachjargon.",
    bullets: [
      { icon: Clock, text: "Fristen: Erbschein, Grundbuch, Steuer — automatisch" },
      { icon: TrendingUp, text: "Realer Marktwert für die Erbschaftsteuer" },
      { icon: FileText, text: "Vorlagen: Mitteilung ans Finanzamt, Versicherung, Verwalter" },
    ],
    primary: { label: "Schritt für Schritt starten", sub: "Kostenloser Erbschafts-Guide", to: "/auth", icon: HeartHandshake },
    secondary: { label: "Marktwert prüfen", sub: "Für die Erbschaftsteuer", to: "/markt", icon: TrendingUp },
    tertiary: { label: "Fristen-Checkliste", sub: "Was wann ans Finanzamt", to: "/auth", icon: Clock },
  },
};

const Index = () => {
  const [persona, setPersona] = useState<PersonaKey>("owner");

  usePageSeo({
    title: "ImmonIQ — Deine Immobilie. Endlich verstanden. An einem Ort.",
    description: "Die deutsche All-in-One App rund um Immobilien: Tresor, Fristen, Marktwert, Mieten, Suchen, Erben. Verschlüsselt, DSGVO, kostenlos für Privatnutzer.",
    canonicalPath: "/",
    ogDescription: "Die deutsche All-in-One App rund um Immobilien: Tresor, Fristen, Marktwert, Mieten, Suchen, Erben. Verschlüsselt, DSGVO, kostenlos für Privatnutzer.",
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
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ImmonIQ",
        url: "https://immoniq.xyz",
        inLanguage: "de-DE",
      },
    ],
  });

  const p = PERSONAS[persona];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-50 glass">
        <div className="container flex h-16 items-center justify-between gap-2">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#fuer-wen" className="hover:text-foreground transition">Für wen</a>
            <a href="#start" className="hover:text-foreground transition">60-Sek-Start</a>
            <a href="#module" className="hover:text-foreground transition">Module</a>
            <a href="#warum" className="hover:text-foreground transition">Warum</a>
            <a href="#preise" className="hover:text-foreground transition">Preise</a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/markt">Markt</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Anmelden</Link></Button>
            <Button asChild size="sm" className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
              <Link to="/auth"><span className="hidden sm:inline">Kostenlos starten</span><span className="sm:hidden">Starten</span></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="container relative pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-muted-foreground mb-8">
              <Shield className="h-3 w-3 text-primary" />
              Made in Germany · DSGVO · Verschlüsselt · Kostenlos für Privatnutzer
            </div>

            {/* Großes ImmonIQ Wordmark — pure Typografie, maximale Präsenz */}
            <div className="relative mb-8 select-none">
              <h2
                aria-label="ImmonIQ"
                className="font-display font-black tracking-[-0.04em] leading-[0.85] text-[clamp(3.5rem,12vw,8rem)]"
              >
                <span className="text-foreground">Immon</span>
                <span className="text-gradient-gold drop-shadow-[0_0_30px_hsl(var(--primary)/0.35)]">IQ</span>
              </h2>
              <div className="mt-3 mx-auto h-px w-24 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            </div>

            <h1 className="text-[2rem] leading-[1.1] sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 font-display">
              Deine Immobilie.{" "}
              <span className="text-gradient-gold">Endlich verstanden.</span>{" "}
              <br className="hidden sm:block" />
              Endlich an einem Ort.
            </h1>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
              Egal ob du selbst wohnst, vermietest, Steuerberater bist oder suchst —
              ImmonIQ holt dich genau dort ab, wo du stehst. Ohne Fachjargon. Ohne Stress.
            </p>
            <p className="text-sm md:text-base text-foreground/80 max-w-xl mx-auto mb-8 font-medium">
              In 60 Sekunden eingerichtet. Privatnutzer kostenlos. Keine Kreditkarte.
            </p>

            {/* Persona-Switch */}
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3" id="fuer-wen">
              Wer bist du? — wir passen die App an dich an
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {(Object.keys(PERSONAS) as PersonaKey[]).map((k) => {
                const P = PERSONAS[k];
                const active = persona === k;
                return (
                  <button
                    key={k}
                    onClick={() => setPersona(k)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-gold scale-[1.02]"
                        : "glass text-muted-foreground hover:text-foreground hover:scale-[1.02]"
                    }`}
                  >
                    <P.icon className="h-4 w-4" />
                    {P.label}
                  </button>
                );
              })}
            </div>

            {/* Persona-spezifischer Block */}
            <div key={persona} className="glass rounded-3xl p-6 md:p-8 text-left animate-fade-in-up shadow-elevated">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 font-display">{p.headline}</h2>
              <p className="text-muted-foreground mb-6">{p.sub}</p>
              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                {p.bullets.map((b) => (
                  <div key={b.text} className="flex items-start gap-2 text-sm">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <b.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="pt-1.5">{b.text}</span>
                  </div>
                ))}
              </div>

              {/* Persona-CTA-Grid: 3 starke Buttons mit Sub-Labels */}
              {(() => {
                const withAs = (to: string) =>
                  to.startsWith("/auth") ? `${to}${to.includes("?") ? "&" : "?"}as=${persona}` : to;
                return (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Primary — Gold, dominant */}
                <Link
                  to={withAs(p.primary.to)}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-gold p-4 text-left shadow-gold transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.5)] sm:col-span-2 lg:col-span-1"
                >
                  <div className="flex items-center gap-3">
                    {p.primary.icon && (
                      <div className="h-10 w-10 rounded-xl bg-black/15 flex items-center justify-center flex-shrink-0">
                        <p.primary.icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-primary-foreground leading-tight">{p.primary.label}</p>
                      {p.primary.sub && (
                        <p className="text-[11px] text-primary-foreground/80 leading-tight mt-0.5">{p.primary.sub}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary-foreground transition-transform group-hover:translate-x-1 flex-shrink-0" />
                  </div>
                </Link>

                {/* Secondary */}
                {p.secondary && (
                  <Link
                    to={withAs(p.secondary.to)}
                    className="group rounded-2xl glass border border-primary/20 p-4 text-left transition-all hover:scale-[1.02] hover:border-primary/40"
                  >
                    <div className="flex items-center gap-3">
                      {p.secondary.icon && (
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                          <p.secondary.icon className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground leading-tight">{p.secondary.label}</p>
                        {p.secondary.sub && (
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{p.secondary.sub}</p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 flex-shrink-0" />
                    </div>
                  </Link>
                )}

                {/* Tertiary */}
                {p.tertiary && (
                  <Link
                    to={withAs(p.tertiary.to)}
                    className="group rounded-2xl border border-border bg-background/50 p-4 text-left transition-all hover:scale-[1.02] hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      {p.tertiary.icon && (
                        <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                          <p.tertiary.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground leading-tight">{p.tertiary.label}</p>
                        {p.tertiary.sub && (
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{p.tertiary.sub}</p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 flex-shrink-0" />
                    </div>
                  </Link>
                )}
              </div>
                );
              })()}
            </div>

            {/* Trust-Strip — direkt unterm Hero, beruhigt sofort */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
              {[
                { icon: Lock, label: "Ende-zu-Ende verschlüsselt", sub: "Nur du hast den Schlüssel" },
                { icon: MapPin, label: "Server in Deutschland", sub: "DSGVO, BDSG, ISO-konform" },
                { icon: Clock, label: "60 Sekunden Setup", sub: "Ohne Excel-Import-Marathon" },
                { icon: HeartHandshake, label: "Echter Support", sub: "Aus Ennigerloh, kein Bot" },
              ].map((t) => (
                <div key={t.label} className="glass rounded-xl p-3 flex items-start gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <t.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 60-Sekunden-Start-Flow */}
      <QuickStartFlow />

      {/* WAS DRIN IST — universelle Module */}
      <section id="module" className="py-24 bg-muted/30 border-y border-border">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm text-primary font-semibold uppercase tracking-wider mb-4">Was drin ist</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Sechs Bausteine. <span className="text-gradient-gold">Du nutzt, was du brauchst.</span>
            </h2>
            <p className="text-muted-foreground">
              Jedes Modul funktioniert allein — und alle zusammen ergeben dein persönliches Immobilien-Cockpit.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: FolderLock, title: "Dokumenten-Tresor", desc: "Kaufvertrag, Grundbuch, Versicherung, Energieausweis — verschlüsselt mit deiner PIN. Niemand außer dir kann es öffnen." },
              { icon: Bell, title: "Fristen & Plan", desc: "Nebenkosten, Wartung, Versicherung, Steuer. ImmonIQ erinnert dich rechtzeitig — mit Paragraph dazu." },
              { icon: TrendingUp, title: "Marktwert & Mietspiegel", desc: "Aktueller Wert deiner Immobilie und Vergleichsmieten für jede PLZ. Jederzeit auf Knopfdruck." },
              { icon: Building2, title: "Vermieter-Cockpit", desc: "Mieten, Nebenkosten, Mahnwesen, Anlage V. Optional, wenn du vermietest." },
              { icon: Search, title: "Privater Markt", desc: "Inserieren oder suchen — direkt zwischen Eigentümern und Mietern. Keine Maklerprovision nach Bestellerprinzip." },
              { icon: Wrench, title: "Profis in deiner Nähe", desc: "Handwerker, Steuerberater, Versicherung — strikt getrennt nach Kategorie. Reihenfolge nach Bewertung, nicht nach Geld." },
            ].map((m) => (
              <div key={m.title} className="glass rounded-2xl p-7 hover:shadow-gold transition-shadow">
                <div className="h-12 w-12 rounded-2xl bg-gradient-gold flex items-center justify-center mb-5 shadow-gold">
                  <m.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-bold mb-2">{m.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM / WARUM ÜBERHAUPT */}
      <section className="py-24 border-t border-border">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-sm text-primary font-semibold uppercase tracking-wider mb-4">Warum überhaupt</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Deine Immobilien-Sachen liegen in <span className="text-gradient-gold">10 Ordnern, 4 Apps und 1 Schuhkarton.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Egal ob Eigenheim, vermietete Wohnung oder Kaufabsicht — die Unterlagen, Fristen und Zahlen
              sind verstreut. ImmonIQ ist der eine Ort, an dem alles zusammenkommt — sicher, ehrlich, deutsch.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { stat: "1 App", text: "statt 4. Tresor, Fristen, Markt, Steuer — gebündelt." },
              { stat: "0 €", text: "kostet der private Plan für deine eigene Wohnung." },
              { stat: "DSGVO", text: "Server in der EU. Dokumente Ende-zu-Ende verschlüsselt." },
            ].map((p) => (
              <div key={p.stat} className="glass rounded-2xl p-6">
                <p className="text-4xl font-bold text-gradient-gold mb-2">{p.stat}</p>
                <p className="text-sm text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="warum" className="py-24 bg-muted/30 border-y border-border">
        <div className="container max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm text-primary font-semibold uppercase tracking-wider mb-4">Warum ImmonIQ</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Andere verwalten. <span className="text-gradient-gold">Wir denken mit.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                { icon: Zap, title: "Null Lernkurve", desc: "Wenn dein Vater es nicht in 3 Minuten versteht, ist es zu komplex. Apple-Ästhetik, deutsche Klarheit." },
                { icon: Lock, title: "Rechtliche Klarheit", desc: "Bei jedem Feature steht der Paragraph (§ 556 BGB, § 7 EStG, § 147 AO). Keine KI-Beratung — nur saubere Quellen." },
                { icon: Shield, title: "Ehrlich finanziert", desc: "Privatnutzer kostenlos. Anzeigen klar gekennzeichnet, niemals in den Treffern. Keine bezahlten Spitzenplätze." },
                { icon: TrendingUp, title: "Eingebauter Vorteil", desc: "Renditebenchmarks, Förderhinweise, Mietspiegel-Vergleich. Du siehst, was andere übersehen." },
              ].map((b) => (
                <div key={b.title} className="flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="glass rounded-3xl p-8 bg-gradient-to-br from-primary/5 to-transparent">
              <Receipt className="h-8 w-8 text-primary mb-4" />
              <p className="text-lg font-medium leading-relaxed mb-6">
                "Endlich liegen mein Kaufvertrag, die Versicherung und die Handwerker-Rechnungen
                an einem Ort. Und ich werde rechtzeitig erinnert, wenn etwas fällig wird."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold">L</div>
                <div>
                  <p className="text-sm font-semibold">Leon B.</p>
                  <p className="text-xs text-muted-foreground">Eigentümer · Ennigerloh</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="preise" className="py-24">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-sm text-primary font-semibold uppercase tracking-wider mb-4">Preise</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Privat <span className="text-gradient-gold">kostenlos.</span> Vermieten ab 4,99 €.
            </h2>
            <p className="text-muted-foreground">14 Tage volle Funktionen testen. Monatlich kündbar. Keine versteckten Kosten.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Privat",
                price: "0",
                units: "Für deine eigene Wohnung",
                features: [
                  "Dokumenten-Tresor (verschlüsselt)",
                  "Fristen & Erinnerungen",
                  "Marktwert-Schätzung",
                  "Wohnung suchen & bewerben",
                ],
                cta: "Kostenlos starten",
              },
              {
                name: "Vermieten",
                price: "4,99",
                units: "1–3 vermietete Wohnungen",
                featured: true,
                features: [
                  "Alles aus Privat",
                  "Mietkonto & Mahnwesen",
                  "Belege & Steuer-Export",
                  "Inserieren ohne Provision",
                ],
                cta: "Vermieten starten",
              },
              {
                name: "Pro",
                price: "9,99",
                units: "4+ Wohnungen oder Profi-Nutzung",
                features: [
                  "Alles aus Vermieten",
                  "DATEV-CSV für StB",
                  "Steuerberater-Portal",
                  "Priorität-Support",
                ],
                cta: "Pro starten",
              },
            ].map((p) => (
              <div key={p.name} className={`relative rounded-2xl p-8 ${p.featured ? "glass shadow-gold border-2 border-primary" : "glass"}`}>
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Beliebt
                  </div>
                )}
                <p className="text-sm text-muted-foreground mb-1">{p.name}</p>
                <p className="text-xs text-muted-foreground mb-4">{p.units}</p>
                <p className="mb-6">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground"> €/Monat</span>
                </p>
                <ul className="space-y-2 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className={`w-full ${p.featured ? "bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90" : ""}`} variant={p.featured ? "default" : "outline"}>
                  <Link to="/auth">{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOBRAINER CTA */}
      <section className="py-24 bg-muted/30 border-t border-border">
        <div className="container max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-muted-foreground mb-6">
            <Star className="h-3 w-3 text-primary" />
            Warum es ein Nobrainer ist
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 font-display">
            Wenn nicht jetzt — <span className="text-gradient-gold">wann dann?</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-10 text-left">
            {[
              { icon: CheckCircle2, text: "Privat 0 €. Für immer." },
              { icon: CheckCircle2, text: "60 Sek. Setup. Keine Kreditkarte." },
              { icon: CheckCircle2, text: "Wechsel jederzeit. Daten gehören dir." },
            ].map((x) => (
              <div key={x.text} className="glass rounded-xl p-4 flex items-center gap-3">
                <x.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">{x.text}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mb-8 text-lg">
            Du verlierst nichts. Du gewinnst Klarheit, Sicherheit und Stunden deines Lebens.
          </p>
          <Button asChild size="lg" className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold h-14 px-10 text-base">
            <Link to="/auth">Jetzt kostenlos starten <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Über 1.000 Eigentümer und Mieter haben ihren Papierkrieg schon beendet.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <nav className="flex gap-5 text-xs text-muted-foreground">
            <Link to="/impressum" className="hover:text-foreground">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
            <Link to="/agb" className="hover:text-foreground">AGB</Link>
            <Link to="/widerruf" className="hover:text-foreground">Widerruf</Link>
            <a href="mailto:leonboomgaarden@gmail.com" className="hover:text-foreground">Kontakt</a>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ImmonIQ · Made in Ennigerloh, NRW · DSGVO-konform
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
