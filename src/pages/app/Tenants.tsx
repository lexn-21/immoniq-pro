import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Mail, Phone, Link2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { eur, date } from "@/lib/format";
import { z } from "zod";
import EmptyState from "@/components/EmptyState";
import { CardGridSkeleton } from "@/components/ListSkeleton";

const schema = z.object({
  property_id: z.string().uuid("Objekt wählen"),
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  lease_start: z.string().optional().or(z.literal("")),
  lease_end: z.string().optional().or(z.literal("")),
  deposit: z.number().min(0).max(99999).optional(),
});

const Tenants = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ property_id: "", full_name: "", email: "", phone: "", lease_start: "", lease_end: "", deposit: "" });

  useEffect(() => { document.title = "Mieter · ImmonIQ"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const [t, p] = await Promise.all([
      supabase.from("tenants").select("*, properties(name)").order("created_at", { ascending: false }),
      supabase.from("properties").select("id, name").order("name"),
    ]);
    setTenants(t.data ?? []);
    setProperties(p.data ?? []);
    setLoading(false);
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      property_id: form.property_id,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      lease_start: form.lease_start,
      lease_end: form.lease_end,
      deposit: form.deposit ? Number(form.deposit) : undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Default-Unit sicherstellen (für Konsistenz mit bestehenden Modulen)
    const { data: unitId, error: uErr } = await supabase.rpc("ensure_default_unit", { _property_id: parsed.data.property_id });
    if (uErr) return toast.error(uErr.message);

    const payload: any = { ...parsed.data, user_id: user.id, unit_id: unitId };
    if (!payload.email) delete payload.email;
    if (!payload.phone) delete payload.phone;
    if (!payload.lease_start) delete payload.lease_start;
    if (!payload.lease_end) delete payload.lease_end;
    const { error } = await supabase.from("tenants").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Mieter angelegt.");
    setOpen(false);
    setForm({ property_id: "", full_name: "", email: "", phone: "", lease_start: "", lease_end: "", deposit: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Mieter</h1>
          <p className="text-muted-foreground text-sm mt-1">Mietverhältnisse und Kontaktdaten.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground shadow-gold" disabled={properties.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> Mieter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuer Mieter</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Objekt *</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                  <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>E-Mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Mietbeginn</Label><Input type="date" value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} /></div>
              <div><Label>Mietende</Label><Input type="date" value={form.lease_end} onChange={(e) => setForm({ ...form, lease_end: e.target.value })} /></div>
              <div className="col-span-2"><Label>Kaution (€)</Label><Input type="number" step="0.01" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-gold text-primary-foreground shadow-gold">Anlegen</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {loading ? (
        <CardGridSkeleton count={2} />
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Erstmal ein Objekt anlegen"
          description="Mieter werden Objekten zugeordnet. Lege zuerst deine erste Immobilie an."
          action={{ label: "Objekt anlegen", to: "/app/properties", icon: Plus }}
        />
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Noch keine Mieter"
          description="Erfasse Mietverhältnisse mit Kontaktdaten und Kaution. Generiere danach mit einem Klick einen Mieter-Portal-Link."
          action={{ label: "Mieter anlegen", onClick: () => setOpen(true), icon: Plus }}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {tenants.map(t => (
            <Card key={t.id} className="p-5 glass">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold">{t.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{t.properties?.name}</p>
                </div>
                {t.deposit && <span className="text-xs px-2 py-0.5 rounded-full bg-muted">Kaution {eur(t.deposit)}</span>}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground mt-3">
                {t.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {t.email}</p>}
                {t.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {t.phone}</p>}
                <p>Vertrag: {date(t.lease_start)} – {t.lease_end ? date(t.lease_end) : "unbefristet"}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={async () => {
                const { data: auth } = await supabase.auth.getUser();
                if (!auth.user || !t.unit_id) return;
                const existing = await supabase.from("tenant_portal_links")
                  .select("token").eq("tenant_id", t.id).eq("revoked", false).maybeSingle();
                let token = existing.data?.token;
                if (!token) {
                  const ins = await supabase.from("tenant_portal_links").insert({
                    user_id: auth.user.id, tenant_id: t.id, unit_id: t.unit_id,
                  }).select("token").single();
                  if (ins.error) { toast.error(ins.error.message); return; }
                  token = ins.data.token;
                }
                const url = `${window.location.origin}/mieter/${token}`;
                await navigator.clipboard.writeText(url);
                toast.success("Mieter-Link kopiert", { description: url });
              }}>
                <Link2 className="h-3.5 w-3.5 mr-1.5" /> Mieter-Portal-Link
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tenants;
