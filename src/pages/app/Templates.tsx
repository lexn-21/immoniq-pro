import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Pencil, Trash2, Copy, Download, Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { CardGridSkeleton } from "@/components/ListSkeleton";

interface UserTemplate {
  id: string;
  title: string;
  category: string | null;
  body_md: string;
  updated_at: string;
}

const CATEGORIES = ["Mietvertrag", "Kündigung", "Mahnung", "Übergabeprotokoll", "Hausordnung", "Sonstiges"];

const STARTERS: Array<{ title: string; category: string; body_md: string }> = [
  {
    title: "Mahnung – 1. Stufe",
    category: "Mahnung",
    body_md: `Sehr geehrte/r {name},

leider konnten wir für die Wohnung {adresse} noch keinen Eingang der fälligen Miete in Höhe von {kaltmiete} für den Monat feststellen.

Bitte begleichen Sie den offenen Betrag bis spätestens in 7 Tagen.

Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben als gegenstandslos.

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Mieterhöhung – Anschreiben",
    category: "Mietvertrag",
    body_md: `Sehr geehrte/r {name},

für die Wohnung {adresse} bitte ich Sie um Zustimmung zur Mieterhöhung ab dem nächsten zulässigen Termin.

Die ortsübliche Vergleichsmiete liegt aktuell höher als Ihre derzeitige Kaltmiete von {kaltmiete}. Eine Begründung anhand des örtlichen Mietspiegels füge ich bei.

Bitte teilen Sie mir bis innerhalb von 2 Monaten Ihre Zustimmung mit (§ 558 BGB).

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Wohnungs-Übergabeprotokoll",
    category: "Übergabeprotokoll",
    body_md: `ÜBERGABEPROTOKOLL

Objekt: {adresse}
Mieter: {name}
Übergabedatum: {datum}

Zählerstände
- Strom: ________
- Gas: ________
- Wasser kalt: ________
- Wasser warm: ________

Schlüssel übergeben
- Wohnungstür: ____ Stück
- Haustür: ____ Stück
- Briefkasten: ____ Stück
- Sonstige: ____

Zustand der Räume
(Beschreibung / Mängel je Raum)

Unterschriften
Übergeber: ___________________
Übernehmer: ___________________`,
  },
  {
    title: "Kündigung – Mietverhältnis (Vermieter)",
    category: "Kündigung",
    body_md: `Sehr geehrte/r {name},

hiermit kündige ich das Mietverhältnis über die Wohnung {adresse} ordentlich zum nächsten zulässigen Zeitpunkt unter Beachtung der gesetzlichen Kündigungsfrist (§ 573c BGB).

Begründung: ____________________________________________

Bitte räumen Sie die Wohnung fristgerecht und übergeben Sie sie in vertragsgemäßem Zustand.

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Hausordnung – Kurzfassung",
    category: "Hausordnung",
    body_md: `HAUSORDNUNG · {adresse}

1. Ruhezeiten: 22:00 – 06:00 Uhr und sonntags ganztägig.
2. Treppenhaus, Flure, Keller und Gemeinschaftsräume sind freizuhalten.
3. Müll bitte sortiert in den vorgesehenen Tonnen entsorgen.
4. Lüften nur kurz und durchziehend (Stoßlüften), kein Dauerkippen.
5. Reparaturen und Schäden umgehend dem Vermieter melden.
6. Rücksicht auf Mitbewohner — keine Belästigung durch Lärm, Gerüche, Rauch.

Stand: {datum}
{vermieter}`,
  },
];

const VAR_HINTS = ["name", "adresse", "kaltmiete", "datum", "mietbeginn", "vermieter", "objekt", "kaution"];

export default function Templates() {
  const [mine, setMine] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<UserTemplate>>({});
  const [saving, setSaving] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyTemplate, setApplyTemplate] = useState<UserTemplate | null>(null);

  useEffect(() => {
    document.title = "Vorlagen · ImmonIQ";
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const b = await supabase.from("user_templates").select("*").order("updated_at", { ascending: false });
    setMine((b.data as UserTemplate[]) || []);
    setLoading(false);
  };

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

  const seedStarters = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = new Set(mine.map(m => m.title));
    const inserts = STARTERS.filter(s => !existing.has(s.title)).map(s => ({ ...s, user_id: user.id }));
    if (inserts.length === 0) return toast("Alle Starter sind schon angelegt.");
    const { error } = await supabase.from("user_templates").insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`${inserts.length} Starter-Vorlagen angelegt.`);
    load();
  };

  const useStarter = (s: typeof STARTERS[number]) => {
    setEdit({ title: s.title, category: s.category, body_md: s.body_md });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vorlagen</h1>
          <p className="text-muted-foreground mt-1">
            Schreib einmal — fülle mit einem Klick aus deinen Mieter- und Objekt-Daten.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {mine.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedStarters}>
              <Sparkles className="h-4 w-4 mr-1.5 text-primary" /> Starter laden
            </Button>
          )}
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit({}); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-gold text-primary-foreground shadow-gold">
                <Plus className="h-4 w-4 mr-1" /> Neue Vorlage
              </Button>
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
                  <div className="flex items-center justify-between mb-1">
                    <Label>Inhalt</Label>
                    <div className="flex gap-1 flex-wrap">
                      {VAR_HINTS.map(v => (
                        <button key={v} type="button" onClick={() => setEdit(e => ({ ...e, body_md: (e.body_md || "") + `{${v}}` }))} className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70 font-mono">
                          {`{${v}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea rows={14} value={edit.body_md || ""} onChange={e => setEdit({ ...edit, body_md: e.target.value })} placeholder="Sehr geehrte/r {name},&#10;&#10;…" className="font-mono text-xs" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Tipp: Klick einen Platzhalter, um ihn einzufügen — beim Anwenden werden sie automatisch aus deinen Mieter-/Objektdaten ersetzt.
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button onClick={saveTemplate} disabled={saving} className="bg-gradient-gold text-primary-foreground">{saving ? "Speichere…" : "Speichern"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading && <CardGridSkeleton count={4} />}

      {!loading && mine.length === 0 && (
        <>
          <EmptyState
            icon={FileText}
            title="Noch keine Vorlagen"
            description="Lade die Starter-Sammlung (Mahnung, Mieterhöhung, Übergabeprotokoll, Kündigung, Hausordnung) — oder lege deine eigene Vorlage an."
          />
          <div className="grid md:grid-cols-2 gap-3">
            {STARTERS.map(s => (
              <Card key={s.title} className="glass hover:border-primary/40 transition cursor-pointer" onClick={() => useStarter(s)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{s.title}</p>
                    <Badge variant="outline" className="mt-1">{s.category}</Badge>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.body_md.split("\n").slice(0, 2).join(" ")}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!loading && mine.length > 0 && (
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
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Auf Mieter/Objekt anwenden" onClick={() => { setApplyTemplate(t); setApplyOpen(true); }}><Wand2 className="h-3.5 w-3.5 text-primary" /></Button>
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

      <ApplyDialog open={applyOpen} onOpenChange={setApplyOpen} template={applyTemplate} />
    </div>
  );
}

function ApplyDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (v: boolean) => void; template: UserTemplate | null }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [propertyId, setPropertyId] = useState<string>("");
  const [output, setOutput] = useState("");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [t, p, prof] = await Promise.all([
        supabase.from("tenants").select("id,full_name,email,phone,lease_start,lease_end,deposit,property_id,unit_id").order("full_name"),
        supabase.from("properties").select("id,name,street,zip,city,cold_rent,utilities").order("name"),
        supabase.from("profiles").select("display_name").maybeSingle(),
      ]);
      setTenants(t.data ?? []);
      setProperties(p.data ?? []);
      setProfile(prof.data);
    })();
  }, [open]);

  useEffect(() => {
    if (!template) { setOutput(""); return; }
    const tenant = tenants.find(x => x.id === tenantId);
    const prop = properties.find(x => x.id === propertyId) ?? properties.find(x => x.id === tenant?.property_id);
    const today = new Date();
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("de-DE") : "";
    const fmtEur = (n: any) => n != null ? Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "";
    const vars: Record<string, string> = {
      name: tenant?.full_name ?? "",
      mieter: tenant?.full_name ?? "",
      email: tenant?.email ?? "",
      telefon: tenant?.phone ?? "",
      mietbeginn: fmtDate(tenant?.lease_start),
      mietende: fmtDate(tenant?.lease_end),
      kaution: fmtEur(tenant?.deposit),
      objekt: prop?.name ?? "",
      strasse: prop?.street ?? "",
      plz: prop?.zip ?? "",
      ort: prop?.city ?? "",
      adresse: [prop?.street, [prop?.zip, prop?.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      kaltmiete: fmtEur(prop?.cold_rent),
      nebenkosten: fmtEur(prop?.utilities),
      datum: today.toLocaleDateString("de-DE"),
      heute: today.toLocaleDateString("de-DE"),
      vermieter: profile?.display_name ?? "",
    };
    let out = template.body_md;
    Object.entries(vars).forEach(([k, v]) => {
      out = out.replace(new RegExp(`\\{${k}\\}`, "gi"), v);
    });
    setOutput(out);
  }, [template, tenantId, propertyId, tenants, properties, profile]);

  const copy = async () => { await navigator.clipboard.writeText(output); toast.success("Text kopiert"); };

  const download = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${template?.title ?? "vorlage"}-ausgefuellt.txt`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Anwenden · {template?.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Mieter</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={tenantId} onChange={e => setTenantId(e.target.value)}>
                <option value="">— keiner —</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <Label>Objekt</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
                <option value="">— Mieter-Objekt nutzen —</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <Textarea rows={14} value={output} onChange={e => setOutput(e.target.value)} className="font-mono text-xs" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Schließen</Button>
          <Button variant="outline" onClick={download}><Download className="h-3.5 w-3.5 mr-1.5" /> Als .txt</Button>
          <Button onClick={copy} className="bg-gradient-gold text-primary-foreground shadow-gold"><Copy className="h-3.5 w-3.5 mr-1.5" /> Kopieren</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
