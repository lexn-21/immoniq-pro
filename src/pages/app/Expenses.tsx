import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Paperclip, Info, AlertTriangle, Calendar, TrendingDown, Wallet, CheckCircle2, Building2, ScanLine, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { eur, date } from "@/lib/format";
import { z } from "zod";
import EmptyState from "@/components/EmptyState";
import { recordActivity } from "@/lib/activity";
import { ListSkeleton } from "@/components/ListSkeleton";
import { cn } from "@/lib/utils";
import { DocScanner } from "@/components/DocScanner";

const schema = z.object({
  property_id: z.string().uuid().optional().or(z.literal("")),
  tenant_id: z.string().uuid().optional().or(z.literal("")),
  spent_on: z.string().min(1),
  amount: z.number().min(0.01).max(9999999),
  vendor: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category: z.enum(["immediate", "depreciable", "utilities_passthrough", "financing", "other"]),
});

const PAGE_SIZE = 50;

const CAT_INFO: Record<string, { label: string; hint: string; emoji: string }> = {
  immediate: { label: "Sofort abzugsfähig", hint: "Erhaltungsaufwand · § 9 EStG · voll im Jahr absetzbar", emoji: "🔧" },
  depreciable: { label: "AfA-fähig", hint: "Anschaffung/Herstellung · § 7 EStG · über AfA verteilt", emoji: "🏗️" },
  utilities_passthrough: { label: "NK-umlagefähig", hint: "Auf Mieter umlegbar · BetrKV", emoji: "💡" },
  financing: { label: "Finanzierung", hint: "Zinsen · Werbungskosten · sofort absetzbar", emoji: "🏦" },
  other: { label: "Sonstige", hint: "Manuell prüfen", emoji: "📎" },
};

type Filter = "month" | "year" | "all";
const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
};

const Expenses = () => {
  const [items, setItems] = useState<any[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("month");
  const [propFilter, setPropFilter] = useState<string>("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [form, setForm] = useState({
    property_id: "",
    tenant_id: "",
    spent_on: new Date().toISOString().slice(0, 10),
    amount: "", vendor: "", description: "", category: "immediate",
  });
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { document.title = "Ausgaben · ImmonIQ"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const [e, p, t] = await Promise.all([
      supabase.from("expenses").select("*, properties(name), tenants(full_name)").order("spent_on", { ascending: false }),
      supabase.from("properties").select("id, name, purchase_price, purchase_date"),
      supabase.from("tenants").select("id, full_name, property_id").order("full_name"),
    ]);
    setItems(e.data ?? []);
    setProps(p.data ?? []);
    setTenants(t.data ?? []);
    setLoading(false);
  };

  const tenantsForProperty = useMemo(
    () => tenants.filter(t => t.property_id === form.property_id),
    [tenants, form.property_id]
  );

  // Auto-select if only one property
  useEffect(() => {
    if (open && props.length === 1 && !form.property_id) {
      setForm(f => ({ ...f, property_id: props[0].id }));
    }
  }, [open, props]); // eslint-disable-line

  // Auto-select tenant if only one for the property
  useEffect(() => {
    if (!form.property_id) return;
    if (tenantsForProperty.length === 1 && !form.tenant_id) {
      setForm(f => ({ ...f, tenant_id: tenantsForProperty[0].id }));
    } else if (tenantsForProperty.length === 0 && form.tenant_id) {
      setForm(f => ({ ...f, tenant_id: "" }));
    }
  }, [form.property_id, tenantsForProperty]); // eslint-disable-line

  const submit = async () => {
    const parsed = schema.safeParse({
      property_id: form.property_id,
      tenant_id: form.tenant_id,
      spent_on: form.spent_on,
      amount: Number(form.amount),
      vendor: form.vendor,
      description: form.description,
      category: form.category as any,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let receipt_path: string | undefined;
    if (file) {
      if (file.size > 10 * 1024 * 1024) return toast.error("Datei zu groß (max 10 MB).");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (upErr) return toast.error("Upload fehlgeschlagen: " + upErr.message);
      receipt_path = path;
    }

    const payload: any = { ...parsed.data, user_id: user.id, receipt_path };
    if (!payload.property_id) delete payload.property_id;
    if (!payload.tenant_id) delete payload.tenant_id;
    if (!payload.vendor) delete payload.vendor;
    if (!payload.description) delete payload.description;

    const { data: ins, error } = await supabase.from("expenses").insert(payload).select("id").single();
    if (error) return toastError(error, { onRetry: submit });

    const propName = props.find(p => p.id === parsed.data.property_id)?.name;
    const tName = tenants.find(t => t.id === parsed.data.tenant_id)?.full_name;
    toast.success(`✓ ${eur(parsed.data.amount)} verbucht`, {
      description: `${CAT_INFO[parsed.data.category].label}${propName ? ` · ${propName}` : ""}${tName ? ` · 👤 ${tName}` : ""} · ${date(parsed.data.spent_on)}`,
    });
    recordActivity("receipts_added");

    if (ins?.id) {
      setHighlightId(ins.id);
      setTimeout(() => rowRefs.current[ins.id]?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
      setTimeout(() => setHighlightId(null), 3500);
    }
    const m = parsed.data.spent_on.slice(0, 7);
    const now = new Date().toISOString().slice(0, 7);
    if (m !== now) setFilter("year");

    setOpen(false);
    setFile(null);
    setForm({
      property_id: props.length === 1 ? props[0].id : "",
      tenant_id: "",
      spent_on: new Date().toISOString().slice(0, 10),
      amount: "", vendor: "", description: "", category: "immediate",
    });
    load();
  };

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const filtered = useMemo(() => items.filter(i => {
    if (propFilter !== "all" && i.property_id !== propFilter) return false;
    if (filter === "month" && i.spent_on < monthStart) return false;
    if (filter === "year" && i.spent_on < yearStart) return false;
    return true;
  }), [items, filter, propFilter, monthStart, yearStart]);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter, propFilter]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const sumThisMonth = useMemo(() => items.filter(i => i.spent_on >= monthStart).reduce((s, e) => s + Number(e.amount), 0), [items, monthStart]);
  const sumThisYear = useMemo(() => items.filter(i => i.spent_on >= yearStart).reduce((s, e) => s + Number(e.amount), 0), [items, yearStart]);
  const sumFiltered = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount), 0), [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of visible) {
      const k = monthKey(it.spent_on);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [visible]);

  // §6(1)1a EStG warning
  const warnings = useMemo(() => {
    const out: { propertyName: string; spent: number; limit: number }[] = [];
    for (const p of props as any[]) {
      if (!p.purchase_price || !p.purchase_date) continue;
      const purchase = new Date(p.purchase_date);
      const threeYearLimit = new Date(purchase); threeYearLimit.setFullYear(purchase.getFullYear() + 3);
      const buildingAk = Number(p.purchase_price) * 0.8;
      const limit = buildingAk * 0.15;
      const spent = items
        .filter(i => i.property_id === p.id && new Date(i.spent_on) >= purchase && new Date(i.spent_on) <= threeYearLimit)
        .reduce((s, i) => s + Number(i.amount), 0);
      if (spent > limit && limit > 0) out.push({ propertyName: p.name, spent, limit });
    }
    return out;
  }, [items, props]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Ausgaben</h1>
          <p className="text-muted-foreground text-sm mt-1">Belege, Werbungskosten & Anschaffungen — automatisch im Steuerbericht.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold w-full sm:w-auto">
              <Plus className="h-5 w-5 mr-2" /> Ausgabe erfassen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ausgabe erfassen</DialogTitle>
              <p className="text-xs text-muted-foreground">Pflichtfelder mit *. Beleg kannst du auch später hochladen.</p>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Objekt (optional)</Label>
                {props.length === 1 ? (
                  <div className="mt-1 px-3 py-2.5 rounded-md border bg-muted/30 text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{props[0].name}</span>
                  </div>
                ) : (
                  <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Optional zuordnen" /></SelectTrigger>
                    <SelectContent>{props.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>

              {form.property_id && tenantsForProperty.length > 0 && (
                <div>
                  <Label className="text-xs">Mieter (optional)</Label>
                  {tenantsForProperty.length === 1 ? (
                    <div className="mt-1 px-3 py-2.5 rounded-md border bg-muted/30 text-sm flex items-center justify-between">
                      <span className="font-medium">👤 {tenantsForProperty[0].full_name}</span>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Betrag (€) *</Label>
                  <Input
                    type="number" inputMode="decimal" step="0.01"
                    placeholder="z.B. 120"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="mt-1 text-lg font-semibold"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Datum *</Label>
                  <Input type="date" value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Kategorie *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAT_INFO).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />{CAT_INFO[form.category].hint}
                </p>
              </div>

              <div>
                <Label className="text-xs">Lieferant / Handwerker</Label>
                <Input placeholder="z.B. Schmidt Heizungsbau" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="mt-1" />
              </div>

              <div>
                <Label className="text-xs">Beschreibung (optional)</Label>
                <Textarea rows={2} placeholder="z.B. Heizungswartung Jahresservice" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
              </div>

              <div>
                <Label className="text-xs">Beleg (Foto / PDF)</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="flex-1" />
                  <Button type="button" variant="outline" size="default" onClick={() => setScannerOpen(true)} title="Mit Kamera scannen (Adobe-Style)">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
                {file && <p className="text-[11px] text-success mt-1">✓ {file.name}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Erfassen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="p-4 glass">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Diesen Monat</div>
            <p className="text-2xl font-bold mt-1 tabular text-destructive">−{eur(sumThisMonth)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{items.filter(i => i.spent_on >= monthStart).length} Belege</p>
          </Card>
          <Card className="p-4 glass">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-3.5 w-3.5" /> Dieses Jahr</div>
            <p className="text-2xl font-bold mt-1 tabular">−{eur(sumThisYear)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{items.filter(i => i.spent_on >= yearStart).length} Belege</p>
          </Card>
          <Card className="p-4 glass col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Gesamt</div>
            <p className="text-2xl font-bold mt-1 tabular text-gradient-gold">{eur(items.reduce((s, e) => s + Number(e.amount), 0))}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{items.length} Belege insgesamt</p>
          </Card>
        </div>
      )}

      {warnings.length > 0 && (
        <Card className="p-5 glass border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2 flex-1">
              <p className="font-semibold text-destructive">Achtung: Anschaffungsnahe Herstellungskosten möglich</p>
              <p className="text-muted-foreground text-xs">
                15 %-Grenze der Gebäude-AK gem. <strong className="text-foreground">§ 6 Abs. 1 Nr. 1a EStG</strong> überschritten — diese Kosten müssen aktiviert (über AfA) statt sofort abgezogen werden. Mit Steuerberater klären.
              </p>
              <ul className="space-y-1 mt-2">
                {warnings.map((w, i) => (
                  <li key={i} className="flex justify-between bg-background/40 rounded-lg px-3 py-2 text-xs">
                    <span className="font-medium">{w.propertyName}</span>
                    <span><span className="text-destructive font-semibold">{eur(w.spent)}</span> / Grenze {eur(w.limit)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

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
          {props.length > 1 && (
            <Select value={propFilter} onValueChange={setPropFilter}>
              <SelectTrigger className="h-8 text-xs w-auto min-w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Objekte</SelectItem>
                {props.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            Auswahl: <span className="font-semibold text-foreground tabular">{eur(sumFiltered)}</span>
          </span>
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Noch keine Ausgaben erfasst"
          description="Erfasse Werbungskosten, Anschaffungen und NK-umlagefähige Posten. Foto oder PDF anhängen — wir erkennen Kategorie und 15%-Grenze automatisch."
          action={{ label: "Erste Ausgabe erfassen", onClick: () => setOpen(true), icon: Plus }}
        />
      ) : filtered.length === 0 ? (
        <Card className="p-8 glass text-center">
          <p className="text-sm text-muted-foreground">In diesem Zeitraum keine Ausgaben.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setFilter("all")}>Alle anzeigen</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, rows]) => {
            const monthSum = rows.reduce((s, e) => s + Number(e.amount), 0);
            return (
              <Card key={key} className="glass overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/40 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide">{monthLabel(key)}</p>
                  <p className="text-sm font-bold text-destructive tabular">−{eur(monthSum)}</p>
                </div>
                <div className="divide-y divide-border">
                  {rows.map(e => (
                    <div
                      key={e.id}
                      ref={el => { rowRefs.current[e.id] = el; }}
                      className={cn(
                        "px-4 py-3 flex items-center gap-3 transition-all duration-700",
                        highlightId === e.id && "bg-success/10 ring-2 ring-success/40"
                      )}
                    >
                      <div className="text-2xl flex-shrink-0">{CAT_INFO[e.category].emoji}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate flex items-center gap-1.5">
                          {e.receipt_path && <Paperclip className="h-3 w-3 text-primary flex-shrink-0" />}
                          <span className="truncate">{e.vendor || e.description || "Beleg"}</span>
                          {highlightId === e.id && <span className="text-[10px] uppercase tracking-wide text-success font-bold">Neu</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {date(e.spent_on)} · {CAT_INFO[e.category].label}{e.properties?.name ? ` · ${e.properties.name}` : ""}{e.tenants?.full_name ? ` · 👤 ${e.tenants.full_name}` : ""}
                        </p>
                      </div>
                      <p className="font-semibold whitespace-nowrap tabular">−{eur(e.amount)}</p>
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

export default Expenses;
