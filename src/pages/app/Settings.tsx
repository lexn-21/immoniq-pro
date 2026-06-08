import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, User as UserIcon, Sparkles, ExternalLink } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { getStripeEnvironment } from "@/lib/stripe";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import NotificationSettings from "@/components/NotificationSettings";

const Settings = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const sub = useSubscription();

  useEffect(() => { document.title = "Einstellungen · ImmonIQ"; }, []);
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) console.warn("[Settings] profile load:", error.message);
        setName(data?.display_name ?? "");
      } catch (e) {
        console.error("[Settings] profile load failed", e);
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("user_id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Profil gespeichert.");
  };

  const openPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("create-portal-session", {
      body: { returnUrl: `${window.location.origin}/app/settings`, environment: getStripeEnvironment() },
    });
    setPortalLoading(false);
    if (error || !data?.url) {
      toast.error(error?.message ?? "Portal konnte nicht geöffnet werden.");
      return;
    }
    window.open(data.url, "_blank");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground text-sm mt-1">Profil, Abo und Sicherheit.</p>
      </header>

      {/* ABO */}
      <Card className="p-6 glass">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-bold">Dein Plan</h2>
        </div>

        {sub.loading ? (
          <p className="text-sm text-muted-foreground">Lade…</p>
        ) : sub.hasActiveSubscription ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge>Pro · aktiv</Badge>
              {sub.cancelAtPeriodEnd && <Badge variant="outline">Kündigung zum {sub.periodEnd ? new Date(sub.periodEnd).toLocaleDateString("de-DE") : "Periodenende"}</Badge>}
            </div>
            {sub.periodEnd && !sub.cancelAtPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                Nächste Abrechnung: {new Date(sub.periodEnd).toLocaleDateString("de-DE")}
              </p>
            )}
            <Button onClick={openPortal} disabled={portalLoading} variant="outline" size="sm">
              {portalLoading ? "Öffne…" : "Abo verwalten"} <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        ) : sub.isTrial ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">🎁 Pro-Trial</Badge>
              <span className="text-sm text-muted-foreground">
                noch {sub.trialDaysLeft} Tag{sub.trialDaysLeft === 1 ? "" : "e"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Nach Ablauf wechselt dein Konto automatisch auf Free. Keine Abbuchung — du musst aktiv abonnieren.
            </p>
            <Button asChild size="sm">
              <Link to="/pricing">Pro abonnieren · 9,90 €/Monat</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Badge variant="outline">Free</Badge>
            <p className="text-sm text-muted-foreground">
              Du nutzt aktuell den kostenlosen Plan. Pro-Funktionen wie KI, Tresor, Markt-Inserate und mehr Objekte freischalten:
            </p>
            <Button asChild>
              <Link to="/pricing">Pro abonnieren · 9,90 €/Monat</Link>
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6 glass">
        <div className="flex items-center gap-3 mb-4">
          <UserIcon className="h-5 w-5 text-primary" />
          <h2 className="font-bold">Profil</h2>
        </div>
        <div className="space-y-3">
          <div><Label>E-Mail</Label><Input value={user?.email ?? ""} disabled /></div>
          <div><Label>Anzeigename</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        </div>
        <Button onClick={save} disabled={loading} className="mt-5 bg-gradient-gold text-primary-foreground shadow-gold">
          {loading ? "Speichern…" : "Speichern"}
        </Button>
      </Card>

      <NotificationSettings />


      <Card className="p-6 glass">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-bold">Sicherheit & Datenschutz</h2>
        </div>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>✓ Server in der EU (Frankfurt / Irland)</li>
          <li>✓ DSGVO-konform — Auftragsverarbeitungsvertrag auf Anfrage</li>
          <li>✓ Passwörter werden gegen die Have-I-Been-Pwned-Datenbank geprüft</li>
          <li>✓ Belege liegen in einem privaten Bucket — nur du hast Zugriff</li>
          <li>✓ Aufbewahrungsfristen nach § 147 AO werden überwacht</li>
        </ul>
      </Card>
    </div>
  );
};

export default Settings;
