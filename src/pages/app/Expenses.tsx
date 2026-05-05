import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Paperclip, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { eur, date } from "@/lib/format";
import { z } from "zod";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";

const schema = z.object({
  property_id: z.string().uuid().optional().or(z.literal("")),
  spent_on: z.string().min(1),
  amount: z.number().min(0.01).max(9999999),
  vendor: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category: z.enum(["immediate","depreciable","utilities_passthrough","financing","other"]),
});

const CAT_INFO: Record<string, { label: string; hint: string }> = {
  immediate: { label: "Sofort abzugsfähig", hint: "Erhaltungsaufwand · § 9 EStG · voll im Jahr absetzbar" },
  depreciable: { label: "AfA-fähig (Anschaffung/Herstellung)", hint: "Wird über AfA verteilt · § 7 EStG · Vorsicht 15%-Grenze §6(1)1a EStG" },
  utilities_passthrough: { label: "NK-umlagefähig", hint: "Auf Mieter umlegbar · BetrKV" },
  financing: { label: "Finanzierung (Zinsen)", hint: "Werbungskosten · sofort absetzbar" },
  other: { label: "Sonstige", hint: "Manuell prüfen" },
};

const Expenses = () => {
  const [items, setItems] = useState<any[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ property_id: "", spent_on: new Date().toISOString().slice(0, 10), amount: "", vendor: "", description: "", category: "immediate" });

  useEffect(() => { document.title = "Belege · ImmonIQ"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const [e, p] = await Promise.all([
      supabase.from("expenses").select("*, properties(name)").order("spent_on", { ascending: false }),
      supabase.from("properties").select("id, name"),
    ]);
    setItems(e.data ?? []);
    setProps(p.data ?? []);
    setLoading(false);
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      property_id: form.property_id,
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
    if (!payload.vendor) delete payload.vendor;
    if (!payload.description) delete payload.description;

    const { error } = await supabase.from("expenses").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Beleg erfasst.");
    setOpen(false);
    setFile(null);
    setForm({ property_id: "", spent_on: new Date().toISOString().slice(0, 10), amount: "", vendor: "", description: "", category: "immediate" });
    load();
  };

  const total = items.reduce((s, e) => s + Number(e.amount), 0);

  // §6(1)1a EStG — Anschaffungsnahe Herstellungskosten Check
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
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Belege</h1>
          <p className="text-muted-foreground text-sm mt-1">Werbungskosten und Anschaffungen — verschlüsselt abgelegt.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground shadow-gold"><Plus className="h-4 w-4 mr-2" /> Beleg</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Beleg erfassen</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Objekt</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional zuordnen" /></SelectTrigger>
                  <SelectContent>{props.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Datum *</Label><Input type="date" value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} /></div>
              <div><Label>Betrag (€) *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="col-span-2"><Label>Lieferant / Handwerker</Label><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
              <div className="col-span-2"><Label>Beschreibung</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="col-span-2"><Label>Kategorie *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CAT_INFO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />{CAT_INFO[form.category].hint}
                </p>
              </div>
              <div className="col-span-2"><Label>Belegfoto / PDF</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-gold text-primary-foreground shadow-gold">Erfassen</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="p-6 glass">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Summe aller erfassten Belege</p>
            <p className="text-3xl font-bold mt-1 text-gradient-gold">{eur(total)}</p>
          </div>
          <Receipt className="h-8 w-8 text-primary" />
        </div>
      </Card>

      {warnings.length > 0 && (
        <Card className="p-5 glass border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2 flex-1">
              <p className="font-semibold text-destructive">Achtung: Anschaffungsnahe Herstellungskosten möglich</p>
              <p className="text-muted-foreground">
                Folgende Objekte überschreiten in den ersten 3 Jahren nach Kauf die 15 %-Grenze
                der Gebäude-AK gem. <strong className="text-foreground">§ 6 Abs. 1 Nr. 1a EStG</strong>.
                Diese Kosten müssen aktiviert (über AfA verteilt) statt sofort abgezogen werden.
                Bitte mit Steuerberater klären.
              </p>
              <ul className="space-y-1 mt-2">
                {warnings.map((w, i) => (
                  <li key={i} className="flex justify-between bg-background/40 rounded-lg px-3 py-2">
                    <span className="font-medium">{w.propertyName}</span>
                    <span className="text-muted-foreground">
                      <span className="text-destructive font-semibold">{eur(w.spent)}</span> / Grenze {eur(w.limit)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Noch keine Belege erfasst"
          description="Erfasse Werbungskosten, Anschaffungen und NK-umlagefähige Posten. Foto oder PDF anhängen — wir erkennen Kategorie und 15%-Grenze automatisch."
          action={{ label: "Ersten Beleg erfassen", onClick: () => setOpen(true), icon: Plus }}
        />
      ) : (
        <Card className="glass overflow-hidden">
          {/* Mobile */}
          <div className="md:hidden divide-y divide-border">
            {items.map(e => (
              <div key={e.id} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {e.receipt_path && <Paperclip className="h-3 w-3 text-primary flex-shrink-0" />}
                    <p className="font-medium truncate">{e.vendor || e.description || "—"}</p>
                  </div>
                  <p className="font-semibold whitespace-nowrap">−{eur(e.amount)}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{date(e.spent_on)} · {e.properties?.name ?? "ohne Objekt"}</span>
                  <span className="px-2 py-0.5 rounded-full bg-muted text-[10px]">{CAT_INFO[e.category].label}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop */}
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="text-left p-3">Datum</th>
                <th className="text-left p-3">Lieferant / Beschreibung</th>
                <th className="text-left p-3">Kategorie</th>
                <th className="text-left p-3">Objekt</th>
                <th className="text-right p-3">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {items.map(e => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-3">{date(e.spent_on)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {e.receipt_path && <Paperclip className="h-3 w-3 text-primary" />}
                      <span>{e.vendor || e.description || "—"}</span>
                    </div>
                  </td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{CAT_INFO[e.category].label}</span></td>
                  <td className="p-3 text-muted-foreground">{e.properties?.name ?? "—"}</td>
                  <td className="p-3 text-right font-semibold">−{eur(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default Expenses;
