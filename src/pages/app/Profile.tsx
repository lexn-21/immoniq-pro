import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, IdCard, UserCircle2, Sparkles, Home as HomeIcon, Briefcase, ShieldCheck } from "lucide-react";

/**
 * Unified Profile — ein zentraler Ort wie Social Media.
 * - Steckbrief (öffentlich, Pass-Code teilbar)
 * - Bewerber-Daten (für Wohnungssuche)
 * - Vermieter/Eigentümer-Daten (für Inserate, Trust-Badge)
 * Modus oben: was willst du bei ImmonIQ — "Wohnen suchen", "Vermieten", "Beides".
 */

const INTENT_KEY = "immoniq_intent";
type Intent = "rent" | "let" | "both";

function calcSeekerScore(p: any) {
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

export default function Profile() {
  const { user } = useAuth();
  const [intent, setIntent] = useState<Intent>(() => (localStorage.getItem(INTENT_KEY) as Intent) || "both");
  const [pass, setPass] = useState<any>(null);
  const [seeker, setSeeker] = useState<any>({
    full_name: "", phone: "", household_size: 1, has_pets: false, smoker: false,
    net_income_monthly: "", employment_type: "unbefristet", employer: "",
    schufa_status: "unverified", move_in_from: "", max_rent: "",
    preferred_zips: "", about_me: "",
    is_student: false, university: "", study_program: "", study_semester: "",
    bafoeg_amount: "", guarantor_name: "", guarantor_relation: "", guarantor_income: "",
    guarantor_document_path: "", study_certificate_path: "",
  });
  const [profile, setProfile] = useState({ display_name: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Mein Profil · ImmonIQ"; }, []);
  useEffect(() => { localStorage.setItem(INTENT_KEY, intent); }, [intent]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, s, pr] = await Promise.all([
        supabase.from("tenant_pass" as any).select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("seeker_profiles" as any).select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      ]);
      let passData = (p as any).data;
      if (!passData) {
        const ins = await supabase.from("tenant_pass" as any).insert({ user_id: user.id }).select("*").single();
        passData = (ins as any).data;
      }
      setPass(passData);
      if ((s as any).data) {
        const d: any = (s as any).data;
        setSeeker((prev: any) => ({
          ...prev, ...d,
          net_income_monthly: d.net_income_monthly ?? "",
          max_rent: d.max_rent ?? "",
          preferred_zips: (d.preferred_zips ?? []).join(", "),
          move_in_from: d.move_in_from ?? "",
          about_me: d.about_me ?? "",
          employer: d.employer ?? "",
        }));
      }
      setProfile({ display_name: (pr as any).data?.display_name ?? "" });
      setLoading(false);
    })();
  }, [user]);

  const updatePass = async (patch: any) => {
    if (!pass) return;
    const { data, error } = await supabase.from("tenant_pass" as any).update(patch).eq("id", pass.id).select("*").single();
    if (error) return toast.error(error.message);
    setPass(data);
  };

  const saveSeeker = async () => {
    if (!user) return;
    const payload: any = {
      user_id: user.id,
      full_name: seeker.full_name || null,
      phone: seeker.phone || null,
      household_size: Number(seeker.household_size) || 1,
      has_pets: !!seeker.has_pets,
      smoker: !!seeker.smoker,
      net_income_monthly: seeker.net_income_monthly ? Number(seeker.net_income_monthly) : null,
      employment_type: seeker.employment_type,
      employer: seeker.employer || null,
      schufa_status: seeker.schufa_status,
      move_in_from: seeker.move_in_from || null,
      max_rent: seeker.max_rent ? Number(seeker.max_rent) : null,
      preferred_zips: seeker.preferred_zips
        ? String(seeker.preferred_zips).split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
      about_me: seeker.about_me || null,
      completeness_score: calcSeekerScore(seeker),
    };
    const { error } = await supabase.from("seeker_profiles" as any).upsert(payload, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    toast.success("Bewerber-Daten gespeichert.");
  };

  const saveBasics = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ display_name: profile.display_name }).eq("user_id", user.id);
    toast.success("Profil gespeichert.");
  };

  if (loading) return <div className="text-muted-foreground">Lade…</div>;

  const sScore = calcSeekerScore(seeker);
  const publicUrl = pass ? `${window.location.origin}/pass/${pass.pass_code}` : "";

  const showSeeker = intent === "rent" || intent === "both";
  const showLet = intent === "let" || intent === "both";

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCircle2 className="h-7 w-7 text-primary" /> Mein Profil
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Alles an einem Ort — wie ein LinkedIn fürs Wohnen. Einmal pflegen, überall nutzen.
        </p>
      </header>

      {/* Intent picker */}
      <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Was machst du bei ImmonIQ?</div>
            <div className="text-sm">Das bestimmt, welche Bereiche unten sichtbar sind.</div>
          </div>
          <div className="flex gap-1 rounded-lg bg-background p-1 border border-border">
            {[
              { id: "rent", label: "Wohnen suchen" },
              { id: "let",  label: "Vermieten" },
              { id: "both", label: "Beides" },
            ].map((o) => (
              <button
                key={o.id}
                onClick={() => setIntent(o.id as Intent)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${intent === o.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >{o.label}</button>
            ))}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="basic">Steckbrief</TabsTrigger>
          {showSeeker && <TabsTrigger value="seeker">Wohnungssuche</TabsTrigger>}
          {showLet && <TabsTrigger value="landlord">Vermieter</TabsTrigger>}
          <TabsTrigger value="share">Teilen</TabsTrigger>
        </TabsList>

        {/* STECKBRIEF */}
        <TabsContent value="basic" className="space-y-4">
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><IdCard className="h-4 w-4 text-primary" /> Basis</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>E-Mail</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div>
                <Label>Anzeigename</Label>
                <Input value={profile.display_name} onChange={(e) => setProfile({ display_name: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Headline (eine Zeile zu dir)</Label>
                <Input
                  defaultValue={pass?.headline ?? ""}
                  placeholder="z. B. Berufstätig, ruhig, Nichtraucher"
                  onBlur={(e) => e.target.value !== (pass?.headline ?? "") && updatePass({ headline: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveBasics} size="sm" className="bg-gradient-gold text-primary-foreground shadow-gold">Speichern</Button>
            </div>
          </Card>
        </TabsContent>

        {/* SEEKER */}
        {showSeeker && (
          <TabsContent value="seeker" className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Vollständigkeit Bewerber-Profil</span>
                <span className="text-sm font-bold text-primary">{sScore}%</span>
              </div>
              <Progress value={sScore} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">Vollständige Profile haben 5× höhere Erfolgsquote.</p>
            </Card>

            <Card className="p-5 space-y-4">
              <h3 className="font-semibold">Persönlich & Bonität</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Vollständiger Name</Label>
                  <Input value={seeker.full_name} onChange={(e) => setSeeker({ ...seeker, full_name: e.target.value })} /></div>
                <div><Label>Telefon</Label>
                  <Input value={seeker.phone} onChange={(e) => setSeeker({ ...seeker, phone: e.target.value })} /></div>
                <div><Label>Haushalts-Größe</Label>
                  <Input type="number" min={1} value={seeker.household_size} onChange={(e) => setSeeker({ ...seeker, household_size: e.target.value })} /></div>
                <div><Label>Netto-Einkommen €/Mo</Label>
                  <Input type="number" value={seeker.net_income_monthly} onChange={(e) => setSeeker({ ...seeker, net_income_monthly: e.target.value })} /></div>
                <div><Label>Beschäftigung</Label>
                  <Select value={seeker.employment_type} onValueChange={(v) => setSeeker({ ...seeker, employment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unbefristet">Unbefristet</SelectItem>
                      <SelectItem value="befristet">Befristet</SelectItem>
                      <SelectItem value="selbststaendig">Selbstständig</SelectItem>
                      <SelectItem value="beamter">Beamter/in</SelectItem>
                      <SelectItem value="rentner">Rentner/in</SelectItem>
                      <SelectItem value="student">Student/in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Über mich</Label>
                  <Textarea rows={3} value={seeker.about_me} onChange={(e) => setSeeker({ ...seeker, about_me: e.target.value })} placeholder="Hi, ich bin …" /></div>
                <div><Label>Wunsch-PLZs</Label>
                  <Input value={seeker.preferred_zips} onChange={(e) => setSeeker({ ...seeker, preferred_zips: e.target.value })} placeholder="80331, 80333" /></div>
                <div><Label>Max. Warmmiete €</Label>
                  <Input type="number" value={seeker.max_rent} onChange={(e) => setSeeker({ ...seeker, max_rent: e.target.value })} /></div>
                <div><Label>Einzug ab</Label>
                  <Input type="date" value={seeker.move_in_from} onChange={(e) => setSeeker({ ...seeker, move_in_from: e.target.value })} /></div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 text-sm"><Switch checked={seeker.has_pets} onCheckedChange={(v) => setSeeker({ ...seeker, has_pets: v })} /> Tiere</label>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={seeker.smoker} onCheckedChange={(v) => setSeeker({ ...seeker, smoker: v })} /> Raucher</label>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveSeeker} className="bg-gradient-gold text-primary-foreground shadow-gold">Bewerber-Daten speichern</Button>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* LANDLORD */}
        {showLet && (
          <TabsContent value="landlord" className="space-y-4">
            <Card className="p-5 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><HomeIcon className="h-4 w-4 text-primary" /> Vermieter-Profil</h3>
              <p className="text-sm text-muted-foreground">
                Wenn du selbst vermietest: pflege deine Objekte, Mieter & Inserate in den jeweiligen Menüs.
                Hier ist dein Trust-Status für Bewerber zu sehen.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <Card className="p-3 bg-muted/40 border-0">
                  <div className="text-xs text-muted-foreground">Verifizierte Inserate</div>
                  <div className="text-lg font-bold mt-1">—</div>
                </Card>
                <Card className="p-3 bg-muted/40 border-0">
                  <div className="text-xs text-muted-foreground">Antwortzeit ⌀</div>
                  <div className="text-lg font-bold mt-1">—</div>
                </Card>
                <Card className="p-3 bg-muted/40 border-0">
                  <div className="text-xs text-muted-foreground">Bewerter-Rating</div>
                  <div className="text-lg font-bold mt-1">—</div>
                </Card>
              </div>
              <Badge variant="outline" className="mt-2">Wird aus deiner Aktivität berechnet</Badge>
            </Card>
          </TabsContent>
        )}

        {/* SHARE */}
        <TabsContent value="share" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Dein Pass-Link (für Vermieter)</div>
                <div className="font-mono text-sm mt-1 break-all">{publicUrl}</div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link kopiert"); }}>
                <Copy className="h-4 w-4" /> Link kopieren
              </Button>
            </div>
            <div className="flex items-center justify-between border-t pt-4 mt-4">
              <div>
                <div className="font-medium text-sm">Öffentlich teilbar</div>
                <div className="text-xs text-muted-foreground">Vermieter mit Pass-Code sehen deinen Steckbrief</div>
              </div>
              <Switch checked={!!pass?.is_public} onCheckedChange={(v) => updatePass({ is_public: v })} />
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 mt-4 pt-4 border-t">
              <li className="flex items-start gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary mt-0.5" /> Du besitzt deine Daten — DSGVO-konform.</li>
              <li className="flex items-start gap-2"><Briefcase className="h-3.5 w-3.5 text-primary mt-0.5" /> Bewerbung in 1 Klick statt 20 Dokumente scannen.</li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
