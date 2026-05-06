import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ShieldCheck, Trophy, Target, Home, Users, Receipt,
  FileCheck, Megaphone, Calculator, Flame, CheckCircle2, Lock,
} from "lucide-react";

type ScoreBreakdown = {
  score: number;
  completeness: number;
  activity: number;
  accounting: number;
  nka: number;
  streak_bonus: number;
};

type Achievement = {
  code: string; title: string; description: string;
  icon: string; tier: string; sort_order: number;
};

type Quest = {
  code: string; title: string; description: string;
  metric: string; target: number; reward_points: number;
};

const ICON_MAP: Record<string, any> = {
  trophy: Trophy, home: Home, users: Users, receipt: Receipt,
  "file-check": FileCheck, megaphone: Megaphone, calculator: Calculator,
  flame: Flame, "shield-check": ShieldCheck,
};

const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-700/30 to-amber-500/10 border-amber-600/30 text-amber-700",
  silber: "from-slate-400/30 to-slate-200/10 border-slate-400/30 text-slate-600",
  gold:   "from-amber-400/40 to-yellow-200/10 border-amber-400/40 text-amber-600",
  platin: "from-cyan-300/30 to-cyan-100/10 border-cyan-400/30 text-cyan-700",
};

export const GameDeck = () => {
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [defs, setDefs] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [quests, setQuests] = useState<Quest[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setLoading(false);

      // Trigger evaluation (cheap) then fetch all
      await supabase.rpc("evaluate_achievements");

      const [scoreRes, defsRes, uaRes, qRes, expRes, nkaRes, lstRes] = await Promise.all([
        supabase.rpc("calc_landlord_score", { _user_id: u.user.id }),
        supabase.from("achievements").select("*").order("sort_order"),
        supabase.from("user_achievements").select("code"),
        supabase.from("quests").select("*").eq("active", true).order("sort_order"),
        supabase.from("expenses").select("id,created_at,receipt_path")
          .eq("user_id", u.user.id)
          .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("nka_periods").select("id,status,updated_at").eq("user_id", u.user.id),
        supabase.from("listings").select("id,status,published_at").eq("user_id", u.user.id),
      ]);

      setScore(scoreRes.data as ScoreBreakdown);
      setDefs((defsRes.data || []) as Achievement[]);
      setUnlocked(new Set((uaRes.data || []).map((r: any) => r.code)));
      setQuests((qRes.data || []) as Quest[]);

      // Quest-Progress berechnen (rolling 30 Tage)
      const exp = expRes.data || [];
      const nka = nkaRes.data || [];
      const lst = lstRes.data || [];
      const weekAgo = Date.now() - 7 * 86400000;
      const monthAgo = Date.now() - 30 * 86400000;
      const p: Record<string, number> = {
        q_receipts_5: exp.filter((e: any) => e.receipt_path && new Date(e.created_at).getTime() > weekAgo).length,
        q_receipts_20: exp.filter((e: any) => e.receipt_path && new Date(e.created_at).getTime() > monthAgo).length,
        q_nka_done: nka.filter((n: any) => n.status === "done" && new Date(n.updated_at).getTime() > monthAgo).length,
        q_listing: lst.filter((l: any) => l.status === "published" && l.published_at && new Date(l.published_at).getTime() > monthAgo).length,
      };
      setProgress(p);
      setLoading(false);
    })();
  }, []);

  if (loading || !score) return null;

  const scoreColor =
    score.score >= 80 ? "text-emerald-500" :
    score.score >= 60 ? "text-primary" :
    score.score >= 40 ? "text-amber-500" : "text-muted-foreground";

  const scoreLabel =
    score.score >= 80 ? "Top-Vermieter" :
    score.score >= 60 ? "Solide" :
    score.score >= 40 ? "In Aufbau" : "Starte durch";

  const visibleQuests = quests
    .map(q => ({ ...q, p: progress[q.code] || 0 }))
    .filter(q => q.p < q.target)
    .slice(0, 2);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Vermieter-Score */}
      <Card className="p-5 glass relative overflow-hidden">
        <motion.div
          className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Vermieter-Score
            </p>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-end gap-3 mb-4">
            <span className={`text-5xl font-bold tabular-nums ${scoreColor}`}>
              {score.score}
            </span>
            <span className="text-sm text-muted-foreground mb-1.5">/ 100 · {scoreLabel}</span>
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Stammdaten",    val: score.completeness, max: 25 },
              { label: "Aktivität",     val: score.activity,     max: 25 },
              { label: "Buchhaltung",   val: score.accounting,   max: 25 },
              { label: "Abrechnungen",  val: score.nka,          max: 15 },
              { label: "Streak-Bonus",  val: score.streak_bonus, max: 10 },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-2 text-xs">
                <span className="w-28 text-muted-foreground">{b.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full bg-primary/70" style={{ width: `${(b.val / b.max) * 100}%` }} />
                </div>
                <span className="w-10 text-right tabular-nums text-muted-foreground">{b.val}/{b.max}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Quests */}
      <Card className="p-5 glass">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Aktive Missionen
          </p>
          <Target className="h-4 w-4 text-primary" />
        </div>
        {visibleQuests.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-medium">Alle Missionen erledigt</p>
            <p className="text-xs text-muted-foreground">Neue Aufgaben kommen bald.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleQuests.map(q => {
              const pct = Math.min(100, (q.p / q.target) * 100);
              return (
                <div key={q.code}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{q.title}</p>
                    <Badge variant="outline" className="text-[10px]">+{q.reward_points} P</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{q.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-10 text-right">
                      {q.p}/{q.target}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Achievements */}
      <Card className="p-5 glass lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Trophäen · {unlocked.size} / {defs.length}
          </p>
          <Trophy className="h-4 w-4 text-primary" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {defs.map(a => {
            const Icon = ICON_MAP[a.icon] || Trophy;
            const got = unlocked.has(a.code);
            const tier = TIER_COLORS[a.tier] || TIER_COLORS.bronze;
            return (
              <motion.div
                key={a.code}
                whileHover={got ? { y: -2 } : undefined}
                className={`p-3 rounded-xl border bg-gradient-to-br ${
                  got ? tier : "from-muted/40 to-transparent border-border/50 text-muted-foreground/60 grayscale"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-5 w-5" />
                  {got ? (
                    <CheckCircle2 className="h-3.5 w-3.5 opacity-60" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 opacity-40" />
                  )}
                </div>
                <p className="text-xs font-bold leading-tight mb-0.5">{a.title}</p>
                <p className="text-[10px] leading-tight opacity-75 line-clamp-2">{a.description}</p>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
