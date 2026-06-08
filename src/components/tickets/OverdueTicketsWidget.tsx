import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CalendarClock, CheckCircle2, ArrowRight, Wrench } from "lucide-react";

interface OverdueIssue {
  id: string;
  title: string;
  severity: string;
  due_date: string | null;
  reported_at: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function OverdueTicketsWidget() {
  const [items, setItems] = useState<OverdueIssue[] | null>(null);
  const [openCount, setOpenCount] = useState(0);

  const load = async () => {
    const today = todayISO();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setItems([]); return; }

    const [overdue, open] = await Promise.all([
      supabase
        .from("tenant_issues")
        .select("id, title, severity, due_date, reported_at")
        .eq("user_id", user.id)
        .neq("status", "resolved")
        .or(`snooze_until.is.null,snooze_until.lte.${today}`)
        .not("due_date", "is", null)
        .lte("due_date", today)
        .order("due_date", { ascending: true })
        .limit(5),
      supabase
        .from("tenant_issues")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "resolved")
        .or(`snooze_until.is.null,snooze_until.lte.${today}`),
    ]);

    setItems((overdue.data as OverdueIssue[]) || []);
    setOpenCount(open.count ?? 0);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("dash_overdue")
      .on("postgres_changes", { event: "*", schema: "public", table: "tenant_issues" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (items === null) return null;
  if (items.length === 0 && openCount === 0) return null;

  return (
    <Card className="p-4 glass border-primary/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Tickets heute</h3>
          {openCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {openCount} offen
            </span>
          )}
        </div>
        <Link to="/app/tickets" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
          Alle <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Keine überfälligen Tickets — alles im grünen Bereich.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                to="/app/tickets"
                className="flex items-center gap-2 text-sm hover:bg-muted/50 -mx-1 px-1 py-1 rounded"
              >
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="flex-1 truncate">{i.title}</span>
                <span className="text-xs text-red-600 inline-flex items-center gap-1 shrink-0">
                  <CalendarClock className="h-3 w-3" />
                  {i.due_date
                    ? new Date(i.due_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
