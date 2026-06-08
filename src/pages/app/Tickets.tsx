import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, Clock, Wrench, Radio, ListChecks, Download, CalendarClock, BellOff, User2, MessageSquare } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { showLocalNotification } from "@/lib/pushNotifications";
import QuickTicketDialog from "@/components/QuickTicketDialog";
import TicketNotes from "@/components/tickets/TicketNotes";
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
  due_date: string | null;
  snooze_until: string | null;
  assignee: string | null;
  tenant?: { full_name: string } | null;
  unit?: { label: string; property?: { name: string } | null } | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDaysISO = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

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

  const patchIssue = async (id: string, patch: Partial<Issue>) => {
    const { error } = await supabase.from("tenant_issues").update(patch as any).eq("id", id);
    if (error) return toastError(error);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } as Issue : i)));
    toast.success("Aktualisiert");
  };

  const snooze = (id: string, days: number) =>
    patchIssue(id, { snooze_until: addDaysISO(days) });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notesIssue, setNotesIssue] = useState<Issue | null>(null);
  const toggleSel = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSelected(new Set());

  const bulkUpdate = async (status: Issue["status"]) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const patch: any = { status };
    if (status === "resolved") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("tenant_issues").update(patch).in("id", ids);
    if (error) return toastError(error);
    toast.success(`${ids.length} Ticket(s) aktualisiert`);
    clearSel();
    load();
  };

  
  const today = todayISO();
  const isSnoozed = (i: Issue) => !!i.snooze_until && i.snooze_until > today && i.status !== "resolved";
  const isOverdue = (i: Issue) => !!i.due_date && i.due_date < today && i.status !== "resolved";
  const urgencyScore = (i: Issue) => {
    if (i.status === "resolved") return 1000 + new Date(i.resolved_at || i.reported_at).getTime() / 1e10;
    const sev = i.severity === "critical" ? 0 : i.severity === "major" ? 1 : 2;
    const due = i.due_date ? new Date(i.due_date).getTime() : Date.now() + 1e12;
    const snoozePenalty = isSnoozed(i) ? 1e9 : 0;
    return sev * 1e6 + due / 1e6 + snoozePenalty;
  };
  const filtered = items
    .filter((i) => filter === "all" || i.status === filter)
    .filter((i) => filter === "all" || !isSnoozed(i))
    .sort((a, b) => urgencyScore(a) - urgencyScore(b));
  const counts = {
    open: items.filter((i) => i.status === "open" && !isSnoozed(i)).length,
    in_progress: items.filter((i) => i.status === "in_progress" && !isSnoozed(i)).length,
    resolved: items.filter((i) => i.status === "resolved").length,
  };
  const allSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const toggleAll = () => {
    if (allSelected) clearSel();
    else setSelected(new Set(filtered.map((i) => i.id)));
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" /> Schäden & Tickets</h1>
          <p className="text-sm text-muted-foreground">Alle Mieter-Meldungen — KI-erkannt, sortiert, dokumentiert.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={filtered.length === 0}
          onClick={() => downloadCsv(
            `tickets-${new Date().toISOString().slice(0,10)}`,
            filtered.map((i) => ({
              Gemeldet: format(new Date(i.reported_at), "yyyy-MM-dd HH:mm"),
              Status: i.status,
              Schwere: severityLabel[i.severity] ?? i.severity,
              Kategorie: categoryLabel[i.category] ?? i.category,
              Titel: i.title,
              Beschreibung: i.description ?? "",
              Mieter: i.tenant?.full_name ?? "",
              Objekt: i.unit?.property?.name ?? "",
              Einheit: i.unit?.label ?? "",
              Erledigt_am: i.resolved_at ? format(new Date(i.resolved_at), "yyyy-MM-dd HH:mm") : "",
            })),
          )}
        >
          <Download className="h-4 w-4 mr-1.5" /> CSV
        </Button>
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

      {filtered.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-md border bg-muted/30 px-3 py-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <ListChecks className="h-4 w-4" />
            {selected.size > 0 ? `${selected.size} ausgewählt` : "Alle auswählen"}
          </label>
          {selected.size > 0 && (
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" onClick={() => bulkUpdate("in_progress")}>Übernehmen</Button>
              <Button size="sm" onClick={() => bulkUpdate("resolved")}>Erledigt</Button>
              <Button size="sm" variant="ghost" onClick={clearSel}>Abbrechen</Button>
            </div>
          )}
        </div>
      )}

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
            <Card key={i.id} className={selected.has(i.id) ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(i.id)}
                    onCheckedChange={() => toggleSel(i.id)}
                    aria-label="Auswählen"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={severityStyles[i.severity]} variant="outline">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {severityLabel[i.severity]}
                      </Badge>
                      <Badge variant="secondary">{categoryLabel[i.category] || i.category}</Badge>
                      {i.status === "in_progress" && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />In Arbeit</Badge>}
                      {i.status === "resolved" && <Badge className="bg-green-500/15 text-green-700 border-green-500/30" variant="outline"><CheckCircle2 className="h-3 w-3 mr-1" />Erledigt</Badge>}
                      {isOverdue(i) && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                          <CalendarClock className="h-3 w-3 mr-1" />Überfällig {format(new Date(i.due_date!), "dd. MMM", { locale: de })}
                        </Badge>
                      )}
                      {!isOverdue(i) && i.due_date && i.status !== "resolved" && (
                        <Badge variant="outline">
                          <CalendarClock className="h-3 w-3 mr-1" />Fällig {format(new Date(i.due_date), "dd. MMM", { locale: de })}
                        </Badge>
                      )}
                      {i.assignee && (
                        <Badge variant="outline"><User2 className="h-3 w-3 mr-1" />{i.assignee}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{i.title}</h3>
                    {i.description && <p className="text-sm text-muted-foreground line-clamp-3">{i.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      {i.tenant?.full_name || "—"} · {i.unit?.property?.name || i.unit?.label || "—"} ·{" "}
                      {format(new Date(i.reported_at), "dd. MMM yyyy, HH:mm", { locale: de })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {i.status !== "resolved" && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline" aria-label="Planen">
                            <CalendarClock className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 space-y-3">
                          <div>
                            <p className="text-xs font-medium mb-1">Fällig bis</p>
                            <Input
                              type="date"
                              defaultValue={i.due_date ?? ""}
                              onBlur={(e) => {
                                const v = e.target.value || null;
                                if (v !== (i.due_date ?? null)) patchIssue(i.id, { due_date: v });
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1">Zuständig</p>
                            <Input
                              placeholder="z. B. Klempner Schulz · 0151 …"
                              defaultValue={i.assignee ?? ""}
                              onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (i.assignee ?? null)) patchIssue(i.id, { assignee: v });
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1 flex items-center gap-1"><BellOff className="h-3 w-3" />Snooze</p>
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => snooze(i.id, 1)}>1 Tag</Button>
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => snooze(i.id, 7)}>7 Tage</Button>
                              {i.snooze_until && (
                                <Button size="sm" variant="ghost" onClick={() => patchIssue(i.id, { snooze_until: null })}>×</Button>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
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

      <QuickTicketDialog onCreated={load} />
      <TicketNotes
        issueId={notesIssue?.id ?? null}
        issueTitle={notesIssue?.title}
        onClose={() => setNotesIssue(null)}
      />
    </div>
  );
}
