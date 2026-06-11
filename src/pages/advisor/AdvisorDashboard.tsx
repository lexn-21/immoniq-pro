import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { Building2, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { date } from "@/lib/format";
import { toast } from "sonner";

export default function AdvisorDashboard() {
  const navigate = useNavigate();
  const [mandates, setMandates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Mandanten · ImmonIQ Steuerberater";
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth?as=advisor", { replace: true }); return; }
      const { data, error } = await supabase.rpc("advisor_list_mandates");
      if (error) toast.error(error.message);
      setMandates(data ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4 mr-2" /> Abmelden
          </Button>
        </div>
      </header>
      <main className="container py-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" /> Meine Mandanten</h1>
          <p className="text-muted-foreground text-sm mt-1">Alle Vermieter, die dir Zugriff gegeben haben — an einem Ort.</p>
        </div>

        {loading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Lade…</Card>
        ) : mandates.length === 0 ? (
          <Card className="p-10 text-center glass">
            <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium">Noch keine Mandanten verknüpft</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sobald ein Vermieter dich einlädt, erscheint er hier. Den Einladungs-Link bekommst du per E-Mail.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {mandates.map((m) => (
              <Card key={m.mandate_id} className="p-5 glass hover:bg-card/80 transition cursor-pointer"
                    onClick={() => navigate(`/berater/${m.landlord_user_id}`)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{m.landlord_name}</h3>
                      {m.can_write ? (
                        <Badge className="bg-success/15 text-success border-success/30">Schreibrechte</Badge>
                      ) : (
                        <Badge variant="secondary">Nur lesen</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Building2 className="h-3.5 w-3.5" /> {m.property_count} Objekte · seit {date(m.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
