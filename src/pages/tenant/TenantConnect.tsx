import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function TenantConnect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState(user?.user_metadata?.display_name ?? "");
  const [loading, setLoading] = useState(false);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Bitte E-Mail eingeben");
    setLoading(true);
    const { error } = await supabase.rpc("tenant_connect_by_landlord_email", {
      _email: email.trim(),
      _my_name: name.trim() || "Mieter",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Verbunden! Du kannst jetzt chatten.");
    navigate("/mein-immoniq/chat", { replace: true });
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" /> Mit Vermieter verbinden
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gib einfach die E-Mail-Adresse deines Vermieters ein — kein Token, keine Einladung. Sobald euer Vermieter auch ImmonIQ nutzt, seid ihr verbunden.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={connect} className="space-y-4">
          <div>
            <Label htmlFor="lname">Dein Name</Label>
            <Input id="lname" value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" required />
          </div>
          <div>
            <Label htmlFor="lemail">E-Mail deines Vermieters</Label>
            <Input id="lemail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vermieter@beispiel.de" required />
            <p className="text-[11px] text-muted-foreground mt-1">Dein Vermieter muss bei ImmonIQ registriert sein.</p>
          </div>
          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Verbinden
          </Button>
        </form>
      </Card>

      <Card className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Vermieter noch nicht dabei?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Auch ohne Vermieter kannst du sofort den <strong>Tresor</strong> nutzen, deine <strong>Rechte</strong> einsehen und alles vorbereiten. Sobald euer Vermieter sich registriert, verbindet ihr euch in 5 Sekunden.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
