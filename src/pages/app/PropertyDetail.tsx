import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Home, Pencil, Camera, Save, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { eur } from "@/lib/format";
import { z } from "zod";
import { NeighborhoodInsight } from "@/components/market/NeighborhoodInsight";
import { MietspiegelCard } from "@/components/market/MietspiegelCard";
import { AvmWidget } from "@/components/market/AvmWidget";
import PropertyComponents from "@/components/property/PropertyComponents";

const unitSchema = z.object({
  label: z.string().trim().min(1).max(100),
  living_space: z.number().min(0).max(10000).optional(),
  rooms: z.number().min(0).max(50).optional(),
  rent_cold: z.number().min(0).max(99999),
  utilities: z.number().min(0).max(99999),
  persons_count: z.number().int().min(0).max(20).optional(),
});

const PropertyDetail = () => {
  const { id } = useParams();
  const [property, setProperty] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "", living_space: "", rooms: "", rent_cold: "", utilities: "", persons_count: "" });

  // Inline-Edit
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    const [p, u, t] = await Promise.all([
      supabase.from("properties").select("*").eq("id", id).maybeSingle(),
      supabase.from("units").select("*").eq("property_id", id).order("label"),
      supabase.from("tenants").select("id,full_name,unit_id,move_in,move_out").eq("property_id", id),
    ]);
    setProperty(p.data);
    setUnits(u.data ?? []);
    setTenants(t.data ?? []);
    if (p.data) {
      document.title = `${p.data.name} · ImmonIQ`;
      setEdit({
        name: p.data.name ?? "",
        street: p.data.street ?? "",
        zip: p.data.zip ?? "",
        city: p.data.city ?? "",
        build_year: p.data.build_year ?? "",
        last_renovation_year: p.data.last_renovation_year ?? "",
        purchase_price: p.data.purchase_price ?? "",
        afa_rate: p.data.afa_rate ?? "",
        status: p.data.status ?? "rented",
        energy_class: p.data.energy_class ?? "",
        energy_consumption_kwh: p.data.energy_consumption_kwh ?? "",
        heating_type: p.data.heating_type ?? "",
        listed_building: !!p.data.listed_building,
        notes: p.data.notes ?? "",
      });
    }
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    const payload: any = {
      name: String(edit.name || "").trim() || property.name,
      street: edit.street || null,
      zip: edit.zip || null,
      city: edit.city || null,
      build_year: edit.build_year ? Number(edit.build_year) : null,
      last_renovation_year: edit.last_renovation_year ? Number(edit.last_renovation_year) : null,
      purchase_price: edit.purchase_price ? Number(edit.purchase_price) : null,
      afa_rate: edit.afa_rate ? Number(edit.afa_rate) : null,
      status: edit.status || "rented",
      energy_class: edit.energy_class || null,
      energy_consumption_kwh: edit.energy_consumption_kwh ? Number(edit.energy_consumption_kwh) : null,
      heating_type: edit.heating_type || null,
      listed_building: !!edit.listed_building,
      notes: edit.notes || null,
    };
    const { error } = await supabase.from("properties").update(payload).eq("id", id);
    setSavingEdit(false);
    if (error) return toast.error(error.message);
    toast.success("Gespeichert.");
    setEditing(false);
    load();
  };

  const uploadImage = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Max. 5 MB");
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${id}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("listing-photos").upload(path, file, { upsert: true });
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    const { data: pub } = supabase.storage.from("listing-photos").getPublicUrl(path);
    const { error } = await supabase.from("properties").update({ image_url: pub.publicUrl }).eq("id", id);
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Bild aktualisiert.");
    load();
  };

  const addUnit = async () => {
    const parsed = unitSchema.safeParse({
      label: form.label,
      living_space: form.living_space ? Number(form.living_space) : undefined,
      rooms: form.rooms ? Number(form.rooms) : undefined,
      rent_cold: Number(form.rent_cold || 0),
      utilities: Number(form.utilities || 0),
      persons_count: form.persons_count ? Number(form.persons_count) : undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const insertPayload = { ...parsed.data, property_id: id as string, user_id: user.id };
    const { error } = await supabase.from("units").insert(insertPayload as any);
    if (error) return toast.error(error.message);
    toast.success("Einheit angelegt.");
    setOpen(false);
    setForm({ label: "", living_space: "", rooms: "", rent_cold: "", utilities: "", persons_count: "" });
    load();
  };

  if (!property) return <div className="text-muted-foreground">Lade…</div>;

  const monthlyTotal = units.reduce((s, u) => s + Number(u.rent_cold) + Number(u.utilities), 0);
  const activeTenants = tenants.filter(t => !t.move_out || new Date(t.move_out) > new Date());

  return (
    <div className="space-y-6">
      <Link to="/app/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Alle Objekte
      </Link>

      <Card className="overflow-hidden glass">
        {property.image_url ? (
          <div className="relative h-48 md:h-64 bg-muted">
            <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
            <Button size="sm" variant="secondary" className="absolute bottom-3 right-3 gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera className="h-3.5 w-3.5" /> {uploading ? "Lade…" : "Ersetzen"}
            </Button>
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImageIcon className="h-3.5 w-3.5" /> {uploading ? "Lade…" : "Foto hochladen"}
            </Button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {!editing ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{property.name}</h1>
                    <Badge variant={property.status === "vacant" ? "secondary" : "default"}>{property.status === "vacant" ? "Leerstand" : property.status === "self_use" ? "Eigennutzung" : "Vermietet"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[property.street, [property.zip, property.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Keine Adresse"}
                  </p>
                  {property.notes && <p className="text-sm mt-2 text-foreground/80 whitespace-pre-wrap">{property.notes}</p>}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Name</Label><Input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Straße</Label><Input value={edit.street} onChange={e => setEdit({ ...edit, street: e.target.value })} /></div>
                  <div><Label>PLZ</Label><Input value={edit.zip} onChange={e => setEdit({ ...edit, zip: e.target.value })} /></div>
                  <div><Label>Ort</Label><Input value={edit.city} onChange={e => setEdit({ ...edit, city: e.target.value })} /></div>
                  <div><Label>Baujahr</Label><Input type="number" value={edit.build_year} onChange={e => setEdit({ ...edit, build_year: e.target.value })} /></div>
                  <div><Label>Kaufpreis (€)</Label><Input type="number" value={edit.purchase_price} onChange={e => setEdit({ ...edit, purchase_price: e.target.value })} /></div>
                  <div><Label>AfA-Satz (%)</Label><Input type="number" step="0.01" value={edit.afa_rate} onChange={e => setEdit({ ...edit, afa_rate: e.target.value })} /></div>
                  <div>
                    <Label>Status</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })}>
                      <option value="rented">Vermietet</option>
                      <option value="vacant">Leerstand</option>
                      <option value="self_use">Eigennutzung</option>
                    </select>
                  </div>
                  <div className="col-span-2"><Label>Notizen</Label><Textarea rows={3} value={edit.notes} onChange={e => setEdit({ ...edit, notes: e.target.value })} placeholder="Interne Notizen, Termine, Besonderheiten…" /></div>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!editing ? (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> Bearbeiten</Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); load(); }}><X className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" onClick={saveEdit} disabled={savingEdit} className="bg-gradient-gold text-primary-foreground"><Save className="h-3.5 w-3.5 mr-1" /> Speichern</Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-border">
            <div><p className="text-xs text-muted-foreground">Baujahr</p><p className="font-semibold">{property.build_year ?? "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Kaufpreis</p><p className="font-semibold">{property.purchase_price ? eur(property.purchase_price) : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">AfA-Satz</p><p className="font-semibold">{property.afa_rate ?? "—"} %</p></div>
            <div><p className="text-xs text-muted-foreground">Einheiten</p><p className="font-semibold">{units.length}</p></div>
            <div><p className="text-xs text-muted-foreground">Sollmiete/Mo</p><p className="font-semibold text-gradient-gold">{eur(monthlyTotal)}</p></div>
          </div>
        </div>
      </Card>

      {activeTenants.length > 0 && (
        <Card className="p-5 glass">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Aktive Mieter</h2>
          <div className="flex flex-wrap gap-2">
            {activeTenants.map(t => (
              <Link key={t.id} to={`/app/tenants/${t.id}`} className="text-xs bg-muted hover:bg-muted/70 px-3 py-1.5 rounded-full transition">
                {t.full_name}{units.find(u => u.id === t.unit_id) && ` · ${units.find(u => u.id === t.unit_id).label}`}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <AvmWidget
        zip={property.zip}
        livingSpace={units.reduce((s, u) => s + Number(u.living_space ?? 0), 0) || null}
        annualRent={units.reduce((s, u) => s + (Number(u.rent_cold ?? 0) * 12), 0) || null}
        purchasePrice={property.purchase_price}
      />

      <MietspiegelCard zip={property.zip} city={property.city} />

      <NeighborhoodInsight zip={property.zip} city={property.city} kind="rent" label={property.name} radiusKm={10} />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Wohneinheiten</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-gold text-primary-foreground shadow-gold"><Plus className="h-4 w-4 mr-2" /> Einheit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Wohneinheit hinzufügen</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Bezeichnung *</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="WE 01 / OG links" /></div>
              <div><Label>Wohnfläche (m²)</Label><Input type="number" step="0.1" value={form.living_space} onChange={(e) => setForm({ ...form, living_space: e.target.value })} /></div>
              <div><Label>Zimmer</Label><Input type="number" step="0.5" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} /></div>
              <div><Label>Kaltmiete (€)</Label><Input type="number" step="0.01" value={form.rent_cold} onChange={(e) => setForm({ ...form, rent_cold: e.target.value })} /></div>
              <div><Label>Nebenkosten (€)</Label><Input type="number" step="0.01" value={form.utilities} onChange={(e) => setForm({ ...form, utilities: e.target.value })} /></div>
              <div className="col-span-2"><Label>Bewohner-Anzahl <span className="text-muted-foreground text-[10px]">(für NK-Verteilung nach Personen)</span></Label><Input type="number" step="1" value={form.persons_count} onChange={(e) => setForm({ ...form, persons_count: e.target.value })} placeholder="z.B. 2" /></div>
            </div>
            <DialogFooter><Button onClick={addUnit} className="bg-gradient-gold text-primary-foreground shadow-gold">Hinzufügen</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {units.length === 0 ? (
        <Card className="p-10 text-center glass">
          <Home className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Noch keine Einheiten. Füge die erste hinzu.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {units.map(u => {
            const unitTenants = tenants.filter(t => t.unit_id === u.id && (!t.move_out || new Date(t.move_out) > new Date()));
            return (
              <Card key={u.id} className="p-5 glass">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">{u.label}</h3>
                  <span className="text-sm font-semibold text-gradient-gold">{eur(Number(u.rent_cold) + Number(u.utilities))}</span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground flex-wrap mb-3">
                  <span>{u.living_space ?? "—"} m²</span>
                  <span>{u.rooms ?? "—"} Zi.</span>
                  {u.persons_count != null && <span>{u.persons_count} Pers.</span>}
                  <span>Kalt {eur(u.rent_cold)} · NK {eur(u.utilities)}</span>
                </div>
                {unitTenants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {unitTenants.map(t => (
                      <Link key={t.id} to={`/app/tenants/${t.id}`} className="text-[11px] bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded-full">
                        👤 {t.full_name}
                      </Link>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Heiz-Anteil (%)</Label>
                  <Input
                    type="number" step="0.01" min="0" max="100"
                    className="h-7 text-xs w-24"
                    defaultValue={u.heating_share_pct ?? ""}
                    placeholder="auto"
                    onBlur={async (e) => {
                      const raw = e.target.value.trim();
                      const val = raw === "" ? null : Number(raw);
                      if (val !== null && (Number.isNaN(val) || val < 0 || val > 100)) return toast.error("0–100");
                      const { error } = await supabase.from("units").update({ heating_share_pct: val } as any).eq("id", u.id);
                      if (error) return toast.error(error.message);
                      toast.success("Heizkosten-Anteil gespeichert.");
                      load();
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">HeizkostenV-Override</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
