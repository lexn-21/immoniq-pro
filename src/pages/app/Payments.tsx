import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, Building2 } from "lucide-react";
import { toast } from "sonner";
import { eur, date } from "@/lib/format";
import { z } from "zod";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { Link } from "react-router-dom";

const schema = z.object({
  property_id: z.string().uuid("Objekt wählen"),
  paid_on: z.string().min(1, "Datum fehlt"),
  amount: z.number().min(0.01).max(999999),
  kind: z.enum(["rent_cold","utilities","deposit","other"]),
  note: z.string().max(300).optional().or(z.literal("")),
});

const KIND_LABEL: Record<string, string> = {
  rent_cold: "Kaltmiete", utilities: "Nebenkosten", deposit: "Kaution", other: "Sonstige",
};

const Payments = () => {
  const [items, setItems] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ property_id: "", paid_on: new Date().toISOString().slice(0, 10), amount: "", kind: "rent_cold", note: "" });

  useEffect(() => { document.title = "Zahlungen · ImmonIQ"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const [p, pr] = await Promise.all([
      supabase.from("payments").select("*, properties(name)").order("paid_on", { ascending: false }),
      supabase.from("properties").select("id, name").order("name"),
    ]);
    setItems(p.data ?? []);
    setProperties(pr.data ?? []);
    setLoading(false);
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      property_id: form.property_id,
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
    const { error } = await supabase.from("payments").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Zahlung erfasst.");
    setOpen(false);
    setForm({ property_id: "", paid_on: new Date().toISOString().slice(0, 10), amount: "", kind: "rent_cold", note: "" });
    load();
  };

  const total = items.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Zahlungen</h1>
          <p className="text-muted-foreground text-sm mt-1">Erfasste Mietzahlungen — Bank-Anbindung folgt.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground shadow-gold" disabled={properties.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> Zahlung
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Zahlung erfassen</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Objekt *</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
                  <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Datum *</Label><Input type="date" value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} /></div>
              <div><Label>Betrag (€) *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="col-span-2"><Label>Art</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent_cold">Kaltmiete</SelectItem>
                    <SelectItem value="utilities">Nebenkosten</SelectItem>
                    <SelectItem value="deposit">Kaution</SelectItem>
                    <SelectItem value="other">Sonstige</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Notiz</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-gold text-primary-foreground shadow-gold">Erfassen</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {!loading && items.length > 0 && (
        <Card className="p-6 glass">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Summe aller erfassten Zahlungen</p>
              <p className="text-3xl font-bold mt-1 text-gradient-gold">{eur(total)}</p>
            </div>
            <Wallet className="h-8 w-8 text-primary" />
          </div>
        </Card>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Erstmal ein Objekt anlegen"
          description="Zahlungen werden Objekten zugeordnet. Lege zuerst deine erste Immobilie an, dann kannst du hier Mieten erfassen."
          action={{ label: "Objekt anlegen", to: "/app/properties", icon: Plus }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Noch keine Zahlungen erfasst"
          description="Erfasse Mieteingänge, Nebenkosten und Kautionen — automatisch in deinen Steuerbericht übernommen."
          action={{ label: "Erste Zahlung erfassen", onClick: () => setOpen(true), icon: Plus }}
        />
      ) : (
        <Card className="glass overflow-hidden">
          {/* Mobile: Card-Liste */}
          <div className="md:hidden divide-y divide-border">
            {items.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.properties?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {date(p.paid_on)} · {KIND_LABEL[p.kind]}
                  </p>
                </div>
                <p className="font-semibold text-success whitespace-nowrap">+{eur(p.amount)}</p>
              </div>
            ))}
          </div>
          {/* Desktop: Tabelle */}
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="text-left p-3">Datum</th>
                <th className="text-left p-3">Objekt</th>
                <th className="text-left p-3">Art</th>
                <th className="text-right p-3">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">{date(p.paid_on)}</td>
                  <td className="p-3">{p.properties?.name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{KIND_LABEL[p.kind]}</td>
                  <td className="p-3 text-right font-semibold text-success">+{eur(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default Payments;
