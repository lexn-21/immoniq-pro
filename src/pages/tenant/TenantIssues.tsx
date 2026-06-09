import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { date } from "@/lib/format";
import type { TenantCtx } from "./TenantLayout";

type Issue = { id: string; title: string; description: string | null; category: string; severity: string; status: string; reported_at: string };

const SEV_TONE: Record<string, string> = {
  info: "bg-muted text-muted-foreground", minor: "bg-info/15 text-info",
  major: "bg-warning/15 text-warning", urgent: "bg-destructive/15 text-destructive",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Offen", acknowledged: "Erhalten", in_progress: "In Bearbeitung", resolved: "Gelöst", closed: "Geschlossen",
};

export default function TenantIssues() {
  const ctx = useOutletContext<TenantCtx>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "sanitaer", severity: "minor", title: "", description: "" });

  const load = async () => {
    const { data } = await supabase.from("tenant_issues")
      .select("id, title, description, category, severity, status, reported_at")
      .eq("tenant_id", ctx.tenant.id).order("reported_at", { ascending: false });
    setIssues((data as Issue[] | null) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [ctx.tenant.id]);

  const submit = async () => {
    if (!form.title.trim() || !ctx.tenant.unit_id) return;
    const { error } = await supabase.from("tenant_issues").insert({
      user_id: ctx.tenant.user_id,
      tenant_id: ctx.tenant.id,
      unit_id: ctx.tenant.unit_id,
      category: form.category,
      severity: form.severity as any,
      title: form.title,
      description: form.description || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Schaden gemeldet — Vermieter wurde informiert");
    setOpen(false);
    setForm({ category: "sanitaer", severity: "minor", title: "", description: "" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schadensmeldungen</h1>
          <p className="text-sm text-muted-foreground">Schnell, dokumentiert, mit Status-Tracking.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Schaden melden</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuer Schaden</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sanitaer">Sanitär / Wasser</SelectItem>
                      <SelectItem value="elektrik">Elektrik</SelectItem>
                      <SelectItem value="heizung">Heizung</SelectItem>
                      <SelectItem value="fenster">Fenster / Türen</SelectItem>
                      <SelectItem value="schimmel">Schimmel</SelectItem>
                      <SelectItem value="laerm">Lärm / Nachbarn</SelectItem>
                      <SelectItem value="sonstiges">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dringlichkeit</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="minor">Klein</SelectItem>
                      <SelectItem value="major">Groß</SelectItem>
                      <SelectItem value="urgent">Dringend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="z. B. Heizung im Wohnzimmer kalt" />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button onClick={submit} disabled={!form.title.trim()} className="w-full h-11">Senden</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {issues.length === 0 ? (
          <div className="p-10 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Alles in Ordnung ✨</p>
            <p className="text-xs text-muted-foreground mt-1">Keine offenen Meldungen.</p>
          </div>
        ) : (
          <div className="divide-y">
            {issues.map(i => (
              <div key={i.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="font-medium">{i.title}</p>
                  <div className="flex gap-1.5">
                    <Badge className={SEV_TONE[i.severity]}>{i.severity}</Badge>
                    <Badge variant="outline">{STATUS_LABEL[i.status] ?? i.status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{date(i.reported_at)} · {i.category}</p>
                {i.description && <p className="text-sm text-muted-foreground mt-2">{i.description}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
