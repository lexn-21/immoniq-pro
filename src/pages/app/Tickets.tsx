import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Wrench, Radio } from "lucide-react";
import { showLocalNotification } from "@/lib/pushNotifications";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Issue {
  id: string;
  tenant_id: string;
  unit_id: string;
  category: string;
  severity: "minor" | "major" | "critical";
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved";
  reported_at: string;
  resolved_at: string | null;
  tenant?: { full_name: string } | null;
  unit?: { label: string; property?: { name: string } | null } | null;
}

const severityStyles: Record<string, string> = {
  critical: "bg-red-500/15 text-red-600 border-red-500/30",
  major: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  minor: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
};
const severityLabel: Record<string, string> = { critical: "Kritisch", major: "Wichtig", minor: "Klein" };
const categoryLabel: Record<string, string> = {
  sanitaer: "Sanitär", heizung: "Heizung", strom: "Strom", schaedling: "Schädling",
  schaden: "Schaden", laerm: "Lärm", schluessel: "Schlüssel", sonstiges: "Sonstiges",
};

export default function Tickets() {
  const [items, setItems] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("open");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_issues")
      .select("*, tenant:tenants(full_name), unit:units(label, property:properties(name))")
      .order("reported_at", { ascending: false });
    if (error) toastError(error);
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    // Realtime: neue Tickets sofort sichtbar + Push-Notification
    const ch = supabase
      .channel("tenant_issues_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tenant_issues" }, (payload) => {
        const issue = payload.new as Issue;
        setItems((prev) => [issue, ...prev]);
        toast.success(`Neues Ticket: ${issue.title}`, { icon: "🔔" });
        showLocalNotification(`Neues Ticket: ${issue.title}`, { body: issue.description || "" }).catch(() => {});
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tenant_issues" }, (payload) => {
        const issue = payload.new as Issue;
        setItems((prev) => prev.map((i) => (i.id === issue.id ? { ...i, ...issue } : i)));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setStatus = async (id: string, status: Issue["status"]) => {
    const patch: any = { status };
    if (status === "resolved") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("tenant_issues").update(patch).eq("id", id);
    if (error) return toastError(error);
    toast.success(status === "resolved" ? "Erledigt ✓" : "Status aktualisiert");
    load();
  };

  const filtered = items.filter((i) => filter === "all" || i.status === filter);
  const counts = {
    open: items.filter((i) => i.status === "open").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
    resolved: items.filter((i) => i.status === "resolved").length,
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" /> Schäden & Tickets</h1>
          <p className="text-sm text-muted-foreground">Alle Mieter-Meldungen — KI-erkannt, sortiert, dokumentiert.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { k: "open", l: `Offen (${counts.open})` },
          { k: "in_progress", l: `In Arbeit (${counts.in_progress})` },
          { k: "resolved", l: `Erledigt (${counts.resolved})` },
          { k: "all", l: "Alle" },
        ].map((f) => (
          <Button key={f.k} size="sm" variant={filter === f.k ? "default" : "outline"} onClick={() => setFilter(f.k as any)}>
            {f.l}
          </Button>
        ))}
      </div>

      {loading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Keine Tickets"
          description="Alles ruhig — keine offenen Schäden gemeldet."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => (
            <Card key={i.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={severityStyles[i.severity]} variant="outline">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {severityLabel[i.severity]}
                      </Badge>
                      <Badge variant="secondary">{categoryLabel[i.category] || i.category}</Badge>
                      {i.status === "in_progress" && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />In Arbeit</Badge>}
                      {i.status === "resolved" && <Badge className="bg-green-500/15 text-green-700 border-green-500/30" variant="outline"><CheckCircle2 className="h-3 w-3 mr-1" />Erledigt</Badge>}
                    </div>
                    <h3 className="font-semibold">{i.title}</h3>
                    {i.description && <p className="text-sm text-muted-foreground line-clamp-3">{i.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      {i.tenant?.full_name || "—"} · {i.unit?.property?.name || i.unit?.label || "—"} ·{" "}
                      {format(new Date(i.reported_at), "dd. MMM yyyy, HH:mm", { locale: de })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {i.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(i.id, "in_progress")}>Übernehmen</Button>
                    )}
                    {i.status !== "resolved" && (
                      <Button size="sm" onClick={() => setStatus(i.id, "resolved")}>Erledigt</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
