import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdvisorAcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "needs_auth" | "accepting" | "done" | "error">("checking");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    document.title = "Steuerberater-Einladung · ImmonIQ";
    if (!token) { setState("error"); setMsg("Ungültiger Link."); return; }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState("needs_auth");
        return;
      }
      setState("accepting");
      const { error } = await supabase.rpc("advisor_accept_invite", { _token: token });
      if (error) { setState("error"); setMsg(error.message); return; }
      toast.success("Mandant verknüpft.");
      setState("done");
      setTimeout(() => navigate("/berater", { replace: true }), 1200);
    })();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="relative container py-8"><Link to="/"><Logo /></Link></div>
      <div className="relative container flex items-center justify-center px-4 pb-20">
        <Card className="w-full max-w-md p-8 glass shadow-glass text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          {state === "checking" && <p className="text-sm text-muted-foreground"><Loader2 className="h-4 w-4 inline animate-spin mr-2" />Prüfe Einladung…</p>}
          {state === "needs_auth" && (
            <>
              <h1 className="text-xl font-bold">Steuerberater-Zugang</h1>
              <p className="text-sm text-muted-foreground">
                Melde dich mit deiner E-Mail an oder erstelle einen kostenlosen Berater-Account. Danach wird der Mandant automatisch verknüpft.
              </p>
              <Button
                onClick={() => navigate(`/auth?advisor_invite=${encodeURIComponent(token!)}`)}
                className="w-full bg-gradient-gold text-primary-foreground shadow-gold"
              >
                Anmelden / Registrieren
              </Button>
            </>
          )}
          {state === "accepting" && <p className="text-sm text-muted-foreground"><Loader2 className="h-4 w-4 inline animate-spin mr-2" />Verknüpfe Mandant…</p>}
          {state === "done" && <p className="text-sm">✓ Mandant verknüpft. Weiter zum Dashboard…</p>}
          {state === "error" && (
            <>
              <p className="text-sm text-destructive">{msg || "Einladung ungültig oder abgelaufen."}</p>
              <Button asChild variant="outline" className="w-full"><Link to="/">Zur Startseite</Link></Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
