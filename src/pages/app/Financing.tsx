import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Page, Stagger, Item } from "@/components/motion/Primitives";
import { LeitzinsWidget } from "@/components/LeitzinsWidget";
import EmptyState from "@/components/EmptyState";
import { eur, pct, date as fdate } from "@/lib/format";
import { toast } from "sonner";
import { Banknote, Plus, Pencil, Trash2, AlertTriangle, TrendingDown, Clock, Sparkles, Mail, Info, Building2, RefreshCw } from "lucide-react";
import { HouseFill } from "@/components/calc/HouseFill";

type Financing = {
  id: string;
  property_id: string | null;
  bank_name: string;
  loan_amount: number;
  interest_rate: number;
  amortization_rate: number | null;
  fixed_until: string | null;
  start_date: string;
  monthly_rate: number | null;
  current_balance: number | null;
  special_repayment_allowed: number | null;
  notes: string | null;
};

type Property = { id: string; name: string };

const EMPTY: Partial<Financing> = {
  bank_name: "",
  loan_amount: 0,
  interest_rate: 3.5,
  amortization_rate: 2,
  start_date: new Date().toISOString().slice(0, 10),
  special_repayment_allowed: 5,
};

// Vereinfachte Annuitäten-Restschuld
function residualBalance(principal: number, ratePct: number, amortPct: number, monthsElapsed: number) {
  const r = ratePct / 100 / 12;
  const annuityYear = principal * (ratePct + amortPct) / 100;
  const monthly = annuityYear / 12;
  if (r === 0) return Math.max(0, principal - monthly * monthsElapsed);
  let bal = principal;
  for (let i = 0; i < monthsElapsed; i++) {
    const interest = bal * r;
    const repay = monthly - interest;
    bal = Math.max(0, bal - repay);
    if (bal === 0) break;
  }
  return bal;
}

function monthsBetween(from: string, to: Date) {
  const f = new Date(from);
  return Math.max(0, (to.getFullYear() - f.getFullYear()) * 12 + (to.getMonth() - f.getMonth()));
}

// Marktzins Heuristik: EZB-Leitzins + 1.5 % Bank-Marge
const ASSUMED_SPREAD = 1.5;

export default function Financing() {
  const [items, setItems] = useState<Financing[]>([]);
  const [props, setProps] = useState<Property[]>([]);
  const [marketRate, setMarketRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Financing>>(EMPTY);

  useEffect(() => {
    document.title = "Finanzierung · ImmonIQ";
    load();
    fetchEcb();
  }, []);

  const fetchEcb = async () => {
    try {
      const res = await fetch("https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.4F.KR.MRR_FR.LEV?format=jsondata&lastNObservations=1");
      const j = await res.json();
      const obs = j?.dataSets?.[0]?.series?.["0:0:0:0:0:0:0"]?.observations ?? {};
      const keys = Object.keys(obs);
      if (keys.length) {
        const v = obs[String(Math.max(...keys.map(Number)))][0] as number;
        setMarketRate(v + ASSUMED_SPREAD);
      }
    } catch { /* ignore */ }
  };

  const load = async () => {
    setLoading(true);
    const [f, p] = await Promise.all([
      supabase.from("financings").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("id,name"),
    ]);
    setItems((f.data as Financing[]) ?? []);
    setProps((p.data as Property[]) ?? []);
    setLoading(false);
  };

  const save = async () => {
    if (!edit.bank_name?.trim()) return toast.error("Bank-Name fehlt");
    if (!edit.loan_amount || edit.loan_amount <= 0) return toast.error("Darlehenssumme fehlt");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: any = {
      user_id: user.id,
      bank_name: edit.bank_name.trim(),
      loan_amount: Number(edit.loan_amount),
      interest_rate: Number(edit.interest_rate ?? 0),
      amortization_rate: Number(edit.amortization_rate ?? 2),
      start_date: edit.start_date,
      fixed_until: edit.fixed_until || null,
      monthly_rate: edit.monthly_rate ? Number(edit.monthly_rate) : null,
      current_balance: edit.current_balance ? Number(edit.current_balance) : null,
      special_repayment_allowed: Number(edit.special_repayment_allowed ?? 0),
      notes: edit.notes || null,
      property_id: edit.property_id || null,
    };
    const res = edit.id
      ? await supabase.from("financings").update(payload).eq("id", edit.id)
      : await supabase.from("financings").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(edit.id ? "Finanzierung aktualisiert" : "Finanzierung gespeichert");
    setOpen(false); setEdit(EMPTY); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Finanzierung löschen?")) return;
    const { error } = await supabase.from("financings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gelöscht"); load();
  };

  const totals = useMemo(() => {
    if (!items.length) return null;
    const total = items.reduce((s, f) => s + Number(f.loan_amount ?? 0), 0);
    const balances = items.reduce((s, f) => {
      const b = f.current_balance ?? residualBalance(
        Number(f.loan_amount),
        Number(f.interest_rate),
        Number(f.amortization_rate ?? 2),
        monthsBetween(f.start_date, new Date())
      );
      return s + b;
    }, 0);
    const monthly = items.reduce((s, f) => s + Number(f.monthly_rate ?? ((Number(f.loan_amount) * (Number(f.interest_rate) + Number(f.amortization_rate ?? 2))) / 100 / 12)), 0);
    return { total, balances, monthly, repaid: total - balances };
  }, [items]);

  const refinanceCandidates = useMemo(() => {
    if (!marketRate) return [];
    return items.filter(f => Number(f.interest_rate) - marketRate >= 0.5);
  }, [items, marketRate]);

  const mailtoBank = (f: Financing) => {
    const subj = encodeURIComponent(`Anfrage Anschlussfinanzierung · Darlehen ${f.bank_name}`);
    const body = encodeURIComponent(
      `Sehr geehrte Damen und Herren,\n\nfür mein bestehendes Darlehen bei der ${f.bank_name} (Darlehenssumme: ${eur(Number(f.loan_amount))}, aktueller Zinssatz: ${pct(Number(f.interest_rate))}) prüfe ich aktuell Konditionen für die Anschluss- bzw. Umfinanzierung.\n\nBitte senden Sie mir ein unverbindliches Angebot zu folgenden Konditionen:\n- Zinsbindung: 10/15 Jahre\n- Tilgung: ${pct(Number(f.amortization_rate ?? 2))}\n- Sondertilgung: bis 5 % p. a.\n\nVielen Dank vorab.\n\nMit freundlichen Grüßen`
    );
    window.location.href = `mailto:?subject=${subj}&body=${body}`;
  };

  return (
    <Page>
      <Stagger className="space-y-6">
        <Item>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary mb-2">
                <Banknote className="h-3 w-3" /> Finanzierungs-Cockpit
              </span>
              <h1 className="font-display text-4xl font-bold tracking-tight">Kredite, Restschuld & Anschluss</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Behalte Restschuld, Zinsbindung und Marktzins im Blick. Wir melden, wenn sich Umfinanzieren lohnt.
              </p>
            </div>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit(EMPTY); }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-gold text-primary-foreground shadow-gold">
                  <Plus className="h-4 w-4 mr-2" /> Finanzierung anlegen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{edit.id ? "Finanzierung bearbeiten" : "Finanzierung anlegen"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Bank *</Label>
                      <Input value={edit.bank_name ?? ""} onChange={(e) => setEdit({ ...edit, bank_name: e.target.value })} placeholder="z. B. Sparkasse" />
                    </div>
                    {props.length > 0 && (
                      <div className="col-span-2">
                        <Label className="text-xs">Objekt</Label>
                        <Select value={edit.property_id ?? ""} onValueChange={(v) => setEdit({ ...edit, property_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Optional zuordnen" /></SelectTrigger>
                          <SelectContent>
                            {props.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Darlehenssumme (€) *</Label>
                      <Input type="number" value={edit.loan_amount ?? ""} onChange={(e) => setEdit({ ...edit, loan_amount: +e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Aktuelle Restschuld (€)</Label>
                      <Input type="number" placeholder="auto-berechnet" value={edit.current_balance ?? ""} onChange={(e) => setEdit({ ...edit, current_balance: +e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Zinssatz (%) *</Label>
                      <Input type="number" step="0.01" value={edit.interest_rate ?? ""} onChange={(e) => setEdit({ ...edit, interest_rate: +e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Tilgung (% p. a.)</Label>
                      <Input type="number" step="0.1" value={edit.amortization_rate ?? ""} onChange={(e) => setEdit({ ...edit, amortization_rate: +e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Beginn *</Label>
                      <Input type="date" value={edit.start_date ?? ""} onChange={(e) => setEdit({ ...edit, start_date: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Zinsbindung bis</Label>
                      <Input type="date" value={edit.fixed_until ?? ""} onChange={(e) => setEdit({ ...edit, fixed_until: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Monatliche Rate (€)</Label>
                      <Input type="number" placeholder="auto" value={edit.monthly_rate ?? ""} onChange={(e) => setEdit({ ...edit, monthly_rate: +e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Sondertilgung (% p. a.)</Label>
                      <Input type="number" step="1" value={edit.special_repayment_allowed ?? ""} onChange={(e) => setEdit({ ...edit, special_repayment_allowed: +e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Notizen</Label>
                      <Textarea rows={2} value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={save} className="w-full bg-gradient-gold text-primary-foreground">Speichern</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Item>

        {/* Leitzins + Marktzins */}
        <div className="grid md:grid-cols-2 gap-4">
          <Item><LeitzinsWidget /></Item>
          <Item>
            <Card className="p-5 glass h-full">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Geschätzter Bauzins (10 J.)
              </p>
              <p className="text-3xl font-bold tabular mt-1.5">
                {marketRate ? `${marketRate.toFixed(2)} %` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                EZB-Leitzins + {ASSUMED_SPREAD.toFixed(1)} % Bank-Marge (Richtwert). Tatsächliche Konditionen variieren nach Bonität & Beleihung.
              </p>
            </Card>
          </Item>
        </div>

        {/* KPI Summen */}
        {totals && (
          <Item>
            <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Darlehen gesamt" value={eur(totals.total)} />
                <Stat label="Restschuld heute" value={eur(totals.balances)} accent="warning" />
                <Stat label="Bereits getilgt" value={eur(totals.repaid)} accent="success" />
                <Stat label="Rate pro Monat" value={eur(totals.monthly)} />
              </div>
            </Card>
          </Item>
        )}

        {/* Refinanzierungs-Alert */}
        {refinanceCandidates.length > 0 && marketRate && (
          <Item>
            <Card className="p-5 border-success/40 bg-success/5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Umfinanzierung könnte sich lohnen</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {refinanceCandidates.length} Darlehen liegt {refinanceCandidates.length === 1 ? "" : "liegen"} mindestens 0,5 % über dem aktuellen Marktzins ({marketRate.toFixed(2)} %). Ein Vergleichs­angebot kostet nichts.
                  </p>
                </div>
              </div>
            </Card>
          </Item>
        )}

        {/* Liste */}
        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">Lade …</Card>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Noch keine Finanzierung erfasst"
            description="Lege dein Darlehen an — wir berechnen Restschuld, melden Zinsbindungs-Ende und checken, wann Umfinanzieren sich lohnt."
            action={{ label: "Finanzierung anlegen", onClick: () => setOpen(true), icon: Plus }}
          />
        ) : (
          <div className="space-y-4">
            {items.map(f => {
              const months = monthsBetween(f.start_date, new Date());
              const auto = residualBalance(Number(f.loan_amount), Number(f.interest_rate), Number(f.amortization_rate ?? 2), months);
              const balance = f.current_balance ?? auto;
              const progress = Math.min(100, ((Number(f.loan_amount) - balance) / Number(f.loan_amount)) * 100);
              const propName = props.find(p => p.id === f.property_id)?.name;
              const fixedDaysLeft = f.fixed_until ? Math.ceil((new Date(f.fixed_until).getTime() - Date.now()) / 86400000) : null;
              const monthsToFixed = fixedDaysLeft !== null ? Math.round(fixedDaysLeft / 30) : null;
              const fixedSoon = monthsToFixed !== null && monthsToFixed > 0 && monthsToFixed <= 18;
              const canRefinance = marketRate && Number(f.interest_rate) - marketRate >= 0.5;
              const savings = canRefinance ? (Number(f.interest_rate) - marketRate!) / 100 * balance : 0;

              return (
                <Card key={f.id} className="p-5 glass space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{f.bank_name}</h3>
                        {propName && (
                          <Badge variant="secondary" className="font-normal text-[10px]">
                            <Building2 className="h-3 w-3 mr-1" />{propName}
                          </Badge>
                        )}
                        {canRefinance && (
                          <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                            <Sparkles className="h-3 w-3 mr-1" /> Umfinanzieren prüfen
                          </Badge>
                        )}
                        {fixedSoon && (
                          <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" /> Zinsbindung in {monthsToFixed} Mo.
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        seit {fdate(f.start_date)} · {pct(Number(f.interest_rate))} fest{f.fixed_until ? ` bis ${fdate(f.fixed_until)}` : ""} · {pct(Number(f.amortization_rate ?? 2))} Tilgung
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEdit(f); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(f.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniStat label="Darlehen" value={eur(Number(f.loan_amount))} />
                    <MiniStat label="Restschuld" value={eur(balance)} accent="warning" />
                    <MiniStat label="Getilgt" value={`${progress.toFixed(1)} %`} accent="success" />
                    <MiniStat label="Monatsrate" value={eur(Number(f.monthly_rate ?? ((Number(f.loan_amount) * (Number(f.interest_rate) + Number(f.amortization_rate ?? 2))) / 100 / 12)))} />
                  </div>

                  {/* Tilgungs-Progress */}
                  <div className="space-y-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-success to-primary" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Start {fdate(f.start_date)}</span>
                      <span>Heute</span>
                    </div>
                  </div>

                  {canRefinance && (
                    <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <TrendingDown className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">
                            Mögliche Ersparnis: <span className="text-success">~{eur(savings)} pro Jahr</span> bei Wechsel auf {marketRate!.toFixed(2)} %.
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Achtung: Vorfälligkeitsentschädigung beachten. Nach 10 J. Bindung freies Kündigungsrecht (§ 489 BGB).
                          </p>
                          <Button size="sm" variant="outline" className="mt-2 h-8" onClick={() => mailtoBank(f)}>
                            <Mail className="h-3 w-3 mr-1.5" /> Anfrage an Bank vorbereiten
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {f.notes && (
                    <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">{f.notes}</p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Methodik */}
        <Item>
          <Card className="p-6 border-border/60">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Begriffe in einer Minute
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold">Sondertilgung</p>
                <p className="text-xs text-muted-foreground mt-1">Außerplanmäßige Rückzahlung — meist 5 % p. a. erlaubt. Verkürzt Laufzeit & Zinslast.</p>
              </div>
              <div>
                <p className="font-semibold">Forward-Darlehen</p>
                <p className="text-xs text-muted-foreground mt-1">Anschlusszinsen schon heute sichern, frühestens 5,5 J. vor Ablauf der Bindung.</p>
              </div>
              <div>
                <p className="font-semibold">§ 489 BGB</p>
                <p className="text-xs text-muted-foreground mt-1">Nach 10 Jahren Zinsbindung darfst du jederzeit mit 6 Monaten Frist kündigen — ohne Vorfälligkeit.</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4 pt-4 border-t border-border/60">
              Diese Übersicht ersetzt keine Bank- oder Honorarberatung. ImmonIQ ist nicht zur Finanzberatung zugelassen.
            </p>
          </Card>
        </Item>
      </Stagger>
    </Page>
  );
}

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`font-display text-2xl font-bold mt-1 tabular ${accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : ""}`}>{value}</p>
  </div>
);

const MiniStat = ({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" }) => (
  <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-sm font-bold tabular mt-0.5 ${accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : ""}`}>{value}</p>
  </div>
);
