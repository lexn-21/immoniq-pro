import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarRange, TrendingUp, TrendingDown, Wallet, Receipt,
  ArrowUpRight, AlertTriangle, CheckCircle2, FileWarning, Landmark, ArrowRight,
} from "lucide-react";
import { eur, pct } from "@/lib/format";

type Row = { amount: number | string; paid_on?: string; spent_on?: string };

interface QuarterOverviewProps {
  payments: Row[];
  expenses: Row[];
  nkaDraft: number;
  nkaOpen: number;
}

/**
 * Vermieter-Cockpit — Move 5: Quartalsübersicht
 * Zeigt Q-Fortschritt, Kennzahlen (QTD + Δ Vorquartal), Status-Badge
 * und dynamische Handlungsempfehlungen (Steuer, NKA, offene Posten).
 */
export function QuarterOverview({ payments, expenses, nkaDraft, nkaOpen }: QuarterOverviewProps) {
  const now = new Date();
  const y = now.getFullYear();
  const qIdx = Math.floor(now.getMonth() / 3); // 0..3
  const qNum = qIdx + 1;
  const qStart = new Date(y, qIdx * 3, 1);
  const qEnd = new Date(y, qIdx * 3 + 3, 1);
  const prevStart = new Date(y, qIdx * 3 - 3, 1);
  const prevEnd = qStart;

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const inRange = (d?: string, a?: Date, b?: Date) =>
    d && a && b && d >= iso(a) && d < iso(b);

  const sum = (rows: Row[], key: "paid_on" | "spent_on", a: Date, b: Date) =>
    rows
      .filter((r) => inRange(r[key] as string | undefined, a, b))
      .reduce((s, r) => s + Number(r.amount || 0), 0);

  const incomeQ = sum(payments, "paid_on", qStart, qEnd);
  const expenseQ = sum(expenses, "spent_on", qStart, qEnd);
  const cashflowQ = incomeQ - expenseQ;

  const incomePrev = sum(payments, "paid_on", prevStart, prevEnd);
  const expensePrev = sum(expenses, "spent_on", prevStart, prevEnd);
  const cashflowPrev = incomePrev - expensePrev;

  const deltaCash = cashflowQ - cashflowPrev;
  const deltaPct = cashflowPrev !== 0 ? (deltaCash / Math.abs(cashflowPrev)) * 100 : null;

  const daysTotal = Math.round((qEnd.getTime() - qStart.getTime()) / 86400000);
  const daysElapsed = Math.min(daysTotal, Math.max(0, Math.round((now.getTime() - qStart.getTime()) / 86400000)));
  const daysLeft = Math.max(0, daysTotal - daysElapsed);
  const progress = (daysElapsed / daysTotal) * 100;

  // Status-Ampel
  const openIssues = (cashflowQ < 0 ? 1 : 0) + (nkaDraft > 0 ? 1 : 0) + (nkaOpen > 0 ? 1 : 0);
  const status: "gruen" | "gelb" | "rot" =
    cashflowQ < 0 && openIssues >= 2 ? "rot" : openIssues >= 1 ? "gelb" : "gruen";
  const statusMap = {
    gruen: { label: "Auf Kurs", tone: "bg-success/15 text-success border-success/30", Icon: CheckCircle2 },
    gelb: { label: "Handlungsbedarf", tone: "bg-warning/15 text-warning border-warning/30", Icon: AlertTriangle },
    rot: { label: "Kritisch", tone: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertTriangle },
  }[status];

  // Nächste Schritte (dynamisch)
  const steps: { id: string; label: string; to: string; icon: any; hint?: string }[] = [];
  if (nkaDraft > 0) {
    steps.push({
      id: "nka",
      label: `${nkaDraft} Nebenkostenabrechnung${nkaDraft === 1 ? "" : "en"} im Entwurf`,
      hint: "Fertigstellen und an Mieter senden",
      to: "/app/nebenkosten",
      icon: FileWarning,
    });
  }
  if (nkaOpen > 0) {
    steps.push({
      id: "nka-open",
      label: `${nkaOpen} offene NK-Nachzahlung${nkaOpen === 1 ? "" : "en"}`,
      hint: "Zahlungseingang prüfen oder mahnen",
      to: "/app/payments",
      icon: Receipt,
    });
  }
  if (daysLeft <= 14 && daysLeft > 0) {
    steps.push({
      id: "ust",
      label: `Quartalsende in ${daysLeft} Tag${daysLeft === 1 ? "" : "en"}`,
      hint: "USt-Voranmeldung & Steuerberater-Export vorbereiten",
      to: "/app/tax-bridge",
      icon: Landmark,
    });
  }
  if (cashflowQ < 0) {
    steps.push({
      id: "cashflow",
      label: "Cashflow im Quartal negativ",
      hint: "Ausgaben prüfen oder Refinanzierung anschauen",
      to: "/app/expenses",
      icon: TrendingDown,
    });
  }
  if (steps.length === 0) {
    steps.push({
      id: "insights",
      label: "Alles im Lot — Zeit für Insights",
      hint: "Trends & Benchmarks für dein Portfolio ansehen",
      to: "/app/insights",
      icon: TrendingUp,
    });
  }

  const StatusIcon = statusMap.Icon;

  return (
    <Card className="p-5 lg:p-6 glass overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            <CalendarRange className="h-3.5 w-3.5 text-primary" />
            Quartalsübersicht
          </div>
          <h2 className="text-xl lg:text-2xl font-bold mt-1 tracking-tight">
            Q{qNum} {y}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              · Tag {daysElapsed} von {daysTotal} · noch {daysLeft} Tage
            </span>
          </h2>
        </div>
        <Badge variant="outline" className={`gap-1.5 ${statusMap.tone}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {statusMap.label}
        </Badge>
      </div>

      {/* Fortschrittsbalken Quartal */}
      <div className="mb-6">
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-gold"
          />
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
        <QMetric
          label="Einnahmen QTD"
          value={eur(incomeQ)}
          delta={incomePrev > 0 ? ((incomeQ - incomePrev) / incomePrev) * 100 : null}
          icon={Wallet}
          tone="success"
        />
        <QMetric
          label="Ausgaben QTD"
          value={eur(expenseQ)}
          delta={expensePrev > 0 ? ((expenseQ - expensePrev) / expensePrev) * 100 : null}
          icon={Receipt}
          tone="default"
          invertDelta
        />
        <QMetric
          label="Cashflow QTD"
          value={eur(cashflowQ)}
          delta={deltaPct}
          icon={cashflowQ >= 0 ? TrendingUp : TrendingDown}
          tone={cashflowQ >= 0 ? "success" : "warning"}
        />
      </div>

      {/* Nächste Schritte */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2.5">
          Nächste Schritte
        </div>
        <div className="space-y-2">
          {steps.map((s) => (
            <Link
              key={s.id}
              to={s.to}
              className="group flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{s.label}</p>
                {s.hint && <p className="text-xs text-muted-foreground truncate">{s.hint}</p>}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Quick-Actions */}
      <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border/40">
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to="/app/tax-bridge"><Landmark className="h-3.5 w-3.5" /> Steuer-Export</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to="/app/payments"><Wallet className="h-3.5 w-3.5" /> Alle Zahlungen</Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="gap-1.5 ml-auto">
          <Link to="/app/insights">Details <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </div>
    </Card>
  );
}

function QMetric({
  label, value, delta, icon: Icon, tone, invertDelta,
}: {
  label: string;
  value: string;
  delta: number | null;
  icon: any;
  tone: "success" | "warning" | "default";
  invertDelta?: boolean;
}) {
  const toneColor =
    tone === "success" ? "text-success bg-success/10"
      : tone === "warning" ? "text-warning bg-warning/10"
        : "text-primary bg-primary/10";

  const deltaSign = delta === null ? null : delta >= 0 ? "+" : "";
  // Bei Ausgaben ist "mehr" schlecht → Farbe invertieren
  const deltaGood = delta === null ? null : invertDelta ? delta <= 0 : delta >= 0;
  const deltaColor = deltaGood === null ? "text-muted-foreground"
    : deltaGood ? "text-success" : "text-destructive";

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`h-6 w-6 rounded-md flex items-center justify-center ${toneColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{label}</p>
      </div>
      <p className="text-lg lg:text-xl font-bold tracking-tight tabular truncate">{value}</p>
      {delta !== null && (
        <p className={`text-[11px] mt-0.5 ${deltaColor} flex items-center gap-0.5`}>
          {deltaSign}{pct(delta, 1)} vs. Vorquartal
        </p>
      )}
    </div>
  );
}

export default QuarterOverview;
