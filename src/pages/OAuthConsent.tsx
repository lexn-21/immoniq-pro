import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

// Supabase Auth beta namespace — types not always exposed. Small typed wrapper.
type OAuthNS = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthApi = (): OAuthNS => (supabase.auth as unknown as { oauth: OAuthNS }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Fehlende Authorization-ID.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        setError(e?.message ?? "Fehler beim Laden.");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const api = oauthApi();
      const { data, error } = approve
        ? await api.approveAuthorization(authorizationId)
        : await api.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("Kein Redirect vom Autorisierungsserver.");
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "Fehler.");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <Logo />
        {error ? (
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Anfrage konnte nicht geladen werden</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Lade Autorisierungsanfrage…</p>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">
                {details.client?.name ?? "Eine App"} mit deinem ImmonIQ-Konto verbinden?
              </h1>
              <p className="text-sm text-muted-foreground">
                Diese Anwendung darf im Rahmen deines Kontos Immobilien, Mieter, Zahlungen und Aufgaben
                lesen sowie Ausgaben erfassen. Du kannst die Verbindung jederzeit widerrufen.
              </p>
            </div>
            <div className="flex gap-3">
              <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
                Erlauben
              </Button>
              <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">
                Ablehnen
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
