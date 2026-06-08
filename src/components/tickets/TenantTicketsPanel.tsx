import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Wrench, CalendarClock, MessageSquare } from "lucide-react";
import { toastError } from "@/lib/errors";
import EmptyState from "@/components/EmptyState";
import TicketNotes from "@/components/tickets/TicketNotes";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Issue {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  reported_at: string;
  resolved_at: string | null;
  due_date: string | null;
  assignee: string | null;
}

const sevColor: Record<string, string> = {
  critical: "bg-red-500/15 text-red-600 border-red-500/30",
  major: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  minor: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
};
const sevLabel: Record<string, string> = { critical: "Kritisch", major: "Wichtig", minor: "Klein" };

export default function TenantTicketsPanel({ tenantId }: { tenantId: string }) {
  const [items, setItems] = useState<Issue[] | null>(null);
  const [notesIssue, setNotesIssue] = useState<Issue | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("tenant_issues")
      .select("id, category, severity, title, description, status, reported_at, resolved_at, due_date, assignee")
      .eq("tenant_id", tenantId)
      .order("reported_at", { ascending: false });
    if (error) toastError(error);
    setItems((data as Issue[]) || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  if (items === null) return <Card className="p-5 glass"><p className="text-sm text-muted-foreground">Lade …</p></Card>;

  return (
    <Card className="p-5 glass">
      <h3 className="font-semibold flex items-center gap-2 mb-3">
        <Wrench className="h-4 w-4" /> Tickets dieses Mieters
        {items.length > 0 && <span className="text-xs text-muted-foreground">({items.length})</span>}
      </h3>

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Keine Tickets"
          description="Dieser Mieter hat noch keine Schäden gemeldet."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="rounded-lg border bg-background/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <Badge variant="outline" className={sevColor[i.severity] ?? ""}>
                      <AlertTriangle className="h-3 w-3 mr-1" />{sevLabel[i.severity] ?? i.severity}
                    </Badge>
                    {i.status === "in_progress" && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />In Arbeit</Badge>}
                    {i.status === "resolved" && (
                      <Badge variant="outline" className="bg-green-500/15 text-green-700 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Erledigt
                      </Badge>
                    )}
                    {i.due_date && i.status !== "resolved" && (
                      <Badge variant="outline">
                        <CalendarClock className="h-3 w-3 mr-1" />
                        {format(new Date(i.due_date), "dd. MMM", { locale: de })}
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm">{i.title}</p>
                  {i.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{i.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(i.reported_at), "dd. MMM yyyy", { locale: de })}
                    {i.assignee ? ` · ${i.assignee}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setNotesIssue(i)} aria-label="Notizen">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TicketNotes
        issueId={notesIssue?.id ?? null}
        issueTitle={notesIssue?.title}
        onClose={() => setNotesIssue(null)}
      />
    </Card>
  );
}
