import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";

const passSchema = z.string().min(8, "Mindestens 8 Zeichen").max(72);

/**
 * Passwort-Reset-Ziel: Supabase leitet mit type=recovery im URL-Hash hierher.
 * Solange der Recovery-Hash aktiv ist, hat der Nutzer eine kurzlebige Session
 * und darf per updateUser({ password }) sein Passwort neu setzen.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    document.title = "Neues Passwort · ImmonIQ";
    // Recovery-Session aus dem URL-Hash übernehmen. Supabase setzt sie automatisch,
    // wir warten nur bis onAuthStateChange „PASSWORD_RECOVERY" oder eine Session meldet.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pv = passSchema.safeParse(password);
    if (!pv.success) return toast.error(pv.error.issues[0].message);
    if (password !== confirm) return toast.error("Passwörter stimmen nicht überein.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pv.data });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("pwned") || error.message.toLowerCase().includes("compromised"))
        return toast.error("Dieses Passwort wurde in Datenlecks gefunden. Bitte ein neues wählen.");
      return toast.error(error.message);
    }
    toast.success("Passwort aktualisiert. Bitte neu anmelden.");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="relative container py-8">
        <Link to="/"><Logo /></Link>
      </div>
      <div className="relative container flex items-center justify-center px-4 pb-20">
        <Card className="w-full max-w-md p-8 glass shadow-glass">
          <h1 className="text-2xl font-bold tracking-tight text-center mb-2">Neues Passwort</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {ready
              ? "Wähle ein neues, sicheres Passwort."
              : "Wir prüfen deinen Reset-Link…"}
          </p>

          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="rp-pw">Neues Passwort</Label>
                <Input
                  id="rp-pw"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground mt-1">Mind. 8 Zeichen. Wird gegen Datenlecks geprüft.</p>
              </div>
              <div>
                <Label htmlFor="rp-pw2">Passwort bestätigen</Label>
                <Input
                  id="rp-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold">
                {loading ? "Speichern…" : "Passwort speichern"}
              </Button>
            </form>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-6">
              Falls diese Seite hängen bleibt, fordere unter
              <Link to="/auth" className="text-primary underline mx-1">Anmelden → Passwort vergessen</Link>
              einen neuen Link an.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
