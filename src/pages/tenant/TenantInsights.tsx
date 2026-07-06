import { useEffect, useMemo, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, Cell, PieChart, Pie, RadialBar,
  RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Wallet, ShieldCheck, Flame, CalendarClock, Sparkles, Home, TrendingUp,
  FileText, Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Page, Stagger, Item, Counter } from "@/components/motion/Primitives";
import { eur, num, pct } from "@/lib/format";
import type { TenantCtx } from "./TenantLayout";

const C = {
  primary: "hsl(38 51% 52%)",
  glow: "hsl(42 70% 72%)",
  success: "hsl(142 60% 40%)",
  warn: "hsl(32 95% 50%)",
  muted: "hsl(0 0% 40%)",
  grid: "hsl(30 8% 88%)",
};

export default function TenantInsights() {
  const ctx = useOutletContext<TenantCtx>();
  const [payments, setPayments] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx.tenant) { setLoading(false); return; }
    (async () => {
      const [pay, dd, iss] = await Promise.all([
        supabase.from("payments").select("*").eq("tenant_id", ctx.tenant!.id).order("paid_on", { ascending: true }),
        supabase.from("tenant_documents").select("id, created_at, kind").eq("tenant_id", ctx.tenant!.id),
        supabase.from("tenant_issues").select("id, status, created_at").eq("tenant_id", ctx.tenant!.id),
      ]);
      setPayments(pay.data ?? []);
      setDocs(dd.data ?? []);
      setIssues(iss.data ?? []);
      setLoading(false);
    })();
  }, [ctx.tenant]);

  const rent = Number(ctx.unit?.rent_cold ?? 0) + Number(ctx.unit?.utilities ?? 0);

  const months = useMemo(() => {
    const now = new Date();
    const arr: { key: string; label: string; paid: number; due: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      arr.push({ key: k, label: d.toLocaleDateString("de-DE", { month: "short" }), paid: 0, due: rent });
    }
    const idx = new Map(arr.map((m, i) => [m.key, i]));
    for (const p of payments) {
      if (!p.paid_on) continue;
      const i = idx.get(p.paid_on.slice(0, 7));
      if (i != null) arr[i].paid += Number(p.amount ?? 0);
    }
    return arr;
  }, [payments, rent]);

  const totalPaid = months.reduce((s, m) => s + m.paid, 0);
  const totalDue = months.reduce((s, m) => s + m.due, 0);
  const reliability = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0;

  const monthsSinceStart = ctx.tenant?.lease_start
    ? Math.max(1, Math.floor((Date.now() - new Date(ctx.tenant.lease_start).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0;
  const lifetimePaid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const docCompleteness = Math.min(100, docs.length * 20); // 5 docs = 100 %
  const openIssues = issues.filter(i => i.status !== "closed" && i.status !== "resolved").length;

  const streak = useMemo(() => {
    let s = 0;
    for (let i = months.length - 1; i >= 0; i--) {
      if (months[i].paid >= months[i].due * 0.95) s++;
      else break;
    }
    return s;
  }, [months]);

  const donut = [
    { name: "Kaltmiete", value: Number(ctx.unit?.rent_cold ?? 0) },
    { name: "Nebenkosten", value: Number(ctx.unit?.utilities ?? 0) },
  ];
  const donutColors = [C.primary, C.glow];

  if (!ctx.tenant) {
    return (
      <Page className="max-w-3xl mx-auto space-y-4">
        <Card className="p-8 text-center space-y-3">
          <Sparkles className="h-8 w-8 mx-auto text-primary" />
          <h2 className="text-xl font-semibold">Verbinde dich mit deinem Vermieter</h2>
          <p className="text-sm text-muted-foreground">Sobald du verbunden bist, siehst du hier deine persönlichen Insights.</p>
          <Button asChild><Link to="/mein-immoniq/verbinden">Jetzt verbinden</Link></Button>
        </Card>
      </Page>
    );
  }

  return (
    <Page className="space-y-6">
      <Stagger className="space-y-6">
        {/* Hero */}
        <Item variant="up">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-foreground to-foreground/90 text-background p-6 md:p-8">
            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: "var(--gradient-hero)" }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary-glow" />
                <span className="text-xs uppercase tracking-[0.2em] text-primary-glow">Deine Insights</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
                Hi {ctx.tenant.full_name?.split(" ")[0] ?? "du"},<br />
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-gold)" }}>
                  du bist ein Vorbild-Mieter.
                </span>
              </h1>
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="rounded-xl bg-background/10 backdrop-blur p-3">
                  <p className="text-[10px] uppercase text-background/60">Zuverlässigkeit</p>
                  <p className="text-xl md:text-2xl font-bold tabular"><Counter value={reliability} suffix="%" /></p>
                </div>
                <div className="rounded-xl bg-background/10 backdrop-blur p-3">
                  <p className="text-[10px] uppercase text-background/60">Streak</p>
                  <p className="text-xl md:text-2xl font-bold tabular">{streak} <span className="text-xs font-normal">Mo.</span></p>
                </div>
                <div className="rounded-xl bg-background/10 backdrop-blur p-3">
                  <p className="text-[10px] uppercase text-background/60">Gezahlt gesamt</p>
                  <p className="text-xl md:text-2xl font-bold tabular">{eur(lifetimePaid)}</p>
                </div>
              </div>
            </div>
          </div>
        </Item>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { l: "Kaltmiete", v: eur(ctx.unit?.rent_cold ?? 0), i: Home },
            { l: "Nebenkosten", v: eur(ctx.unit?.utilities ?? 0), i: Wallet },
            { l: "Kaution", v: eur(ctx.tenant.deposit ?? 0), i: ShieldCheck },
            { l: "Mietdauer", v: `${monthsSinceStart} Mo.`, i: CalendarClock },
          ].map((k, i) => (
            <Item key={i} variant="scale">
              <Card className="p-4">
                <k.i className="h-4 w-4 text-primary mb-2" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</p>
                <p className="text-lg md:text-xl font-bold tabular mt-1">{k.v}</p>
              </Card>
            </Item>
          ))}
        </div>

        {/* Reliability + payment history */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Item variant="scale">
            <Card className="p-5 h-full">
              <h3 className="font-semibold mb-1">Zahlungs-Score</h3>
              <p className="text-xs text-muted-foreground">Letzte 12 Monate</p>
              <div className="h-52 relative">
                <ResponsiveContainer>
                  <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ value: reliability, fill: C.primary }]} startAngle={90} endAngle={-270}>
                    <RadialBar background={{ fill: "hsl(var(--muted))" } as any} dataKey="value" cornerRadius={20} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-4xl font-bold tabular"><Counter value={reliability} suffix="%" /></p>
                  <p className="text-xs text-muted-foreground mt-1">Reliability</p>
                </div>
              </div>
              {reliability >= 90 && (
                <Badge className="w-full justify-center bg-success/10 text-success border-success/30 mt-2">
                  <Award className="h-3 w-3 mr-1" /> Top-Mieter-Status
                </Badge>
              )}
            </Card>
          </Item>

          <div className="md:col-span-2">
            <Item variant="scale">
              <Card className="p-5 h-full">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">Zahlungs-Verlauf</h3>
                    <p className="text-xs text-muted-foreground">Ist vs. Soll pro Monat</p>
                  </div>
                  <Badge variant="outline">{num(months.filter(m => m.paid >= m.due * 0.95).length)}/12 pünktlich</Badge>
                </div>
                <div className="h-56">
                  <ResponsiveContainer>
                    <AreaChart data={months} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.primary} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.muted }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.muted }}
                        tickFormatter={v => `${(v / 100).toFixed(0)}00`} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                        formatter={(v: any, name: string) => [eur(Number(v)), name === "paid" ? "Gezahlt" : "Soll"]} />
                      <Area type="monotone" dataKey="due" stroke={C.muted} strokeDasharray="4 4" fill="transparent" />
                      <Area type="monotone" dataKey="paid" stroke={C.primary} strokeWidth={2} fill="url(#tg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Item>
          </div>
        </div>

        {/* Cost mix + completeness */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Item variant="scale">
            <Card className="p-5 h-full">
              <h3 className="font-semibold mb-1">Was du monatlich zahlst</h3>
              <p className="text-xs text-muted-foreground mb-4">Aufteilung deiner Warmmiete</p>
              <div className="h-52 relative">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donut} innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" stroke="hsl(var(--card))" strokeWidth={3}>
                      {donut.map((_, i) => <Cell key={i} fill={donutColors[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                      formatter={(v: any) => eur(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-bold tabular">{eur(rent)}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">Warm gesamt</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {donut.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: donutColors[i] }} />
                    <span className="flex-1">{d.name}</span>
                    <span className="tabular text-muted-foreground">{eur(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Item>

          <Item variant="scale">
            <Card className="p-5 h-full">
              <h3 className="font-semibold mb-1">Dossier-Vollständigkeit</h3>
              <p className="text-xs text-muted-foreground mb-4">Je vollständiger, desto besser deine Chance auf die nächste Wohnung.</p>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>Dokumente hochgeladen</span>
                    <span className="tabular font-semibold">{docCompleteness}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${docCompleteness}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full" style={{ background: "var(--gradient-gold)" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <FileText className="h-4 w-4 text-primary mb-1" />
                    <p className="text-xl font-bold tabular">{docs.length}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Dokumente</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <Flame className="h-4 w-4 text-warning mb-1" />
                    <p className="text-xl font-bold tabular">{openIssues}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">Offene Schäden</p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/mein-immoniq/dokumente">Dossier vervollständigen</Link>
                </Button>
              </div>
            </Card>
          </Item>
        </div>

        {/* Milestone strip */}
        <Item variant="up">
          <Card className="p-5 md:p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "var(--gradient-gold-soft)" }} />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Meilenstein</p>
                </div>
                <p className="text-lg md:text-xl font-semibold mt-1">
                  In {ctx.tenant.lease_start ? Math.max(0, 12 - (monthsSinceStart % 12)) : "—"} Monaten hast du dein nächstes Jubiläum.
                </p>
                <p className="text-sm text-muted-foreground">
                  Bisher gezahlt: <span className="font-semibold text-foreground tabular">{eur(lifetimePaid)}</span> · Streak: <span className="font-semibold text-foreground">{streak} Monate</span>
                </p>
              </div>
              <Button asChild><Link to="/mein-immoniq/tresor">Zum Tresor</Link></Button>
            </div>
          </Card>
        </Item>
      </Stagger>

      {loading && <p className="text-xs text-muted-foreground text-center">Lade…</p>}
    </Page>
  );
}
