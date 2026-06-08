import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { eur } from "@/lib/format";
import { recordActivity } from "@/lib/activity";
import { toast } from "sonner";
import {
  CheckCircle2, AlertTriangle, CalendarClock, Sparkles,
  ChevronLeft, ChevronRight, Wallet, ListChecks, Lightbulb,
} from "lucide-react";

type Tenant = { id: string; full_name: string; unit_id: string | null; property_id: string | null; lease_end: string | null };
type Unit = { id: string; rent_cold: number | null; utilities: number | null; property_id: string };
type Payment = { id: string; tenant_id: string | null; amount: number; paid_on: string; month: string | null; kind: string };
type Task = { id: string; title: string; due_date: string | null; done: boolean };

type FeedCard =
  | { kind: "rent_suggest"; id: string; tenant: Tenant; unit: Unit; amount: number; monthLabel: string; monthKey: string }
  | { kind: "rent_overdue"; id: string; tenant: Tenant; unit: Unit; amount: number; daysLate: number; monthKey: string }
  | { kind: "task"; id: string; task: Task }
  | { kind: "tip"; id: string; title: string; body: string }
  | { kind: "wins"; id: string; count: number };

const TIPS = [
  { title: "Wusstest du?", body: "Indexmieten kannst du 1× pro Jahr nach VPI-Index anpassen — ImmonIQ rechnet's dir aus." },
  { title: "Steuer-Tipp", body: "Belege fotografieren reicht — die KI erkennt Datum, Betrag & Kategorie automatisch." },
  { title: "NK-Reminder", body: "Du hast 12 Monate Zeit für die Nebenkostenabrechnung — danach kein Anspruch mehr (§ 556 BGB)." },
  { title: "Pro-Tipp", body: "Mahnung erst nach 5 Tagen Verzug — wahrt Beziehung & ist rechtlich sauber." },
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabelDe(d: Date) {
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export const TodayFeed = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bankingActive, setBankingActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [booking, setBooking] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    const [t, u, p, ts, bc] = await Promise.all([
      supabase.from("tenants").select("id, full_name, unit_id, property_id, lease_end"),
      supabase.from("units").select("id, rent_cold, utilities, property_id"),
      supabase.from("payments").select("id, tenant_id, amount, paid_on, month, kind").gte("paid_on", new Date(Date.now() - 95 * 86400000).toISOString().slice(0, 10)),
      supabase.from("tasks").select("id, title, due_date, done").eq("done", false).order("due_date", { ascending: true }).limit(5),
      supabase.from("bank_connections").select("id, status").eq("status", "active").limit(1),
    ]);
    setTenants((t.data as Tenant[]) ?? []);
    setUnits((u.data as Unit[]) ?? []);
    setPayments((p.data as Payment[]) ?? []);
    setTasks((ts.data as Task[]) ?? []);
    setBankingActive(((bc.data as any[]) ?? []).length > 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const cards = useMemo<FeedCard[]>(() => {
    if (!user) return [];
    const today = new Date();
    const curMonth = monthKey(today);
    const curMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonth = monthKey(prevMonthDate);

    const unitsById = new Map(units.map(u => [u.id, u]));
    const isRent = (k: string) => k === "rent_cold" || k === "utilities";
    const paidThisMonth = new Set(
      payments
        .filter(p => isRent(p.kind))
        .filter(p => p.month === curMonth || p.paid_on.startsWith(curMonth))
        .map(p => p.tenant_id)
        .filter(Boolean) as string[]
    );
    const paidPrevMonth = new Set(
      payments
        .filter(p => isRent(p.kind))
        .filter(p => p.month === prevMonth || p.paid_on.startsWith(prevMonth))
        .map(p => p.tenant_id)
        .filter(Boolean) as string[]
    );

    const activeTenants = tenants.filter(t => !t.lease_end || new Date(t.lease_end) >= today);
    const out: FeedCard[] = [];

    // 1) Überfällige Vormonatsmieten (rot, Top-Priorität)
    if (today.getDate() >= 5) {
      activeTenants.forEach(t => {
        if (!paidPrevMonth.has(t.id) && t.unit_id) {
          const unit = unitsById.get(t.unit_id);
          if (!unit) return;
          const amount = Number(unit.rent_cold ?? 0) + Number(unit.utilities ?? 0);
          if (amount <= 0) return;
          const daysLate = Math.floor((today.getTime() - new Date(today.getFullYear(), today.getMonth(), 1).getTime()) / 86400000);
          out.push({
            kind: "rent_overdue", id: `overdue-${t.id}-${prevMonth}`,
            tenant: t, unit, amount, daysLate, monthKey: prevMonth,
          });
        }
      });
    }

    // 2) Auto-Mietvorschläge laufender Monat — nur wenn KEIN Banking verbunden
    // (mit Banking läuft Auto-Match, manuelles Buchen wäre redundant)
    if (!bankingActive) {
      activeTenants.forEach(t => {
        if (paidThisMonth.has(t.id) || !t.unit_id) return;
        const unit = unitsById.get(t.unit_id);
        if (!unit) return;
        const amount = Number(unit.rent_cold ?? 0) + Number(unit.utilities ?? 0);
        if (amount <= 0) return;
        out.push({
          kind: "rent_suggest", id: `suggest-${t.id}-${curMonth}`,
          tenant: t, unit, amount,
          monthLabel: monthLabelDe(curMonthDate), monthKey: curMonth,
        });
      });
    }

    // 3) Heutige/überfällige Aufgaben
    const todayISO = today.toISOString().slice(0, 10);
    tasks.filter(x => x.due_date && x.due_date <= todayISO).slice(0, 3).forEach(x => {
      out.push({ kind: "task", id: `task-${x.id}`, task: x });
    });

    // 4) Tipp des Tages (deterministisch nach Tag)
    const tipIdx = today.getDate() % TIPS.length;
    out.push({ kind: "tip", id: `tip-${todayISO}`, ...TIPS[tipIdx] });

    // 5) Wins (kleines Wrap)
    const incomeThisMonth = payments
      .filter(p => p.paid_on.startsWith(curMonth))
      .reduce((s, p) => s + Number(p.amount), 0);
    if (incomeThisMonth > 0) {
      out.push({ kind: "wins", id: `wins-${curMonth}`, count: Math.round(incomeThisMonth) });
    }

    return out.filter(c => !dismissed.has(c.id));
  }, [tenants, units, payments, tasks, user, dismissed]);

  useEffect(() => { if (idx >= cards.length) setIdx(0); }, [cards.length, idx]);

  if (loading) return null;
  if (cards.length === 0) return null;

  const card = cards[idx];
  const dismiss = (id: string) => {
    setDismissed(s => new Set(s).add(id));
  };

  const bookRent = async (c: Extract<FeedCard, { kind: "rent_suggest" | "rent_overdue" }>) => {
    if (!user) return;
    setBooking(c.id);
    try {
      const { error } = await supabase.from("payments").insert({
        user_id: user.id,
        tenant_id: c.tenant.id,
        unit_id: c.unit.id,
        property_id: c.unit.property_id,
        amount: c.amount,
        paid_on: new Date().toISOString().slice(0, 10),
        month: c.monthKey,
        kind: "rent_cold" as any,
        type: "rent",
      });
      if (error) throw error;
      setConfetti(true);
      setTimeout(() => setConfetti(false), 1400);
      toast.success(`✓ ${eur(c.amount)} verbucht — ${c.tenant.full_name}`, {
        description: c.kind === "rent_overdue" ? `Vormonat nachgetragen (${c.monthKey})` : c.monthKey,
      });
      recordActivity("receipts_added", { amount: c.amount });
      dismiss(c.id);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Fehler beim Buchen");
    } finally {
      setBooking(null);
    }
  };

  const completeTask = async (id: string) => {
    await supabase.from("tasks").update({ done: true }).eq("id", id);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1000);
    toast.success("Erledigt 🎉");
    dismiss(`task-${id}`);
  };

  return (
    <div className="relative">
      {/* Confetti */}
      <AnimatePresence>
        {confetti && (
          <motion.div
            initial={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ x: "50%", y: "50%", opacity: 1, scale: 0 }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 120}%`,
                  y: `${20 + Math.random() * 80}%`,
                  rotate: Math.random() * 360,
                  scale: 1, opacity: 0,
                }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                className="absolute h-2 w-2 rounded-sm"
                style={{ background: ["hsl(var(--primary))", "hsl(var(--success))", "#f0d78c", "#ffffff"][i % 4] }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-bold text-lg">Dein Heute</h2>
          <span className="text-xs text-muted-foreground">— {cards.length} {cards.length === 1 ? "Karte" : "Karten"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIdx(i => (i - 1 + cards.length) % cards.length)} aria-label="Zurück">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular w-10 text-center">{idx + 1}/{cards.length}</span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIdx(i => (i + 1) % cards.length)} aria-label="Weiter">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative h-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, x: 30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) setIdx(i => (i + 1) % cards.length);
              else if (info.offset.x > 60) setIdx(i => (i - 1 + cards.length) % cards.length);
            }}
            className="absolute inset-0"
          >
            {card.kind === "rent_suggest" && (
              <Card className="h-full p-5 glass border-primary/30 flex flex-col">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-gradient-gold-soft border border-primary/15 flex items-center justify-center flex-shrink-0">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Miete fällig — {card.monthLabel}</p>
                    <p className="font-bold text-base mt-0.5 truncate">{card.tenant.full_name}</p>
                    <p className="text-2xl font-bold tabular text-gradient-gold mt-1">{eur(card.amount)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={() => bookRent(card)} disabled={booking === card.id} className="flex-1 bg-gradient-gold text-primary-foreground">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {booking === card.id ? "Buche…" : "Als gezahlt buchen"}
                  </Button>
                  <Button variant="ghost" onClick={() => dismiss(card.id)} className="px-3">Später</Button>
                </div>
              </Card>
            )}

            {card.kind === "rent_overdue" && (
              <Card className="h-full p-5 glass border-destructive/40 flex flex-col">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-destructive font-bold">Überfällig · {card.daysLate} Tage</p>
                    <p className="font-bold text-base mt-0.5 truncate">{card.tenant.full_name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Vormonat ({card.monthKey})</p>
                    <p className="text-xl font-bold tabular text-destructive mt-1">{eur(card.amount)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={() => bookRent(card)} disabled={booking === card.id} variant="outline" className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {booking === card.id ? "Buche…" : "Doch eingegangen"}
                  </Button>
                  <Button asChild variant="destructive" className="flex-1">
                    <Link to="/app/dunning">Mahnen</Link>
                  </Button>
                </div>
              </Card>
            )}

            {card.kind === "task" && (
              <Card className="h-full p-5 glass flex flex-col">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Aufgabe heute</p>
                    <p className="font-bold text-base mt-0.5 line-clamp-2">{card.task.title}</p>
                    {card.task.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">Fällig: {new Date(card.task.due_date).toLocaleDateString("de-DE")}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button onClick={() => completeTask(card.task.id)} className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-2" />Erledigt
                  </Button>
                  <Button asChild variant="ghost"><Link to="/app/tasks">Alle</Link></Button>
                </div>
              </Card>
            )}

            {card.kind === "tip" && (
              <Card className="h-full p-5 glass flex flex-col bg-gradient-gold-soft">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Tipp</p>
                    <p className="font-bold text-base mt-0.5">{card.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">{card.body}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button variant="ghost" size="sm" onClick={() => dismiss(card.id)}>Verstanden</Button>
                </div>
              </Card>
            )}

            {card.kind === "wins" && (
              <Card className="h-full p-5 bg-gradient-gold text-primary-foreground border-transparent shadow-gold flex flex-col justify-center">
                <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">Diesen Monat verbucht</p>
                <p className="text-4xl font-bold tabular mt-1">+{eur(card.count)}</p>
                <p className="text-sm opacity-90 mt-2">🔥 Weiter so — jede Buchung zählt für deine Steuer.</p>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-1 mt-3">
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setIdx(i)}
            aria-label={`Karte ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
};
