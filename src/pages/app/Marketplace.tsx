import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, ExternalLink, Wrench, Calculator, Paintbrush, Zap,
  Droplets, Hammer, Building2, Sparkles, Phone, MapPin, Globe,
  ShieldCheck, Loader2, Key, Sprout, Mail, Star, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { searchProviders, type Provider } from "@/lib/places";
import { num } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

type Category = {
  id: string;
  label: string;
  icon: any;
  description: string;
  group: "trade" | "advisor" | "service";
};

const CATEGORIES: Category[] = [
  { id: "tax", label: "Steuerberater", icon: Calculator, description: "V&V, Anlage V, GbR, Immobilien.", group: "advisor" },
  { id: "lawyer", label: "Anwalt für Mietrecht", icon: ShieldCheck, description: "Mietrecht, WEG, Räumung.", group: "advisor" },
  { id: "electrician", label: "Elektriker", icon: Zap, description: "Zähler, Smart Home, E-Check, Wallbox.", group: "trade" },
  { id: "plumber", label: "Sanitär & Heizung", icon: Droplets, description: "Heizung, Bad, Wärmepumpe, GEG-Beratung.", group: "trade" },
  { id: "painter", label: "Maler & Lackierer", icon: Paintbrush, description: "Innenanstrich, Fassade, Tapete, Putz.", group: "trade" },
  { id: "roofer", label: "Dachdecker", icon: Building2, description: "Dachsanierung, Flachdach, Dämmung.", group: "trade" },
  { id: "carpenter", label: "Tischler & Schreiner", icon: Hammer, description: "Möbelbau, Türen, Einbauten.", group: "trade" },
  { id: "handyman", label: "Hausmeister", icon: Wrench, description: "Kleinreparaturen, Treppenhaus, Winterdienst.", group: "service" },
  { id: "cleaner", label: "Reinigung", icon: Sparkles, description: "Treppenhaus, Endreinigung, Fenster.", group: "service" },
  { id: "gardener", label: "Gartenpflege", icon: Sprout, description: "Hecke, Rasen, Baumschnitt.", group: "service" },
  { id: "locksmith", label: "Schlüsseldienst", icon: Key, description: "Notöffnung, Schloss tauschen.", group: "trade" },
];

const GROUP_STYLE: Record<Category["group"], { dot: string; tile: string; iconBg: string; badge: string; label: string }> = {
  advisor: {
    dot: "bg-violet-500",
    tile: "border-violet-500/30 hover:border-violet-500 hover:bg-violet-500/5",
    iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    label: "Berater",
  },
  trade: {
    dot: "bg-primary",
    tile: "hover:border-primary/40 hover:bg-accent/30",
    iconBg: "bg-primary/10 text-primary",
    badge: "bg-primary/10 text-primary border-primary/30",
    label: "Handwerk",
  },
  service: {
    dot: "bg-emerald-500",
    tile: "hover:border-emerald-500/40 hover:bg-emerald-500/5",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    label: "Service",
  },
};

const Marketplace = () => {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [results, setResults] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(15);
  const [source, setSource] = useState<"google" | "osm" | "cache" | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [centerLabel, setCenterLabel] = useState<string | null>(null);
  const [properties, setProperties] = useState<Array<{ id: string; name: string; zip: string | null; city: string | null }>>([]);

  useEffect(() => {
    document.title = "Experten finden · ImmonIQ";
    supabase.from("properties").select("id,name,zip,city").then(({ data }) => setProperties(data ?? []));
  }, []);

  const activeMeta = useMemo(() => CATEGORIES.find((c) => c.id === activeCat), [activeCat]);

  const runSearch = async (catId: string) => {
    const q = query.trim();
    if (q.length < 3) {
      toast.error("Bitte PLZ (z. B. 59320) oder Ort (z. B. Ennigerloh) eingeben.");
      return;
    }
    setActiveCat(catId);
    setLoading(true);
    setResults([]);
    setWarning(null);
    setSource(null);
    setCenterLabel(null);
    try {
      const { providers, source: src, warning: w, centerLabel: cl } = await searchProviders(catId, q, radius);
      setResults(providers);
      setSource(src);
      setCenterLabel(cl ?? null);
      if (w) setWarning(w);
      if (providers.length === 0) {
        toast.info("Keine Anbieter im Umkreis gefunden. Erhöhe den Radius oder probiere eine andere Kategorie.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Suche fehlgeschlagen: " + (e?.message ?? "unbekannt"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Experten finden</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Steuerberater, Handwerker & Service-Profis aus deiner Region — mit Bewertungen,
          Telefon, Website und Öffnungszeiten. Powered by Google Maps.
        </p>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Berater (Steuer/Recht)</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Handwerk</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Service</span>
        </div>
      </header>

      <Card className="p-4 md:p-5">
        <div className="grid sm:grid-cols-[1fr,160px] gap-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              PLZ oder Ort
            </label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="z. B. 59320 oder Ennigerloh"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && activeCat) runSearch(activeCat);
                }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Radius</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-2 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={15}>15 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
            </select>
          </div>
        </div>
        {properties.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Objekt wählen:</span>
            {properties.filter(p => p.zip || p.city).slice(0, 6).map(p => (
              <button
                key={p.id}
                onClick={() => setQuery(p.zip || p.city || "")}
                className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition"
              >
                {p.name} {p.zip ? `· ${p.zip}` : p.city ? `· ${p.city}` : ""}
              </button>
            ))}
          </div>
        )}
        {centerLabel && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Suchgebiet: {centerLabel}
          </p>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = activeCat === c.id;
          const gs = GROUP_STYLE[c.group];
          return (
            <button
              key={c.id}
              onClick={() => runSearch(c.id)}
              className={`text-left p-4 rounded-lg border transition-colors ${
                isActive
                  ? `border-current ${gs.iconBg.split(" ").find(x => x.startsWith("text-")) ?? "text-primary"} bg-current/5`
                  : `border-border ${gs.tile}`
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${gs.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-sm text-foreground">{c.label}</div>
                    {c.group === "advisor" && (
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${gs.badge}`}>{gs.label}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{c.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeCat && (
        <Card className={`p-5 space-y-4 ${activeMeta?.group === "advisor" ? "border-violet-500/40" : activeMeta?.group === "service" ? "border-emerald-500/40" : "border-primary/30"}`}>
          <div className="flex items-center gap-2 flex-wrap">
            {activeMeta && <activeMeta.icon className="h-5 w-5 text-primary" />}
            <h2 className="font-bold">{activeMeta?.label}</h2>
            {source && (
              <Badge variant="outline" className="text-[10px] uppercase">
                {source === "osm" ? "OpenStreetMap" : "Google Maps"}
              </Badge>
            )}
            <Badge variant="outline" className="ml-auto">
              {loading ? "Suche…" : `${num(results.length)} Treffer · ${radius} km`}
            </Badge>
          </div>

          {warning && (
            <div className="flex items-start gap-2 text-xs p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{warning}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Suche läuft…
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Keine Anbieter in {radius} km Umkreis gefunden. Versuche einen größeren Radius.
            </p>
          ) : (
            <div className="space-y-2">
              {results.map((p) => {
                const websiteUrl = p.website
                  ? (p.website.startsWith("http") ? p.website : `https://${p.website}`)
                  : null;
                const mapsUrl = p.google_maps
                  ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address ?? ""}`)}`;
                const directionsUrl = p.lat && p.lng
                  ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
                  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${p.name} ${p.address ?? ""}`)}`;
                const today = (new Date().getDay() + 6) % 7; // Mo=0
                const hoursToday = p.opening_hours?.[today] ?? null;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-2 p-3 rounded-md bg-accent/20 border border-border hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{p.name}</span>
                          {p.category && (
                            <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                          )}
                          {typeof p.rating === "number" && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                              <Star className="h-3 w-3 fill-current" />
                              {p.rating.toFixed(1)}
                              {p.rating_count ? (
                                <span className="text-muted-foreground ml-0.5">({num(p.rating_count)})</span>
                              ) : null}
                            </span>
                          )}
                          {typeof p.distance_km === "number" && (
                            <Badge variant="outline" className="text-[10px]">
                              {p.distance_km < 1 ? "< 1" : p.distance_km.toFixed(1)} km
                            </Badge>
                          )}
                        </div>
                        {p.address && (
                          <a
                            href={mapsUrl}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-start gap-1"
                          >
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {p.address}
                          </a>
                        )}
                        {hoursToday && (
                          <p className="text-[11px] text-muted-foreground">
                            Heute: <span className="text-foreground">{hoursToday.replace(/^[^:]+:\s*/, "")}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {p.phone && (
                        <Button asChild size="sm" variant="default" className="h-8 gap-1.5">
                          <a href={`tel:${p.phone.replace(/\s/g, "")}`}>
                            <Phone className="h-3.5 w-3.5" /> {p.phone}
                          </a>
                        </Button>
                      )}
                      {websiteUrl && (
                        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
                          <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-3.5 w-3.5" /> Website
                          </a>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                          <MapPin className="h-3.5 w-3.5" /> Route
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5">
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                          Auf Google Maps <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-md">
            {source === "osm"
              ? <>Daten von <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap-Mitwirkenden</a>.</>
              : <>Daten von Google Maps. Anrufe über die angezeigten Nummern sind direkt mit dem Anbieter — ImmonIQ ist nicht Vertragspartner.</>}
          </p>
        </Card>
      )}

      <Card className="p-5 border-dashed">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Du bist Handwerker oder Steuerberater?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Bald: verifizierte ImmonIQ-Profile mit Bewertungen, Direktbuchung und transparenten Preisen.
              Schreib uns für Early Access.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 gap-1.5">
              <a href="mailto:partner@immoniq.xyz?subject=Anbieter-Anmeldung%20ImmonIQ">
                <Mail className="h-3.5 w-3.5" /> partner@immoniq.xyz
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Marketplace;
