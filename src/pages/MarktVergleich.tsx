import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { eur } from "@/lib/format";
import { ArrowLeft, MapPin, Check, X as XIcon } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";

const KEYS: { key: string; label: string; format?: (v: any) => string }[] = [
  { key: "price", label: "Preis", format: (v) => eur(v) },
  { key: "living_space", label: "Wohnfläche", format: (v) => v ? `${v} m²` : "—" },
  { key: "rooms", label: "Zimmer", format: (v) => v ?? "—" },
  { key: "ppm2", label: "€ / m²", format: (v) => v ? `${v.toFixed(2).replace(".", ",")} €` : "—" },
  { key: "utilities", label: "Nebenkosten", format: (v) => v ? eur(v) : "—" },
  { key: "deposit", label: "Kaution", format: (v) => v ? eur(v) : "—" },
  { key: "energy_class", label: "Energieklasse", format: (v) => v ?? "—" },
  { key: "available_from", label: "Verfügbar ab", format: (v) => v ? new Date(v).toLocaleDateString("de-DE") : "sofort" },
  { key: "min_term_months", label: "Mindestmietzeit", format: (v) => v ? `${v} Monate` : "—" },
];

const FEATURES = ["balcony", "garden", "elevator", "parking", "kitchen", "pets", "furnished", "new_build"];
const FEATURE_LABELS: Record<string, string> = {
  balcony: "Balkon", garden: "Garten", elevator: "Aufzug", parking: "Stellplatz",
  kitchen: "Einbauküche", pets: "Haustiere", furnished: "Möbliert", new_build: "Erstbezug",
};

export default function MarktVergleich() {
  usePageSeo({
    title: "Inserate vergleichen · ImmonIQ Markt",
    description: "Bis zu 3 Wohnungs- oder Kaufinserate Seite an Seite vergleichen — Preis, Wohnfläche, Energieklasse, Ausstattung. Nur auf ImmonIQ.",
    canonicalPath: "/markt/vergleich",
  });
  const [params] = useSearchParams();
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Vergleich · ImmonIQ";
    if (!ids.length) return;
    (async () => {
      const { data } = await supabase.from("listings").select("*").in("id", ids);
      setItems(data ?? []);
    })();
    // eslint-disable-next-line
  }, [params.get("ids")]);

  const enriched = items.map(l => ({
    ...l,
    ppm2: l.living_space && l.living_space > 0 ? Number(l.price) / Number(l.living_space) : null,
  }));

  const photoUrl = (p?: string) => p ? supabase.storage.from("listing-photos").getPublicUrl(p).data.publicUrl : null;

  // best/worst per row
  const bestId = (key: string, lower = true): string | null => {
    const vals = enriched.map(l => ({ id: l.id, v: Number(l[key]) })).filter(x => !isNaN(x.v) && x.v > 0);
    if (vals.length < 2) return null;
    return vals.reduce((a, b) => (lower ? (a.v < b.v ? a : b) : (a.v > b.v ? a : b))).id;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass border-b border-border/60">
        <div className="container max-w-6xl flex items-center justify-between h-14">
          <Link to="/markt" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> zurück
          </Link>
          <Logo />
          <div className="w-12" />
        </div>
      </header>

      <main className="container max-w-6xl py-6 space-y-5">
        <h1 className="text-2xl font-bold">Vergleich</h1>
        {enriched.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Keine Inserate ausgewählt.</Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 w-32 align-bottom"></th>
                  {enriched.map(l => (
                    <th key={l.id} className="p-2 text-left align-bottom">
                      <Link to={`/markt/${l.id}`}>
                        <div className="aspect-video bg-muted rounded-md mb-2 overflow-hidden">
                          {l.photos?.[0] && <img src={photoUrl(l.photos[0])!} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <p className="font-semibold leading-tight line-clamp-2">{l.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {[l.zip, l.city].filter(Boolean).join(" ")}
                        </p>
                        <Badge variant="outline" className="mt-1 text-[10px]">{l.kind === "rent" ? "Miete" : "Kauf"}</Badge>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KEYS.map(({ key, label, format }) => {
                  const lowerIsBetter = ["price", "ppm2", "utilities", "deposit"].includes(key);
                  const best = bestId(key, lowerIsBetter);
                  return (
                    <tr key={key} className="border-t">
                      <td className="p-2 text-xs text-muted-foreground">{label}</td>
                      {enriched.map(l => (
                        <td key={l.id} className={`p-2 ${best === l.id ? "font-bold text-primary" : ""}`}>
                          {format ? format((l as any)[key]) : (l as any)[key] ?? "—"}
                          {best === l.id && <span className="ml-1 text-[10px] uppercase">★ best</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t">
                  <td className="p-2 text-xs text-muted-foreground align-top">Ausstattung</td>
                  {enriched.map(l => (
                    <td key={l.id} className="p-2">
                      <div className="flex flex-col gap-1">
                        {FEATURES.map(f => {
                          const has = !!(l.features?.[f]);
                          return (
                            <span key={f} className="flex items-center gap-1.5 text-xs">
                              {has ? <Check className="h-3 w-3 text-emerald-600" /> : <XIcon className="h-3 w-3 text-muted-foreground/50" />}
                              <span className={has ? "" : "text-muted-foreground/60"}>{FEATURE_LABELS[f]}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-t">
                  <td className="p-2"></td>
                  {enriched.map(l => (
                    <td key={l.id} className="p-2">
                      <Link to={`/markt/${l.id}`}>
                        <Button size="sm" className="w-full">Details</Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
