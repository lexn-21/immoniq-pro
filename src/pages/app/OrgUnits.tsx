import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Landmark, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";

type Unit = {
  id: string;
  parent_id: string | null;
  name: string;
  level: string;
  contact_email: string | null;
  notes: string | null;
};

const LEVELS = [
  { v: "bistum", l: "Bistum / Erzbistum" },
  { v: "landeskirche", l: "Landeskirche" },
  { v: "dekanat", l: "Dekanat / Kirchenkreis" },
  { v: "gemeinde", l: "Kirchengemeinde" },
  { v: "stiftung", l: "Stiftung" },
  { v: "verwaltung", l: "Verwaltung / Träger" },
  { v: "sonstige", l: "Sonstige" },
];

const OrgUnits = () => {
  const [items, setItems] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", level: "gemeinde", parent_id: "none", contact_email: "", notes: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("org_units" as any).select("*").order("level").order("name");
    if (error) toast.error(error.message);
    else setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); document.title = "Organisation · ImmonIQ"; }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name fehlt");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("org_units" as any).insert({
      user_id: user.id,
      name: form.name.trim(),
      level: form.level,
      parent_id: form.parent_id === "none" ? null : form.parent_id,
      contact_email: form.contact_email || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Einheit angelegt");
    setOpen(false);
    setForm({ name: "", level: "gemeinde", parent_id: "none", contact_email: "", notes: "" });
    load();
  };

  // Tree-Render
  const renderTree = (parentId: string | null, depth = 0): JSX.Element[] => {
    return items
      .filter((u) => u.parent_id === parentId)
      .map((u) => (
        <div key={u.id} style={{ marginLeft: depth * 20 }}>
          <Card className="p-3 mb-2 hover:bg-muted/30 transition">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {depth > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <Landmark className="h-4 w-4 text-primary shrink-0" />
                <div className="truncate">
                  <div className="font-medium truncate">{u.name}</div>
                  {u.contact_email && <div className="text-xs text-muted-foreground truncate">{u.contact_email}</div>}
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">{LEVELS.find(l => l.v === u.level)?.l ?? u.level}</Badge>
            </div>
          </Card>
          {renderTree(u.id, depth + 1)}
        </div>
      ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="h-7 w-7 text-primary" /> Organisation
          </h1>
          <p className="text-muted-foreground mt-1">
            Bistum → Dekanat → Gemeinde, oder Stiftung → Träger. Verknüpfe Objekte mit der richtigen Einheit.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Einheit hinzufügen</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neue Organisations-Einheit</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z. B. Bistum Münster" /></div>
              <div>
                <Label>Ebene</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Übergeordnet</Label>
                <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Keine" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Keine (Top-Level) —</SelectItem>
                    {items.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Kontakt-E-Mail</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><Label>Notizen</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button onClick={save}>Speichern</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Lädt…</Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Noch keine Organisations-Struktur"
          description="Für Bistümer, Landeskirchen, Stiftungen oder größere Verwaltungen: Lege deine Hierarchie an und hänge Objekte daran."
          action={{ label: "Erste Einheit anlegen", onClick: () => setOpen(true) }}
        />
      ) : (
        <div>{renderTree(null)}</div>
      )}
    </div>
  );
};

export default OrgUnits;
