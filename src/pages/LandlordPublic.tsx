import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck, ArrowRight } from "lucide-react";
import { LegalFooter } from "@/components/LegalFooter";
import { usePageSeo } from "@/hooks/usePageSeo";

type Rating = {
  id: string;
  stars: number;
  category_communication: number | null;
  category_maintenance: number | null;
  category_fairness: number | null;
  comment: string | null;
  verified: boolean;
  created_at: string;
};

export default function LandlordPublic() {
  const { userId } = useParams();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("landlord_ratings_public")
        .select("id, stars, category_communication, category_maintenance, category_fairness, comment, verified, created_at")
        .eq("landlord_user_id", userId)
        .order("created_at", { ascending: false });
      setRatings((data ?? []) as Rating[]);
      setLoading(false);
    })();
  }, [userId]);

  const avg = ratings.length
    ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length
    : 0;
  const catAvg = (k: keyof Rating) => {
    const vals = ratings.map((r) => r[k] as number | null).filter((v): v is number => !!v);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const title = ratings.length
    ? `Vermieter-Profil · ${avg.toFixed(1)}★ (${ratings.length} Bewertungen) · ImmonIQ`
    : "Vermieter-Profil · ImmonIQ";

  usePageSeo({
    title,
    description: "Öffentliche Vermieter-Bewertungen auf ImmonIQ — verifiziert von aktiven Mietern.",
    canonicalPath: `/vermieter/${userId}`,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/40">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold tracking-tight">ImmonIQ</Link>
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />Vermieter-Profil</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Gesamtbewertung</div>
              <div className="flex items-center gap-2">
                <div className="text-4xl font-bold">{avg > 0 ? avg.toFixed(1) : "—"}</div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-5 w-5 ${n <= Math.round(avg) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{ratings.length} verifizierte Bewertungen</div>
            </div>
            {ratings.length > 0 && (
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { k: "category_communication" as const, l: "Kommunikation" },
                  { k: "category_maintenance" as const, l: "Instandhaltung" },
                  { k: "category_fairness" as const, l: "Fairness" },
                ].map(({ k, l }) => {
                  const v = catAvg(k);
                  return (
                    <div key={k}>
                      <div className="text-lg font-semibold">{v > 0 ? v.toFixed(1) : "—"}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Bewertungen</h2>
          {loading && <p className="text-sm text-muted-foreground">Lädt …</p>}
          {!loading && ratings.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Noch keine Bewertungen. Aktive Mieter dieses Vermieters können über ImmonIQ bewerten.
            </Card>
          )}
          {ratings.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= r.stars ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("de-DE")}</div>
              </div>
              {r.comment && <p className="text-sm leading-relaxed">{r.comment}</p>}
            </Card>
          ))}
        </div>

        <Card className="p-5 bg-muted/30">
          <p className="text-sm">
            Du bist Vermieter? Auf ImmonIQ baust du deine öffentliche Reputation auf — verifiziert und fair.
          </p>
          <Button asChild className="mt-3 gap-2"><Link to="/">Kostenlos starten <ArrowRight className="h-4 w-4" /></Link></Button>
        </Card>
      </main>
      <LegalFooter />
    </div>
  );
}
