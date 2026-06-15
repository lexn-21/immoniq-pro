import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Wrench, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const KINDS: Array<{ value: string; label: string; lifespan: number }> = [
  { value: "roof", label: "Dach", lifespan: 40 },
  { value: "facade", label: "Fassade", lifespan: 40 },
  { value: "windows", label: "Fenster", lifespan: 30 },
  { value: "doors", label: "Türen", lifespan: 30 },
  { value: "heating", label: "Heizung", lifespan: 20 },
  { value: "boiler", label: "Warmwasser-Boiler", lifespan: 15 },
  { value: "solar_pv", label: "Photovoltaik", lifespan: 25 },
  { value: "solar_thermal", label: "Solarthermie", lifespan: 20 },
  { value: "electrical", label: "Elektrik", lifespan: 40 },
  { value: "plumbing", label: "Sanitärleitungen", lifespan: 40 },
  { value: "insulation", label: "Dämmung", lifespan: 40 },
  { value: "smoke_detector", label: "Rauchmelder", lifespan: 10 },
  { value: "elevator", label: "Aufzug", lifespan: 25 },
  { value: "garage_door", label: "Garagentor", lifespan: 20 },
  { value: "gate", label: "Hoftor", lifespan: 25 },
  { value: "intercom", label: "Klingel/Sprechanlage", lifespan: 15 },
  { value: "ventilation", label: "Lüftung", lifespan: 20 },
  { value: "chimney", label: "Schornstein", lifespan: 30 },
  { value: "oil_tank", label: "Öltank", lifespan: 30 },
  { value: "water_tank", label: "Wassertank", lifespan: 20 },
  { value: "sewage", label: "Abwasser", lifespan: 40 },
  { value: "kitchen", label: "Einbauküche", lifespan: 20 },
  { value: "bathroom", label: "Badezimmer", lifespan: 25 },
  { value: "flooring", label: "Bodenbelag", lifespan: 20 },
  { value: "paint", label: "Anstrich", lifespan: 8 },
  { value: "garden", label: "Garten/Außenanlage", lifespan: 5 },
  { value: "fence", label: "Zaun", lifespan: 20 },
  { value: "driveway", label: "Einfahrt/Hof", lifespan: 25 },
  { value: "other", label: "Sonstiges", lifespan: 15 },
];

const empty = {
  kind: "roof", label: "", installed_on: "", last_maintenance_on: "", next_check_on: "",
  expected_lifespan_years: "", warranty_until: "", manufacturer: "", model: "",
  serial_number: "", cost_cents: "", supplier: "", notes: "",
};

export default function PropertyComponents({ propertyId }: { propertyId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("property_components" as any)
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });
    setItems((data as any[]) ?? []);
  };

  useEffect(() => { load(); }, [propertyId]);

  const selectedKind = KINDS.find(k => k.value === form.kind);

  const save = async () => {
    if (!form.kind) return toast.error("Bauteil wählen");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload: any = {
      user_id: user.id,
      property_id: propertyId,
      kind: form.kind,
      label: form.label.trim() || null,
      installed_on: form.installed_on || null,
      last_maintenance_on: form.last_maintenance_on || null,
      next_check_on: form.next_check_on || null,
      expected_lifespan_years: form.expected_lifespan_years ? Number(form.expected_lifespan_years) : null,
      warranty_until: form.warranty_until || null,
      manufacturer: form.manufacturer.trim() || null,
      model: form.model.trim() || null,
      serial_number: form.serial_number.trim() || null,
      cost_cents: form.cost_cents ? Math.round(Number(form.cost_cents) * 100) : null,
      supplier: form.supplier.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { error } = await supabase.from("property_components" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Bauteil gespeichert – Erinnerungen werden automatisch angelegt.");
    setOpen(false);
    setForm({ ...empty });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Bauteil löschen?")) return;
    const { error } = await supabase.from("property_components" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gelöscht.");
    load();
  };

  const statusOf = (c: any): { tone: "ok" | "warn" | "crit"; text: string } => {
    if (!c.installed_on || !c.expected_lifespan_years) return { tone: "ok", text: "OK" };
    const eol = new Date(c.installed_on);
    eol.setFullYear(eol.getFullYear() + c.expected_lifespan_years);
    const yearsLeft = (eol.getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000);
    if (yearsLeft < 0) return { tone: "crit", text: `${Math.abs(Math.round(yearsLeft))} J. überfällig` };
    if (yearsLeft < 2) return { tone: "warn", text: `noch ${yearsLeft.toFixed(1)} J.` };
    return { tone: "ok", text: `noch ${Math.round(yearsLeft)} J.` };
  };

  return (
    <Card className="p-5 glass">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Wrench className="h-5 w-5" /> Bauteile & Anlagen</h2>
          <p className="text-xs text-muted-foreground mt-1">Dach, Heizung, Fenster … wir erinnern dich automatisch an Wartung, Lebensdauer-Ende und Garantieablauf.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-gold text-primary-foreground shadow-gold"><Plus className="h-4 w-4 mr-1" /> Bauteil</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Bauteil hinzufügen</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Bauteil *</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.kind}
                  onChange={e => {
                    const k = KINDS.find(x => x.value === e.target.value);
                    setForm({ ...form, kind: e.target.value, expected_lifespan_years: k ? String(k.lifespan) : "" });
                  }}
                >
                  {KINDS.map(k => <option key={k.value} value={k.value}>{k.label} (typ. {k.lifespan} J.)</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label>Bezeichnung <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
                <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder={`z. B. "Gasbrennwert OG"`} />
              </div>
              <div>
                <Label>Einbau am</Label>
                <Input type="date" value={form.installed_on} onChange={e => setForm({ ...form, installed_on: e.target.value })} />
              </div>
              <div>
                <Label>Lebensdauer (Jahre)</Label>
                <Input type="number" value={form.expected_lifespan_years} onChange={e => setForm({ ...form, expected_lifespan_years: e.target.value })} placeholder={selectedKind ? String(selectedKind.lifespan) : ""} />
              </div>
              <div>
                <Label>Letzte Wartung</Label>
                <Input type="date" value={form.last_maintenance_on} onChange={e => setForm({ ...form, last_maintenance_on: e.target.value })} />
              </div>
              <div>
                <Label>Nächste Prüfung</Label>
                <Input type="date" value={form.next_check_on} onChange={e => setForm({ ...form, next_check_on: e.target.value })} />
              </div>
              <div>
                <Label>Garantie bis</Label>
                <Input type="date" value={form.warranty_until} onChange={e => setForm({ ...form, warranty_until: e.target.value })} />
              </div>
              <div>
                <Label>Kosten (€)</Label>
                <Input type="number" step="0.01" value={form.cost_cents} onChange={e => setForm({ ...form, cost_cents: e.target.value })} />
              </div>
              <div>
                <Label>Hersteller</Label>
                <Input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} placeholder="z. B. Viessmann" />
              </div>
              <div>
                <Label>Modell</Label>
                <Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="z. B. Vitodens 200" />
              </div>
              <div>
                <Label>Seriennr.</Label>
                <Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
              </div>
              <div>
                <Label>Lieferant / Handwerker</Label>
                <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Notizen</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={saving} className="bg-gradient-gold text-primary-foreground shadow-gold">
                {saving ? "Speichere…" : "Speichern"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Noch keine Bauteile erfasst. Lege das erste an – wir erinnern dich automatisch an Lebensdauer-Ende & Wartungen.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(c => {
            const k = KINDS.find(x => x.value === c.kind);
            const s = statusOf(c);
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{k?.label || c.kind}</span>
                    {c.label && <span className="text-sm text-muted-foreground">· {c.label}</span>}
                    <Badge variant={s.tone === "crit" ? "destructive" : s.tone === "warn" ? "secondary" : "outline"} className="text-[10px]">
                      {s.tone === "crit" ? <AlertTriangle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {s.text}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                    {c.installed_on && <span>Einbau: {c.installed_on}</span>}
                    {c.expected_lifespan_years && <span>Lebensdauer: {c.expected_lifespan_years} J.</span>}
                    {c.manufacturer && <span>{c.manufacturer} {c.model || ""}</span>}
                    {c.warranty_until && <span>Garantie bis {c.warranty_until}</span>}
                    {c.next_check_on && <span>nächste Prüfung: {c.next_check_on}</span>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
