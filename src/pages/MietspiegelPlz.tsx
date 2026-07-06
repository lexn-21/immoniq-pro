import { Link, useParams, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, MapPin, TrendingUp, TrendingDown, Info, ExternalLink, Calculator, Home, Building2 } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";
import { MIETSPIEGEL_BY_ZIP, MIETSPIEGEL_ROWS, NATIONAL_AVG_RENT, NATIONAL_AVG_PURCHASE, type MietspiegelRow } from "@/data/mietspiegel";
import { supabase } from "@/integrations/supabase/client";
import { LegalFooter } from "@/components/LegalFooter";

const fmt = (n: number, d = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt0 = (n: number) => Math.round(n).toLocaleString("de-DE");

const OFFICIAL: Record<string, { name: string; url: string }> = {
  berlin: { name: "Mietspiegel Berlin (offiziell)", url: "https://mietspiegel.berlin.de/" },
  münchen: { name: "Mietspiegel München (offiziell)", url: "https://stadt.muenchen.de/infos/mietspiegel.html" },
  hamburg: { name: "Mietenspiegel Hamburg (offiziell)", url: "https://www.hamburg.de/mietenspiegel/" },
  köln: { name: "Mietspiegel Köln (offiziell)", url: "https://www.stadt-koeln.de/artikel/06421/index.html" },
  frankfurt: { name: "Mietspiegel Frankfurt (offiziell)", url: "https://frankfurt.de/themen/planen-bauen-und-wohnen/wohnen/informationen-zum-wohnungsmarkt/mietspiegel" },
  stuttgart: { name: "Mietspiegel Stuttgart (offiziell)", url: "https://www.stuttgart.de/leben/wohnen/rund-ums-wohnen/mietpreise-und-mietspiegel" },
  düsseldorf: { name: "Mietspiegel Düsseldorf (offiziell)", url: "https://miete-duesseldorf.de/" },
  leipzig: { name: "Mietspiegel Leipzig (offiziell)", url: "https://www.leipzig.de/" },
  dresden: { name: "Mietspiegel Dresden (offiziell)", url: "https://www.dresden.de/de/leben/wohnen/wohnungsmarkt/mietspiegel.php" },
  hannover: { name: "Mietspiegel Hannover (offiziell)", url: "https://www.hannover.de/" },
  nürnberg: { name: "Mietenspiegel Nürnberg (offiziell)", url: "https://www.nuernberg.de/internet/wohnen/mietenspiegel.html" },
  dortmund: { name: "Mietspiegel Dortmund (offiziell)", url: "https://www.dortmund.de/themen/wohnen/mietspiegel/" },
};

function officialFor(city: string) {
  const key = city.split(" ")[0].toLowerCase();
  return OFFICIAL[key];
}

export default function MietspiegelPlz() {
  const { plz } = useParams<{ plz: string }>();
  const seed = plz ? MIETSPIEGEL_BY_ZIP[plz] : undefined;
  const [live, setLive] = useState<MietspiegelRow | null>(null);

  useEffect(() => {
    if (!plz) return;
    supabase.from("market_index").select("*").eq("zip", plz).maybeSingle().then(({ data }) => {
      if (data) {
        setLive({
          zip: data.zip,
          city: data.city,
          avg_rent_sqm: Number(data.avg_rent_sqm ?? 0),
          avg_purchase_sqm: Number(data.avg_purchase_sqm ?? 0),
          yield_factor: Number(data.yield_factor ?? 0),
          avg_utilities_sqm: Number(data.avg_utilities_sqm ?? 0),
          sample_size: Number(data.sample_size ?? 0),
        });
      }
    });
  }, [plz]);

  const row = live ?? seed;
  const city = row?.city ?? "";
  const short = city.split(" ")[0];
  const off = officialFor(city);

  const rentDelta = row ? ((row.avg_rent_sqm - NATIONAL_AVG_RENT) / NATIONAL_AVG_RENT) * 100 : 0;
  const buyDelta = row ? ((row.avg_purchase_sqm - NATIONAL_AVG_PURCHASE) / NATIONAL_AVG_PURCHASE) * 100 : 0;

  const nearby = useMemo(() => {
    if (!plz) return [];
    const prefix = plz.slice(0, 2);
    return MIETSPIEGEL_ROWS
      .filter((r) => r.zip !== plz && r.zip.startsWith(prefix))
      .slice(0, 6);
  }, [plz]);

  usePageSeo({
    title: row
      ? `Mietspiegel ${short} PLZ ${plz} — Ø ${fmt(row.avg_rent_sqm)} €/m² · ImmonIQ`
      : `Mietspiegel PLZ ${plz} · ImmonIQ`,
    description: row
      ? `Aktueller Mietspiegel für PLZ ${plz} (${city}): Ø ${fmt(row.avg_rent_sqm)} €/m² Miete, Ø ${fmt0(row.avg_purchase_sqm)} €/m² Kauf. Vergleich zum Bundesdurchschnitt, offizielle Quelle, ${row.sample_size} Inserate.`
      : `Miet- und Kaufpreise für Postleitzahl ${plz} in Deutschland. Aktuelle Ø-Werte pro m², Vergleich, offizielle Mietspiegel-Quelle.`,
    canonicalPath: `/mietspiegel/${plz}`,
    ogDescription: row
      ? `Ø ${fmt(row.avg_rent_sqm)} €/m² Miete in PLZ ${plz} (${city}) — ${rentDelta >= 0 ? "+" : ""}${fmt(rentDelta, 1)}% ggü. Ø Deutschland.`
      : undefined,
    jsonLdId: "mietspiegel-plz",
    jsonLd: row
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Place",
            name: `${city} — PLZ ${plz}`,
            address: { "@type": "PostalAddress", postalCode: plz, addressLocality: short, addressCountry: "DE" },
          },
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `Mietspiegel PLZ ${plz} — ${city}`,
            description: `Ø Miete ${fmt(row.avg_rent_sqm)} €/m², Ø Kaufpreis ${fmt0(row.avg_purchase_sqm)} €/m² auf Basis von ${row.sample_size} Inseraten.`,
            variableMeasured: [
              { "@type": "PropertyValue", name: "Ø Kaltmiete", value: row.avg_rent_sqm, unitText: "EUR/m²" },
              { "@type": "PropertyValue", name: "Ø Kaufpreis", value: row.avg_purchase_sqm, unitText: "EUR/m²" },
              { "@type": "PropertyValue", name: "Faktor", value: row.yield_factor, unitText: "Jahresmieten" },
            ],
            spatialCoverage: { "@type": "Place", name: `${city} (${plz})` },
            creator: { "@type": "Organization", name: "ImmonIQ", url: "https://immoniq.xyz" },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://immoniq.xyz/" },
              { "@type": "ListItem", position: 2, name: "Mietspiegel", item: "https://immoniq.xyz/mietspiegel" },
              { "@type": "ListItem", position: 3, name: `PLZ ${plz}`, item: `https://immoniq.xyz/mietspiegel/${plz}` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `Wie hoch ist die Miete in PLZ ${plz}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Die durchschnittliche Kaltmiete in PLZ ${plz} (${city}) liegt bei ${fmt(row.avg_rent_sqm)} €/m². Das ist ${rentDelta >= 0 ? "+" : ""}${fmt(rentDelta, 1)}% ${rentDelta >= 0 ? "über" : "unter"} dem Bundesdurchschnitt von ${fmt(NATIONAL_AVG_RENT)} €/m².`,
                },
              },
              {
                "@type": "Question",
                name: `Was kostet Wohneigentum in ${short}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Der durchschnittliche Kaufpreis in PLZ ${plz} beträgt ${fmt0(row.avg_purchase_sqm)} €/m². Der Kaufpreisfaktor liegt bei ${fmt(row.yield_factor, 1)} Jahresmieten.`,
                },
              },
              {
                "@type": "Question",
                name: `Ist das der offizielle Mietspiegel?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Nein — ImmonIQ zeigt aggregierte Marktwerte. Rechtlich maßgeblich ist der qualifizierte Mietspiegel deiner Kommune nach § 558c BGB. Direktlink zur offiziellen Quelle ist auf dieser Seite verlinkt.`,
                },
              },
            ],
          },
        ]
      : undefined,
  });

  if (plz && !seed && !live) {
    // Unbekannte PLZ → freundlich auf Hub verweisen (client-side redirect)
    return <Navigate to="/mietspiegel" replace />;
  }
  if (!row) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/40">
        <div className="container flex h-14 items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition">Home</Link>
            <Link to="/mietspiegel" className="hover:text-foreground transition">Alle PLZ</Link>
            <Link to="/markt" className="hover:text-foreground transition">Markt</Link>
          </nav>
          <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-4 text-[13px]">
            <Link to="/auth">Starten</Link>
          </Button>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="container pt-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/mietspiegel" className="hover:text-foreground">Mietspiegel</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">PLZ {plz}</span>
      </nav>

      {/* Hero */}
      <section className="container pt-8 pb-12">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-muted-foreground mb-4">
          <MapPin className="h-3 w-3 text-primary" />
          <span>{city} · Postleitzahl {plz}</span>
        </div>
        <h1 className="font-display font-medium tracking-[-0.03em] leading-[0.95] text-[clamp(2.25rem,5.5vw,4rem)]">
          Mietspiegel <span className="text-gradient-gold">{short}</span>
          <br />
          <span className="text-muted-foreground text-[0.6em] font-normal">PLZ {plz}</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
          Was kostet der Quadratmeter in {city}? Aktuelle Ø-Werte für Kaltmiete, Kaufpreis und Nebenkosten —
          basierend auf {row.sample_size.toLocaleString("de-DE")} Marktdatenpunkten.
        </p>
      </section>

      {/* Key stats */}
      <section className="container pb-16">
        <div className="grid md:grid-cols-3 gap-4">
          <Stat
            icon={<Home className="h-4 w-4" />}
            label="Ø Kaltmiete"
            value={`${fmt(row.avg_rent_sqm)} €`}
            unit="pro m²"
            delta={rentDelta}
            deltaLabel="vs. Ø Deutschland"
            highlight
          />
          <Stat
            icon={<Building2 className="h-4 w-4" />}
            label="Ø Kaufpreis"
            value={`${fmt0(row.avg_purchase_sqm)} €`}
            unit="pro m²"
            delta={buyDelta}
            deltaLabel="vs. Ø Deutschland"
          />
          <Stat
            icon={<Calculator className="h-4 w-4" />}
            label="Kaufpreis-Faktor"
            value={`${fmt(row.yield_factor, 1)}×`}
            unit="Jahresmieten"
          />
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/60 p-5">
            <div className="text-xs text-muted-foreground">Ø Nebenkosten (kalt)</div>
            <div className="mt-1 font-display text-2xl font-medium tabular-nums">{fmt(row.avg_utilities_sqm)} €/m²</div>
            <p className="text-xs text-muted-foreground mt-2">Bei 70 m² sind das ~{fmt0(row.avg_utilities_sqm * 70)} € Nebenkosten/Monat.</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-5">
            <div className="text-xs text-muted-foreground">Warmmiete-Schätzung (70 m²)</div>
            <div className="mt-1 font-display text-2xl font-medium tabular-nums">
              {fmt0((row.avg_rent_sqm + row.avg_utilities_sqm) * 70)} €<span className="text-sm text-muted-foreground">/Monat</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Kaltmiete {fmt0(row.avg_rent_sqm * 70)} € + Nebenkosten {fmt0(row.avg_utilities_sqm * 70)} €</p>
          </div>
        </div>
      </section>

      {/* Text block for SEO */}
      <section className="container pb-16">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl font-medium tracking-tight mb-4">Wohnungsmarkt in {city}</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              In der Postleitzahl <strong className="text-foreground">{plz}</strong> ({city}) liegt die durchschnittliche
              Kaltmiete bei <strong className="text-foreground">{fmt(row.avg_rent_sqm)} €/m²</strong>. Damit liegt die Miete
              {" "}
              {rentDelta >= 0 ? (
                <span className="text-primary">{fmt(rentDelta, 1)}% über</span>
              ) : (
                <span className="text-emerald-500">{fmt(Math.abs(rentDelta), 1)}% unter</span>
              )}
              {" "}dem deutschen Bundesdurchschnitt von {fmt(NATIONAL_AVG_RENT)} €/m².
            </p>
            <p>
              Wer in {short} kaufen möchte, zahlt im Schnitt <strong className="text-foreground">{fmt0(row.avg_purchase_sqm)} €/m²</strong>.
              Der Kaufpreisfaktor liegt bei <strong className="text-foreground">{fmt(row.yield_factor, 1)}</strong> Jahresmieten —
              das entspricht einer Bruttomietrendite von etwa {fmt(100 / row.yield_factor, 2)}% pro Jahr.
            </p>
            <p>
              Diese Werte basieren auf {row.sample_size.toLocaleString("de-DE")} anonymisierten Marktdatenpunkten und werden
              wöchentlich aktualisiert. Für die rechtlich maßgebliche ortsübliche Vergleichsmiete nach § 558 BGB ist der
              qualifizierte Mietspiegel deiner Kommune verbindlich — den Direktlink findest du unten.
            </p>
          </div>
        </div>
      </section>

      {/* CTA row */}
      <section className="container pb-16">
        <div className="grid md:grid-cols-2 gap-4">
          {off && (
            <a
              href={off.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-6 hover:border-primary/60 transition-all"
            >
              <div className="text-[11px] tracking-[0.2em] uppercase text-primary mb-3">Offizielle Quelle</div>
              <div className="font-display text-xl font-medium mb-2">{off.name}</div>
              <p className="text-sm text-muted-foreground mb-4">
                Direktlink zum qualifizierten Mietspiegel der Kommune (§ 558c BGB).
              </p>
              <div className="inline-flex items-center gap-1.5 text-sm font-medium">
                Zur Stadt {short} <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </a>
          )}
          <Link
            to="/auth"
            className="group rounded-2xl border border-border/60 p-6 hover:border-primary/40 transition-all"
          >
            <div className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-3">Für dein Objekt</div>
            <div className="font-display text-xl font-medium mb-2">Marktwert präzise berechnen</div>
            <p className="text-sm text-muted-foreground mb-4">
              Lage, Baujahr, Ausstattung, Energieklasse — ImmonIQ berechnet den echten Wert deiner Wohnung in {short} kostenlos.
            </p>
            <div className="inline-flex items-center gap-1.5 text-sm font-medium">
              Kostenlos starten <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </section>

      {/* Nearby PLZ */}
      {nearby.length > 0 && (
        <section className="container pb-20">
          <h2 className="font-display text-2xl font-medium tracking-tight mb-6">Postleitzahlen in der Nähe</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nearby.map((r) => (
              <Link
                key={r.zip}
                to={`/mietspiegel/${r.zip}`}
                className="group rounded-xl border border-border/60 p-4 hover:border-primary/40 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-xs text-muted-foreground tabular-nums">{r.zip}</div>
                  <div className="font-medium text-sm">{r.city}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium tabular-nums">{fmt(r.avg_rent_sqm)} €</div>
                  <div className="text-[11px] text-muted-foreground">pro m²</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ block */}
      <section className="container pb-24">
        <h2 className="font-display text-2xl font-medium tracking-tight mb-6">Häufige Fragen</h2>
        <div className="space-y-4 max-w-3xl">
          {[
            {
              q: `Wie hoch ist die Miete in PLZ ${plz}?`,
              a: `Ø ${fmt(row.avg_rent_sqm)} €/m² Kaltmiete. Bei 70 m² sind das ca. ${fmt0(row.avg_rent_sqm * 70)} € Kaltmiete pro Monat.`,
            },
            {
              q: `Was kostet Kauf in ${short}?`,
              a: `Ø ${fmt0(row.avg_purchase_sqm)} €/m² — für 70 m² sind das rund ${fmt0(row.avg_purchase_sqm * 70)} € Kaufpreis.`,
            },
            {
              q: `Ist das der offizielle Mietspiegel?`,
              a: `Nein. ImmonIQ zeigt aggregierte Marktdaten. Rechtlich verbindlich für Mieterhöhungen ist der qualifizierte Mietspiegel deiner Kommune (§ 558c BGB) — verlinkt oben.`,
            },
          ].map((f) => (
            <div key={f.q} className="rounded-xl border border-border/60 p-5">
              <div className="font-medium mb-1.5">{f.q}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/40">
        <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-3"><Logo /><span>© {new Date().getFullYear()} ENTERVENTUS</span></div>
          <div className="flex flex-wrap gap-6">
            <Link to="/mietspiegel" className="hover:text-foreground">Alle PLZ</Link>
            <Link to="/impressum" className="hover:text-foreground">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-foreground">Datenschutz</Link>
            <Link to="/agb" className="hover:text-foreground">AGB</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({
  icon, label, value, unit, delta, deltaLabel, highlight,
}: {
  icon: React.ReactNode; label: string; value: string; unit?: string;
  delta?: number; deltaLabel?: string; highlight?: boolean;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight ? "border-primary/40 bg-gradient-to-b from-primary/5 to-transparent" : "border-border/60"
      }`}
    >
      <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-medium tabular-nums">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {typeof delta === "number" && (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs ${up ? "text-primary" : "text-emerald-500"}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "+" : ""}{fmt(delta, 1)}%
          <span className="text-muted-foreground ml-1">{deltaLabel}</span>
        </div>
      )}
      <LegalFooter />
      </div>
  );
}
