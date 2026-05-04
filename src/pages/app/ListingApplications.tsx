import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { eur } from "@/lib/format";
import { toast } from "sonner";
import { ArrowLeft, Star, X, Check, MessageSquare, ShieldCheck, Sparkles, Loader2, TrendingUp, Users, Copy, Plus, Trash2 } from "lucide-react";
import ChatDialog from "@/components/market/ChatDialog";
import LegalSnippet from "@/components/LegalSnippet";
import { AIDisclaimer } from "@/components/AIDisclaimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const labelStatus: Record<string, string> = {
  sent: "Neu", shortlisted: "Favorit", rejected: "Abgelehnt", accepted: "Angenommen", withdrawn: "Zurückgezogen",
};

const ListingApplications = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [chatApp, setChatApp] = useState<any>(null);
  const [scoring, setScoring] = useState<string | null>(null);
  const [wgOpen, setWgOpen] = useState(false);
  const [wgMembers, setWgMembers] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ name: "", email: "" });

  const aiScore = async (appId: string) => {
    setScoring(appId);
    try {
      const { error } = await supabase.functions.invoke("ai-score-application", { body: { application_id: appId } });
      if (error) throw error;
      toast.success("KI-Bewertung erstellt");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setScoring(null);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    const [l, a] = await Promise.all([
      supabase.from("listings").select("*").eq("id", id).maybeSingle(),
      supabase.from("applications").select("*").eq("listing_id", id).order("created_at", { ascending: false }),
    ]);
    setListing(l.data);
    setApps(a.data ?? []);
    if (l.data) document.title = `Bewerbungen · ${l.data.title}`;
    if (l.data?.kind === "wg_room") loadWgMembers();
  };

  const loadWgMembers = async () => {
    const { data } = await supabase.from("wg_member_links").select("*").eq("listing_id", id!).order("created_at", { ascending: false });
    setWgMembers(data ?? []);
  };

  const addWgMember = async () => {
    if (!newMember.name) return toast.error("Name fehlt");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("wg_member_links").insert({
      user_id: u.user!.id,
      listing_id: id!,
      member_name: newMember.name,
      member_email: newMember.email || null,
    });
    if (error) return toast.error(error.message);
    setNewMember({ name: "", email: "" });
    toast.success("Mitbewohner:in hinzugefügt");
    loadWgMembers();
  };

  const revokeMember = async (mid: string) => {
    await supabase.from("wg_member_links").update({ revoked: true }).eq("id", mid);
    loadWgMembers();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/wg-casting/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link kopiert");
  };

  const setStatus = async (appId: string, status: "sent" | "shortlisted" | "rejected" | "accepted" | "withdrawn") => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
    if (error) return toast.error(error.message);

    if (status === "accepted") {
      const app = apps.find((x) => x.id === appId);
      if (app && listing?.unit_id) {
        const sp = app.snapshot_profile ?? {};
        await supabase.from("tenants").insert({
          user_id: app.owner_user_id,
          unit_id: listing.unit_id,
          full_name: sp.full_name ?? "Neuer Mieter",
          email: sp.email ?? null,
          phone: sp.phone ?? null,
          deposit: listing.deposit ?? null,
          lease_start: listing.available_from ?? new Date().toISOString().slice(0, 10),
        });
        await supabase.from("listings").update({ status: "closed" }).eq("id", listing.id);
        toast.success("Mieter angelegt & Inserat geschlossen.");
      } else {
        toast.success("Angenommen.");
      }
    } else {
      toast.success("Status aktualisiert.");
    }
    load();
  };

  if (!listing) return <div className="text-muted-foreground">Lade…</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => nav("/app/listings")} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Inserate
      </button>
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{listing.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{apps.length} Bewerbungen</p>
        </div>
        {listing.kind === "wg_room" && (
          <Dialog open={wgOpen} onOpenChange={setWgOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Users className="h-4 w-4 mr-1" /> WG-Casting verwalten</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>WG-Mitbewohner einladen</DialogTitle></DialogHeader>
              <p className="text-xs text-muted-foreground">Lade deine bestehenden Mitbewohner:innen ein, über neue Bewerber abzustimmen.</p>
              <div className="flex gap-2">
                <Input placeholder="Name" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} />
                <Input placeholder="E-Mail (optional)" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} />
                <Button size="sm" onClick={addWgMember}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {wgMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 p-2 border rounded-lg text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{m.member_name} {m.revoked && <Badge variant="outline" className="ml-1 text-[10px]">widerrufen</Badge>}</div>
                      {m.member_email && <div className="text-xs text-muted-foreground truncate">{m.member_email}</div>}
                    </div>
                    {!m.revoked && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => copyLink(m.token)}><Copy className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => revokeMember(m.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </>
                    )}
                  </div>
                ))}
                {wgMembers.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Noch keine Mitbewohner:innen eingeladen.</p>}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <LegalSnippet
        title="Wichtig: Diskriminierungsverbot"
        keys={["agg_19", "bgb_535", "bgb_551"]}
      />

      <AIDisclaimer />


      {apps.length === 0 ? (
        <Card className="p-10 glass text-center text-muted-foreground">Noch keine Bewerbungen.</Card>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => {
            const sp = a.snapshot_profile ?? {};
            const matchOk = listing.kind === "rent" && sp.net_income_monthly && sp.net_income_monthly >= 3 * Number(listing.price);
            return (
              <Card key={a.id} className="p-5 glass">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={a.status === "accepted" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>
                        {labelStatus[a.status]}
                      </Badge>
                      {sp.schufa_status === "self_declared" && <Badge variant="outline" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />SCHUFA Eigenauskunft</Badge>}
                      {sp.schufa_status === "document_uploaded" && <Badge variant="outline" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />SCHUFA verfügbar</Badge>}
                      {matchOk && <Badge variant="outline" className="text-[10px] border-primary text-primary">3× Miete ✓</Badge>}
                    </div>
                    <h3 className="font-bold">{sp.full_name ?? "Bewerber"}</h3>
                    <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                      <span>Einkommen: <strong>{sp.net_income_monthly ? eur(sp.net_income_monthly) : "—"}</strong></span>
                      <span>Haushalt: <strong>{sp.household_size ?? "—"}</strong></span>
                      <span>Job: <strong>{sp.employment_type ?? "—"}</strong></span>
                      <span>Einzug: <strong>{sp.move_in_from ? new Date(sp.move_in_from).toLocaleDateString("de-DE") : "flex."}</strong></span>
                    </div>
                    {a.cover_message && <p className="text-sm mt-3 p-3 bg-muted/40 rounded-lg italic">„{a.cover_message}"</p>}
                    {sp.about_me && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{sp.about_me}</p>}

                    {a.ai_score != null && (
                      <div className="mt-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">KI-Bewertung</span>
                          <Badge variant="outline" className="ml-auto text-xs font-bold">
                            {a.ai_score}/100
                          </Badge>
                        </div>
                        {a.ai_summary && <p className="text-xs">{a.ai_summary}</p>}
                        {a.ai_strengths?.length > 0 && (
                          <p className="text-xs text-success mt-1">+ {a.ai_strengths.join(" · ")}</p>
                        )}
                        {a.ai_concerns?.length > 0 && (
                          <p className="text-xs text-warning mt-1">! {a.ai_concerns.join(" · ")}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-2 italic">KI-Vorschlag — bitte selbst prüfen, keine Rechtsberatung.</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 sm:w-40">
                    {a.ai_score == null && (
                      <Button size="sm" variant="outline" onClick={() => aiScore(a.id)} disabled={scoring === a.id}
                        className="border-primary/40 text-primary hover:bg-primary/5">
                        {scoring === a.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        KI-Score
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setChatApp(a)}>
                      <MessageSquare className="h-3 w-3 mr-1" /> Chat
                    </Button>
                    {a.status !== "shortlisted" && <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "shortlisted")}>
                      <Star className="h-3 w-3 mr-1" /> Favorit
                    </Button>}
                    {a.status !== "accepted" && <Button size="sm" onClick={() => setStatus(a.id, "accepted")} className="bg-gradient-gold text-primary-foreground shadow-gold">
                      <Check className="h-3 w-3 mr-1" /> Annehmen
                    </Button>}
                    {a.status !== "rejected" && <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "rejected")} className="text-destructive">
                      <X className="h-3 w-3 mr-1" /> Ablehnen
                    </Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {chatApp && <ChatDialog app={chatApp} onClose={() => setChatApp(null)} />}
    </div>
  );
};

export default ListingApplications;
