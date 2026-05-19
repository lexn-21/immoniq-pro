import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Wallet, CheckCircle2, Flame, ChevronRight, X } from "lucide-react";
import { eur } from "@/lib/format";

type Stat = {
  income: number;
  expenses: number;
  payments: number;
  doneTasks: number;
  newTenants: number;
  newDocs: number;
};

const startOfWeek = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Mo=0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
};

export function WeeklyWrapWidget() {
  const [stats, setStats] = useState<Stat | null>(null);
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const dismissed = useMemo(() => {
    if (typeof window === "undefined") return true;
    const wk = `${new Date().getFullYear()}-${Math.ceil(((+new Date() - +new Date(new Date().getFullYear(), 0, 1)) / 86400000 + 1) / 7)}`;
    return localStorage.getItem(`wrap_dismissed_${wk}`) === "1";
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const since = startOfWeek().toISOString();
      const [pay, exp, tsk, ten, doc] = await Promise.all([
        supabase.from("payments").select("amount").eq("user_id", user.id).gte("created_at", since),
        supabase.from("expenses").select("amount").eq("user_id", user.id).gte("created_at", since),
        supabase.from("tasks").select("id").eq("user_id", user.id).eq("done", true).gte("updated_at", since),
        supabase.from("tenants").select("id").eq("user_id", user.id).gte("created_at", since),
        supabase.from("vault_documents").select("id").eq("user_id", user.id).gte("created_at", since),
      ]);
      const sum = (rows: any[] | null, k: string) =>
        (rows ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);
      setStats({
        income: sum(pay.data, "amount"),
        expenses: sum(exp.data, "amount"),
        payments: pay.data?.length ?? 0,
        doneTasks: tsk.data?.length ?? 0,
        newTenants: ten.data?.length ?? 0,
        newDocs: doc.data?.length ?? 0,
      });
    })();
  }, []);

  if (!stats || dismissed) return null;
  const total = stats.income + stats.expenses + stats.doneTasks + stats.newTenants + stats.newDocs;
  if (total === 0) return null;

  const net = stats.income - stats.expenses;

  const slides = [
    {
      key: "intro",
      bg: "from-primary/30 via-primary/10 to-background",
      icon: Sparkles,
      title: "Deine Woche bei ImmonIQ",
      sub: "Spotify-Wrapped, aber für deine Immos",
      big: new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long" }),
    },
    {
      key: "cash",
      bg: "from-success/30 via-success/10 to-background",
      icon: Wallet,
      title: "Cash-Flow diese Woche",
      sub: `${stats.payments} Mieten gebucht`,
      big: eur(net),
      note: net >= 0 ? "Plus auf dem Konto 💰" : "Mehr Ausgaben als Einnahmen",
    },
    {
      key: "done",
      bg: "from-warning/25 via-warning/5 to-background",
      icon: CheckCircle2,
      title: "Aufgaben erledigt",
      sub: "Du bist im Flow",
      big: String(stats.doneTasks),
      note: stats.doneTasks > 5 ? "🔥 Maschine!" : "Weiter so",
    },
    {
      key: "growth",
      bg: "from-accent/30 via-accent/10 to-background",
      icon: TrendingUp,
      title: "Neu im Portfolio",
      sub: `${stats.newDocs} Dokumente · ${stats.newTenants} Mieter`,
      big: String(stats.newDocs + stats.newTenants),
    },
    {
      key: "outro",
      bg: "from-primary/40 via-primary/15 to-background",
      icon: Flame,
      title: "Streak weiter ausbauen",
      sub: "Komm morgen wieder vorbei",
      big: "🚀",
    },
  ];

  const dismiss = () => {
    const wk = `${new Date().getFullYear()}-${Math.ceil(((+new Date() - +new Date(new Date().getFullYear(), 0, 1)) / 86400000 + 1) / 7)}`;
    localStorage.setItem(`wrap_dismissed_${wk}`, "1");
    setOpen(false);
  };

  return (
    <>
      <Card
        className="p-5 glass relative overflow-hidden cursor-pointer interactive-card group"
        onClick={() => { setOpen(true); setSlide(0); }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-gold shadow-gold flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Wochen-Wrap</p>
            <p className="font-bold text-lg leading-tight mt-0.5">Deine Woche in 30 Sek.</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {eur(net)} Cashflow · {stats.doneTasks} erledigt · {stats.newDocs} Docs
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </Card>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={dismiss}
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>

            {/* progress dots */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1.5">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${i === slide ? "w-8 bg-white" : "w-4 bg-white/30"}`}
                />
              ))}
            </div>

            <motion.div
              key={slide}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className={`relative w-full max-w-sm aspect-[9/16] rounded-3xl bg-gradient-to-br ${slides[slide].bg} border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center p-8`}
              onClick={(e) => {
                e.stopPropagation();
                if (slide < slides.length - 1) setSlide(slide + 1);
                else dismiss();
              }}
            >
              {(() => {
                const S = slides[slide];
                const Icon = S.icon;
                return (
                  <>
                    <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-6">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">{S.title}</p>
                    <motion.p
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15, type: "spring", damping: 14 }}
                      className="text-6xl font-black text-white my-6 tracking-tight tabular"
                    >
                      {S.big}
                    </motion.p>
                    <p className="text-sm text-white/80">{S.sub}</p>
                    {"note" in S && S.note && (
                      <p className="mt-3 text-xs text-white/60 italic">{(S as any).note}</p>
                    )}
                    <p className="absolute bottom-6 text-[10px] text-white/40 uppercase tracking-wider">
                      Tippen für weiter
                    </p>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
