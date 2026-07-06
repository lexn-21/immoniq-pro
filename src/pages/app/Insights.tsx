import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, RadialBar, RadialBarChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Receipt, Building2, PiggyBank,
  Sparkles, ArrowUpRight, Percent, CalendarClock, ShieldCheck, Flame, Trophy,
  Download, Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Page, Stagger, Item, Counter } from "@/components/motion/Primitives";
import { eur, num, pct } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────
// Design tokens for charts (HSL from index.css)
// ─────────────────────────────────────────────────────────────────
const C = {
  primary: "hsl(38 51% 52%)",
  primaryGlow: "hsl(42 70% 72%)",
  success: "hsl(142 60% 40%)",
  warning: "hsl(32 95% 50%)",
  info: "hsl(210 80% 55%)",
  danger: "hsl(0 70% 50%)",
  muted: "hsl(0 0% 40%)",
  grid: "hsl(30 8% 88%)",
};
const CAT_COLORS = [
  C.primary, C.info, C.success, C.warning, C.danger,
  "hsl(280 60% 55%)", "hsl(180 55% 45%)", "hsl(20 80% 55%)",
];

// ─────────────────────────────────────────────────────────────────
// Reusable pieces
// ─────────────────────────────────────────────────────────────────
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const shortMonth = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("de-DE", { month: "short" });
};

function ChartCard({
  title, subtitle, icon: Icon, children, action, tone = "default",
}: {
  title: string; subtitle?: string; icon?: any; children: React.ReactNode;
  action?: React.ReactNode; tone?: "default" | "gold" | "dark";
}) {
  return (
    <Item variant="scale">
      <Card
        className={`p-5 md:p-6 overflow-hidden relative h-full border-border/60 ${
          tone === "gold"
            ? "bg-gradient-to-br from-primary/[0.08] via-card to-card"
            : tone === "dark"
            ? "bg-gradient-to-br from-foreground/[0.96] to-foreground text-background"
            : "glass"
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  tone === "dark" ? "bg-primary/20" : "bg-primary/10"
                }`}>
                  <Icon className={`h-4 w-4 ${tone === "dark" ? "text-primary-glow" : "text-primary"}`} />
                </div>
              )}
              <h3 className={`font-semibold tracking-tight text-base md:text-lg ${
                tone === "dark" ? "text-background" : ""
              }`}>{title}</h3>
            </div>
            {subtitle && (
              <p className={`text-xs mt-1 ${
                tone === "dark" ? "text-background/60" : "text-muted-foreground"
              }`}>{subtitle}</p>
            )}
          </div>
          {action}
        </div>
        {children}
      </Card>
    </Item>
  );
}

function KpiTile({
  label, value, delta, hint, icon: Icon, gradient,
}: {
  label: string; value: string; delta?: number; hint?: string;
  icon: any; gradient?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Item variant="scale">
      <Card className="p-5 relative overflow-hidden group h-full border-border/60">
        <div
          className="absolute inset-0 opacity-70 pointer-events-none"
          style={{ background: gradient ?? "var(--gradient-gold-soft)" }}
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="h-9 w-9 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center shadow-sm">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            {typeof delta === "number" && (
              <Badge variant="outline" className={`bg-background/70 backdrop-blur border-border/60 ${
                up ? "text-success" : "text-destructive"
              }`}>
                {up ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {pct(Math.abs(delta), 1)}
              </Badge>
            )}
          </div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl md:text-3xl font-bold mt-1 tracking-tight tabular">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
      </Card>
    </Item>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
export default function Insights() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [range, setRange] = useState<12 | 24>(12);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [p, pay, exp, ten] = await Promise.all([
        supabase.from("properties").select("*"),
        supabase.from("payments").select("*").order("paid_on", { ascending: true }),
        supabase.from("expenses").select("*").order("spent_on", { ascending: true }),
        supabase.from("tenants").select("*"),
      ]);
      setProperties(p.data ?? []);
      setPayments(pay.data ?? []);
      setExpenses(exp.data ?? []);
      setTenants(ten.data ?? []);
      setLoading(false);
    })();
  }, [user]);

  // Derive months
  const monthly = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; income: number; expense: number; net: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: shortMonth(monthKey(d)), income: 0, expense: 0, net: 0 });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const p of payments) {
      if (!p.paid_on) continue;
      const k = p.paid_on.slice(0, 7);
      const i = idx.get(k);
      if (i != null) months[i].income += Number(p.amount ?? 0);
    }
    for (const e of expenses) {
      if (!e.spent_on) continue;
      const k = e.spent_on.slice(0, 7);
      const i = idx.get(k);
      if (i != null) months[i].expense += Number(e.amount ?? 0);
    }
    months.forEach(m => (m.net = m.income - m.expense));
    return months;
  }, [payments, expenses, range]);

  const totals = useMemo(() => {
    const income = monthly.reduce((s, m) => s + m.income, 0);
    const expense = monthly.reduce((s, m) => s + m.expense, 0);
    const net = income - expense;
    const half = Math.floor(monthly.length / 2);
    const netA = monthly.slice(0, half).reduce((s, m) => s + m.net, 0);
    const netB = monthly.slice(half).reduce((s, m) => s + m.net, 0);
    const delta = netA === 0 ? 0 : ((netB - netA) / Math.abs(netA)) * 100;
    return { income, expense, net, delta };
  }, [monthly]);

  const totalArea = properties.reduce((s, p) => s + Number(p.area_sqm ?? 0), 0);
  const purchaseSum = properties.reduce((s, p) => s + Number(p.purchase_price ?? 0), 0);
  const yearIncome = totals.income;
  const grossYield = purchaseSum > 0 ? (yearIncome / purchaseSum) * 100 : 0;
  const netYield = purchaseSum > 0 ? (totals.net / purchaseSum) * 100 : 0;

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const cat = (e.category ?? "sonstige").toString();
      map.set(cat, (map.get(cat) ?? 0) + Number(e.amount ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [expenses]);

  const perProperty = useMemo(() => {
    return properties.map(prop => {
      const inc = payments.filter(p => p.property_id === prop.id).reduce((s, p) => s + Number(p.amount ?? 0), 0);
      const exp = expenses.filter(e => e.property_id === prop.id).reduce((s, e) => s + Number(e.amount ?? 0), 0);
      const price = Number(prop.purchase_price ?? 0);
      const yieldPct = price > 0 ? ((inc - exp) / price) * 100 : 0;
      return {
        id: prop.id,
        name: prop.name || `${prop.street ?? "Objekt"}${prop.city ? `, ${prop.city}` : ""}`,
        income: inc,
        expense: exp,
        net: inc - exp,
        yield: yieldPct,
      };
    }).sort((a, b) => b.net - a.net);
  }, [properties, payments, expenses]);

  // Payment reliability across last 12 months (income / expected)
  const reliability = useMemo(() => {
    const expected = properties.reduce((s, p) => s + Number(p.cold_rent ?? 0), 0) * range;
    if (expected <= 0) return { value: 0, expected: 0 };
    const value = Math.min(100, Math.round((yearIncome / expected) * 100));
    return { value, expected };
  }, [properties, yearIncome, range]);

  // Tax preview: Werbungskosten + AfA
  const taxPreview = useMemo(() => {
    const afa = properties.reduce((s, p) => {
      const price = Number(p.purchase_price ?? 0);
      const rate = Number(p.afa_rate ?? 2);
      return s + (price * rate) / 100;
    }, 0);
    const werbungskosten = totals.expense;
    const einkuenfte = totals.income - werbungskosten - afa;
    const steuervorteil = Math.max(0, -einkuenfte) * 0.42; // grobe Schätzung
    return { afa, werbungskosten, einkuenfte, steuervorteil };
  }, [properties, totals]);

  const bestMonth = monthly.reduce((a, b) => (b.net > a.net ? b : a), monthly[0] ?? { label: "—", net: 0 });
  const worstMonth = monthly.reduce((a, b) => (b.net < a.net ? b : a), monthly[0] ?? { label: "—", net: 0 });

  return (
    <Page className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* ── HERO ───────────────────────────────────────────── */}
      <Stagger className="space-y-6">
        <Item variant="up">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-foreground via-foreground to-foreground/95 text-background p-6 md:p-10 shadow-2xl">
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{ background: "var(--gradient-hero)" }}
            />
            <div
              className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-30 pointer-events-none"
              style={{ background: "var(--gradient-gold)" }}
            />
            <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-primary-glow" />
                  <span className="text-xs uppercase tracking-[0.2em] text-primary-glow font-medium">
                    Portfolio Insights
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                  Dein Portfolio,<br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: "var(--gradient-gold)" }}
                  >auf einen Blick.</span>
                </h1>
                <p className="text-background/70 mt-3 max-w-lg text-sm md:text-base">
                  Cashflow, Rendite, Steuer-Impact und Mieter-Reliability — live aus deinen Daten.
                </p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <p className="text-xs uppercase tracking-widest text-background/50">Netto-Cashflow · {range}M</p>
                <p className="text-4xl md:text-6xl font-bold tabular tracking-tight">
                  <Counter value={Math.round(totals.net)} suffix=" €" />
                </p>
                <div className="flex items-center gap-2 text-sm">
                  {totals.delta >= 0 ? (
                    <Badge className="bg-success/20 text-success border-success/30">
                      <TrendingUp className="h-3 w-3 mr-1" /> {pct(Math.abs(totals.delta), 1)} ggü. Vorperiode
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/20 text-destructive-foreground border-destructive/30">
                      <TrendingDown className="h-3 w-3 mr-1" /> {pct(Math.abs(totals.delta), 1)} ggü. Vorperiode
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  {[12, 24].map(r => (
                    <button
                      key={r}
                      onClick={() => setRange(r as 12 | 24)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        range === r
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "bg-background/10 text-background/70 hover:bg-background/20"
                      }`}
                    >{r}M</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Item>

        {/* ── KPI-Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KpiTile
            label="Einnahmen"
            value={eur(totals.income)}
            hint={`${num(payments.length)} Buchungen`}
            icon={Wallet}
            gradient="linear-gradient(135deg, hsl(142 60% 50% / 0.15), transparent)"
          />
          <KpiTile
            label="Ausgaben"
            value={eur(totals.expense)}
            hint={`${num(expenses.length)} Belege`}
            icon={Receipt}
            gradient="linear-gradient(135deg, hsl(0 70% 50% / 0.10), transparent)"
          />
          <KpiTile
            label="Brutto-Rendite"
            value={pct(grossYield, 2)}
            hint={`Kaufwert ${eur(purchaseSum)}`}
            icon={Percent}
          />
          <KpiTile
            label="Netto-Rendite"
            value={pct(netYield, 2)}
            hint={`${num(totalArea)} m² gesamt`}
            icon={PiggyBank}
            gradient="var(--gradient-gold-soft)"
          />
        </div>

        {/* ── Cashflow ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ChartCard
              title="Cashflow-Verlauf"
              subtitle="Monatliche Einnahmen vs. Ausgaben + Netto-Kurve"
              icon={TrendingUp}
              tone="gold"
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.success} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={C.success} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.danger} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={C.danger} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.muted }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.muted }}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        boxShadow: "var(--shadow-elevated)",
                      }}
                      formatter={(v: any, name: string) => [eur(Number(v)), name]}
                    />
                    <Area type="monotone" dataKey="income" name="Einnahmen" stroke={C.success} fill="url(#gIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" name="Ausgaben" stroke={C.danger} fill="url(#gExpense)" strokeWidth={2} />
                    <Line type="monotone" dataKey="net" name="Netto" stroke={C.primary} strokeWidth={3} dot={{ r: 3, fill: C.primary }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-success" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bester Monat</p>
                    <p className="font-semibold truncate">{bestMonth?.label} · {eur(bestMonth?.net ?? 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Flame className="h-4 w-4 text-warning" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Schwächster Monat</p>
                    <p className="font-semibold truncate">{worstMonth?.label} · {eur(worstMonth?.net ?? 0)}</p>
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Reliability Radial */}
          <ChartCard
            title="Zahlungs-Reliability"
            subtitle="Tatsächliche vs. erwartete Kaltmiete"
            icon={ShieldCheck}
          >
            <div className="h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: "reliability", value: reliability.value, fill: C.primary }]} startAngle={90} endAngle={-270}>
                  <RadialBar background={{ fill: "hsl(var(--muted))" } as any} dataKey="value" cornerRadius={20} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-4xl font-bold tabular tracking-tight">
                  <Counter value={reliability.value} suffix="%" />
                </p>
                <p className="text-xs text-muted-foreground mt-1">Deckungsgrad</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-center">
              <div className="rounded-lg bg-muted/50 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">Erwartet</p>
                <p className="text-sm font-semibold tabular">{eur(reliability.expected)}</p>
              </div>
              <div className="rounded-lg bg-success/10 py-2">
                <p className="text-[10px] uppercase text-success">Erhalten</p>
                <p className="text-sm font-semibold tabular text-success">{eur(totals.income)}</p>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* ── Expense donut + Objects bar ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <ChartCard title="Ausgaben nach Kategorie" subtitle="Wohin fließt dein Geld?" icon={Receipt}>
              {expenseByCategory.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  Noch keine Ausgaben erfasst.
                </div>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="hsl(var(--card))"
                          strokeWidth={3}
                        >
                          {expenseByCategory.map((_, i) => (
                            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 12,
                          }}
                          formatter={(v: any) => eur(Number(v))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-3">
                    {expenseByCategory.slice(0, 5).map((c, i) => {
                      const total = expenseByCategory.reduce((s, x) => s + x.value, 0);
                      const share = total > 0 ? (c.value / total) * 100 : 0;
                      return (
                        <div key={c.name} className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                          <span className="text-sm capitalize flex-1 truncate">{c.name}</span>
                          <span className="text-xs text-muted-foreground tabular">{pct(share, 0)}</span>
                          <span className="text-sm font-medium tabular w-20 text-right">{eur(c.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </ChartCard>
          </div>

          <div className="lg:col-span-3">
            <ChartCard
              title="Performance nach Objekt"
              subtitle="Netto-Cashflow und Rendite pro Immobilie"
              icon={Building2}
              action={
                <Button asChild variant="ghost" size="sm" className="text-xs">
                  <Link to="/app/properties">Alle Objekte <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              }
            >
              {perProperty.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  Noch keine Objekte angelegt.
                  <Button asChild size="sm"><Link to="/app/properties">Erstes Objekt anlegen</Link></Button>
                </div>
              ) : (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={perProperty} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <defs>
                          <linearGradient id="gBar" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={C.primaryGlow} />
                            <stop offset="100%" stopColor={C.primary} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.muted }}
                          tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false}
                          tick={{ fontSize: 11, fill: C.muted }} width={140} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 12,
                          }}
                          formatter={(v: any) => eur(Number(v))}
                        />
                        <Bar dataKey="net" name="Netto" fill="url(#gBar)" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-3 pt-3 border-t border-border/50 max-h-40 overflow-auto pr-2">
                    {perProperty.slice(0, 4).map(p => (
                      <Link key={p.id} to={`/app/properties/${p.id}`}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Rendite {pct(p.yield, 2)}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold tabular ${p.net >= 0 ? "text-success" : "text-destructive"}`}>
                            {eur(p.net)}
                          </p>
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary inline-block" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </ChartCard>
          </div>
        </div>

        {/* ── Tax preview ──────────────────────────────────── */}
        <ChartCard
          title="Steuer-Impact Vorschau"
          subtitle="AfA + Werbungskosten — grobe Schätzung, kein Ersatz für Steuerberater"
          icon={CalendarClock}
          tone="dark"
          action={
            <Button asChild variant="secondary" size="sm">
              <Link to="/app/tax"><Download className="h-3 w-3 mr-1.5" /> Export</Link>
            </Button>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-background/5 backdrop-blur p-4 border border-background/10">
              <p className="text-[10px] uppercase tracking-wider text-background/50">Werbungskosten</p>
              <p className="text-xl md:text-2xl font-bold mt-1 tabular">{eur(taxPreview.werbungskosten)}</p>
            </div>
            <div className="rounded-2xl bg-background/5 backdrop-blur p-4 border border-background/10">
              <p className="text-[10px] uppercase tracking-wider text-background/50">AfA (linear)</p>
              <p className="text-xl md:text-2xl font-bold mt-1 tabular">{eur(taxPreview.afa)}</p>
            </div>
            <div className="rounded-2xl bg-background/5 backdrop-blur p-4 border border-background/10">
              <p className="text-[10px] uppercase tracking-wider text-background/50">Einkünfte V+V</p>
              <p className={`text-xl md:text-2xl font-bold mt-1 tabular ${
                taxPreview.einkuenfte >= 0 ? "text-background" : "text-primary-glow"
              }`}>{eur(taxPreview.einkuenfte)}</p>
            </div>
            <div className="rounded-2xl p-4 border border-primary/30"
              style={{ background: "var(--gradient-gold-soft)" }}>
              <p className="text-[10px] uppercase tracking-wider text-primary-glow">Est. Steuervorteil</p>
              <p className="text-xl md:text-2xl font-bold mt-1 tabular text-primary-glow">
                {eur(taxPreview.steuervorteil)}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-background/40 mt-4">
            Basis: {num(properties.length)} Objekte · Ø-AfA-Satz aus Objektdaten · Grenzsteuersatz-Annahme 42 %.
          </p>
        </ChartCard>

        {/* Footer stats bar */}
        <Item variant="up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center pt-2">
            {[
              { label: "Objekte", value: num(properties.length), icon: Building2 },
              { label: "Mieter aktiv", value: num(tenants.length), icon: ShieldCheck },
              { label: "Fläche", value: `${num(totalArea)} m²`, icon: Sparkles },
              { label: "Ø Netto / Monat", value: eur(totals.net / Math.max(1, monthly.length)), icon: TrendingUp },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-border/50 p-4 bg-card">
                <s.icon className="h-4 w-4 mx-auto text-primary mb-2" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="font-bold tabular mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </Item>
      </Stagger>

      {loading && (
        <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-card border rounded-full px-3 py-1.5 shadow">
          Lade Insights…
        </div>
      )}
    </Page>
  );
}
