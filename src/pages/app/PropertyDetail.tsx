import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Home } from "lucide-react";
import { toast } from "sonner";
import { eur } from "@/lib/format";
import { z } from "zod";
import { NeighborhoodInsight } from "@/components/market/NeighborhoodInsight";
import { MietspiegelCard } from "@/components/market/MietspiegelCard";

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
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "", living_space: "", rooms: "", rent_cold: "", utilities: "", persons_count: "" });

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    const [p, u] = await Promise.all([
      supabase.from("properties").select("*").eq("id", id).maybeSingle(),
      supabase.from("units").select("*").eq("property_id", id).order("label"),
    ]);
    setProperty(p.data);
    setUnits(u.data ?? []);
    if (p.data) document.title = `${p.data.name} · ImmonIQ`;
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

  return (
    <div className="space-y-6">
      <Link to="/app/properties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Alle Objekte
      </Link>

      <Card className="p-6 glass">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{property.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {[property.street, [property.zip, property.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Keine Adresse"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
          <div><p className="text-xs text-muted-foreground">Baujahr</p><p className="font-semibold">{property.build_year ?? "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Kaufpreis</p><p className="font-semibold">{property.purchase_price ? eur(property.purchase_price) : "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">AfA-Satz</p><p className="font-semibold">{property.afa_rate ?? "—"} %</p></div>
          <div><p className="text-xs text-muted-foreground">Sollmiete/Mo</p><p className="font-semibold text-gradient-gold">{eur(monthlyTotal)}</p></div>
        </div>
      </Card>

      <MietspiegelCard zip={property.zip} city={property.city} />

      <NeighborhoodInsight
        zip={property.zip}
        city={property.city}
        kind="rent"
        label={property.name}
        radiusKm={10}
      />

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
          {units.map(u => (
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
              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Heiz-Anteil (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
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
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
