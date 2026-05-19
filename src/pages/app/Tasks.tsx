import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Plus, AlertOctagon, ListChecks, CheckCircle2, CalendarClock, LayoutGrid, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { TaskBoard, type BoardTask } from "@/components/TaskBoard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  due_date: string | null;
  done: boolean;
  legal_ref: string | null;
  legal_url: string | null;
  property_id: string | null;
}

interface Property { id: string; name: string }

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "board">(() =>
    (typeof window !== "undefined" && (localStorage.getItem("tasks_view") as "list" | "board")) || "list"
  );
  const [form, setForm] = useState({ title: "", description: "", category: "", due_date: "", property_id: "", legal_ref: "", legal_url: "" });

  const updateTask = async (id: string, patch: Partial<BoardTask>) => {
    const prev = tasks;
    setTasks((curr) => curr.map((t) => (t.id === id ? { ...t, ...patch } as Task : t)));
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (error) { setTasks(prev); toastError(error); }
  };

  const load = async () => {
    setLoading(true);
    const [t, p] = await Promise.all([
      supabase.from("tasks").select("*").order("due_date", { ascending: true }),
      supabase.from("properties").select("id, name").order("name"),
    ]);
    setTasks((t.data as Task[]) || []);
    setProperties((p.data as Property[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (t: Task) => {
    await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
    setTasks(tasks.map(x => x.id === t.id ? { ...x, done: !t.done } : x));
  };

  const create = async () => {
    if (!form.title) { toast.error("Titel fehlt"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      category: form.category || null,
      due_date: form.due_date || null,
      property_id: form.property_id || null,
      legal_ref: form.legal_ref || null,
      legal_url: form.legal_url || null,
    });
    if (error) { toastError(error, { onRetry: create }); return; }
    toast.success("Aufgabe angelegt");
    setOpen(false);
    setForm({ title: "", description: "", category: "", due_date: "", property_id: "", legal_ref: "", legal_url: "" });
    load();
  };

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const overdue = tasks.filter(t => !t.done && t.due_date && t.due_date < today);
  const soon = tasks.filter(t => !t.done && t.due_date && t.due_date >= today && t.due_date <= in30);
  const later = tasks.filter(t => !t.done && (!t.due_date || t.due_date > in30));
  const done = tasks.filter(t => t.done);

  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mein Plan</h1>
          <p className="text-muted-foreground mt-1">Alle Aufgaben & gesetzlichen Fristen — sortiert nach Dringlichkeit. Du verpasst nichts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Neue Aufgabe</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Neue Aufgabe</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Titel *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Beschreibung</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Kategorie</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="z.B. Steuer" /></div>
                <div><Label>Fällig am</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <div>
                <Label>Objekt (optional)</Label>
                <Select value={form.property_id} onValueChange={v => setForm({ ...form, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Kein Objekt" /></SelectTrigger>
                  <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Gesetzes-Ref.</Label><Input value={form.legal_ref} onChange={e => setForm({ ...form, legal_ref: e.target.value })} placeholder="§ 556 BGB" /></div>
                <div><Label>Gesetzes-Link</Label><Input value={form.legal_url} onChange={e => setForm({ ...form, legal_url: e.target.value })} placeholder="https://..." /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={create}>Anlegen</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Alles im Griff — keine offenen Aufgaben"
          description="Sobald du ein Objekt anlegst, generieren wir automatisch deine wichtigsten gesetzlichen Fristen (Nebenkostenabrechnung, Heizungsablesung, Steuererklärung u.v.m.)."
          action={{ label: "Aufgabe anlegen", onClick: () => setOpen(true), icon: Plus }}
          secondary={{ label: "Objekt anlegen", to: "/app/properties" }}
        />
      ) : (
        <div className="space-y-6">
          <Tabs value={view} onValueChange={(v) => { setView(v as any); localStorage.setItem("tasks_view", v); }}>
            <TabsList>
              <TabsTrigger value="list" className="gap-1.5"><Rows3 className="h-3.5 w-3.5" />Liste</TabsTrigger>
              <TabsTrigger value="board" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Board</TabsTrigger>
            </TabsList>
          </Tabs>

          {view === "board" ? (
            <TaskBoard tasks={tasks as BoardTask[]} propMap={propMap} onChange={updateTask} />
          ) : (
            <>
              <Section title="Überfällig" icon={AlertOctagon} tone="destructive" tasks={overdue} onToggle={toggle} propMap={propMap} />
              <Section title="Bald fällig (30 Tage)" icon={CalendarClock} tone="default" tasks={soon} onToggle={toggle} propMap={propMap} />
              <Section title="Später" icon={ListChecks} tone="muted" tasks={later} onToggle={toggle} propMap={propMap} />
              <Section title="Erledigt" icon={CheckCircle2} tone="muted" tasks={done} onToggle={toggle} propMap={propMap} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, tone, tasks, onToggle, propMap }: any) {
  if (tasks.length === 0) return null;
  const color = tone === "destructive" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="space-y-2">
      <h2 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wider ${color}`}>
        <Icon className="h-4 w-4" /> {title} ({tasks.length})
      </h2>
      <div className="space-y-2">
        {tasks.map((t: Task) => (
          <Card key={t.id} className={`glass ${t.done ? "opacity-60" : ""}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <Checkbox checked={t.done} onCheckedChange={() => onToggle(t)} className="mt-1" />
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${t.done ? "line-through" : ""}`}>{t.title}</p>
                {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                  {t.due_date && <span>📅 {new Date(t.due_date).toLocaleDateString("de-DE")}</span>}
                  {t.property_id && propMap[t.property_id] && <span>🏠 {propMap[t.property_id]}</span>}
                  {t.legal_ref && (
                    t.legal_url
                      ? <a href={t.legal_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">{t.legal_ref}<ExternalLink className="h-3 w-3" /></a>
                      : <span>{t.legal_ref}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
