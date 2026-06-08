import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin } from "lucide-react";
import { eur } from "@/lib/format";

interface ScoredListing {
  id: string; title: string; city: string | null; zip: string | null;
  price: number | null; rooms: number | null; living_space: number | null;
  photos: string[] | null; score: number; reasons: string[];
}

export default function RecommendedListings() {
  const [items, setItems] = useState<ScoredListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: prof } = await supabase
        .from("seeker_profiles")
        .select("max_rent, preferred_zips, household_size")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!prof) { setLoading(false); return; }

      const { data: listings } = await supabase
        .from("listings")
        .select("id,title,city,zip,price,rooms,living_space,photos")
        .eq("status", "published")
        .limit(80);

      const maxRent = Number(prof.max_rent ?? 0);
      const zips: string[] = prof.preferred_zips ?? [];
      const minRooms = Math.max(1, Math.ceil((prof.household_size ?? 1) / 1.5));

      const scored: ScoredListing[] = (listings ?? []).map((l: any) => {
        let score = 0; const reasons: string[] = [];
        const price = Number(l.price ?? 0);
        if (maxRent > 0 && price > 0) {
          if (price <= maxRent) { score += 40; reasons.push("im Budget"); }
          else if (price <= maxRent * 1.1) { score += 15; reasons.push("knapp über Budget"); }
        }
        if (zips.length && l.zip) {
          if (zips.includes(l.zip)) { score += 35; reasons.push("Wunsch-PLZ"); }
          else if (zips.some(z => l.zip.startsWith(z.slice(0, 3)))) { score += 15; reasons.push("Wunsch-Gegend"); }
        }
        if (l.rooms && l.rooms >= minRooms) { score += 15; reasons.push(`${l.rooms} Zimmer`); }
        if (l.photos?.length) score += 5;
        return { ...l, score, reasons };
      }).filter(l => l.score >= 30).sort((a, b) => b.score - a.score).slice(0, 6);

      setItems(scored);
      setLoading(false);
    })();
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <Card className="p-5 glass border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Für dich empfohlen</h2>
        <Badge variant="secondary" className="text-xs">KI-Match</Badge>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((l) => (
          <Link key={l.id} to={`/markt/${l.id}`} className="block group">
            <Card className="overflow-hidden hover:border-primary/40 transition">
              {l.photos?.[0] && (
                <img src={l.photos[0]} alt={l.title} className="w-full h-32 object-cover" loading="lazy" />
              )}
              <div className="p-3">
                <p className="font-medium text-sm line-clamp-1 group-hover:text-primary">{l.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {l.zip} {l.city}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold">{eur(Number(l.price ?? 0))}</span>
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    {l.score}% Match
                  </Badge>
                </div>
                {l.reasons.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-1">
                    ✓ {l.reasons.join(" · ")}
                  </p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Card>
  );
}
