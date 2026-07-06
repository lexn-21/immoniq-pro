import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LegalFooter } from "@/components/LegalFooter";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    document.title = "Abmelden · ImmonIQ";
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error || !data?.success) setState("error");
    else setState("done");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 glass text-center space-y-5">
        <div className="flex justify-center">
          {state === "loading" || state === "submitting" ? (
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          ) : state === "done" || state === "already" ? (
            <CheckCircle2 className="h-10 w-10 text-success" />
          ) : state === "valid" ? (
            <MailX className="h-10 w-10 text-primary" />
          ) : (
            <XCircle className="h-10 w-10 text-destructive" />
          )}
        </div>

        {state === "loading" && <p className="text-sm text-muted-foreground">Token wird geprüft…</p>}

        {state === "valid" && (
          <>
            <h1 className="text-2xl font-bold">Abmelden bestätigen</h1>
            <p className="text-sm text-muted-foreground">
              Du erhältst dann keine E-Mails von ImmonIQ mehr (außer rechtlich notwendige).
            </p>
            <Button onClick={confirm} className="w-full bg-gradient-gold text-primary-foreground shadow-gold">
              Jetzt abmelden
            </Button>
          </>
        )}

        {state === "submitting" && <p className="text-sm text-muted-foreground">Wird verarbeitet…</p>}

        {(state === "done" || state === "already") && (
          <>
            <h1 className="text-2xl font-bold">Abgemeldet</h1>
            <p className="text-sm text-muted-foreground">
              {state === "already"
                ? "Diese Adresse wurde bereits abgemeldet."
                : "Du bekommst keine weiteren Mails von uns. Schade, dass du gehst!"}
            </p>
            <Link to="/"><Button variant="outline" className="w-full">Zurück zur Startseite</Button></Link>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="text-2xl font-bold">Link ungültig</h1>
            <p className="text-sm text-muted-foreground">
              Der Abmelde-Link ist abgelaufen oder ungültig.
            </p>
            <Link to="/"><Button variant="outline" className="w-full">Zur Startseite</Button></Link>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="text-2xl font-bold">Etwas ist schiefgelaufen</h1>
            <p className="text-sm text-muted-foreground">Bitte später nochmal versuchen.</p>
            <Button onClick={() => location.reload()} variant="outline" className="w-full">Erneut versuchen</Button>
          </>
        )}
      </Card>
      <LegalFooter />
      </div>
  );
}
