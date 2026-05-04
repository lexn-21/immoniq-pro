import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Users, Pause, Play, Trash2, ExternalLink, Megaphone } from "lucide-react";
import { eur, num } from "@/lib/format";
import { toast } from "sonner";

const Listings = () => {
  const [items, setItems] = useState<any[]>([]);
  const nav = useNavigate();

  useEffect(() => { document.title = "Inserate · ImmonIQ"; load(); }, []);
  const load = async () => {
    const { data } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  const toggle = async (l: any) => {
    const next = l.status === "published" ? "paused" : "published";
    const patch: any = { status: next };
    if (next === "published" && !l.published_at) patch.published_at = new Date().toISOString();
    const { error } = await supabase.from("listings").update(patch).eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success(next === "published" ? "Live geschaltet" : "Pausiert");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Inserat wirklich löschen?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gelöscht");
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" /> Meine Inserate
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Veröffentliche Leerstand in 60 Sekunden — Bewerbungen landen direkt strukturiert in deiner Inbox.
          </p>
        </div>
        <Button onClick={() => nav("/app/listings/new")} className="bg-gradient-gold text-primary-foreground shadow-gold">
          <Plus className="h-4 w-4 mr-2" /> Neues Inserat
        </Button>
      </header>

      {items.length === 0 ? (
        <Card className="p-12 text-center glass">
          <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Noch keine Inserate. Veröffentliche eine freie Einheit.</p>
          <Button onClick={() => nav("/app/listings/new")} className="bg-gradient-gold text-primary-foreground shadow-gold">
            Erstes Inserat anlegen
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((l) => (
            <Card key={l.id} className="p-5 glass">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={l.status === "published" ? "default" : "secondary"} className="text-[10px]">
                      {l.status === "published" ? "Live" : l.status === "draft" ? "Entwurf" : l.status === "paused" ? "Pausiert" : "Geschlossen"}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${l.kind === "wg_room" ? "border-violet-500/40 text-violet-600 dark:text-violet-300" : ""}`}>
                      {l.kind === "rent" ? "Miete" : l.kind === "sale" ? "Kauf" : "WG-Zimmer"}
                    </Badge>
                  </div>
                  <h3 className="font-bold truncate">{l.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {[l.zip, l.city].filter(Boolean).join(" ")} · {l.living_space ?? "—"} m² · {l.rooms ?? "—"} Zi.
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gradient-gold">{eur(l.price)}</p>
                  {l.kind === "rent" && <p className="text-[10px] text-muted-foreground">Kalt/Mo</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-3 mt-3">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {num(l.views_count)}</span>
                <Link to={`/app/listings/${l.id}/applications`} className="flex items-center gap-1 hover:text-primary">
                  <Users className="h-3 w-3" /> {num(l.applications_count)} Bewerbungen
                </Link>
                <a href={`/markt/${l.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 ml-auto hover:text-primary">
                  <ExternalLink className="h-3 w-3" /> Ansicht
                </a>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => nav(`/app/listings/${l.id}/edit`)} className="flex-1">Bearbeiten</Button>
                <Button size="sm" variant="outline" onClick={() => toggle(l)}>
                  {l.status === "published" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Listings;
