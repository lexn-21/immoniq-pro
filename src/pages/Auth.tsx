import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().trim().email("Ungültige E-Mail").max(255);
const passSchema = z.string().min(8, "Mindestens 8 Zeichen").max(72);
const nameSchema = z.string().trim().min(1, "Name fehlt").max(80);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
    <path fill="#EA4335" d="M12 11v3.6h5.1c-.2 1.4-1.6 4-5.1 4-3.1 0-5.6-2.5-5.6-5.6S8.9 7.4 12 7.4c1.7 0 2.9.7 3.6 1.4l2.5-2.4C16.5 4.9 14.4 4 12 4 7.6 4 4 7.6 4 12s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.8 0-.5-.1-.9-.1-1.2H12z"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const params = new URLSearchParams(window.location.search);
  const claimToken = params.get("claim");
  const redirect = params.get("redirect") || params.get("next") || (claimToken ? "/mein-immoniq" : "/app");
  const as = claimToken ? "tenant" : params.get("as");

  const SUBTITLES: Record<string, string> = {
    owner: "Dein sicherer Ort für alles rund um dein Zuhause.",
    landlord: "Dein Verwalten +-Cockpit wartet.",
    advisor: "Mandanten-Daten in Minuten — read-only & DSGVO-sicher.",
    buyer: "Marktwerte, Rendite & Inserate — direkt zwischen Eigentümern.",
    tenant: "Dein kostenloser Mieter-Account: Chat, Dokumente, Schadensmeldungen, Rechte — alles an einem Ort.",
    family: "Schritt für Schritt durch Erbschaft und Immobilien-Fragen.",
  };
  const subtitle = (as && SUBTITLES[as]) || "Alles für deine Immobilie — an einem sicheren Ort.";

  const tryClaim = async () => {
    if (!claimToken) return;
    const { error } = await supabase.rpc("tenant_claim", { _token: claimToken });
    if (error) toast.error("Verknüpfung fehlgeschlagen: " + error.message);
    else toast.success("Wohnung verknüpft!");
  };

  useEffect(() => {
    document.title = claimToken ? "Mieter-Account · ImmonIQ" : "Anmelden · ImmonIQ";
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await tryClaim();
        navigate(redirect, { replace: true });
      }
    });
    // eslint-disable-next-line
  }, [navigate, redirect]);

  const handleGoogle = async () => {
    setOauthLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app`,
    });
    if (result.error) {
      setOauthLoading(false);
      toast.error("Google-Anmeldung fehlgeschlagen.");
      return;
    }
    if (result.redirected) return;
    navigate(redirect, { replace: true });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = emailSchema.safeParse(email);
    const pv = passSchema.safeParse(password);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    if (!pv.success) return toast.error(pv.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: ev.data, password: pv.data });
    setLoading(false);
    if (error) return toast.error(error.message === "Invalid login credentials" ? "E-Mail oder Passwort falsch." : error.message);
    await tryClaim();
    toast.success("Willkommen zurück.");
    navigate(redirect, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const nv = nameSchema.safeParse(name);
    const ev = emailSchema.safeParse(email);
    const pv = passSchema.safeParse(password);
    if (!nv.success) return toast.error(nv.error.issues[0].message);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    if (!pv.success) return toast.error(pv.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: ev.data,
      password: pv.data,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { display_name: nv.data },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("already")) return toast.error("Diese E-Mail ist bereits registriert.");
      if (error.message.toLowerCase().includes("pwned") || error.message.toLowerCase().includes("compromised"))
        return toast.error("Dieses Passwort wurde in Datenlecks gefunden. Bitte ein neues wählen.");
      return toast.error(error.message);
    }
    // Fire-and-forget Welcome-Mail (idempotent über E-Mail-Adresse)
    supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "welcome",
        recipientEmail: ev.data,
        idempotencyKey: `welcome-${ev.data}`,
        templateData: { name: nv.data },
      },
    }).catch(() => { /* nicht blockierend */ });
    toast.success("Konto erstellt. Willkommen bei ImmonIQ.");
    navigate("/app/onboarding", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="relative container py-8">
        <Link to="/"><Logo /></Link>
      </div>
      <div className="relative container flex items-center justify-center px-4 pb-20">
        <Card className="w-full max-w-md p-8 glass shadow-glass">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Willkommen</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>

          <Button onClick={handleGoogle} disabled={oauthLoading} variant="outline" className="w-full mb-4 gap-2">
            <GoogleIcon /> {oauthLoading ? "Verbinde…" : "Mit Google fortfahren"}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider"><span className="bg-card px-2 text-muted-foreground">oder mit E-Mail</span></div>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Anmelden</TabsTrigger>
              <TabsTrigger value="signup">Registrieren</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="si-email">E-Mail</Label>
                  <Input id="si-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="si-pw">Passwort</Label>
                  <Input id="si-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
                  {loading ? "Anmelden…" : "Anmelden"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="su-name">Anzeigename</Label>
                  <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Leon Boomgaarden" required />
                </div>
                <div>
                  <Label htmlFor="su-email">E-Mail</Label>
                  <Input id="su-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="su-pw">Passwort</Label>
                  <Input id="su-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <p className="text-[11px] text-muted-foreground mt-1">Mind. 8 Zeichen. Wird gegen Datenlecks geprüft.</p>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
                  {loading ? "Erstellen…" : "Konto erstellen"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="text-[11px] text-center text-muted-foreground mt-6">
            Mit der Registrierung akzeptierst du die Nutzungsbedingungen. DSGVO-konform, Server in der EU.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
