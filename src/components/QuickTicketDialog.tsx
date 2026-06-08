import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";

interface Tenant {
  id: string;
  full_name: string;
  unit_id: string | null;
  unit?: { id: string; label: string; property?: { name: string } | null } | null;
}

const CATEGORIES = [
  ["sanitaer", "Sanitär"],
  ["heizung", "Heizung"],
  ["strom", "Strom"],
  ["schaedling", "Schädling"],
  ["schaden", "Schaden"],
  ["laerm", "Lärm"],
  ["schluessel", "Schlüssel"],
  ["sonstiges", "Sonstiges"],
] as const;

const SEVERITIES = [
  ["minor", "Klein"],
  ["major", "Wichtig"],
  ["critical", "Kritisch"],
] as const;

export default function QuickTicketDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState<string>("sonstiges");
  const [severity, setSeverity] = useState<string>("minor");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("tenants")
      .select("id, full_name, unit_id, unit:units(id, label, property:properties(name))")
      .order("full_name")
      .then(({ data, error }) => {
        if (error) return toastError(error);
        setTenants((data as any) || []);
      });
  }, [open]);

  const reset = () => {
    setTenantId(""); setCategory("sonstiges"); setSeverity("minor");
    setTitle(""); setDescription("");
  };

  const aiAnalyze = async () => {
    if (!description.trim()) return toast.info("Beschreibung eintragen, dann AI analysiert.");
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-issue-analyze", {
        body: { text: description },
      });
      if (error) throw error;
      if (data?.title) setTitle(data.title);
      if (data?.category) setCategory(data.category);
      if (data?.severity) setSeverity(data.severity);
      toast.success("KI hat klassifiziert ✨");
    } catch (e: any) {
      toastError(e);
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async () => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return toast.error("Mieter wählen");
    if (!tenant.unit_id) return toast.error("Mieter hat keine zugeordnete Einheit");
    if (!title.trim()) return toast.error("Titel fehlt");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("tenant_issues").insert({
      user_id: user.id,
      tenant_id: tenant.id,
      unit_id: tenant.unit_id,
      category,
      severity: severity as any,
      title: title.trim(),
      description: description.trim() || null,
      status: "open",
      reported_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toastError(error);
    toast.success("Ticket angelegt");
    reset();
    setOpen(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-xl z-40"
          aria-label="Neues Ticket"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neues Ticket erfassen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Mieter</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Mieter wählen …" /></SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                    {t.unit?.property?.name ? ` · ${t.unit.property.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Beschreibung (was wurde gemeldet?)</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z. B. Heizung in Schlafzimmer wird seit gestern nicht mehr warm …"
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={aiAnalyze}
              disabled={aiBusy}
            >
              {aiBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              KI: Titel & Kategorie vorschlagen
            </Button>
          </div>

          <div>
            <Label>Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kurz & klar" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schwere</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button className="flex-1" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Anlegen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
