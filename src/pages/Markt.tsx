import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { eur, num } from "@/lib/format";
import {
  Search, MapPin, Bed, Maximize2, SlidersHorizontal, Target, X, Bell,
  ArrowDownAZ, Zap, Heart, Scale, CheckCircle2, Sparkles, Clock, ShieldCheck,
  TrendingDown, Home as HomeIcon, GraduationCap,
} from "lucide-react";
import { SponsoredSlot } from "@/components/market/SponsoredSlot";
import { approxLatLngFromZip } from "@/lib/geo";
import { toast } from "sonner";

type SortKey = "newest" | "price_asc" | "price_desc" | "size_desc" | "ppm2_asc";

const QUICK_FILTERS = [
  { key: "available_now", label: "Sofort frei", icon: Zap },
  { key: "balcony", label: "Balkon", icon: HomeIcon },
  { key: "pets", label: "Haustiere ok", icon: Heart },
  { key: "wg", label: "WG-tauglich", icon: Bed },
  { key: "new_build", label: "Erstbezug", icon: Sparkles },
  { key: "low_energy", label: "Energie A–B", icon: TrendingDown },
  { key: "students_ok", label: "Studenten ok", icon: GraduationCap },
];

const SAVED_KEY = "immoniq.savedSearches.v1";
const COMPARE_KEY = "immoniq.compare.v1";

const Markt = () => {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // filter state (URL-synced)
  const [q, setQ] = useState(params.get("q") ?? "");
  const [kind, setKind] = useState<"rent" | "sale" | "wg_room">((params.get("k") as any) || "rent");
  const [maxPrice, setMaxPrice] = useState(params.get("maxp") ?? "");
  const [minRooms, setMinRooms] = useState(params.get("minr") ?? "");
  const [minSpace, setMinSpace] = useState(params.get("mins") ?? "");
  const [sort, setSort] = useState<SortKey>((params.get("s") as SortKey) || "newest");
  const [quick, setQuick] = useState<Set<string>>(new Set(params.get("qf")?.split(",").filter(Boolean) ?? []));
  const [filterOpen, setFilterOpen] = useState(false);

  // compare
  const [compare, setCompare] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]"); } catch { return []; }
  });

  // anchor radius search (kept from before)
  const anchorId = params.get("near");
  const anchorZip = params.get("zip");
  const anchorKindParam = (params.get("kind") as "rent" | "sale" | "wg_room" | null) ?? null;
  const anchorLabel = params.get("label");
  const [anchor, setAnchor] = useState<any>(null);
  const [radiusKm, setRadiusKm] = useState<number>(Number(params.get("r") ?? 10));
  const [nearbyResults, setNearbyResults] = useState<any[] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const hasAnchor = !!anchorId || !!anchorZip;

  useEffect(() => {
    document.title = "Markt — Wohnungen direkt vom Eigentümer · ImmonIQ";
    (async () => {
      const [{ data }, { data: u }] = await Promise.all([
        supabase.from("listings").select("*").eq("status", "published").order("published_at", { ascending: false }).limit(500),
        supabase.auth.getUser(),
      ]);
      setItems(data ?? []);
      setUser(u?.user ?? null);
      if (u?.user) {
        const { data: saves } = await supabase.from("listing_saves").select("listing_id").eq("user_id", u.user.id);
        setSavedIds(new Set((saves ?? []).map((s: any) => s.listing_id)));
      }
      setLoading(false);
    })();
  }, []);

  // sync URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    const setOrDel = (k: string, v: string) => v ? next.set(k, v) : next.delete(k);
    setOrDel("q", q);
    setOrDel("k", kind);
    setOrDel("maxp", maxPrice);
    setOrDel("minr", minRooms);
    setOrDel("mins", minSpace);
    setOrDel("s", sort === "newest" ? "" : sort);
    setOrDel("qf", [...quick].join(","));
    setParams(next, { replace: true });
    // eslint-disable-next-line
  }, [q, kind, maxPrice, minRooms, minSpace, sort, quick]);

  // anchor radius load
  useEffect(() => {
    if (!hasAnchor) { setAnchor(null); setNearbyResults(null); return; }
    (async () => {
      setNearbyLoading(true);
      let a: any = null;
      if (anchorId) {
        const { data } = await supabase.from("listings").select("*").eq("id", anchorId).maybeSingle();
        a = data;
      } else if (anchorZip) {
        a = { id: null, title: anchorLabel || `Umgebung ${anchorZip}`, zip: anchorZip, city: null, kind: anchorKindParam ?? "rent", lat: null, lng: null };
      }
      setAnchor(a);
      if (!a) { setNearbyResults([]); setNearbyLoading(false); return; }
      const center = a.lat && a.lng ? { lat: Number(a.lat), lng: Number(a.lng) } : approxLatLngFromZip(a.zip);
      let nearby: any[] = [];
      if (center) {
        const { data: rpc } = await supabase.rpc("listings_nearby", {
          _lat: center.lat, _lng: center.lng, _radius_km: radiusKm,
          _kind: a.kind, _exclude_id: a.id, _limit: 60,
        });
        nearby = rpc ?? [];
      }
      const have = new Set(nearby.map((n: any) => n.id));
      const prefix = a.zip ? a.zip.slice(0, 3) : null;
      if (prefix) {
        let qb = supabase.from("listings").select("*").eq("status", "published").eq("kind", a.kind).like("zip", `${prefix}%`).limit(40);
        if (a.id) qb = qb.neq("id", a.id);
        const { data: byZip } = await qb;
        (byZip ?? []).forEach((l: any) => { if (!have.has(l.id)) { nearby.push({ ...l, distance_km: null }); have.add(l.id); } });
      }
      setNearbyResults(nearby);
      setNearbyLoading(false);
    })();
  }, [anchorId, anchorZip, anchorKindParam, anchorLabel, radiusKm, hasAnchor]);

  const matchesQuick = (l: any) => {
    if (!quick.size) return true;
    const f = l.features || {};
    if (quick.has("available_now") && l.available_from && new Date(l.available_from) > new Date()) return false;
    if (quick.has("balcony") && !(f.balcony || f.balkon || f.terrace)) return false;
    if (quick.has("pets") && !(f.pets || f.pets_allowed || f.haustiere)) return false;
    if (quick.has("wg") && !(f.wg || f.shared_living || (l.rooms ?? 0) >= 3)) return false;
    if (quick.has("new_build") && !(f.new_build || f.erstbezug)) return false;
    if (quick.has("low_energy") && !["A+", "A", "B"].includes((l.energy_class || "").toUpperCase())) return false;
    if (quick.has("students_ok") && !l.students_welcome) return false;
    return true;
  };

  const filtered = useMemo(() => {
    let out = items.filter((l) => {
      if (l.kind !== kind) return false;
      if (maxPrice && Number(l.price) > Number(maxPrice)) return false;
      if (minRooms && Number(l.rooms ?? 0) < Number(minRooms)) return false;
      if (minSpace && Number(l.living_space ?? 0) < Number(minSpace)) return false;
      if (q) {
        const hay = `${l.title} ${l.city} ${l.zip} ${l.description ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return matchesQuick(l);
    });
    const ppm2 = (l: any) => (l.living_space && l.living_space > 0 ? Number(l.price) / Number(l.living_space) : Infinity);
    switch (sort) {
      case "price_asc": out = [...out].sort((a, b) => Number(a.price) - Number(b.price)); break;
      case "price_desc": out = [...out].sort((a, b) => Number(b.price) - Number(a.price)); break;
      case "size_desc": out = [...out].sort((a, b) => Number(b.living_space ?? 0) - Number(a.living_space ?? 0)); break;
      case "ppm2_asc": out = [...out].sort((a, b) => ppm2(a) - ppm2(b)); break;
      case "newest":
      default: out = [...out].sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime());
    }
    return out;
    // eslint-disable-next-line
  }, [items, q, kind, maxPrice, minRooms, minSpace, sort, quick]);

  const photoUrl = (p?: string) => p ? supabase.storage.from("listing-photos").getPublicUrl(p).data.publicUrl : null;

  const showNearby = !!anchor;
  const displayList = showNearby ? nearbyResults ?? [] : filtered;
  const adZip = anchor?.zip ?? null;
  const adCity = anchor?.city ?? null;
  const adKind: "rent" | "sale" = ((anchor?.kind ?? kind) === "sale" ? "sale" : "rent");

  const clearAnchor = () => {
    const next = new URLSearchParams(params);
    ["near", "zip", "kind", "label"].forEach(k => next.delete(k));
    setParams(next, { replace: true });
  };
  const setNear = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("near", id); ["zip", "kind", "label"].forEach(k => next.delete(k));
    setParams(next, { replace: true });
  };
  const setRadiusParam = (v: number) => {
    setRadiusKm(v);
    const next = new URLSearchParams(params); next.set("r", String(v)); setParams(next, { replace: true });
  };

  const toggleQuick = (k: string) => {
    setQuick(prev => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next; });
  };
  const resetFilters = () => {
    setQ(""); setMaxPrice(""); setMinRooms(""); setMinSpace(""); setQuick(new Set()); setSort("newest");
  };

  // freshness
  const freshness = (l: any) => {
    const d = l.published_at || l.created_at;
    if (!d) return null;
    const h = (Date.now() - new Date(d).getTime()) / 36e5;
    if (h < 24) return { label: h < 1 ? "gerade neu" : `vor ${Math.floor(h)} Std.`, fresh: true };
    if (h < 72) return { label: `vor ${Math.floor(h / 24)} Tagen`, fresh: false };
    return null;
  };

  // save listing
  const toggleSave = async (e: React.MouseEvent, l: any) => {
    e.preventDefault();
    if (!user) { toast.error("Bitte erst anmelden"); return; }
    if (savedIds.has(l.id)) {
      await supabase.from("listing_saves").delete().eq("user_id", user.id).eq("listing_id", l.id);
      setSavedIds(prev => { const n = new Set(prev); n.delete(l.id); return n; });
      toast.success("Aus Favoriten entfernt");
    } else {
      await supabase.from("listing_saves").insert({ user_id: user.id, listing_id: l.id });
      setSavedIds(prev => new Set(prev).add(l.id));
      toast.success("Gespeichert ♥");
    }
  };

  // compare
  const toggleCompare = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setCompare(prev => {
      let next: string[];
      if (prev.includes(id)) next = prev.filter(x => x !== id);
      else if (prev.length >= 3) { toast.error("Max. 3 Inserate vergleichen"); return prev; }
      else next = [...prev, id];
      localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // save search → alert
  const saveSearchAsAlert = async () => {
    if (!user) { toast.error("Bitte erst anmelden um Suche zu speichern"); return; }
    const zips: string[] = [];
    // try to extract zips from query
    (q.match(/\b\d{5}\b/g) || []).forEach(z => zips.push(z));
    const { error } = await supabase.from("listing_alerts").insert({
      user_id: user.id, kind, zips,
      max_price: maxPrice ? Number(maxPrice) : null,
      min_rooms: minRooms ? Number(minRooms) : null,
      min_space: minSpace ? Number(minSpace) : null,
      active: true,
    });
    if (error) toast.error(error.message);
    else toast.success("✓ Suchauftrag gespeichert — du wirst per E-Mail benachrichtigt");
  };

  const ppmDisplay = (l: any) => {
    if (!l.living_space || l.living_space <= 0) return null;
    const v = Number(l.price) / Number(l.living_space);
    return `${v.toFixed(2).replace(".", ",")} €/m²`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 glass border-b border-border/60">
        <div className="container max-w-6xl flex items-center justify-between h-14">
          <Link to="/"><Logo /></Link>
          <div className="flex gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Anmelden</Button></Link>
            <Link to="/app"><Button size="sm" className="bg-gradient-gold text-primary-foreground shadow-gold">Inserieren</Button></Link>
          </div>
        </div>
      </header>

      <section className="container max-w-6xl py-6 space-y-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Wohnungen — direkt vom Eigentümer.</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base flex items-center gap-2 flex-wrap">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Keine Maklerprovision · Keine bezahlten Plätze in den Treffern · Energieausweis-Pflicht
          </p>
        </div>

        {/* Anchor banner */}
        {anchor && (
          <Card className="p-4 glass border-primary/40 flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Umkreissuche um</p>
              <p className="font-semibold truncate">{anchor.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {[anchor.zip, anchor.city].filter(Boolean).join(" ")}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-12 shrink-0">Radius</span>
                <Slider min={1} max={50} step={1} value={[radiusKm]} onValueChange={(v) => setRadiusParam(v[0])} className="flex-1" />
                <span className="text-xs font-semibold w-12 text-right">{radiusKm} km</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearAnchor} className="shrink-0"><X className="h-4 w-4" /></Button>
          </Card>
        )}

        {/* Search bar — always visible */}
        {!anchor && (
          <div className="space-y-3">
            <Card className="p-3 glass">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Stadt, PLZ oder Stichwort" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <Select value={kind} onValueChange={(v) => setKind(v as "rent" | "sale" | "wg_room")}>
                  <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Mieten</SelectItem>
                    <SelectItem value="sale">Kaufen</SelectItem><SelectItem value="wg_room">WG-Zimmer</SelectItem>
                  </SelectContent>
                </Select>
                <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Filter">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
                    <SheetHeader><SheetTitle>Filter</SheetTitle></SheetHeader>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <label className="text-xs">
                        <span className="text-muted-foreground">Max. {kind === "rent" ? "Miete" : "Preis"} (€)</span>
                        <Input type="number" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                      </label>
                      <label className="text-xs">
                        <span className="text-muted-foreground">Min. Zimmer</span>
                        <Input type="number" step="0.5" inputMode="decimal" value={minRooms} onChange={(e) => setMinRooms(e.target.value)} />
                      </label>
                      <label className="text-xs col-span-2">
                        <span className="text-muted-foreground">Min. Wohnfläche (m²)</span>
                        <Input type="number" inputMode="numeric" value={minSpace} onChange={(e) => setMinSpace(e.target.value)} />
                      </label>
                    </div>
                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Schnell-Filter</p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_FILTERS.map(f => {
                          const Icon = f.icon;
                          const on = quick.has(f.key);
                          return (
                            <button key={f.key} onClick={() => toggleQuick(f.key)}
                              className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1 ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
                              <Icon className="h-3 w-3" /> {f.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <Button variant="outline" onClick={resetFilters} className="flex-1">Zurücksetzen</Button>
                      <Button onClick={() => setFilterOpen(false)} className="flex-1">{num(filtered.length)} Treffer zeigen</Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </Card>

            {/* Quick filter chips (visible) */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-thin">
              {QUICK_FILTERS.map(f => {
                const Icon = f.icon;
                const on = quick.has(f.key);
                return (
                  <button key={f.key} onClick={() => toggleQuick(f.key)}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${on ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card hover:bg-muted border-border"}`}>
                    <Icon className="h-3 w-3" /> {f.label}
                  </button>
                );
              })}
            </div>

            {/* Sort + count + save search */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{num(filtered.length)} Treffer</span>
                {(q || maxPrice || minRooms || minSpace || quick.size > 0) && (
                  <Button size="sm" variant="ghost" onClick={resetFilters} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" /> zurücksetzen
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(q || maxPrice || minRooms || minSpace || quick.size > 0) && (
                  <Button size="sm" variant="outline" onClick={saveSearchAsAlert} className="h-8 text-xs gap-1">
                    <Bell className="h-3 w-3" /> Alarm bei neuen
                  </Button>
                )}
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-8 w-[170px] text-xs">
                    <ArrowDownAZ className="h-3 w-3 mr-1" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Neueste zuerst</SelectItem>
                    <SelectItem value="price_asc">Preis aufsteigend</SelectItem>
                    <SelectItem value="price_desc">Preis absteigend</SelectItem>
                    <SelectItem value="size_desc">Größte zuerst</SelectItem>
                    <SelectItem value="ppm2_asc">Bestes €/m²</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {(loading || nearbyLoading) ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden glass animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : displayList.length === 0 ? (
          <Card className="p-10 text-center glass">
            <p className="font-semibold mb-1">Nichts gefunden</p>
            <p className="text-sm text-muted-foreground mb-4">
              {anchor ? "Erhöhe den Radius oder lockere Filter." : "Passe Filter an — oder lass dich benachrichtigen, sobald etwas reinkommt."}
            </p>
            {!anchor && (
              <Button onClick={saveSearchAsAlert} variant="outline" className="gap-1">
                <Bell className="h-4 w-4" /> Suchauftrag speichern
              </Button>
            )}
          </Card>
        ) : (
          <>
            {anchor && (
              <p className="text-sm text-muted-foreground">
                {num(displayList.length)} Objekte im Umkreis ({anchor.kind === "rent" ? "Miete" : "Kauf"})
              </p>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayList.map((l) => {
                const cover = photoUrl(l.photos?.[0]);
                const fr = freshness(l);
                const inComp = compare.includes(l.id);
                const saved = savedIds.has(l.id);
                const ppm2 = ppmDisplay(l);
                return (
                  <div key={l.id} className="relative group">
                    <Link to={`/markt/${l.id}`}>
                      <Card className="overflow-hidden glass hover:shadow-gold transition h-full flex flex-col">
                        <div className="aspect-video bg-muted relative">
                          {cover ? (
                            <img src={cover} alt={l.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Kein Foto</div>
                          )}
                          <Badge className={`absolute top-2 left-2 backdrop-blur border ${l.kind === "wg_room" ? "bg-violet-500/85 text-white border-violet-500" : "bg-background/85 text-foreground"}`}>
                            {l.kind === "rent" ? "Miete" : l.kind === "sale" ? "Kauf" : "WG-Zimmer"}
                          </Badge>
                          {fr?.fresh && (
                            <Badge className="absolute top-2 left-[5.5rem] bg-emerald-600 text-white border-0 gap-1">
                              <Sparkles className="h-3 w-3" /> Neu
                            </Badge>
                          )}
                          {typeof l.distance_km === "number" && (
                            <Badge className="absolute top-2 right-2 bg-primary/90 text-primary-foreground">
                              {l.distance_km < 1 ? "<1" : Math.round(l.distance_km)} km
                            </Badge>
                          )}
                          {/* Save button */}
                          <button
                            onClick={(e) => toggleSave(e, l)}
                            aria-label={saved ? "Entfernen" : "Speichern"}
                            className={`absolute bottom-2 right-2 h-9 w-9 rounded-full flex items-center justify-center backdrop-blur transition ${saved ? "bg-rose-500 text-white" : "bg-background/85 text-foreground hover:bg-background"}`}
                          >
                            <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                          </button>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-semibold leading-tight line-clamp-2 mb-1">{l.title}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                            <MapPin className="h-3 w-3" /> {[l.zip, l.city].filter(Boolean).join(" ") || "—"}
                          </p>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <div className="flex gap-3 text-muted-foreground">
                              {l.kind === "wg_room" ? (
                                <>
                                  <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {l.wg_room_size_sqm ?? "—"} m²</span>
                                  <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" /> {l.wg_total_rooms ?? "—"}-Zi-WG</span>
                                </>
                              ) : (
                                <>
                                  <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {l.rooms ?? "—"}</span>
                                  <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" /> {l.living_space ?? "—"} m²</span>
                                </>
                              )}
                            </div>
                            <span className="font-bold text-gradient-gold">{eur(l.price)}{(l.kind === "rent" || l.kind === "wg_room") ? "/Mo" : ""}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-auto pt-2 border-t border-border/50">
                            <span className="flex items-center gap-1">
                              {fr ? <><Clock className="h-3 w-3" /> {fr.label}</> : null}
                            </span>
                            {ppm2 && <span className="font-medium">{ppm2}</span>}
                          </div>
                        </div>
                      </Card>
                    </Link>
                    {/* Hover/tap actions */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto">
                      <Button
                        size="sm" variant={inComp ? "default" : "secondary"}
                        onClick={(e) => toggleCompare(e, l.id)}
                        className="h-7 px-2 text-[11px]"
                        title="Vergleichen"
                      >
                        <Scale className="h-3 w-3 mr-1" /> {inComp ? "✓" : "Vgl."}
                      </Button>
                      {!anchor && (
                        <Button
                          size="sm" variant="secondary"
                          onClick={(e) => { e.preventDefault(); setNear(l.id); }}
                          className="h-7 px-2 text-[11px]"
                        >
                          <Target className="h-3 w-3 mr-1" /> Umkreis
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sponsored — clearly separated */}
            <div className="pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Hilfe in deiner Nähe</p>
              <SponsoredSlot placement="market_top" zip={adZip} city={adCity} kind={adKind} limit={1} />
              <p className="text-[11px] text-muted-foreground mt-2">
                Anzeigen sind klar gekennzeichnet und beeinflussen nie die Reihenfolge der Treffer.
              </p>
            </div>
          </>
        )}
      </section>

      {/* Compare bar */}
      {compare.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border shadow-lg rounded-full px-4 py-2 flex items-center gap-3 max-w-[95vw]">
          <Scale className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-medium">{compare.length} im Vergleich</span>
          <Link to={`/markt/vergleich?ids=${compare.join(",")}`}>
            <Button size="sm" className="h-7 text-xs">Vergleichen</Button>
          </Link>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setCompare([]); localStorage.removeItem(COMPARE_KEY); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Markt;
