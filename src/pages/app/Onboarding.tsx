import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Building2, Home, Sparkles, Wallet, Search, Briefcase } from "lucide-react";
import { z } from "zod";

const propSchema = z.object({
  name: z.string().trim().min(1, "Name fehlt").max(100),
  street: z.string().trim().max(120).optional().or(z.literal("")),
  zip: z.string().trim().max(10).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
});
const unitSchema = z.object({
  label: z.string().trim().min(1, "Bezeichnung fehlt").max(100),
  rent_cold: z.number().min(0).max(99999),
  utilities: z.number().min(0).max(99999),
});

const STEPS = ["Willkommen", "Erstes Objekt", "Erste Einheit", "Fertig"] as const;

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [prop, setProp] = useState({ name: "", street: "", zip: "", city: "" });
  const [unit, setUnit] = useState({ label: "WE 01", rent_cold: "", utilities: "" });

  useEffect(() => { document.title = "Onboarding · ImmonIQ"; }, []);

  const markSeen = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) localStorage.setItem(`onboarding_seen_${user.id}`, "1");
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const saveProperty = async () => {
    const parsed = propSchema.safeParse(prop);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const payload: any = { ...parsed.data, user_id: user.id };
    if (!payload.street) delete payload.street;
    if (!payload.zip) delete payload.zip;
    if (!payload.city) delete payload.city;
    const { data, error } = await supabase.from("properties").insert(payload).select().maybeSingle();
    setLoading(false);
    if (error || !data) return toast.error(error?.message ?? "Fehler.");
    setPropertyId(data.id);
    toast.success("Objekt angelegt.");
    next();
  };

  const saveUnit = async () => {
    const parsed = unitSchema.safeParse({
      label: unit.label,
      rent_cold: Number(unit.rent_cold || 0),
      utilities: Number(unit.utilities || 0),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;
    setLoading(true);
    const { error } = await supabase.from("units").insert({ ...parsed.data, property_id: propertyId, user_id: user.id } as any);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Einheit angelegt.");
    next();
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="relative container py-8 flex items-center justify-between">
        <Logo />
        <button onClick={async () => { await markSeen(); navigate("/app"); }} className="text-xs text-muted-foreground hover:text-foreground">Überspringen</button>
      </div>

      <div className="relative container max-w-xl px-4 pb-16">
        {/* progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full transition ${i <= step ? "bg-gradient-gold" : "bg-muted"}`} />
              <span className={`text-[10px] uppercase tracking-wider ${i === step ? "text-primary font-semibold" : "text-muted-foreground"}`}>{label}</span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card className="p-8 glass text-center animate-fade-in">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold mb-6">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Willkommen bei ImmonIQ</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              In zwei Minuten richten wir dein Cockpit ein. Wir legen dein erstes Objekt
              und deine erste Wohneinheit an — danach bist du startklar.
            </p>
            <Button onClick={next} size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
              Los geht's <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-8 glass animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="text-xl font-bold">Dein erstes Objekt</h2>
                <p className="text-xs text-muted-foreground">Stammdaten kannst du später ergänzen.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div><Label>Bezeichnung *</Label><Input value={prop.name} onChange={(e) => setProp({ ...prop, name: e.target.value })} placeholder="MFH Hauptstraße 12" autoFocus /></div>
              <div><Label>Straße & Nr.</Label><Input value={prop.street} onChange={(e) => setProp({ ...prop, street: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>PLZ</Label><Input value={prop.zip} onChange={(e) => setProp({ ...prop, zip: e.target.value })} /></div>
                <div className="col-span-2"><Label>Ort</Label><Input value={prop.city} onChange={(e) => setProp({ ...prop, city: e.target.value })} /></div>
              </div>
            </div>
            <Button onClick={saveProperty} disabled={loading} className="w-full mt-6 bg-gradient-gold text-primary-foreground shadow-gold">
              Weiter <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-8 glass animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Home className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="text-xl font-bold">Erste Wohneinheit</h2>
                <p className="text-xs text-muted-foreground">Mindestens eine, weitere kannst du jederzeit anlegen.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div><Label>Bezeichnung *</Label><Input value={unit.label} onChange={(e) => setUnit({ ...unit, label: e.target.value })} placeholder="WE 01 / OG links" autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Kaltmiete (€) *</Label><Input type="number" step="0.01" value={unit.rent_cold} onChange={(e) => setUnit({ ...unit, rent_cold: e.target.value })} /></div>
                <div><Label>Nebenkosten (€)</Label><Input type="number" step="0.01" value={unit.utilities} onChange={(e) => setUnit({ ...unit, utilities: e.target.value })} /></div>
              </div>
            </div>
            <Button onClick={saveUnit} disabled={loading} className="w-full mt-6 bg-gradient-gold text-primary-foreground shadow-gold">
              Weiter <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-8 glass text-center animate-fade-in">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-success/15 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Dein Cockpit ist bereit.</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Als Nächstes: einen Mieter zuordnen, die erste Mietzahlung erfassen, oder einen Beleg hochladen.
              Am Ende des Quartals: einmal auf "Steuer-Export" klicken — fertig.
            </p>
            <Button onClick={async () => { await markSeen(); navigate("/app"); }} size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold">
              Zum Dashboard <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
