import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { eur } from "@/lib/format";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, HelpCircle, Sparkles, Home, Users } from "lucide-react";

const WgCasting = () => {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    document.title = "WG-Casting · ImmoNIQ";
    if (token) load();
  }, [token]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("wg_casting_resolve", { _token: token! });
    if (error) toast.error(error.message);
    setData(data);
    setLoading(false);
  };

  const vote = async (appId: string, v: "yes" | "no" | "maybe") => {
    setVoting(appId);
    try {
      const { error } = await supabase.rpc("wg_casting_vote", {
        _token: token!,
        _application_id: appId,
        _vote: v,
        _comment: comments[appId] ?? null,
      });
      if (error) throw error;
      toast.success("Stimme abgegeben");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setVoting(null);
    }
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">Lade…</div>;
  if (!data) return <div className="p-10 text-center">Link ungültig oder abgelaufen.</div>;

  const l = data.listing ?? {};
  const apps: any[] = data.applications ?? [];
  const member = data.member ?? {};

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      <header className="space-y-2">
        <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1" /> WG-Casting</Badge>
        <h1 className="text-3xl font-bold">Hi {member.name}, hilf mit zu entscheiden!</h1>
        <p className="text-muted-foreground text-sm">Stimme über die Bewerber für eure WG ab.</p>
      </header>

      <Card className="p-5 glass">
        <div className="flex items-start gap-3">
          <Home className="h-5 w-5 text-primary mt-1" />
          <div>
            <h2 className="font-bold">{l.title}</h2>
            <p className="text-sm text-muted-foreground">{l.zip} {l.city} · {l.wg_room_size_sqm ?? l.living_space} m² · {eur(l.price)} warm</p>
          </div>
        </div>
      </Card>

      {apps.length === 0 ? (
        <Card className="p-10 glass text-center text-muted-foreground">Noch keine Bewerbungen eingegangen.</Card>
      ) : (
        <div className="space-y-4">
          {apps.map((a) => {
            const sp = a.snapshot_profile ?? {};
            const yes = (a.votes ?? []).filter((v: any) => v.vote === "yes").length;
            const no = (a.votes ?? []).filter((v: any) => v.vote === "no").length;
            const maybe = (a.votes ?? []).filter((v: any) => v.vote === "maybe").length;
            return (
              <Card key={a.id} className="p-5 glass space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-lg">{sp.full_name ?? "Bewerber"}</h3>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {sp.is_student && <span>🎓 {sp.university ?? "Student:in"}</span>}
                      {sp.employment_type && <span>{sp.employment_type}</span>}
                      {sp.net_income_monthly && <span>{eur(sp.net_income_monthly)}/Monat</span>}
                      {sp.household_size && <span>Haushalt: {sp.household_size}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 text-xs">
                    <Badge variant="outline" className="border-success text-success">👍 {yes}</Badge>
                    <Badge variant="outline">🤔 {maybe}</Badge>
                    <Badge variant="outline" className="border-destructive text-destructive">👎 {no}</Badge>
                  </div>
                </div>

                {a.cover_message && (
                  <p className="text-sm p-3 bg-muted/40 rounded-lg italic">„{a.cover_message}"</p>
                )}

                {a.ai_score != null && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">KI-Bewertung</span>
                      <Badge variant="outline" className="ml-auto text-xs font-bold">{a.ai_score}/100</Badge>
                    </div>
                    {a.ai_summary && <p className="text-xs">{a.ai_summary}</p>}
                  </div>
                )}

                {(a.votes ?? []).length > 0 && (
                  <div className="text-xs space-y-1">
                    {a.votes.map((v: any, i: number) => (
                      <div key={i} className="text-muted-foreground">
                        <strong>{v.member_name}</strong>: {v.vote === "yes" ? "👍" : v.vote === "no" ? "👎" : "🤔"} {v.comment && <span className="italic">— „{v.comment}"</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium">
                    Deine Stimme {a.my_vote && <Badge variant="outline" className="ml-2 text-[10px]">aktuell: {a.my_vote}</Badge>}
                  </p>
                  <Textarea
                    placeholder="Optional: Kommentar"
                    value={comments[a.id] ?? ""}
                    onChange={(e) => setComments({ ...comments, [a.id]: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" disabled={voting === a.id} onClick={() => vote(a.id, "yes")}
                      className="bg-success/10 text-success hover:bg-success/20 border border-success/30">
                      <ThumbsUp className="h-3 w-3 mr-1" /> Ja, passt
                    </Button>
                    <Button size="sm" variant="outline" disabled={voting === a.id} onClick={() => vote(a.id, "maybe")}>
                      <HelpCircle className="h-3 w-3 mr-1" /> Vielleicht
                    </Button>
                    <Button size="sm" variant="outline" disabled={voting === a.id} onClick={() => vote(a.id, "no")}
                      className="text-destructive border-destructive/30 hover:bg-destructive/5">
                      <ThumbsDown className="h-3 w-3 mr-1" /> Nein
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center pt-4">
        Die finale Entscheidung trifft der Vermieter. Stimmen sind für Diskriminierung gemäß AGG nicht zulässig — bewerte nur faire Kriterien.
      </p>
    </div>
  );
};

export default WgCasting;
