import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { UserCircle2, ShieldCheck, Sparkles } from "lucide-react";

const empty = {
  full_name: "", phone: "", household_size: 1,
  has_pets: false, smoker: false,
  net_income_monthly: "", employment_type: "unbefristet",
  employer: "", schufa_status: "unverified",
  move_in_from: "", max_rent: "", preferred_zips: "", about_me: "",
  is_student: false, university: "", study_program: "", study_semester: "",
  bafoeg_amount: "", guarantor_name: "", guarantor_relation: "", guarantor_income: "",
};

function score(p: any) {
  let s = 0;
  if (p.full_name) s += 15;
  if (p.phone) s += 10;
  if (p.net_income_monthly) s += 20;
  if (p.employment_type) s += 10;
  if (p.move_in_from) s += 10;
  if (p.max_rent) s += 10;
  if (p.about_me && p.about_me.length > 40) s += 15;
  if (p.schufa_status === "self_declared") s += 5;
  if (p.schufa_status === "document_uploaded") s += 10;
  return Math.min(100, s);
}

const SeekerProfile = () => {
  const [form, setForm] = useState<any>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Bewerber-Profil · ImmonIQ"; load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("seeker_profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (data) {
      setForm({
        ...data,
        net_income_monthly: data.net_income_monthly ?? "",
        max_rent: data.max_rent ?? "",
        preferred_zips: (data.preferred_zips ?? []).join(", "),
        move_in_from: data.move_in_from ?? "",
        about_me: data.about_me ?? "",
        employer: data.employer ?? "",
      });
    }
    setLoading(false);
  };

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: any = {
      user_id: user.id,
      full_name: form.full_name || null,
      phone: form.phone || null,
      household_size: Number(form.household_size) || 1,
      has_pets: !!form.has_pets,
      smoker: !!form.smoker,
      net_income_monthly: form.net_income_monthly ? Number(form.net_income_monthly) : null,
      employment_type: form.employment_type,
      employer: form.employer || null,
      schufa_status: form.schufa_status,
      move_in_from: form.move_in_from || null,
      max_rent: form.max_rent ? Number(form.max_rent) : null,
      preferred_zips: form.preferred_zips
        ? String(form.preferred_zips).split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
      about_me: form.about_me || null,
      is_student: !!form.is_student,
      university: form.university || null,
      study_program: form.study_program || null,
      study_semester: form.study_semester ? Number(form.study_semester) : null,
      bafoeg_amount: form.bafoeg_amount ? Number(form.bafoeg_amount) : null,
      guarantor_name: form.guarantor_name || null,
      guarantor_relation: form.guarantor_relation || null,
      guarantor_income: form.guarantor_income ? Number(form.guarantor_income) : null,
      completeness_score: score(form),
    };
    const { error } = await supabase.from("seeker_profiles").upsert(payload, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    toast.success("Profil gespeichert.");
    load();
  };

  if (loading) return <div className="text-muted-foreground">Lade…</div>;
  const sc = score(form);

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCircle2 className="h-7 w-7 text-primary" /> Mein Bewerber-Profil
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Einmal ausfüllen — bei jedem Inserat in einem Klick bewerben (Indeed-Prinzip).
        </p>
      </header>

      <Card className="p-5 glass">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Vollständigkeit</span>
          <span className="text-sm font-bold text-primary">{sc}%</span>
        </div>
        <Progress value={sc} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">Vollständige Profile haben 5× höhere Erfolgsquote.</p>
      </Card>

      <Card className="p-6 glass space-y-4">
        <h2 className="font-bold">Persönlich</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Vollständiger Name *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Telefon</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Personen im Haushalt</Label>
            <Input type="number" min={1} value={form.household_size} onChange={(e) => setForm({ ...form, household_size: e.target.value })} /></div>
        </div>
        <div className="flex gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.has_pets} onCheckedChange={(v) => setForm({ ...form, has_pets: v })} /> Haustiere
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.smoker} onCheckedChange={(v) => setForm({ ...form, smoker: v })} /> Raucher
          </label>
        </div>
      </Card>

      <Card className="p-6 glass space-y-4">
        <h2 className="font-bold">Bonität & Beruf</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Netto-Einkommen / Monat (€)</Label>
            <Input type="number" value={form.net_income_monthly} onChange={(e) => setForm({ ...form, net_income_monthly: e.target.value })} /></div>
          <div><Label>Beschäftigung</Label>
            <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unbefristet">Unbefristet</SelectItem>
                <SelectItem value="befristet">Befristet</SelectItem>
                <SelectItem value="selbststaendig">Selbstständig</SelectItem>
                <SelectItem value="beamter">Beamter/in</SelectItem>
                <SelectItem value="rentner">Rentner/in</SelectItem>
                <SelectItem value="student">Student/in</SelectItem>
                <SelectItem value="arbeitslos">Arbeitssuchend</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2"><Label>Arbeitgeber (optional)</Label>
            <Input value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} /></div>
          <div className="col-span-2"><Label>SCHUFA</Label>
            <Select value={form.schufa_status} onValueChange={(v) => setForm({ ...form, schufa_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unverified">Keine Angabe</SelectItem>
                <SelectItem value="self_declared">Eigenauskunft: keine Negativeinträge</SelectItem>
                <SelectItem value="document_uploaded">SCHUFA-Auskunft im Tresor (auf Anfrage)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Dein SCHUFA-Dokument bleibt verschlüsselt im Tresor — du teilst es nur auf Anfrage.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 glass space-y-4">
        <h2 className="font-bold">Wohn-Wünsche</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Einzug ab</Label>
            <Input type="date" value={form.move_in_from} onChange={(e) => setForm({ ...form, move_in_from: e.target.value })} /></div>
          <div><Label>Max. Warmmiete (€)</Label>
            <Input type="number" value={form.max_rent} onChange={(e) => setForm({ ...form, max_rent: e.target.value })} /></div>
          <div className="col-span-2"><Label>Wunsch-PLZs (Komma-getrennt)</Label>
            <Input value={form.preferred_zips} onChange={(e) => setForm({ ...form, preferred_zips: e.target.value })} placeholder="80331, 80333, 80335" /></div>
          <div className="col-span-2"><Label>Über mich (Vorstellung)</Label>
            <Textarea rows={4} value={form.about_me} onChange={(e) => setForm({ ...form, about_me: e.target.value })}
              placeholder="Hallo, ich bin … arbeite als … suche eine ruhige Wohnung für …" /></div>
        </div>
      </Card>

      <Card className="p-6 glass space-y-4 border-violet-500/20">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">🎓 Studenten-Profil</h2>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.is_student} onCheckedChange={(v) => setForm({ ...form, is_student: v })} /> Ich bin Student/in
          </label>
        </div>
        {form.is_student && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Hochschule</Label>
              <Input value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></div>
            <div><Label>Studiengang</Label>
              <Input value={form.study_program} onChange={(e) => setForm({ ...form, study_program: e.target.value })} /></div>
            <div><Label>Semester</Label>
              <Input type="number" value={form.study_semester} onChange={(e) => setForm({ ...form, study_semester: e.target.value })} /></div>
            <div><Label>BAföG (€/Mo)</Label>
              <Input type="number" value={form.bafoeg_amount} onChange={(e) => setForm({ ...form, bafoeg_amount: e.target.value })} /></div>
            <div className="col-span-2 pt-2 border-t">
              <p className="text-xs font-semibold mb-2 text-muted-foreground">Bürgschaft (z. B. Eltern)</p>
            </div>
            <div><Label>Name Bürge</Label>
              <Input value={form.guarantor_name} onChange={(e) => setForm({ ...form, guarantor_name: e.target.value })} /></div>
            <div><Label>Verhältnis</Label>
              <Input value={form.guarantor_relation} onChange={(e) => setForm({ ...form, guarantor_relation: e.target.value })} placeholder="Vater, Mutter…" /></div>
            <div className="col-span-2"><Label>Netto-Einkommen Bürge (€/Mo)</Label>
              <Input type="number" value={form.guarantor_income} onChange={(e) => setForm({ ...form, guarantor_income: e.target.value })} /></div>
            <p className="col-span-2 text-[11px] text-muted-foreground">
              Tipp: Lade Immatrikulationsbescheinigung & Bürgschaftserklärung im Tresor hoch — Vermieter sehen so schneller deine Bonität.
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} className="bg-gradient-gold text-primary-foreground shadow-gold">Profil speichern</Button>
      </div>
    </div>
  );
};

export default SeekerProfile;
