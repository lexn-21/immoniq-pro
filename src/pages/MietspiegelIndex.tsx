import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, TrendingUp } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";
import { MIETSPIEGEL_ROWS, NATIONAL_AVG_RENT } from "@/data/mietspiegel";
import { useMemo } from "react";
import { LegalFooter } from "@/components/LegalFooter";

const fmt = (n: number, d = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function MietspiegelIndex() {
  usePageSeo({
    title: "Mietspiegel Deutschland — Ø Miete & Kaufpreis nach Postleitzahl · ImmonIQ",
    description: "Aktuelle Miet- und Kaufpreise pro m² für 30 deutsche Postleitzahlen. Vergleich zum Bundesdurchschnitt, offizielle Mietspiegel-Quellen, kostenlose PLZ-Suche.",
    canonicalPath: "/mietspiegel",
    ogDescription: "Ø Miete & Kaufpreis pro m² für 30 deutsche PLZ — kostenlos, aktuell, mit offiziellen Quellen.",
    jsonLdId: "mietspiegel-index",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: "ImmonIQ Mietspiegel Deutschland",
        description: "Aggregierte Miet- und Kaufpreise pro Quadratmeter für deutsche Postleitzahlen.",
        keywords: ["Mietspiegel", "Miete pro m²", "Kaufpreis pro m²", "Deutschland"],
        creator: { "@type": "Organization", name: "ImmonIQ", url: "https://immoniq.xyz" },
        license: "https://immoniq.xyz/agb",
        spatialCoverage: { "@type": "Place", name: "Deutschland" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://immoniq.xyz/" },
          { "@type": "ListItem", position: 2, name: "Mietspiegel", item: "https://immoniq.xyz/mietspiegel" },
        ],
      },
    ],
  });

  const grouped = useMemo(() => {
    const byCity: Record<string, typeof MIETSPIEGEL_ROWS> = {};
    for (const r of MIETSPIEGEL_ROWS) {
      const city = r.city.split(" ")[0];
      (byCity[city] ??= []).push(r);
    }
    return Object.entries(byCity).sort(([a], [b]) => a.localeCompare(b, "de"));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/40">
        <div className="container flex h-14 items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition">Home</Link>
            <Link to="/markt" className="hover:text-foreground transition">Markt</Link>
            <Link to="/pricing" className="hover:text-foreground transition">Preise</Link>
          </nav>
          <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-4 text-[13px]">
            <Link to="/auth">Starten</Link>
          </Button>
        </div>
      </header>

      <section className="container pt-16 md:pt-24 pb-10">
        <p className="text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-6">Mietspiegel · Deutschland</p>
        <h1 className="font-display font-medium tracking-[-0.03em] leading-[0.95] text-[clamp(2.5rem,6vw,4.5rem)] max-w-4xl">
          Was kostet der <span className="text-gradient-gold">Quadratmeter</span> in deiner Postleitzahl?
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
          Aktuelle Ø-Werte für Miete und Kaufpreis in {MIETSPIEGEL_ROWS.length} deutschen Postleitzahlen —
          transparent, kostenlos, verlinkt zum offiziellen Mietspiegel deiner Stadt (§ 558c BGB).
        </p>
        <div className="mt-8 inline-flex items-center gap-3 px-4 py-2 rounded-full border border-border/60 text-sm">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Bundesdurchschnitt</span>
          <span className="font-medium">{fmt(NATIONAL_AVG_RENT)} €/m² Miete</span>
        </div>
      </section>

      <section className="container pb-24">
        {grouped.map(([city, rows]) => (
          <div key={city} className="mb-14">
            <div className="flex items-baseline justify-between mb-5 border-b border-border/40 pb-3">
              <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight">{city}</h2>
              <span className="text-xs text-muted-foreground">{rows.length} PLZ</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.map((r) => {
                const delta = ((r.avg_rent_sqm - NATIONAL_AVG_RENT) / NATIONAL_AVG_RENT) * 100;
                const up = delta >= 0;
                return (
                  <Link
                    key={r.zip}
                    to={`/mietspiegel/${r.zip}`}
                    className="group rounded-2xl border border-border/60 p-5 hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span className="tabular-nums">{r.zip}</span>
                    </div>
                    <div className="mt-1 font-medium">{r.city}</div>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="font-display text-3xl font-medium tabular-nums">{fmt(r.avg_rent_sqm)}</span>
                      <span className="text-sm text-muted-foreground">€/m²</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className={up ? "text-primary" : "text-emerald-500"}>
                        {up ? "+" : ""}{fmt(delta, 1)}% ggü. Ø DE
                      </span>
                      <span className="text-muted-foreground group-hover:text-foreground inline-flex items-center gap-1 transition">
                        Details <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <footer className="border-t border-border/40">
        <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-3"><Logo /><span>© {new Date().getFullYear()} ENTERVENTUS</span></div>
          <div className="flex flex-wrap gap-6">
            <Link to="/impressum" className="hover:text-foreground">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
            <Link to="/agb" className="hover:text-foreground">AGB</Link>
          </div>
        </div>
      </footer>
      <LegalFooter />
      </div>
  );
}
