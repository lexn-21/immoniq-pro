import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import {
  CheckCircle2, ArrowRight, Building2, Home, Sparkles, Wallet, Search, Briefcase,
  Users, DoorOpen, House,
} from "lucide-react";
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

type Persona = "privat" | "vermieter" | "suchender" | "pro";
const PERSONAS: { id: Persona; title: string; desc: string; icon: any }[] = [
  { id: "privat", title: "Eigenverwaltung", desc: "Selbstnutzer · nur meine Immobilie & Bürokratie", icon: Home },
  { id: "vermieter", title: "Vermieter", desc: "Mieter, Mieten, Nebenkosten, Steuer", icon: Wallet },
  { id: "suchender", title: "Wohnungssuche", desc: "WG-Zimmer, Wohnung oder Haus finden & bewerben", icon: Search },
  { id: "pro", title: "Profi / Alles", desc: "Alle Funktionen sofort sichtbar", icon: Briefcase },
];

type SearchType = "wg" | "apartment" | "house";
const SEARCH_TYPES: { id: SearchType; title: string; desc: string; icon: any; household: number }[] = [
  { id: "wg",        title: "WG-Zimmer",       desc: "Ich suche ein Zimmer in einer bestehenden WG.",       icon: DoorOpen, household: 1 },
  { id: "apartment", title: "Eigene Wohnung",  desc: "Ich suche eine eigene Wohnung für mich oder uns.",    icon: Building2, household: 1 },
  { id: "house",     title: "Haus",            desc: "Ich suche ein Haus zur Miete (oder zum Kauf).",       icon: House,     household: 2 },
];

// Zwei komplett getrennte Flows — je nach Persona-Auswahl.
// Vermieter/Privat/Profi: Rolle → Willkommen → Objekt → Einheit → Fertig
// Suchender: Rolle → Was suchst du? → Budget & Umkreis → Fertig
const STEPS_LANDLORD = ["Rolle", "Willkommen", "Erstes Objekt", "Erste Einheit", "Fertig"] as const;
const STEPS_SEEKER   = ["Rolle", "Was suchst du?", "Budget & Umkreis", "Fertig"] as const;

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [persona, setPersona] = useState<Persona>(
    (typeof window !== "undefined" && (localStorage.getItem("immoniq_persona") as Persona)) || "vermieter"
  );

  // Vermieter-Objekt
  const [prop, setProp] = useState({ name: "", street: "", zip: "", city: "" });
  const [unit, setUnit] = useState({ label: "WE 01", rent_cold: "", utilities: "" });

  // Suchender-Profil
  const [searchType, setSearchType] = useState<SearchType>("apartment");
  const [seeker, setSeeker] = useState({
    full_name: "",
    max_rent: "",
    preferred_zips: "",
    move_in_from: "",
    household_size: "1",
  });

  const STEPS = persona === "suchender" ? STEPS_SEEKER : STEPS_LANDLORD;

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

  const saveSeeker = async () => {
    if (!seeker.full_name.trim()) return toast.error("Bitte gib deinen Namen ein.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const zips = seeker.preferred_zips
      .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
    setLoading(true);
    // Suchtyp in localStorage merken → Listings & MyApplications filtern danach.
    localStorage.setItem("immoniq_search_type", searchType);
    // Basis-Bewerberprofil anlegen; SeekerProfile-Seite ergänzt später Bonität etc.
    const payload: any = {
      user_id: user.id,
      full_name: seeker.full_name.trim(),
      max_rent: seeker.max_rent ? Number(seeker.max_rent) : null,
      preferred_zips: zips,
      move_in_from: seeker.move_in_from || null,
      household_size: Number(seeker.household_size) || 1,
      about_me: `Ich suche: ${SEARCH_TYPES.find((t) => t.id === searchType)?.title}.`,
    };
    const { error } = await supabase
      .from("seeker_profiles")
      .upsert(payload, { onConflict: "user_id" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Such-Profil gespeichert.");
    next();
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="relative container py-8 flex items-center justify-between">
        <Logo />
        <button
          onClick={async () => { await markSeen(); navigate(persona === "suchender" ? "/app/marketplace" : "/app"); }}
          className="text-xs text-muted-foreground hover:text-foreground rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none"
        >
          Überspringen
        </button>
      </div>

      <div className="relative container max-w-xl px-4 pb-16">
        {/* progress */}
        <div className="flex items-center gap-2 mb-8" aria-label={`Schritt ${step + 1} von ${STEPS.length}`}>
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full transition ${i <= step ? "bg-gradient-gold" : "bg-muted"}`} />
              <span className={`text-[10px] uppercase tracking-wider ${i === step ? "text-primary font-semibold" : "text-muted-foreground"}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* SCHRITT 0 — Rolle (gleich für alle Flows) */}
        {step === 0 && (
          <Card className="p-6 glass animate-fade-in">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-center mb-2">Was passt zu dir?</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Wir zeigen dir nur, was du wirklich brauchst. Du kannst jederzeit umschalten.
            </p>
            <div className="space-y-2">
              {PERSONAS.map((p) => {
                const Icon = p.icon;
                const active = persona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    aria-pressed={active}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none ${
                      active ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/40"
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${active ? "bg-gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.desc}</div>
                    </div>
                    {active && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <Button
              onClick={() => {
                localStorage.setItem("immoniq_persona", persona);
                next();
              }}
              size="lg"
              className="w-full mt-5 bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
            >
              Weiter <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {/* ============ SUCHENDER-FLOW ============ */}
        {persona === "suchender" && step === 1 && (
          <Card className="p-6 glass animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Was suchst du?</h2>
                <p className="text-xs text-muted-foreground">Wir filtern Inserate & Alerts danach.</p>
              </div>
            </div>
            <div className="space-y-2">
              {SEARCH_TYPES.map((t) => {
                const Icon = t.icon;
                const active = searchType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSearchType(t.id);
                      setSeeker((s) => ({ ...s, household_size: String(t.household) }));
                    }}
                    aria-pressed={active}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none ${
                      active ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/40"
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${active ? "bg-gradient-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </div>
                    {active && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <Button onClick={next} size="lg" className="w-full mt-5 bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
              Weiter <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {persona === "suchender" && step === 2 && (
          <Card className="p-6 glass animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Budget & Umkreis</h2>
                <p className="text-xs text-muted-foreground">Damit du nur passende Treffer siehst.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="s-name">Dein Name *</Label>
                <Input id="s-name" value={seeker.full_name} onChange={(e) => setSeeker({ ...seeker, full_name: e.target.value })} placeholder="Vor- und Nachname" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="s-rent">Max. Warmmiete (€)</Label>
                  <Input id="s-rent" type="number" inputMode="numeric" value={seeker.max_rent} onChange={(e) => setSeeker({ ...seeker, max_rent: e.target.value })} placeholder={searchType === "wg" ? "600" : "1200"} />
                </div>
                <div>
                  <Label htmlFor="s-hh">Personen</Label>
                  <Input id="s-hh" type="number" min={1} value={seeker.household_size} onChange={(e) => setSeeker({ ...seeker, household_size: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="s-zips">Wunsch-PLZs (Komma-getrennt)</Label>
                <Input id="s-zips" value={seeker.preferred_zips} onChange={(e) => setSeeker({ ...seeker, preferred_zips: e.target.value })} placeholder="80331, 80333, 80335" />
              </div>
              <div>
                <Label htmlFor="s-date">Einzug ab</Label>
                <Input id="s-date" type="date" value={seeker.move_in_from} onChange={(e) => setSeeker({ ...seeker, move_in_from: e.target.value })} />
              </div>
            </div>
            <Button onClick={saveSeeker} disabled={loading} className="w-full mt-6 bg-gradient-gold text-primary-foreground shadow-gold">
              {loading ? "Speichere…" : "Such-Profil speichern"} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              Bonität, SCHUFA & Bürgschaft kannst du später in deinem Profil ergänzen — das erhöht deine Erfolgsquote.
            </p>
          </Card>
        )}

        {persona === "suchender" && step === 3 && (
          <Card className="p-8 glass text-center animate-fade-in">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-success/15 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Los geht die Suche.</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Wir zeigen dir nur <span className="text-foreground font-semibold">{SEARCH_TYPES.find(t => t.id === searchType)?.title}</span> in deinen Wunsch-PLZs.
              Bewirb dich mit einem Klick.
            </p>
            <Button
              onClick={async () => { await markSeen(); navigate("/app/marketplace"); }}
              size="lg"
              className="bg-gradient-gold text-primary-foreground shadow-gold"
            >
              Inserate ansehen <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {/* ============ VERMIETER / PRIVAT / PROFI-FLOW ============ */}
        {persona !== "suchender" && step === 1 && (
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

        {persona !== "suchender" && step === 2 && (
          <Card className="p-8 glass animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="text-xl font-bold">Dein erstes Objekt</h2>
                <p className="text-xs text-muted-foreground">Stammdaten kannst du später ergänzen.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div><Label htmlFor="p-name">Bezeichnung *</Label><Input id="p-name" value={prop.name} onChange={(e) => setProp({ ...prop, name: e.target.value })} placeholder="MFH Hauptstraße 12" autoFocus /></div>
              <div><Label htmlFor="p-street">Straße & Nr.</Label><Input id="p-street" value={prop.street} onChange={(e) => setProp({ ...prop, street: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label htmlFor="p-zip">PLZ</Label><Input id="p-zip" value={prop.zip} onChange={(e) => setProp({ ...prop, zip: e.target.value })} /></div>
                <div className="col-span-2"><Label htmlFor="p-city">Ort</Label><Input id="p-city" value={prop.city} onChange={(e) => setProp({ ...prop, city: e.target.value })} /></div>
              </div>
            </div>
            <Button onClick={saveProperty} disabled={loading} className="w-full mt-6 bg-gradient-gold text-primary-foreground shadow-gold">
              Weiter <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {persona !== "suchender" && step === 3 && (
          <Card className="p-8 glass animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Home className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="text-xl font-bold">Erste Wohneinheit</h2>
                <p className="text-xs text-muted-foreground">Mindestens eine, weitere kannst du jederzeit anlegen.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div><Label htmlFor="u-label">Bezeichnung *</Label><Input id="u-label" value={unit.label} onChange={(e) => setUnit({ ...unit, label: e.target.value })} placeholder="WE 01 / OG links" autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="u-rent">Kaltmiete (€) *</Label><Input id="u-rent" type="number" step="0.01" value={unit.rent_cold} onChange={(e) => setUnit({ ...unit, rent_cold: e.target.value })} /></div>
                <div><Label htmlFor="u-util">Nebenkosten (€)</Label><Input id="u-util" type="number" step="0.01" value={unit.utilities} onChange={(e) => setUnit({ ...unit, utilities: e.target.value })} /></div>
              </div>
            </div>
            <Button onClick={saveUnit} disabled={loading} className="w-full mt-6 bg-gradient-gold text-primary-foreground shadow-gold">
              Weiter <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        {persona !== "suchender" && step === 4 && (
          <Card className="p-8 glass text-center animate-fade-in">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-success/15 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Dein Cockpit ist bereit.</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Deine Ansicht ist auf <span className="text-foreground font-semibold">{PERSONAS.find(p => p.id === persona)?.title}</span> zugeschnitten.
              Mehr Tools schaltest du jederzeit links unten frei.
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
