import { useOutletContext, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, MapPin, Calendar, Wallet, MessageCircle, FileText, AlertTriangle, Scale, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { eur, date } from "@/lib/format";
import type { TenantCtx } from "./TenantLayout";

export default function TenantHome() {
  const ctx = useOutletContext<TenantCtx>();
  const { tenant, unit, property } = ctx;
  const warm = (Number(unit?.rent_cold ?? 0) + Number(unit?.utilities ?? 0));
  const first = tenant.full_name.split(" ")[0] || tenant.full_name;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">Hallo</p>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          {first} <Badge variant="secondary" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />verifizierter Mieter</Badge>
        </h1>
      </motion.div>

      {/* Wohnung */}
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{property?.name ?? "Wohnung"} {unit?.label && `· ${unit.label}`}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {property ? `${property.street}, ${property.zip} ${property.city}` : "—"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wohnfläche</p>
            <p className="font-mono font-semibold mt-1">{unit?.living_space ?? "—"} m²</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Kaltmiete</p>
            <p className="font-mono font-semibold mt-1">{eur(unit?.rent_cold ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nebenkosten</p>
            <p className="font-mono font-semibold mt-1">{eur(unit?.utilities ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Warmmiete</p>
            <p className="font-mono font-semibold mt-1 text-primary">{eur(warm)}</p>
          </div>
        </div>
        {(tenant.lease_start || tenant.deposit) && (
          <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t text-sm">
            {tenant.lease_start && (
              <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />Einzug: <span className="font-medium">{date(tenant.lease_start)}</span></div>
            )}
            {tenant.deposit && (
              <div className="flex items-center gap-2"><Wallet className="h-3.5 w-3.5 text-muted-foreground" />Kaution: <span className="font-medium">{eur(tenant.deposit)}</span></div>
            )}
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-3">
        <QuickCard to="/mein-immoniq/chat" icon={MessageCircle} title="Chat mit Vermieter"
          desc="Direkt schreiben — wird sofort zugestellt." />
        <QuickCard to="/mein-immoniq/schaeden" icon={AlertTriangle} title="Schaden melden"
          desc="Mit KI: einfach Foto machen — Formular füllt sich selbst." accent />
        <QuickCard to="/mein-immoniq/dokumente" icon={FileText} title="Meine Dokumente"
          desc="Mietvertrag, Nebenkostenabrechnung, eigene Belege — alles sicher in einem Tresor." />
        <QuickCard to="/mein-immoniq/rechte" icon={Scale} title="Meine Rechte"
          desc="Mietminderung, Kündigung, NK-Einspruch — auf Augenhöhe verständlich." />
      </div>

      {/* Why */}
      <Card className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-semibold">Dein Mieter-Account ist und bleibt kostenlos.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Chat, Dokumenten-Tresor, Schadensmeldungen, NK-Einsicht und Rechte-Hub — gratis. Premium-Features wie Vertrags-KI-Check oder NK-Einspruch-Generator kommen optional dazu.
            </p>
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
