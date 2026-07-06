import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { LegalFooter } from "@/components/LegalFooter";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  // Auf Webhook warten: Subscription muss in DB sein, bevor wir „freigeschaltet" sagen.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const env = getStripeEnvironment();
    const start = Date.now();

    const poll = async () => {
      while (!cancelled && Date.now() - start < 20000) {
        const { data } = await supabase
          .from("subscriptions")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("environment", env)
          .in("status", ["active", "trialing", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) { setReady(true); return; }
        await new Promise((r) => setTimeout(r, 1500));
      }
      // Nach 20s Timeout: trotzdem freigeben, Webhook kommt fast immer in <5s
      if (!cancelled) setReady(true);
    };
    poll();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-6">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          {ready ? (
            <>
              <CheckCircle2 className="h-14 w-14 text-success mx-auto" />
              <h1 className="text-2xl font-bold">Willkommen bei ImmonIQ Pro!</h1>
              <p className="text-sm text-muted-foreground">
                Alles freigeschaltet. Eine Rechnung kommt per E-Mail.
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-14 w-14 text-primary mx-auto animate-spin" />
              <h1 className="text-2xl font-bold">Zahlung wird verarbeitet…</h1>
              <p className="text-sm text-muted-foreground">
                Sekunde, wir aktivieren dein Abo.
              </p>
            </>
          )}
          {sessionId && (
            <p className="text-[10px] text-muted-foreground/60 font-mono break-all">
              Session: {sessionId}
            </p>
          )}
          <Button asChild className="w-full" disabled={!ready}>
            <Link to="/app">Zum Dashboard</Link>
          </Button>
        </Card>
      </div>
      <LegalFooter compact />
    </div>
  );
}
