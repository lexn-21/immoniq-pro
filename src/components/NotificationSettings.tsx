import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Inbox, MailCheck, Megaphone, Receipt, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { isPushSupported, pushPermission, requestPushPermission, showLocalNotification } from "@/lib/pushNotifications";

type Prefs = {
  email_new_application: boolean;
  email_application_status: boolean;
  email_ad_moderation: boolean;
  email_invoice: boolean;
};

const DEFAULTS: Prefs = {
  email_new_application: true,
  email_application_status: true,
  email_ad_moderation: true,
  email_invoice: true,
};

const ITEMS: { key: keyof Prefs; icon: any; title: string; desc: string }[] = [
  { key: "email_new_application", icon: Inbox, title: "Neue Bewerbungen", desc: "Sofort Bescheid wenn jemand sich auf dein Inserat bewirbt — Antwort in 24 h verdreifacht die Vermietquote." },
  { key: "email_application_status", icon: MailCheck, title: "Bewerbungs-Status", desc: "Updates wenn der Vermieter dich vormerkt, einlädt oder absagt — keine Warterei mehr." },
  { key: "email_ad_moderation", icon: Megaphone, title: "Werbe-Freigaben", desc: "Sofort wissen wann deine Anzeige live geht oder warum sie nachgebessert werden muss." },
  { key: "email_invoice", icon: Receipt, title: "Rechnungen (GoBD)", desc: "Automatische PDF-Rechnung nach jeder Zahlung — direkt steuerlich verwertbar." },
];

export default function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs({
        email_new_application: data.email_new_application,
        email_application_status: data.email_application_status,
        email_ad_moderation: data.email_ad_moderation,
        email_invoice: data.email_invoice,
      });
      setLoading(false);
    })();
  }, [user]);

  const update = async (key: keyof Prefs, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await supabase
      .from("notification_prefs")
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
    if (error) {
      toast.error(error.message);
      setPrefs(prefs);
    } else {
      toast.success(value ? "Benachrichtigung an" : "Benachrichtigung aus");
    }
  };

  const [permission, setPermission] = useState<NotificationPermission>("default");
  const supported = isPushSupported();

  useEffect(() => { if (supported) setPermission(pushPermission()); }, [supported]);

  const enablePush = async () => {
    const res = await requestPushPermission();
    setPermission(res);
    if (res === "granted") {
      await showLocalNotification("ImmonIQ aktiviert ✓", {
        body: "Du bekommst ab jetzt Push-Benachrichtigungen, wenn die App offen ist.",
      });
      toast.success("Push-Benachrichtigungen aktiv");
    } else if (res === "denied") {
      toast.error("Im Browser blockiert — bitte in den Einstellungen erlauben.");
    }
  };

  return (
    <Card className="p-6 glass">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Benachrichtigungen</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-5">
        Du entscheidest, was in dein Postfach landet. Rechtlich notwendige Mails (Login, Sicherheit) bekommst du immer.
      </p>

      {supported && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5 mb-4">
          <Smartphone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">Push auf diesem Gerät</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sofort-Benachrichtigung bei neuen Bewerbungen, fälligen Mieten und Tickets — auch wenn die App nur im Hintergrund läuft.
            </p>
          </div>
          {permission === "granted" ? (
            <span className="text-xs font-bold text-success">Aktiv ✓</span>
          ) : permission === "denied" ? (
            <span className="text-xs text-muted-foreground">Blockiert</span>
          ) : (
            <Button size="sm" onClick={enablePush}>Aktivieren</Button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {ITEMS.map(({ key, icon: Icon, title, desc }) => (
          <div key={key} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/30 transition">
            <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <Label htmlFor={key} className="font-medium text-sm cursor-pointer block">{title}</Label>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
            </div>
            <Switch
              id={key}
              checked={prefs[key]}
              onCheckedChange={(v) => update(key, v)}
              disabled={loading}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
