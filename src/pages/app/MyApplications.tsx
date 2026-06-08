import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MessageSquare, Heart, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { eur } from "@/lib/format";
import ChatDialog from "@/components/market/ChatDialog";
import RecommendedListings from "@/components/market/RecommendedListings";
import { Skeleton } from "@/components/ui/skeleton";

const labelStatus: Record<string, string> = {
  sent: "Gesendet", shortlisted: "Favorit beim Eigentümer", rejected: "Abgelehnt",
  accepted: "Angenommen 🎉", withdrawn: "Zurückgezogen",
};

const MyApplications = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [chatApp, setChatApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = "Meine Bewerbungen · ImmonIQ"; load(); }, []);
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const timeout = <T,>(p: PromiseLike<T>, ms = 10000): Promise<T> =>
        Promise.race([
          Promise.resolve(p),
          new Promise<T>((_, rej) => setTimeout(() => rej(new Error("Zeitüberschreitung — bitte erneut versuchen.")), ms)),
        ]);
      const [aRes, sRes] = await Promise.all([
        timeout(supabase.from("applications").select("*, listings(*)").order("created_at", { ascending: false })),
        timeout(supabase.from("listing_saves").select("*, listings(*)")),
      ]);
      if ((aRes as any).error) throw (aRes as any).error;
      setApps((aRes as any).data ?? []);
      setSaved((sRes as any).data ?? []);
    } catch (e: any) {
      setError(e.message || "Konnte nicht laden.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Briefcase className="h-7 w-7 text-primary" /> Meine Bewerbungen</h1>
          <p className="text-muted-foreground text-sm mt-1">Status, Chats und gespeicherte Inserate.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Aktualisieren
        </Button>
      </header>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Daten konnten nicht geladen werden</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={load}>Erneut versuchen</Button>
        </Card>
      )}

      <RecommendedListings />

      <section className="space-y-3">
        <h2 className="font-bold">Aktive Bewerbungen</h2>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : apps.length === 0 ? (
          <Card className="p-8 glass text-center text-sm text-muted-foreground">
            Noch keine Bewerbungen. <Link to="/markt" className="text-primary underline">Im Markt stöbern</Link>.
          </Card>
        ) : apps.map((a) => (
          <Card key={a.id} className="p-4 glass flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <Badge variant="secondary" className="mb-1">{labelStatus[a.status]}</Badge>
              <p className="font-semibold truncate">{a.listings?.title ?? "Inserat"}</p>
              <p className="text-xs text-muted-foreground">{[a.listings?.zip, a.listings?.city].filter(Boolean).join(" ")} · {eur(a.listings?.price)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setChatApp(a)}>
              <MessageSquare className="h-3 w-3 mr-1" /> Chat
            </Button>
            <Link to={`/markt/${a.listing_id}`}><Button size="sm" variant="ghost">Ansehen</Button></Link>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold flex items-center gap-2"><Heart className="h-4 w-4" /> Gespeichert</h2>
        {saved.length === 0 ? (
          <Card className="p-6 glass text-center text-sm text-muted-foreground">Keine gespeicherten Inserate.</Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {saved.map((s) => (
              <Link key={s.listing_id} to={`/markt/${s.listing_id}`}>
                <Card className="p-4 glass hover:shadow-gold transition">
                  <p className="font-semibold truncate">{s.listings?.title}</p>
                  <p className="text-xs text-muted-foreground">{eur(s.listings?.price)}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {chatApp && <ChatDialog app={chatApp} onClose={() => setChatApp(null)} />}
    </div>
  );
};

export default MyApplications;
