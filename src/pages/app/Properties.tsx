import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, MapPin, ArrowRight, Megaphone, Users, Home as HomeIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { eur } from "@/lib/format";
import { z } from "zod";
import EmptyState from "@/components/EmptyState";
import { CardGridSkeleton } from "@/components/ListSkeleton";

const schema = z.object({
  name: z.string().trim().min(1, "Name fehlt").max(100),
  street: z.string().trim().max(120).optional().or(z.literal("")),
  zip: z.string().trim().max(10).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  build_year: z.number().int().min(1800).max(2100).optional(),
  area_sqm: z.number().min(0).max(100000).optional(),
  rooms: z.number().min(0).max(50).optional(),
  purchase_price: z.number().min(0).max(99999999).optional(),
  purchase_date: z.string().optional().or(z.literal("")),
  afa_rate: z.number().min(0).max(20).optional(),
  sonderafa_7b: z.boolean().optional(),
  cold_rent: z.number().min(0).max(999999).optional(),
  utilities: z.number().min(0).max(999999).optional(),
  deposit: z.number().min(0).max(9999999).optional(),
});

const empty = { name: "", street: "", zip: "", city: "", build_year: "", area_sqm: "", rooms: "", purchase_price: "", purchase_date: "", afa_rate: "2", sonderafa_7b: false, cold_rent: "", utilities: "", deposit: "" };

const Properties = () => {
  const [items, setItems] = useState<any[]>([]);
  const [unitsByProp, setUnitsByProp] = useState<Record<string, any[]>>({});
  const [tenantsByProp, setTenantsByProp] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "rented" | "vacant" | "self_use">("all");

  useEffect(() => { document.title = "Objekte · ImmonIQ"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: props } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
    const propsArr = props ?? [];
    setItems(propsArr);

    const ids = propsArr.map((p) => p.id);
    if (ids.length) {
      const [u, t] = await Promise.all([
        supabase.from("units").select("id,property_id,rent_cold,utilities,label").in("property_id", ids),
        supabase.from("tenants").select("id,property_id,full_name,move_out").in("property_id", ids),
      ]);
      const uMap: Record<string, any[]> = {};
      (u.data ?? []).forEach((x: any) => { (uMap[x.property_id] ||= []).push(x); });
      const tMap: Record<string, any[]> = {};
      (t.data ?? []).forEach((x: any) => { (tMap[x.property_id] ||= []).push(x); });
      setUnitsByProp(uMap);
      setTenantsByProp(tMap);
    }
    setLoading(false);
  };

  const submit = async () => {
    const num = (v: string) => v ? Number(v) : undefined;
    const parsed = schema.safeParse({
      name: form.name, street: form.street, zip: form.zip, city: form.city,
      build_year: num(form.build_year), area_sqm: num(form.area_sqm), rooms: num(form.rooms),
      purchase_price: num(form.purchase_price), purchase_date: form.purchase_date,
      afa_rate: num(form.afa_rate), sonderafa_7b: !!form.sonderafa_7b,
      cold_rent: num(form.cold_rent), utilities: num(form.utilities), deposit: num(form.deposit),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Nicht angemeldet.");

    // Hartes Limit kommt aus DB-Trigger (check_user_quota): Free=1, Verwalten+=10, Pro=unbegrenzt

    const payload: any = { ...parsed.data, user_id: user.id };
    Object.keys(payload).forEach(k => { if (payload[k] === "" || payload[k] === undefined) delete payload[k]; });

    const { error } = await supabase.from("properties").insert(payload);
    if (error) return toastError(error, { onRetry: submit });
    toast.success("Objekt angelegt — 4 Standard-Fristen wurden automatisch erzeugt.");
    setOpen(false);
    setForm(empty);
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Objekte</h1>
          <p className="text-muted-foreground text-sm mt-1">Deine Immobilien — Stammdaten und AfA.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold"><Plus className="h-4 w-4 mr-2" /> Neues Objekt</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Neues Objekt anlegen</DialogTitle></DialogHeader>

            <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-2">Stammdaten</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MFH Hauptstraße" /></div>
              <div className="col-span-2"><Label>Straße & Nr.</Label><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
              <div><Label>PLZ</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
              <div><Label>Ort</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Baujahr</Label><Input type="number" value={form.build_year} onChange={(e) => setForm({ ...form, build_year: e.target.value })} /></div>
              <div><Label>Wohnfläche (m²)</Label><Input type="number" step="0.1" value={form.area_sqm} onChange={(e) => setForm({ ...form, area_sqm: e.target.value })} /></div>
              <div><Label>Zimmer</Label><Input type="number" step="0.5" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} /></div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-4">Steuerliche Daten</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kaufpreis (€)</Label><Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></div>
              <div><Label>Kaufdatum</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
              <div><Label>AfA-Satz % (§ 7 EStG)</Label><Input type="number" step="0.01" value={form.afa_rate} onChange={(e) => setForm({ ...form, afa_rate: e.target.value })} /></div>
              <div className="flex items-end gap-2 pb-2">
                <input type="checkbox" id="s7b" checked={form.sonderafa_7b} onChange={(e) => setForm({ ...form, sonderafa_7b: e.target.checked })} className="h-4 w-4 accent-primary" />
                <Label htmlFor="s7b" className="text-sm font-normal cursor-pointer">Sonder-AfA § 7b prüfen</Label>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-4">Miete & Kaution (optional)</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Kaltmiete (€/Mo)</Label><Input type="number" step="0.01" value={form.cold_rent} onChange={(e) => setForm({ ...form, cold_rent: e.target.value })} /></div>
              <div><Label>NK (€/Mo)</Label><Input type="number" step="0.01" value={form.utilities} onChange={(e) => setForm({ ...form, utilities: e.target.value })} /></div>
              <div><Label>Kaution (€)</Label><Input type="number" step="0.01" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} /></div>
            </div>

            <DialogFooter className="mt-4"><Button onClick={submit} className="bg-gradient-gold text-primary-foreground shadow-gold">Anlegen</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Filter / Suche */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen (Name, Straße, Ort, PLZ)…" className="pl-9 h-9" />
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {[
              { id: "all", label: "Alle" },
              { id: "rented", label: "Vermietet" },
              { id: "vacant", label: "Leerstand" },
              { id: "self_use", label: "Eigennutzung" },
            ].map((o) => (
              <button
                key={o.id}
                onClick={() => setStatusFilter(o.id as any)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${statusFilter === o.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{o.label}</button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground ml-auto">{items.length} Objekt{items.length === 1 ? "" : "e"}</span>
        </div>
      )}

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Dein erstes Objekt wartet"
          description="Lege jetzt deine erste Immobilie an — Stammdaten, AfA und Mietkonditionen in unter einer Minute. Wir generieren automatisch deine 4 wichtigsten Fristen."
          action={{ label: "Objekt anlegen", onClick: () => setOpen(true), icon: Plus }}
          secondary={{ label: "Tour starten", to: "/app/onboarding" }}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items
            .filter((p) => statusFilter === "all" || (p.status ?? "rented") === statusFilter)
            .filter((p) => {
              if (!q.trim()) return true;
              const hay = `${p.name} ${p.street ?? ""} ${p.zip ?? ""} ${p.city ?? ""}`.toLowerCase();
              return hay.includes(q.toLowerCase());
            })
            .map((p) => {
              const units = unitsByProp[p.id] ?? [];
              const tenants = (tenantsByProp[p.id] ?? []).filter((t: any) => !t.move_out || new Date(t.move_out) > new Date());
              const sollMo = units.reduce((s, u) => s + Number(u.rent_cold || 0) + Number(u.utilities || 0), 0);
              const status = p.status ?? "rented";
              return (
                <Card key={p.id} className="overflow-hidden glass hover:shadow-gold transition group flex flex-col">
                  <Link to={`/app/properties/${p.id}`} className="block">
                    {p.image_url ? (
                      <div className="h-32 bg-muted relative">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        <Badge className="absolute top-2 right-2 backdrop-blur-sm" variant={status === "vacant" ? "secondary" : status === "self_use" ? "outline" : "default"}>
                          {status === "vacant" ? "Leerstand" : status === "self_use" ? "Eigennutzung" : "Vermietet"}
                        </Badge>
                      </div>
                    ) : (
                      <div className="h-24 bg-gradient-to-br from-muted to-muted/30 flex items-center justify-between px-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
                          <Building2 className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <Badge variant={status === "vacant" ? "secondary" : status === "self_use" ? "outline" : "default"}>
                          {status === "vacant" ? "Leerstand" : status === "self_use" ? "Eigennutzung" : "Vermietet"}
                        </Badge>
                      </div>
                    )}
                  </Link>

                  <div className="p-5 flex-1 flex flex-col">
                    <Link to={`/app/properties/${p.id}`} className="block flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-lg leading-tight">{p.name}</h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition flex-shrink-0 mt-1" />
                      </div>
                      {(p.street || p.city) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{[p.street, [p.zip, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-2 my-3 pt-3 border-t border-border">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><HomeIcon className="h-3 w-3" /> Einh.</div>
                          <div className="font-bold text-sm">{units.length}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Mieter</div>
                          <div className="font-bold text-sm">{tenants.length}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Soll/Mo</div>
                          <div className="font-bold text-sm text-gradient-gold">{sollMo > 0 ? eur(sollMo) : "—"}</div>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Bj. {p.build_year ?? "—"}</span>
                        <span className="font-medium">{p.purchase_price ? eur(p.purchase_price) : "—"}</span>
                      </div>
                    </Link>

                    <Button asChild size="sm" variant="outline" className="w-full mt-3 border-primary/30 hover:bg-primary/5">
                      <Link to={`/app/listings/new?property=${p.id}`}>
                        <Megaphone className="h-3.5 w-3.5 mr-1.5 text-primary" /> Vermarkten
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default Properties;
