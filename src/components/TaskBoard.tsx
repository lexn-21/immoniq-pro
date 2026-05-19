import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AlertOctagon, CalendarClock, ListChecks, CheckCircle2, ExternalLink, GripVertical } from "lucide-react";

export interface BoardTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  done: boolean;
  legal_ref: string | null;
  legal_url: string | null;
  property_id: string | null;
  category: string | null;
}

type ColKey = "overdue" | "today" | "soon" | "later" | "done";
const COLS: { key: ColKey; label: string; icon: any; tone: string }[] = [
  { key: "overdue", label: "Überfällig", icon: AlertOctagon, tone: "border-destructive/30 bg-destructive/5" },
  { key: "today",   label: "Heute",      icon: CalendarClock, tone: "border-warning/30 bg-warning/5" },
  { key: "soon",    label: "Diese Woche",icon: CalendarClock, tone: "border-primary/30 bg-primary/5" },
  { key: "later",   label: "Später",     icon: ListChecks,    tone: "border-border bg-muted/30" },
  { key: "done",    label: "Erledigt",   icon: CheckCircle2,  tone: "border-success/30 bg-success/5" },
];

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function bucketOf(t: BoardTask): ColKey {
  if (t.done) return "done";
  if (!t.due_date) return "later";
  if (t.due_date < today()) return "overdue";
  if (t.due_date === today()) return "today";
  if (t.due_date <= addDays(7)) return "soon";
  return "later";
}

export function TaskBoard({
  tasks,
  propMap,
  onChange,
}: {
  tasks: BoardTask[];
  propMap: Record<string, string>;
  onChange: (id: string, patch: Partial<BoardTask>) => Promise<void> | void;
}) {
  const grouped = useMemo(() => {
    const g: Record<ColKey, BoardTask[]> = { overdue: [], today: [], soon: [], later: [], done: [] };
    tasks.forEach((t) => g[bucketOf(t)].push(t));
    return g;
  }, [tasks]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ColKey | null>(null);

  const moveTo = async (id: string, col: ColKey) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const patch: Partial<BoardTask> = {};
    if (col === "done") patch.done = true;
    else {
      patch.done = false;
      if (col === "today") patch.due_date = today();
      else if (col === "soon") patch.due_date = addDays(3);
      else if (col === "later") patch.due_date = addDays(30);
      else if (col === "overdue") patch.due_date = addDays(-1);
    }
    await onChange(id, patch);
  };

  return (
    <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
      <div className="flex gap-3 min-w-max lg:grid lg:grid-cols-5 lg:min-w-0">
        {COLS.map((c) => {
          const Icon = c.icon;
          const items = grouped[c.key];
          return (
            <div
              key={c.key}
              onDragOver={(e) => { e.preventDefault(); setOverCol(c.key); }}
              onDragLeave={() => setOverCol((o) => (o === c.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (dragId) moveTo(dragId, c.key);
                setDragId(null);
              }}
              className={`w-72 lg:w-auto rounded-2xl border-2 p-3 transition-colors ${c.tone} ${overCol === c.key ? "ring-2 ring-primary/40" : ""}`}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{c.label}</span>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-background/60">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {items.map((t) => (
                  <motion.div
                    layout
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`cursor-grab active:cursor-grabbing ${dragId === t.id ? "opacity-50" : ""}`}
                  >
                    <Card className="p-3 bg-background/90 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium leading-snug ${t.done ? "line-through opacity-60" : ""}`}>
                            {t.title}
                          </p>
                          {t.category && (
                            <span className="inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                              {t.category}
                            </span>
                          )}
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
                            {t.due_date && <span>📅 {new Date(t.due_date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>}
                            {t.property_id && propMap[t.property_id] && <span>🏠 {propMap[t.property_id]}</span>}
                            {t.legal_ref && (
                              t.legal_url ? (
                                <a href={t.legal_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5">
                                  {t.legal_ref}<ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ) : <span>{t.legal_ref}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
                {items.length === 0 && (
                  <div className="text-[10px] text-muted-foreground/60 text-center py-4 italic">
                    Hierher ziehen
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
