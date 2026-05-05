import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Calculator, FileDown, Send, Trash2, Receipt, AlertTriangle, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { computeDistributions, renderNkaPdf, type NkaCostItem, type NkaUnit, type DistKey } from "@/lib/nka";

const DIST_LABELS: Record<DistKey, string> = {
  qm: "nach m²",
  personen: "nach Personen",
  einheiten: "pro Einheit",
  verbrauch_manual: "nach Verbrauch (manuell)",
  direkt_zuordnung: "direkte Zuordnung",
  heizkostenv_50_50: "Heizkosten 50/50 (HeizkostenV)",
};

const DIST_OPTIONS: DistKey[] = ["qm", "personen", "einheiten", "verbrauch_manual", "direkt_zuordnung", "heizkostenv_50_50"];

type Period = {
  id: string;
  property_id: string;
  year: number;
  period_start: string;
  period_end: string;
  status: string;
  notes: string | null;
};

type Property = { id: string; name: string; street: string | null; zip: string | null; city: string | null };
type Unit = { id: string; property_id: string; label: string; living_space: number | null; persons_count: number | null; heating_share_pct: number | null };
type Tenant = { id: string; full_name: string; unit_id: string | null; email: string | null };
type CostCategory = { code: string; label: string; default_distribution_key: string; sort_order: number };
type CostItem = NkaCostItem & { manual_shares_obj?: Record<string, number> };

export default function Nebenkosten() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [propertyId, setPropertyId] = useState<string>("");
  const [periodId, setPeriodId] = useState<string>("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [costCategories, setCostCategories] = useState<CostCategory[]>([]);
  const [items, setItems] = useState<CostItem[]>([]);
  const [profile, setProfile] = useState<{ display_name: string | null } | null>(null);
  const [newPeriodOpen, setNewPeriodOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ year: new Date().getFullYear() - 1, period_start: "", period_end: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Nebenkosten · ImmonIQ"; init(); }, []);

  async function init() {
    const [p, c, pr] = await Promise.all([
      supabase.from("properties").select("id, name, street, zip, city").order("name"),
      supabase.from("nka_cost_categories").select("*").order("sort_order"),
      supabase.from("profiles").select("display_name").maybeSingle(),
    ]);
    setProperties(p.data ?? []);
    setCostCategories(c.data ?? []);
    setProfile(pr.data ?? null);
    if (p.data?.[0]) setPropertyId(p.data[0].id);
  }

  useEffect(() => { if (propertyId) loadProperty(); }, [propertyId]);
  useEffect(() => { if (periodId) loadPeriod(); else setItems([]); }, [periodId]);

  async function loadProperty() {
    const [pds, us, ts] = await Promise.all([
      supabase.from("nka_periods").select("*").eq("property_id", propertyId).order("year", { ascending: false }),
      supabase.from("units").select("id, property_id, label, living_space, persons_count, heating_share_pct").eq("property_id", propertyId),
      supabase.from("tenants").select("id, full_name, unit_id, email").eq("property_id", propertyId),
    ]);
    setPeriods(pds.data ?? []);
    setUnits(us.data ?? []);
    setTenants(ts.data ?? []);
    if (pds.data?.[0]) setPeriodId(pds.data[0].id); else setPeriodId("");
  }

  async function loadPeriod() {
    const { data } = await supabase.from("nka_cost_items").select("*").eq("period_id", periodId).order("created_at");
    const mapped: CostItem[] = (data ?? []).map((d: any) => ({
      id: d.id,
      category_code: d.category_code,
      label: d.label,
      amount: Number(d.amount),
      distribution_key: d.distribution_key as DistKey,
      umlagefaehig: d.umlagefaehig,
      manual_shares: (d.manual_shares as any) || {},
    }));
    setItems(mapped);
  }

  async function createPeriod() {
    if (!propertyId) return toast.error("Bitte Objekt wählen");
    const start = newPeriod.period_start || `${newPeriod.year}-01-01`;
    const end = newPeriod.period_end || `${newPeriod.year}-12-31`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("nka_periods").insert({
      user_id: user.id, property_id: propertyId, year: newPeriod.year,
      period_start: start, period_end: end, status: "draft",
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Periode angelegt");
    setNewPeriodOpen(false);
    await loadProperty();
    setPeriodId(data.id);
  }

  async function addCostItem() {
    if (!periodId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const cat = costCategories[0];
    const { data, error } = await supabase.from("nka_cost_items").insert({
      period_id: periodId, user_id: user.id,
      category_code: cat.code, label: cat.label, amount: 0,
      distribution_key: cat.default_distribution_key, umlagefaehig: true,
    }).select().single();
    if (error) return toast.error(error.message);
    setItems((prev) => [...prev, { id: data.id, category_code: data.category_code, label: data.label, amount: 0, distribution_key: data.distribution_key as DistKey, umlagefaehig: true, manual_shares: {} }]);
  }

  async function importFromExpenses() {
    if (!periodId) return;
    const period = periods.find(p => p.id === periodId);
    if (!period) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: exps } = await supabase
      .from("expenses")
      .select("id, amount, description, vendor, category, spent_on, classification")
      .eq("property_id", propertyId)
      .gte("spent_on", period.period_start)
      .lte("spent_on", period.period_end)
      .or("category.eq.utilities_passthrough,nka_eligible.eq.true");
    if (!exps?.length) return toast.info("Keine umlagefähigen Belege im Zeitraum gefunden");
    const inserts = exps.map((e: any) => ({
      period_id: periodId, user_id: user.id,
      category_code: "sonstige",
      label: e.description || e.vendor || "Beleg",
      amount: Number(e.amount),
      distribution_key: "qm",
      umlagefaehig: true,
      source_expense_id: e.id,
    }));
    const { error } = await supabase.from("nka_cost_items").insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`${inserts.length} Belege importiert`);
    loadPeriod();
  }

  async function updateItem(id: string, patch: Partial<CostItem>) {
    setItems((prev) => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    const dbPatch: any = { ...patch };
    if (patch.manual_shares) dbPatch.manual_shares = patch.manual_shares;
    await supabase.from("nka_cost_items").update(dbPatch).eq("id", id);
  }

  async function deleteItem(id: string) {
    await supabase.from("nka_cost_items").delete().eq("id", id);
    setItems((prev) => prev.filter(i => i.id !== id));
  }

  async function aiClassify(it: CostItem) {
    if (!it.label && !it.amount) return toast.error("Bitte erst Bezeichnung eingeben");
    try {
      const { data, error } = await supabase.functions.invoke("ai-classify-expense", {
        body: { description: it.label, vendor: null, amount: it.amount },
      });
      if (error) throw error;
      const cat = costCategories.find(c => c.code === data.category_code);
      await updateItem(it.id, {
        category_code: data.category_code,
        distribution_key: data.distribution_key as DistKey,
        umlagefaehig: data.umlagefaehig,
        label: it.label || cat?.label || data.category_code,
      });
      toast.success(`KI: ${cat?.label ?? data.category_code} · ${data.umlagefaehig ? "umlagefähig" : "nicht umlagefähig"}`);
    } catch (e: any) {
      toast.error(e.message || "KI-Klassifikation fehlgeschlagen");
    }
  }

  // Berechnung
  const period = periods.find(p => p.id === periodId);
  const property = properties.find(p => p.id === propertyId);
  const nkaUnits: NkaUnit[] = useMemo(() => units.map(u => {
    const t = tenants.find(t => t.unit_id === u.id);
    return {
      id: u.id, label: u.label,
      living_space: u.living_space ? Number(u.living_space) : 0,
      persons_count: u.persons_count ?? 1,
      heating_share_pct: u.heating_share_pct != null ? Number(u.heating_share_pct) : null,
      tenant_id: t?.id, tenant_name: t?.full_name,
      vorauszahlung_summe: 0,
    };
  }), [units, tenants]);

  const [vorauszahlungen, setVorauszahlungen] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!periodId || !period || nkaUnits.length === 0) return;
    (async () => {
      const tenantIds = nkaUnits.map(u => u.tenant_id).filter(Boolean) as string[];
      if (!tenantIds.length) return;
      const { data } = await supabase
        .from("payments")
        .select("tenant_id, amount, kind")
        .in("tenant_id", tenantIds)
        .gte("paid_on", period.period_start)
        .lte("paid_on", period.period_end);
      const sums: Record<string, number> = {};
      (data ?? []).forEach((p: any) => {
        if (p.kind === "utilities") {
          sums[p.tenant_id] = (sums[p.tenant_id] || 0) + Number(p.amount);
        }
      });
      setVorauszahlungen(sums);
    })();
  }, [periodId, period, nkaUnits.length]);

  const unitsWithVoraus: NkaUnit[] = useMemo(
    () => nkaUnits.map(u => ({ ...u, vorauszahlung_summe: u.tenant_id ? (vorauszahlungen[u.tenant_id] || 0) : 0 })),
    [nkaUnits, vorauszahlungen]
  );

  const results = useMemo(
    () => computeDistributions(unitsWithVoraus, items),
    [unitsWithVoraus, items]
  );

  const totalCosts = items.filter(i => i.umlagefaehig).reduce((s, i) => s + i.amount, 0);

  async function saveDistributionsAndPdf(send: boolean) {
    if (!period || !property) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      for (const r of results) {
        if (!r.tenant_id) continue;
        const pdfBlob = renderNkaPdf({
          ownerName: profile?.display_name || "Vermieter",
          propertyName: property.name,
          propertyAddress: `${property.street ?? ""}, ${property.zip ?? ""} ${property.city ?? ""}`.trim(),
          periodStart: period.period_start,
          periodEnd: period.period_end,
          result: r,
        });
        const path = `nka/${period.id}/${r.tenant_id}.pdf`;
        await supabase.storage.from("documents").upload(path, pdfBlob, { upsert: true, contentType: "application/pdf" });
        const upsertObj: any = {
          period_id: period.id, user_id: user.id,
          tenant_id: r.tenant_id, unit_id: r.unit_id,
          vorauszahlung_summe: r.vorauszahlung,
          ist_summe: r.ist, saldo: r.saldo,
          breakdown: r.breakdown as any, pdf_path: path,
        };
        if (send) upsertObj.sent_at = new Date().toISOString();
        await supabase.from("nka_distributions").upsert(upsertObj, { onConflict: "period_id,tenant_id" });

        if (send && r.saldo > 0.01) {
          // Nachzahlungs-Forderung in payments anlegen
          await supabase.from("payments").insert({
            user_id: user.id, property_id: propertyId,
            tenant_id: r.tenant_id, unit_id: r.unit_id,
            amount: r.saldo, kind: "nka_nachzahlung" as any,
            type: "nka", status: "open",
            paid_on: period.period_end,
            note: `NK-Nachzahlung ${period.year}`,
          });
        }
      }
      if (send) {
        await supabase.from("nka_periods").update({ status: "sent" }).eq("id", period.id);
        toast.success("Abrechnungen erstellt, PDFs gespeichert und Forderungen angelegt");
      } else {
        toast.success("PDFs generiert und gespeichert");
      }
      await loadProperty();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  async function downloadPdf(r: typeof results[number]) {
    if (!period || !property) return;
    const pdfBlob = renderNkaPdf({
      ownerName: profile?.display_name || "Vermieter",
      propertyName: property.name,
      propertyAddress: `${property.street ?? ""}, ${property.zip ?? ""} ${property.city ?? ""}`.trim(),
      periodStart: period.period_start,
      periodEnd: period.period_end,
      result: r,
    });
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url; a.download = `NK_${period.year}_${r.unit_label.replace(/\s+/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nebenkostenabrechnung</h1>
        <p className="text-muted-foreground">Belege erfassen, Verteilung berechnen, PDF-Abrechnung pro Mieter und Forderung anlegen — BetrKV/HeizkostenV-konform.</p>
      </div>

      {properties.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          Lege zuerst eine Immobilie an.
        </Card>
      ) : (
        <>
          {/* Auswahl */}
          <Card className="p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Objekt</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Abrechnungsperiode</Label>
              <Select value={periodId} onValueChange={setPeriodId}>
                <SelectTrigger><SelectValue placeholder="— wählen —" /></SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.year} ({p.period_start} – {p.period_end}) {p.status !== "draft" && `· ${p.status}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => setNewPeriodOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Neue Periode
            </Button>
          </Card>

          {/* Status & Hinweise */}
          {units.some(u => !u.living_space) && (
            <Card className="p-3 bg-amber-50 border-amber-200 text-amber-900 text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                Nicht alle Einheiten haben eine Wohnfläche. Verteilung nach m² wird ungenau.
                Bitte unter <strong>Objekte</strong> ergänzen.
              </div>
            </Card>
          )}

          {periodId && (
            <>
              {/* Kostenpositionen */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-lg">Kostenpositionen</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={importFromExpenses}>
                      <Receipt className="h-4 w-4 mr-1" /> Aus Belegen importieren
                    </Button>
                    <Button size="sm" onClick={addCostItem}>
                      <Plus className="h-4 w-4 mr-1" /> Position
                    </Button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Noch keine Kostenpositionen.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map(it => (
                      <div key={it.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-border">
                        <Select value={it.category_code} onValueChange={(v) => {
                          const cat = costCategories.find(c => c.code === v);
                          updateItem(it.id, { category_code: v, label: cat?.label ?? null, distribution_key: (cat?.default_distribution_key as DistKey) ?? "qm" });
                        }}>
                          <SelectTrigger className="col-span-3 h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {costCategories.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input className="col-span-3 h-9" value={it.label ?? ""} onChange={(e) => updateItem(it.id, { label: e.target.value })} placeholder="Bezeichnung" />
                        <Input className="col-span-2 h-9" type="number" step="0.01" value={it.amount} onChange={(e) => updateItem(it.id, { amount: Number(e.target.value) })} placeholder="Betrag €" />
                        <Select value={it.distribution_key} onValueChange={(v) => updateItem(it.id, { distribution_key: v as DistKey })}>
                          <SelectTrigger className="col-span-2 h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DIST_OPTIONS.map(d => <SelectItem key={d} value={d}>{DIST_LABELS[d]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="col-span-1 h-9 text-primary" onClick={() => aiClassify(it)} title="KI-Klassifikation">
                          <Sparkles className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="col-span-1 h-9" onClick={() => deleteItem(it.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>

                        {/* Manuelle Anteile */}
                        {(it.distribution_key === "verbrauch_manual" || it.distribution_key === "direkt_zuordnung" || it.distribution_key === "heizkostenv_50_50") && (
                          <div className="col-span-12 mt-2 pl-2 border-l-2 border-primary/30">
                            {it.distribution_key === "heizkostenv_50_50" && (
                              <p className="text-[10px] text-muted-foreground mb-1">
                                Verbrauchsanteil pro Einheit (50% wird automatisch nach m² verteilt). Override via heating_share_pct in der Einheit.
                              </p>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {units.map(u => (
                                <div key={u.id}>
                                  <Label className="text-[10px]">{u.label}{u.heating_share_pct != null && it.distribution_key === "heizkostenv_50_50" ? ` (${u.heating_share_pct}% fix)` : ""}</Label>
                                  <Input className="h-8 text-xs" type="number" step="0.01"
                                    value={it.manual_shares?.[u.id] ?? 0}
                                    onChange={(e) => updateItem(it.id, { manual_shares: { ...(it.manual_shares ?? {}), [u.id]: Number(e.target.value) } })}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="text-right text-sm font-semibold pt-2">
                      Summe umlagefähig: {totalCosts.toFixed(2)} €
                    </div>
                  </div>
                )}
              </Card>

              {/* Verteilung */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" /> Verteilung pro Mieter
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={busy || !results.length} onClick={() => saveDistributionsAndPdf(false)}>
                      <FileDown className="h-4 w-4 mr-1" /> PDFs speichern
                    </Button>
                    <Button disabled={busy || !results.length} onClick={() => saveDistributionsAndPdf(true)}>
                      <Send className="h-4 w-4 mr-1" /> Versenden & Forderungen anlegen
                    </Button>
                  </div>
                </div>
                {results.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Lege Einheiten und Mieter an, um die Verteilung zu sehen.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="py-2">Einheit / Mieter</th>
                          <th className="py-2 text-right">Vorauszahlungen</th>
                          <th className="py-2 text-right">Soll-Kosten</th>
                          <th className="py-2 text-right">Saldo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map(r => (
                          <tr key={r.unit_id} className="border-b border-border/40">
                            <td className="py-2">
                              <div className="font-medium">{r.unit_label}</div>
                              <div className="text-xs text-muted-foreground">{r.tenant_name ?? "— kein Mieter zugeordnet —"}</div>
                            </td>
                            <td className="py-2 text-right">{r.vorauszahlung.toFixed(2)} €</td>
                            <td className="py-2 text-right">{r.ist.toFixed(2)} €</td>
                            <td className="py-2 text-right">
                              <Badge variant={r.saldo > 0 ? "destructive" : "default"} className={r.saldo <= 0 ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20" : ""}>
                                {r.saldo > 0 ? "+" : ""}{r.saldo.toFixed(2)} €
                              </Badge>
                            </td>
                            <td className="py-2 text-right">
                              <Button variant="ghost" size="sm" onClick={() => downloadPdf(r)} disabled={!r.tenant_name}>
                                <FileDown className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  Vorauszahlungen werden aus Zahlungen mit Art „Nebenkosten" oder „Warmmiete" im Zeitraum gezogen. Nachzahlungen landen automatisch im <strong>Mahnwesen</strong>, falls überfällig.
                </div>
              </Card>
            </>
          )}
        </>
      )}

      <Dialog open={newPeriodOpen} onOpenChange={setNewPeriodOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Abrechnungsperiode</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Jahr</Label>
              <Input type="number" value={newPeriod.year} onChange={(e) => setNewPeriod(p => ({ ...p, year: Number(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Beginn</Label>
                <Input type="date" value={newPeriod.period_start} onChange={(e) => setNewPeriod(p => ({ ...p, period_start: e.target.value }))} placeholder={`${newPeriod.year}-01-01`} />
              </div>
              <div>
                <Label>Ende</Label>
                <Input type="date" value={newPeriod.period_end} onChange={(e) => setNewPeriod(p => ({ ...p, period_end: e.target.value }))} placeholder={`${newPeriod.year}-12-31`} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewPeriodOpen(false)}>Abbrechen</Button>
            <Button onClick={createPeriod}>Anlegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
