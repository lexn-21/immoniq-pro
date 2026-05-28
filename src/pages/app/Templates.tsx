import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, FileText, AlertCircle, Plus, Pencil, Trash2, Copy, Download, Wand2 } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { CardGridSkeleton } from "@/components/ListSkeleton";

interface Template {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  source: string | null;
  url: string | null;
  format: string | null;
  is_free: boolean;
}

interface UserTemplate {
  id: string;
  title: string;
  category: string | null;
  body_md: string;
  updated_at: string;
}

const CATEGORIES = ["Mietvertrag", "Kündigung", "Mahnung", "Übergabeprotokoll", "Hausordnung", "Sonstiges"];

export default function Templates() {
  const [items, setItems] = useState<Template[]>([]);
  const [mine, setMine] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<UserTemplate>>({});
  const [saving, setSaving] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyTemplate, setApplyTemplate] = useState<UserTemplate | null>(null);

  useEffect(() => {
    document.title = "Vertragsvorlagen · ImmonIQ";
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.from("contract_templates").select("*").order("sort_order"),
      supabase.from("user_templates").select("*").order("updated_at", { ascending: false }),
    ]);
    setItems((a.data as Template[]) || []);
    setMine((b.data as UserTemplate[]) || []);
    setLoading(false);
  };

  const grouped = items.reduce<Record<string, Template[]>>((acc, t) => {
    const k = t.category || "Sonstige";
    (acc[k] = acc[k] || []).push(t);
    return acc;
  }, {});

  const saveTemplate = async () => {
    if (!edit.title?.trim()) return toast.error("Titel fehlt");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload: any = {
      user_id: user.id,
      title: edit.title.trim(),
      category: edit.category || null,
      body_md: edit.body_md || "",
    };
    const res = edit.id
      ? await supabase.from("user_templates").update(payload).eq("id", edit.id)
      : await supabase.from("user_templates").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(edit.id ? "Aktualisiert." : "Vorlage gespeichert.");
    setOpen(false); setEdit({});
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Vorlage löschen?")) return;
    const { error } = await supabase.from("user_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gelöscht.");
    load();
  };

  const duplicate = (t: UserTemplate) => {
    setEdit({ title: `${t.title} (Kopie)`, category: t.category, body_md: t.body_md });
    setOpen(true);
  };

  const exportTxt = (t: UserTemplate) => {
    const blob = new Blob([t.body_md], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${t.title}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Vertragsvorlagen</h1>
        <p className="text-muted-foreground mt-1">Geprüfte Quellen + deine eigenen Vorlagen.</p>
      </div>

      <Tabs defaultValue="curated">
        <TabsList>
          <TabsTrigger value="curated">Geprüfte Quellen</TabsTrigger>
          <TabsTrigger value="mine">Meine Vorlagen {mine.length > 0 && <Badge variant="secondary" className="ml-2">{mine.length}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="curated" className="space-y-6 mt-6">
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              Wir verlinken zu geprüften Quellen wie <strong className="text-foreground">Haus &amp; Grund</strong> und{" "}
              <strong className="text-foreground">Mieterbund</strong> statt eigene Vorlagen zu generieren — wegen
              BGH-Updates und Haftungsrisiko. So bleiben deine Verträge immer aktuell und rechtssicher.
            </div>
          </div>
          {loading && <CardGridSkeleton count={4} />}
          {!loading && items.length === 0 && (
            <EmptyState icon={FileText} title="Noch keine Vorlagen geladen" description="Sobald die geprüften Quellen synchronisiert sind, findest du hier rechtssichere Verträge." />
          )}
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {list.map(t => (
                  <Card key={t.id} className="glass hover:border-primary/40 transition">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{t.title}</p>
                          {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {t.source && <Badge variant="secondary">{t.source}</Badge>}
                            {t.format && <Badge variant="outline">{t.format}</Badge>}
                            <Badge className={t.is_free ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30"}>
                              {t.is_free ? "Kostenlos" : "Kostenpflichtig"}
                            </Badge>
                          </div>
                          {t.url && (
                            <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3">
                              Öffnen <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="mine" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Eigene Bausteine, Anschreiben, individuelle Klauseln — bleibt nur bei dir.</p>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit({}); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-gold text-primary-foreground shadow-gold"><Plus className="h-4 w-4 mr-1" /> Neue Vorlage</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{edit.id ? "Vorlage bearbeiten" : "Neue Vorlage"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Titel *</Label><Input value={edit.title || ""} onChange={e => setEdit({ ...edit, title: e.target.value })} placeholder="z.B. Mahnung 1. Stufe" /></div>
                  <div>
                    <Label>Kategorie</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={edit.category || ""} onChange={e => setEdit({ ...edit, category: e.target.value })}>
                      <option value="">— wählen —</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Inhalt (Markdown / Platzhalter wie {"{name}"}, {"{datum}"})</Label>
                    <Textarea rows={12} value={edit.body_md || ""} onChange={e => setEdit({ ...edit, body_md: e.target.value })} placeholder="Sehr geehrte/r {name},&#10;&#10;…" className="font-mono text-xs" />
                  </div>
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ Eigene Vorlagen sind <strong>keine Rechtsberatung</strong>. Bei wichtigen Verträgen geprüfte Quellen oder Anwalt nutzen.
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
                  <Button onClick={saveTemplate} disabled={saving} className="bg-gradient-gold text-primary-foreground">{saving ? "Speichere…" : "Speichern"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {mine.length === 0 ? (
            <EmptyState icon={FileText} title="Noch keine eigenen Vorlagen" description="Lege dir wiederkehrende Anschreiben, Mahnungen oder Klauseln als Vorlage an." />
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {mine.map(t => (
                <Card key={t.id} className="glass">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{t.title}</p>
                        {t.category && <Badge variant="outline" className="mt-1">{t.category}</Badge>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEdit(t); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(t)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => exportTxt(t)}><Download className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap font-mono">{t.body_md || "—"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
