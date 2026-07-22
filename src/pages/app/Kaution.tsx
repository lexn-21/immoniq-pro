import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Plus, ShieldCheck, Banknote, Info } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";

const eur = (n: number) => (n / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  offen: { label: "Offen", variant: "outline" },
  verwahrt: { label: "Verwahrt", variant: "default" },
  teilverrechnet: { label: "Teil verrechnet", variant: "secondary" },
  ausgezahlt: { label: "Ausgezahlt", variant: "secondary" },
  streitig: { label: "Streitig", variant: "destructive" },
};

const KIND_LABEL: Record<string, string> = {
  immoniq_trust: "ImmonIQ-Treuhand",
  sparbuch: "Mietkautionssparbuch",
  bankburgschaft: "Bankbürgschaft",
  barkaution: "Barkaution",
  sonstiges: "Sonstiges",
};

export default function Kaution() {
  usePageSeo({ title: "Kautions-Konto — ImmonIQ", description: "Kautionen rechtssicher verwahren nach §551 BGB — Übersicht, Verzinsung, Auszahlung." });
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    tenant_id: "",
    amount_eur: "",
    account_kind: "immoniq_trust",
    interest_rate_bps: "50", // 0.5%
    custodian: "ImmonIQ Treuhand (in Kürze verfügbar)",
    received_on: new Date().toISOString().slice(0, 10),
  });

  async function load() {
    if (!user) return;
    setLoading(true);
    const [r, t] = await Promise.all([
      (supabase as any).from("deposit_accounts").select("*, tenants(full_name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, full_name, unit_id").eq("user_id", user.id).is("archived_at", null).order("full_name"),
    ]);
    setRows(r.data ?? []);
    setTenants(t.data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [user]);

  async function save() {
    if (!user) return;
    if (!form.amount_eur || +form.amount_eur <= 0) { toast.error("Betrag angeben"); return; }
    const tenant = tenants.find(t => t.id === form.tenant_id);
    const { error } = await (supabase as any).from("deposit_accounts").insert({
      user_id: user.id,
      tenant_id: form.tenant_id || null,
      unit_id: tenant?.unit_id ?? null,
      amount_cents: Math.round(+form.amount_eur * 100),
      account_kind: form.account_kind,
      interest_rate_bps: +form.interest_rate_bps || 0,
      custodian: form.custodian,
      received_on: form.received_on,
      status: form.account_kind === "immoniq_trust" ? "offen" : "verwahrt",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Kaution erfasst");
    setOpen(false);
    setForm({ ...form, tenant_id: "", amount_eur: "" });
    load();
  }

  async function setStatus(id: string, status: string) {
    await (supabase as any).from("deposit_accounts").update({ status, released_on: status === "ausgezahlt" ? new Date().toISOString().slice(0, 10) : null }).eq("id", id);
    load();
  }

  const total = rows.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const verwahrt = rows.filter(r => r.status === "verwahrt" || r.status === "offen").reduce((s, r) => s + (r.amount_cents ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Kautions-Konto</h1>
          <p className="text-muted-foreground mt-1">Rechtssichere Verwahrung nach § 551 BGB — separat vom Vermieter-Vermögen, verzinst.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> Kaution erfassen</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neue Kaution</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Mieter</Label>
                <Select value={form.tenant_id} onValueChange={v => setForm({ ...form, tenant_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Wähle einen Mieter" /></SelectTrigger>
                  <SelectContent>{tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Betrag (EUR)</Label>
                <Input type="number" value={form.amount_eur} onChange={e => setForm({ ...form, amount_eur: e.target.value })} placeholder="1500" />
                <p className="text-xs text-muted-foreground mt-1">§ 551 BGB: max. 3 Nettokaltmieten</p>
              </div>
              <div>
                <Label>Verwahrungsform</Label>
                <Select value={form.account_kind} onValueChange={v => setForm({ ...form, account_kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(KIND_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Zinssatz (Bps)</Label><Input type="number" value={form.interest_rate_bps} onChange={e => setForm({ ...form, interest_rate_bps: e.target.value })} /></div>
                <div><Label>Erhalten am</Label><Input type="date" value={form.received_on} onChange={e => setForm({ ...form, received_on: e.target.value })} /></div>
              </div>
              <div><Label>Verwahrer</Label><Input value={form.custodian} onChange={e => setForm({ ...form, custodian: e.target.value })} /></div>
              <Button onClick={save} className="w-full">Speichern</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Gesamt-Volumen</p><p className="text-2xl font-bold">{eur(total)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Aktiv verwahrt</p><p className="text-2xl font-bold text-primary">{eur(verwahrt)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Kautionen</p><p className="text-2xl font-bold">{rows.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Ø Verzinsung</p><p className="text-2xl font-bold">{rows.length ? (rows.reduce((s, r) => s + (r.interest_rate_bps ?? 0), 0) / rows.length / 100).toFixed(2) : "0,00"}%</p></CardContent></Card>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>ImmonIQ-Treuhand (Preview)</AlertTitle>
        <AlertDescription>Wir bereiten die Anbindung an einen BaFin-registrierten Verwahrpartner vor. Bis zur Freischaltung nutzt du diese Übersicht als revisionssicheres Register — inklusive Vertrags-PDF und Verzinsungs-Ausweis nach §551 Abs. 3 BGB.</AlertDescription>
      </Alert>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Alle Kautionen</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
            rows.length === 0 ? <p className="text-sm text-muted-foreground py-4">Noch keine Kaution erfasst.</p> :
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.tenants?.full_name ?? "Ohne Mieter"}</p>
                    <p className="text-xs text-muted-foreground">{KIND_LABEL[r.account_kind]} · {r.custodian ?? "—"} · seit {r.received_on ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold">{eur(r.amount_cents)}</p>
                      <p className="text-[10px] text-muted-foreground">{(r.interest_rate_bps / 100).toFixed(2)}% p.a.</p>
                    </div>
                    <Badge variant={STATUS_LABEL[r.status]?.variant}>{STATUS_LABEL[r.status]?.label ?? r.status}</Badge>
                    <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
