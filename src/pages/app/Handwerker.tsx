import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, MapPin, Phone, Globe, Star, Plus, Search, Wrench, Heart } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";

type Place = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  primaryTypeDisplayName?: { text: string };
};

const CATEGORIES = [
  { key: "Klempner", q: "Klempner Sanitär Heizung" },
  { key: "Elektriker", q: "Elektriker Elektroinstallation" },
  { key: "Maler", q: "Maler Lackierer" },
  { key: "Schlüsseldienst", q: "Schlüsseldienst Notdienst" },
  { key: "Dachdecker", q: "Dachdecker" },
  { key: "Schädlingsbekämpfung", q: "Schädlingsbekämpfer Kammerjäger" },
  { key: "Reinigung", q: "Gebäudereinigung Treppenhausreinigung" },
  { key: "Gärtner", q: "Gärtner Gartenpflege" },
  { key: "Schornsteinfeger", q: "Schornsteinfeger" },
  { key: "Umzug", q: "Umzugsunternehmen" },
];

export default function Handwerker() {
  usePageSeo({ title: "Handwerker & Dienstleister — ImmonIQ", description: "Verifizierte Handwerker in der Nähe deiner Immobilie finden und verwalten." });
  const { user } = useAuth();
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [city, setCity] = useState("");
  const [properties, setProperties] = useState<Array<{ id: string; name: string; city: string; zip: string }>>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [results, setResults] = useState<Place[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [props, sv] = await Promise.all([
        supabase.from("properties").select("id, name, city, zip").eq("user_id", user.id).order("name"),
        (supabase as any).from("craftsmen_contacts").select("*").eq("user_id", user.id).order("favorite", { ascending: false }).order("last_used_at", { ascending: false, nullsFirst: false }),
      ]);
      setProperties(props.data ?? []);
      setSaved(sv.data ?? []);
      if (props.data?.[0]) { setPropertyId(props.data[0].id); setCity(props.data[0].city ?? ""); }
    })();
  }, [user]);

  const activeProperty = useMemo(() => properties.find(p => p.id === propertyId), [properties, propertyId]);

  async function search() {
    const q = CATEGORIES.find(c => c.key === category)?.q ?? category;
    const location = activeProperty ? `${activeProperty.zip} ${activeProperty.city}` : city;
    if (!location) { toast.error("Bitte Objekt wählen oder Ort eingeben."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-search", {
        body: { query: `${q} ${location}`, maxResults: 20 },
      });
      if (error) throw error;
      setResults((data?.places ?? []) as Place[]);
      if (!data?.places?.length) toast.info("Keine Treffer — versuche eine andere Kategorie oder Stadt.");
    } catch (e: any) {
      toast.error(e.message ?? "Suche fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function saveCraftsman(p: Place) {
    if (!user) return;
    const row = {
      user_id: user.id,
      place_id: p.id,
      name: p.displayName?.text ?? "Unbekannt",
      category,
      phone: p.nationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      address: p.formattedAddress ?? null,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      rating: p.rating ?? null,
      rating_count: p.userRatingCount ?? null,
      property_id: propertyId || null,
    };
    const { data, error } = await (supabase as any).from("craftsmen_contacts").upsert(row, { onConflict: "user_id,place_id" }).select().single();
    if (error) { toast.error(error.message); return; }
    setSaved(prev => [data, ...prev.filter(x => x.id !== data.id)]);
    toast.success(`${row.name} gespeichert`);
  }

  async function toggleFavorite(id: string, next: boolean) {
    await (supabase as any).from("craftsmen_contacts").update({ favorite: next }).eq("id", id);
    setSaved(prev => prev.map(c => c.id === id ? { ...c, favorite: next } : c));
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold">Handwerker & Dienstleister</h1>
        <p className="text-muted-foreground mt-1">Verifizierte Kontakte in der Nähe deiner Objekte — mit einem Klick speichern und ins Ticket-System übernehmen.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-4 w-4" /> Suche</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.key}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={propertyId} onValueChange={(v) => { setPropertyId(v); const p = properties.find(x => x.id === v); if (p) setCity(p.city ?? ""); }}>
            <SelectTrigger><SelectValue placeholder="Objekt (optional)" /></SelectTrigger>
            <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.city}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Ort oder PLZ" value={city} onChange={e => setCity(e.target.value)} />
          <Button onClick={search} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suchen"}</Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {results.map(p => (
            <Card key={p.id} className="hover:shadow-md transition">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.displayName?.text}</p>
                    <p className="text-xs text-muted-foreground">{p.primaryTypeDisplayName?.text ?? category}</p>
                  </div>
                  {p.rating && (
                    <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 fill-current" /> {p.rating.toFixed(1)} · {p.userRatingCount}</Badge>
                  )}
                </div>
                {p.formattedAddress && <p className="text-sm text-muted-foreground flex items-start gap-1"><MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {p.formattedAddress}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {p.nationalPhoneNumber && <a href={`tel:${p.nationalPhoneNumber}`} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/70"><Phone className="h-3 w-3" /> {p.nationalPhoneNumber}</a>}
                  {p.websiteUri && <a href={p.websiteUri} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/70"><Globe className="h-3 w-3" /> Website</a>}
                  <Button size="sm" variant="outline" onClick={() => saveCraftsman(p)} className="ml-auto"><Plus className="h-3 w-3 mr-1" /> Speichern</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-xl font-display font-semibold mb-3 flex items-center gap-2"><Wrench className="h-5 w-5" /> Meine Handwerker ({saved.length})</h2>
        {saved.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine gespeichert. Suche oben und klicke „Speichern".</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {saved.map(c => (
              <Card key={c.id}>
                <CardContent className="pt-4 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.category}</p>
                    </div>
                    <button onClick={() => toggleFavorite(c.id, !c.favorite)} aria-label="Favorit">
                      <Heart className={`h-4 w-4 ${c.favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                  {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                  <div className="flex flex-wrap gap-2 text-xs pt-1">
                    {c.phone && <a href={`tel:${c.phone}`} className="text-primary inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</a>}
                    {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1"><Globe className="h-3 w-3" /> Web</a>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
