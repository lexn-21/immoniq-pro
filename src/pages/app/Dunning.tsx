import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, Mail, ShieldAlert, CheckCircle2, Printer, Zap } from "lucide-react";
import { eur, date } from "@/lib/format";
import { computeBalances, generateDunningHTML, openDunningWindow, type TenantBalance } from "@/lib/dunning";
import { toast } from "sonner";
import { AIDisclaimer } from "@/components/AIDisclaimer";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";

const LEVEL_BADGE: Record<number, { label: string; cls: string; icon: any }> = {
  0: { label: "Aktuell", cls: "bg-success/15 text-success border-success/30", icon: CheckCircle2 },
  1: { label: "Erinnerung", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: Mail },
  2: { label: "1. Mahnung", cls: "bg-orange-500/15 text-orange-500 border-orange-500/30", icon: AlertTriangle },
  3: { label: "2. Mahnung", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: ShieldAlert },
};

const Dunning = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [landlordName, setLandlordName] = useState("Vermieter");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Mahnwesen · ImmonIQ";
    (async () => {
      setLoading(true);
      const [t, u, p, pay, prof] = await Promise.all([
        supabase.from("tenants").select("*"),
        supabase.from("units").select("*"),
        supabase.from("properties").select("*"),
        supabase.from("payments").select("*"),
        user ? supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setTenants(t.data ?? []);
      setUnits(u.data ?? []);
      setProperties(p.data ?? []);
      setPayments(pay.data ?? []);
      if ((prof as any).data?.display_name) setLandlordName((prof as any).data.display_name);
      setLoading(false);
    })();
  }, [user]);

  const balances = useMemo(
    () => computeBalances(tenants, units, properties, payments).sort((a, b) => b.level - a.level || a.balance - b.balance),
    [tenants, units, properties, payments],
  );

  const totalOutstanding = balances.filter(b => b.balance < 0).reduce((s, b) => s + Math.abs(b.balance), 0);
  const cntDue = balances.filter(b => b.level > 0).length;

  const printDunning = (b: TenantBalance) => {
    const html = generateDunningHTML(b, landlordName, user?.email ?? "");
    if (!openDunningWindow(html)) toast.error("Pop-up blockiert. Bitte erlauben.");
  };

  const runAutoDunning = () => {
    const due = balances.filter((b) => b.level > 0);
    if (due.length === 0) {
      toast.info("Keine Mieter im Verzug — alles aktuell ✅");
      return;
    }
    const letters = due.map((b) => generateDunningHTML(b, landlordName, user?.email ?? ""));
    // Extract body of each letter and join with page breaks
    const bodies = letters.map((html) => {
      const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return m ? m[1] : html;
    });
    const head = letters[0].match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
    const combined = `<!doctype html><html lang="de"><head>${head}<style>.page-break{page-break-before:always;}</style></head><body>${bodies
      .map((b, i) => (i === 0 ? b : `<div class="page-break"></div>${b}`))
      .join("")}</body></html>`;
    if (!openDunningWindow(combined)) toast.error("Pop-up blockiert. Bitte erlauben.");
    else toast.success(`${due.length} Mahnung${due.length === 1 ? "" : "en"} generiert`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-primary" /> Mahnwesen
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Soll/Ist-Vergleich pro Mieter · Mahnschreiben rechtssicher in 3 Sekunden.
          </p>
        </div>
        {cntDue > 0 && (
          <Button onClick={runAutoDunning} className="bg-gradient-gold text-primary-foreground shadow-gold">
            <Zap className="h-4 w-4 mr-2" /> Auto-Mahnlauf ({cntDue})
          </Button>
        )}
      </header>

      <AIDisclaimer />
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5 glass">
          <p className="text-xs text-muted-foreground">Offene Forderungen</p>
          <p className="text-2xl font-bold mt-1 text-destructive">{eur(totalOutstanding)}</p>
        </Card>
        <Card className="p-5 glass">
          <p className="text-xs text-muted-foreground">Mieter im Verzug</p>
          <p className="text-2xl font-bold mt-1">{cntDue} <span className="text-sm text-muted-foreground font-normal">/ {balances.length}</span></p>
        </Card>
        <Card className="p-5 glass">
          <p className="text-xs text-muted-foreground">Ø Außenstand pro Mieter</p>
          <p className="text-2xl font-bold mt-1">{eur(cntDue > 0 ? totalOutstanding / cntDue : 0)}</p>
        </Card>
      </div>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : balances.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Noch keine Mieter erfasst"
          description="Sobald du Mieter zu deinen Objekten hinzufügst, berechnet ImmonIQ automatisch Soll/Ist und erstellt rechtssichere Mahnungen nach BGB."
          action={{ label: "Mieter anlegen", to: "/app/tenants" }}
          secondary={{ label: "Objekt anlegen", to: "/app/properties" }}
        />
      ) : (
        <div className="space-y-3">
          {balances.map((b) => {
            const cfg = LEVEL_BADGE[b.level];
            const Icon = cfg.icon;
            return (
              <Card key={b.tenant.id} className="p-5 glass">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold truncate">{b.tenant.full_name}</h3>
                      <Badge variant="outline" className={cfg.cls}>
                        <Icon className="h-3 w-3 mr-1" /> {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.property?.name ?? "—"} · {b.unit?.label ?? "—"} · Letzte Zahlung: {date(b.lastPayment)}
                    </p>
                    <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Soll ({b.monthsDue} Monate)</p>
                        <p className="font-semibold">{eur(b.expectedTotal)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Ist</p>
                        <p className="font-semibold">{eur(b.paidTotal)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Saldo</p>
                        <p className={`font-bold ${b.balance < 0 ? "text-destructive" : "text-success"}`}>
                          {b.balance >= 0 ? "+" : ""}{eur(b.balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {b.level > 0 && (
                    <Button
                      onClick={() => printDunning(b)}
                      className="bg-gradient-gold text-primary-foreground shadow-gold"
                      size="sm"
                    >
                      <Printer className="h-4 w-4 mr-2" /> {LEVEL_BADGE[b.level].label} drucken
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-6 glass bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1">Rechtssichere Vorlagen nach BGB</p>
            <p>
              Stufe 1 (Erinnerung, 14 Tage) · Stufe 2 (1. Mahnung, 10 Tage, § 288 BGB Verzugszinsen) ·
              Stufe 3 (Letzte Aufforderung, 7 Tage, § 543 Abs. 2 Nr. 3 BGB Kündigungsandrohung).
              Druck als PDF über Browser-Dialog.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dunning;
