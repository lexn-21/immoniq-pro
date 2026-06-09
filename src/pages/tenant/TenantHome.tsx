import { useOutletContext, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, MapPin, Calendar, Wallet, MessageCircle, FileText, AlertTriangle, Scale, Sparkles, ShieldCheck, Lock, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { eur, date } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import type { TenantCtx } from "./TenantLayout";

export default function TenantHome() {
  const ctx = useOutletContext<TenantCtx>();
  const { user } = useAuth();
  const { tenant, unit, property } = ctx;
  const linked = !!tenant;
  const first = (tenant?.full_name ?? user?.user_metadata?.display_name ?? user?.email ?? "").toString().split(" ")[0] || "Mieter";

  if (!linked) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-muted-foreground">Willkommen</p>
          <h1 className="text-3xl font-bold tracking-tight">
            Hi {first} 👋
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Dein kostenloser Mieter-Account ist startklar. Lege jetzt deine Unterlagen im <strong>Tresor</strong> ab oder verbinde dich mit deinem Vermieter — beides kostet nichts.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Link to="/mein-immoniq/verbinden">
            <Card className="p-5 h-full border-primary/30 bg-gradient-to-br from-primary/10 to-transparent hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Mit Vermieter verbinden</p>
                  <p className="text-sm text-muted-foreground mt-1">E-Mail eingeben, fertig. Kein Code, keine Einladung. Chat & Dokumente schalten sich automatisch frei.</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/mein-immoniq/tresor">
            <Card className="p-5 h-full hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Mein Tresor</p>
                  <p className="text-sm text-muted-foreground mt-1">Ausweis, SCHUFA, Versicherungen — alles privat & verschlüsselt. Bleibt deins, auch wenn du umziehst.</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/mein-immoniq/rechte">
            <Card className="p-5 h-full hover:shadow-md transition">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Meine Rechte</p>
                  <p className="text-sm text-muted-foreground mt-1">Mietminderung, Kündigung, NK-Einspruch — verständlich auf Augenhöhe.</p>
                </div>
              </div>
            </Card>
          </Link>
          <Card className="p-5 h-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Für immer kostenlos.</p>
                <p className="text-sm text-muted-foreground mt-1">Chat, Tresor, Schäden, Rechte — gratis. Premium-KI optional.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const warm = (Number(unit?.rent_cold ?? 0) + Number(unit?.utilities ?? 0));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">Hallo</p>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          {first} <Badge variant="secondary" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />verifizierter Mieter</Badge>
        </h1>
      </motion.div>

      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{property?.name ?? "Wohnung"} {unit?.label && `· ${unit.label}`}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {property ? `${property.street}, ${property.zip} ${property.city}` : "Noch keine Adresse hinterlegt"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
          <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wohnfläche</p><p className="font-mono font-semibold mt-1">{unit?.living_space ?? "—"} m²</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Kaltmiete</p><p className="font-mono font-semibold mt-1">{eur(unit?.rent_cold ?? 0)}</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nebenkosten</p><p className="font-mono font-semibold mt-1">{eur(unit?.utilities ?? 0)}</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Warmmiete</p><p className="font-mono font-semibold mt-1 text-primary">{eur(warm)}</p></div>
        </div>
        {(tenant!.lease_start || tenant!.deposit) && (
          <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t text-sm">
            {tenant!.lease_start && <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />Einzug: <span className="font-medium">{date(tenant!.lease_start)}</span></div>}
            {tenant!.deposit && <div className="flex items-center gap-2"><Wallet className="h-3.5 w-3.5 text-muted-foreground" />Kaution: <span className="font-medium">{eur(tenant!.deposit)}</span></div>}
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        <QuickCard to="/mein-immoniq/chat" icon={MessageCircle} title="Chat mit Vermieter" desc="Direkt schreiben — sofort zugestellt." />
        <QuickCard to="/mein-immoniq/schaeden" icon={AlertTriangle} title="Schaden melden" desc="Foto machen — KI füllt das Formular." accent />
        <QuickCard to="/mein-immoniq/dokumente" icon={FileText} title="Dokumente" desc="Vertrag, NK-Abrechnung & Belege." />
        <QuickCard to="/mein-immoniq/tresor" icon={Lock} title="Mein Tresor" desc="Privat & verschlüsselt — nur du." />
      </div>

      <Card className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-semibold">Dein Mieter-Account ist und bleibt kostenlos.</p>
            <p className="text-sm text-muted-foreground mt-1">Chat, Tresor, Schäden, Rechte — gratis. Premium-Features kommen optional.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function QuickCard({ to, icon: Icon, title, desc, accent }: any) {
  return (
    <Link to={to}>
      <Card className={`p-4 h-full hover:shadow-md transition group ${accent ? "border-primary/30 bg-primary/5" : ""}`}>
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${accent ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold group-hover:text-primary transition">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
