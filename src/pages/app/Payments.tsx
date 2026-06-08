import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, Building2, TrendingUp, Calendar, Repeat, CheckCircle2, Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { eur, date } from "@/lib/format";
import { z } from "zod";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { cn } from "@/lib/utils";

const schema = z.object({
  property_id: z.string().uuid("Bitte Objekt wählen"),
  tenant_id: z.string().uuid().optional().or(z.literal("")),
  paid_on: z.string().min(1, "Datum fehlt"),
  amount: z.number().min(0.01, "Betrag fehlt").max(999999),
  kind: z.enum(["rent_cold", "utilities", "deposit", "other"]),
  note: z.string().max(300).optional().or(z.literal("")),
});

const KIND_LABEL: Record<string, string> = {
  rent_cold: "Kaltmiete", utilities: "Nebenkosten", deposit: "Kaution", other: "Sonstige",
};
const KIND_EMOJI: Record<string, string> = {
  rent_cold: "🏠", utilities: "💡", deposit: "🔒", other: "💶",
};

type Filter = "month" | "year" | "all";

const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM
const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
};

const PAGE_SIZE = 50;

const Payments = () => {
  const [items, setItems] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("month");
  const [propFilter, setPropFilter] = useState<string>("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [form, setForm] = useState({
    property_id: "",
    tenant_id: "",
    paid_on: new Date().toISOString().slice(0, 10),
    amount: "",
    kind: "rent_cold",
    note: "",
  });
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { document.title = "Einnahmen · ImmonIQ"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const [p, pr, te] = await Promise.all([
      supabase.from("payments").select("*, properties(name), tenants(full_name)").order("paid_on", { ascending: false }),
      supabase.from("properties").select("id, name").order("name"),
      supabase.from("tenants").select("id, full_name, property_id").order("full_name"),
    ]);
    setItems(p.data ?? []);
    setProperties(pr.data ?? []);
    setTenants(te.data ?? []);
    setLoading(false);
  };

  // Mieter gefiltert nach gewähltem Objekt
  const tenantsForProperty = useMemo(
    () => tenants.filter(t => t.property_id === form.property_id),
    [tenants, form.property_id]
  );

  // Auto-select property if only one exists, when opening dialog
  useEffect(() => {
    if (open && properties.length === 1 && !form.property_id) {
      setForm(f => ({ ...f, property_id: properties[0].id }));
    }
  }, [open, properties]); // eslint-disable-line

  // Auto-select tenant if only one is linked to selected property
  useEffect(() => {
    if (!form.property_id) return;
    if (tenantsForProperty.length === 1 && !form.tenant_id) {
      setForm(f => ({ ...f, tenant_id: tenantsForProperty[0].id }));
    } else if (tenantsForProperty.length === 0 && form.tenant_id) {
      setForm(f => ({ ...f, tenant_id: "" }));
    }
  }, [form.property_id, tenantsForProperty]); // eslint-disable-line

  // Quick fill: Letzte Zahlung (Kaltmiete) für gewähltes Objekt
  const lastForProperty = useMemo(() => {
    if (!form.property_id) return null;
    return items.find(i => i.property_id === form.property_id && i.kind === "rent_cold") ?? null;
  }, [items, form.property_id]);

  const submit = async () => {
    const parsed = schema.safeParse({
      property_id: form.property_id,
      tenant_id: form.tenant_id,
      paid_on: form.paid_on,
      amount: Number(form.amount),
      kind: form.kind as any,
      note: form.note,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: unitId, error: uErr } = await supabase.rpc("ensure_default_unit", { _property_id: parsed.data.property_id });
    if (uErr) return toast.error(uErr.message);
    const payload: any = { ...parsed.data, user_id: user.id, unit_id: unitId };
    if (!payload.note) delete payload.note;
    if (!payload.tenant_id) delete payload.tenant_id;
    const { data: ins, error } = await supabase.from("payments").insert(payload).select("id").single();
    if (error) return toastError(error, { onRetry: submit });

    const propName = properties.find(p => p.id === parsed.data.property_id)?.name ?? "Objekt";
    const tName = tenants.find(t => t.id === parsed.data.tenant_id)?.full_name;
    toast.success(`✓ ${eur(parsed.data.amount)} verbucht`, {
      description: `${KIND_LABEL[parsed.data.kind]} · ${propName}${tName ? ` · ${tName}` : ""} · ${date(parsed.data.paid_on)}`,
    });

    // Highlight & scroll
    if (ins?.id) {
      setHighlightId(ins.id);
      setTimeout(() => {
        rowRefs.current[ins.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
      setTimeout(() => setHighlightId(null), 3500);
    }
    // Auto-set filter so user actually sees the new entry
    const m = parsed.data.paid_on.slice(0, 7);
    const now = new Date().toISOString().slice(0, 7);
    if (m !== now) setFilter("year");

    setOpen(false);
    setForm({
      property_id: properties.length === 1 ? properties[0].id : "",
      tenant_id: "",
      paid_on: new Date().toISOString().slice(0, 10),
      amount: "", kind: "rent_cold", note: "",
    });
    load();
  };

  // Filtering
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (propFilter !== "all" && i.property_id !== propFilter) return false;
      if (filter === "month" && i.paid_on < monthStart) return false;
      if (filter === "year" && i.paid_on < yearStart) return false;
      return true;
    });
  }, [items, filter, propFilter, monthStart, yearStart]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter, propFilter]);
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const sumThisMonth = useMemo(
    () => items.filter(i => i.paid_on >= monthStart).reduce((s, p) => s + Number(p.amount), 0),
    [items, monthStart]
  );
  const sumThisYear = useMemo(
    () => items.filter(i => i.paid_on >= yearStart).reduce((s, p) => s + Number(p.amount), 0),
    [items, yearStart]
  );
  const sumFiltered = useMemo(
    () => filtered.reduce((s, p) => s + Number(p.amount), 0),
    [filtered]
  );

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of visible) {
      const k = monthKey(it.paid_on);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  const fillFromLast = () => {
    if (!lastForProperty) return;
    setForm(f => ({ ...f, amount: String(lastForProperty.amount), kind: lastForProperty.kind }));
    toast.success("Letzte Werte übernommen");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Einnahmen</h1>
          <p className="text-muted-foreground text-sm mt-1">Mieteingänge erfassen — direkt im Steuerbericht & Dashboard sichtbar.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="lg"
            disabled={items.length === 0}
            onClick={() => downloadCsv(
              `einnahmen-${new Date().toISOString().slice(0,10)}`,
              items.map((p: any) => ({
                Datum: p.paid_on,
                Betrag_EUR: Number(p.amount ?? 0).toFixed(2),
                Art: KIND_LABEL[p.kind] ?? p.kind,
                Objekt: p.properties?.name ?? "",
                Mieter: p.tenants?.full_name ?? "",
                Notiz: p.note ?? "",
              })),
            )}
          >
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold flex-1 sm:flex-none" disabled={properties.length === 0}>
                <Plus className="h-5 w-5 mr-2" /> Einnahme erfassen
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Einnahme erfassen</DialogTitle>
              <p className="text-xs text-muted-foreground">In 10 Sekunden gebucht. Pflichtfelder mit *.</p>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Objekt *</Label>
                {properties.length === 1 ? (
                  <div className="mt-1 px-3 py-2.5 rounded-md border bg-muted/30 text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{properties[0].name}</span>
                  </div>
                ) : (
                  <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Objekt wählen…" /></SelectTrigger>
                    <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>

              {form.property_id && tenantsForProperty.length > 0 && (
                <div>
                  <Label className="text-xs">Mieter {tenantsForProperty.length > 1 ? "*" : ""}</Label>
                  {tenantsForProperty.length === 1 ? (
                    <div className="mt-1 px-3 py-2.5 rounded-md border bg-muted/30 text-sm flex items-center justify-between">
                      <span className="font-medium">{tenantsForProperty[0].full_name}</span>
                      <span className="text-[10px] text-muted-foreground">automatisch zugeordnet</span>
                    </div>
                  ) : (
                    <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Mieter wählen…" /></SelectTrigger>
                      <SelectContent>
                        {tenantsForProperty.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {lastForProperty && !form.amount && (
                <button
                  type="button"
                  onClick={fillFromLast}
                  className="w-full text-left p-3 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition flex items-center gap-3"
                >
                  <Repeat className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-medium">Wie letzte Buchung übernehmen?</p>
                    <p className="text-muted-foreground truncate">
                      {eur(Number(lastForProperty.amount))} · {KIND_LABEL[lastForProperty.kind]} · {date(lastForProperty.paid_on)}
                    </p>
                  </div>
                </button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Betrag (€) *</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="z.B. 850"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="mt-1 text-lg font-semibold"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Datum *</Label>
                  <Input type="date" value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Art</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent_cold">🏠 Kaltmiete</SelectItem>
                    <SelectItem value="utilities">💡 Nebenkosten</SelectItem>
                    <SelectItem value="deposit">🔒 Kaution</SelectItem>
                    <SelectItem value="other">💶 Sonstige</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Notiz (optional)</Label>
                <Input placeholder="z.B. Mai 2026" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Buchen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* KPI-Karten */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="p-4 glass">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Diesen Monat</div>
            <p className="text-2xl font-bold mt-1 text-success tabular">{eur(sumThisMonth)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{items.filter(i => i.paid_on >= monthStart).length} Buchungen</p>
          </Card>
          <Card className="p-4 glass">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Dieses Jahr</div>
            <p className="text-2xl font-bold mt-1 tabular">{eur(sumThisYear)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{items.filter(i => i.paid_on >= yearStart).length} Buchungen</p>
          </Card>
          <Card className="p-4 glass col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Gesamt</div>
            <p className="text-2xl font-bold mt-1 tabular text-gradient-gold">{eur(items.reduce((s, p) => s + Number(p.amount), 0))}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{items.length} Buchungen insgesamt</p>
          </Card>
        </div>
      )}

      {/* Filter */}
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            {(["month", "year", "all"] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition",
                  filter === f ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "month" ? "Dieser Monat" : f === "year" ? "Dieses Jahr" : "Alle"}
              </button>
            ))}
          </div>
          {properties.length > 1 && (
            <Select value={propFilter} onValueChange={setPropFilter}>
              <SelectTrigger className="h-8 text-xs w-auto min-w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Objekte</SelectItem>
                {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            Auswahl: <span className="font-semibold text-foreground tabular">{eur(sumFiltered)}</span>
          </span>
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Erstmal ein Objekt anlegen"
          description="Einnahmen werden Objekten zugeordnet. Lege zuerst deine Immobilie an, dann kannst du hier Mieten erfassen."
          action={{ label: "Objekt anlegen", to: "/app/properties", icon: Plus }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Noch keine Einnahmen erfasst"
          description="Erfasse Mieteingänge, Nebenkosten und Kautionen — automatisch im Dashboard und Steuerbericht."
          action={{ label: "Erste Einnahme erfassen", onClick: () => setOpen(true), icon: Plus }}
        />
      ) : filtered.length === 0 ? (
        <Card className="p-8 glass text-center">
          <p className="text-sm text-muted-foreground">In diesem Zeitraum keine Einnahmen.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFilter("all")}>Alle anzeigen</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, rows]) => {
            const monthSum = rows.reduce((s, p) => s + Number(p.amount), 0);
            return (
              <Card key={key} className="glass overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide">{monthLabel(key)}</p>
                  <p className="text-sm font-bold text-success tabular">+{eur(monthSum)}</p>
                </div>
                <div className="divide-y divide-border">
                  {rows.map(p => (
                    <div
                      key={p.id}
                      ref={el => { rowRefs.current[p.id] = el; }}
                      className={cn(
                        "px-4 py-3 flex items-center gap-3 transition-all duration-700",
                        highlightId === p.id && "bg-success/10 ring-2 ring-success/40"
                      )}
                    >
                      <div className="text-2xl flex-shrink-0">{KIND_EMOJI[p.kind]}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {p.properties?.name ?? "—"}
                          {highlightId === p.id && <span className="ml-2 text-[10px] uppercase tracking-wide text-success font-bold">Neu</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {date(p.paid_on)} · {KIND_LABEL[p.kind]}
                          {p.tenants?.full_name ? ` · 👤 ${p.tenants.full_name}` : ""}
                          {p.note ? ` · ${p.note}` : ""}
                        </p>
                      </div>
                      <p className="font-semibold text-success whitespace-nowrap tabular">+{eur(p.amount)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
          {filtered.length > visibleCount && (
            <div className="text-center pt-2">
              <Button variant="outline" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                Mehr anzeigen ({filtered.length - visibleCount} weitere)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Payments;
