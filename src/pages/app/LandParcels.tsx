import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trees, Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";

type Parcel = {
  id: string;
  name: string;
  gemarkung: string | null;
  flur: string | null;
  flurstueck: string | null;
  zip: string | null;
  city: string | null;
  area_sqm: number | null;
  bodenrichtwert_eur_sqm: number | null;
  parcel_type: string;
  lease_type: string;
  lease_holder: string | null;
  lease_annual_eur: number | null;
  lease_end_date: string | null;
  notes: string | null;
};

const PARCEL_TYPES = [
  { v: "bauland", l: "Bauland" },
  { v: "bauerwartung", l: "Bauerwartungsland" },
  { v: "acker", l: "Acker" },
  { v: "wald", l: "Wald" },
  { v: "wiese", l: "Wiese / Weide" },
  { v: "garten", l: "Garten" },
  { v: "gewerbe", l: "Gewerbefläche" },
  { v: "sonstige", l: "Sonstige" },
];

const LEASE_TYPES = [
  { v: "eigentum", l: "Eigentum (selbst)" },
  { v: "erbpacht_geber", l: "Erbpacht — ich verpachte" },
  { v: "erbpacht_nehmer", l: "Erbpacht — ich pachte" },
  { v: "pacht", l: "Pacht" },
  { v: "miete", l: "Miete" },
  { v: "sonstige", l: "Sonstige" },
];

const emptyForm = {
  name: "", gemarkung: "", flur: "", flurstueck: "",
  zip: "", city: "", area_sqm: "", bodenrichtwert_eur_sqm: "",
  parcel_type: "sonstige", lease_type: "eigentum",
  lease_holder: "", lease_annual_eur: "", lease_end_date: "", notes: "",
};

const LandParcels = () => {
  const [items, setItems] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("land_parcels" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); document.title = "Grundstücke · ImmonIQ"; }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Parcel) => {
    setEditId(p.id);
    setForm({
      name: p.name ?? "",
      gemarkung: p.gemarkung ?? "",
      flur: p.flur ?? "",
      flurstueck: p.flurstueck ?? "",
      zip: p.zip ?? "",
      city: p.city ?? "",
      area_sqm: p.area_sqm ?? "",
      bodenrichtwert_eur_sqm: p.bodenrichtwert_eur_sqm ?? "",
      parcel_type: p.parcel_type ?? "sonstige",
      lease_type: p.lease_type ?? "eigentum",
      lease_holder: p.lease_holder ?? "",
      lease_annual_eur: p.lease_annual_eur ?? "",
      lease_end_date: p.lease_end_date ?? "",
      notes: p.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name fehlt");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Nicht angemeldet");
    const payload: any = {
      name: form.name.trim(),
      gemarkung: form.gemarkung || null,
      flur: form.flur || null,
      flurstueck: form.flurstueck || null,
      zip: form.zip || null,
      city: form.city || null,
      area_sqm: form.area_sqm === "" ? null : Number(form.area_sqm),
      bodenrichtwert_eur_sqm: form.bodenrichtwert_eur_sqm === "" ? null : Number(form.bodenrichtwert_eur_sqm),
      parcel_type: form.parcel_type,
      lease_type: form.lease_type,
      lease_holder: form.lease_holder || null,
      lease_annual_eur: form.lease_annual_eur === "" ? null : Number(form.lease_annual_eur),
      lease_end_date: form.lease_end_date || null,
      notes: form.notes || null,
    };
    const res = editId
      ? await supabase.from("land_parcels" as any).update(payload).eq("id", editId)
      : await supabase.from("land_parcels" as any).insert({ ...payload, user_id: user.id });
    if (res.error) return toast.error(res.error.message);
    toast.success(editId ? "Aktualisiert" : "Grundstück angelegt");
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (p: Parcel) => {
    if (!confirm(`„${p.name}" wirklich löschen?`)) return;
    const { error } = await supabase.from("land_parcels" as any).delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Gelöscht");
    load();
  };

  const totalArea = items.reduce((s, p) => s + (Number(p.area_sqm) || 0), 0);
  const totalValue = items.reduce((s, p) => s + (Number(p.area_sqm) || 0) * (Number(p.bodenrichtwert_eur_sqm) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trees className="h-7 w-7 text-primary" /> Grundstücke
          </h1>
          <p className="text-muted-foreground mt-1">
            Flurstücke, Bodenrichtwerte, Erbpacht & Pacht — alles an einem Ort.
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Grundstück hinzufügen</Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Grundstück bearbeiten" : "Neues Grundstück"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="col-span-2">
              <Label>Bezeichnung *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z. B. Acker am Mühlbach" />
            </div>
            <div><Label>Gemarkung</Label><Input value={form.gemarkung} onChange={(e) => setForm({ ...form, gemarkung: e.target.value })} /></div>
            <div><Label>Flur</Label><Input value={form.flur} onChange={(e) => setForm({ ...form, flur: e.target.value })} /></div>
            <div><Label>Flurstück</Label><Input value={form.flurstueck} onChange={(e) => setForm({ ...form, flurstueck: e.target.value })} /></div>
            <div><Label>Fläche (m²)</Label><Input type="number" value={form.area_sqm} onChange={(e) => setForm({ ...form, area_sqm: e.target.value })} /></div>
            <div><Label>PLZ</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            <div><Label>Ort</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div>
              <Label>Nutzung</Label>
              <Select value={form.parcel_type} onValueChange={(v) => setForm({ ...form, parcel_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PARCEL_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bodenrichtwert (€/m²)</Label>
              <Input type="number" value={form.bodenrichtwert_eur_sqm} onChange={(e) => setForm({ ...form, bodenrichtwert_eur_sqm: e.target.value })} />
            </div>
            <div>
              <Label>Rechtsform</Label>
              <Select value={form.lease_type} onValueChange={(v) => setForm({ ...form, lease_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEASE_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Pächter / Verpächter</Label><Input value={form.lease_holder} onChange={(e) => setForm({ ...form, lease_holder: e.target.value })} /></div>
            <div><Label>Jahres-Zins (€)</Label><Input type="number" value={form.lease_annual_eur} onChange={(e) => setForm({ ...form, lease_annual_eur: e.target.value })} /></div>
            <div><Label>Vertrags-Ende</Label><Input type="date" value={form.lease_end_date} onChange={(e) => setForm({ ...form, lease_end_date: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notizen</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
              <Button onClick={save} className="bg-gradient-gold text-primary-foreground shadow-gold">Speichern</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Grundstücke</div><div className="text-2xl font-bold">{items.length}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Gesamtfläche</div><div className="text-2xl font-bold">{totalArea.toLocaleString("de-DE")} m²</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Bodenrichtwert ges.</div><div className="text-2xl font-bold">{totalValue.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €</div></Card>
        </div>
      )}

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Lädt…</Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Trees}
          title="Noch keine Grundstücke"
          description="Lege Flurstücke, Erbpacht-Verträge oder Pachtflächen an — mit Bodenrichtwert & Karte."
          action={{ label: "Erstes Grundstück anlegen", onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((p) => (
            <Card key={p.id} className="p-4 hover:shadow-md transition group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{p.name}</div>
                  {(p.city || p.zip) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {[p.zip, p.city].filter(Boolean).join(" ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="secondary" className="hidden sm:inline-flex">{PARCEL_TYPES.find(t => t.v === p.parcel_type)?.l ?? p.parcel_type}</Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 group-hover:opacity-100" onClick={() => openEdit(p)} title="Bearbeiten">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 group-hover:opacity-100 text-destructive" onClick={() => remove(p)} title="Löschen">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                {p.area_sqm != null && <div><span className="text-muted-foreground">Fläche:</span> {Number(p.area_sqm).toLocaleString("de-DE")} m²</div>}
                {p.bodenrichtwert_eur_sqm != null && <div><span className="text-muted-foreground">BRW:</span> {p.bodenrichtwert_eur_sqm} €/m²</div>}
                {(p.flur || p.flurstueck) && <div className="col-span-2"><span className="text-muted-foreground">Flur/Flst.:</span> {p.flur || "—"} / {p.flurstueck || "—"}</div>}
                {p.lease_type !== "eigentum" && (
                  <div className="col-span-2 text-xs bg-muted rounded p-2 mt-1">
                    <span className="font-medium">{LEASE_TYPES.find(t => t.v === p.lease_type)?.l}</span>
                    {p.lease_holder && ` · ${p.lease_holder}`}
                    {p.lease_annual_eur && ` · ${Number(p.lease_annual_eur).toLocaleString("de-DE")} €/Jahr`}
                    {p.lease_end_date && ` · bis ${new Date(p.lease_end_date).toLocaleDateString("de-DE")}`}
                  </div>
                )}
                {p.notes && <div className="col-span-2 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-2">{p.notes}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandParcels;
