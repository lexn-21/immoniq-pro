import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Building2, Receipt, Wallet, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { eur, date } from "@/lib/format";

const CAT_LABEL: Record<string, string> = {
  immediate: "Erhaltungsaufwand", depreciable: "AfA-fähig", utilities_passthrough: "NK-umlagefähig",
  financing: "Finanzierungskosten", other: "Sonstige",
};

export default function AdvisorMandate() {
  const { landlordId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [landlordName, setLandlordName] = useState("Mandant");
  const [canWrite, setCanWrite] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  useEffect(() => {
    if (!landlordId) return;
    document.title = "Mandant · ImmonIQ Steuerberater";
    (async () => {
      // touch + check
      const { error: tErr } = await supabase.rpc("advisor_touch_mandate", { _landlord: landlordId });
      if (tErr) { navigate("/berater", { replace: true }); return; }

      const [pr, tn, pa, ex, mList] = await Promise.all([
        supabase.from("properties").select("*").eq("user_id", landlordId).order("created_at"),
        supabase.from("tenants").select("*").eq("user_id", landlordId).order("created_at"),
        supabase.from("payments").select("*").eq("user_id", landlordId).order("paid_on", { ascending: false }),
        supabase.from("expenses").select("*").eq("user_id", landlordId).order("spent_on", { ascending: false }),
        supabase.rpc("advisor_list_mandates"),
      ]);
      setProperties(pr.data ?? []);
      setTenants(tn.data ?? []);
      setPayments(pa.data ?? []);
      setExpenses(ex.data ?? []);
      const me = (mList.data ?? []).find((m: any) => m.landlord_user_id === landlordId);
      if (me) { setLandlordName(me.landlord_name); setCanWrite(me.can_write); }
      setLoading(false);
    })();
  }, [landlordId, navigate]);

  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;
  const yearPayments = useMemo(() => payments.filter((p) => p.paid_on >= yStart && p.paid_on <= yEnd), [payments, year]);
  const yearExpenses = useMemo(() => expenses.filter((e) => e.spent_on >= yStart && e.spent_on <= yEnd), [expenses, year]);
  const income = yearPayments.reduce((s, p) => s + Number(p.amount), 0);
  const expense = yearExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCat: Record<string, number> = yearExpenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount); return acc;
  }, {});

  if (loading) return <div className="container py-10 text-sm text-muted-foreground">Lade Mandanten-Daten…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("/berater")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Mandanten
          </Button>
        </div>
      </header>
      <main className="container py-8 max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{landlordName}</h1>
            <div className="flex items-center gap-2 mt-1">
              {canWrite
                ? <Badge className="bg-success/15 text-success border-success/30">Schreibrechte aktiv</Badge>
                : <Badge variant="secondary">Nur lesen</Badge>}
              <span className="text-xs text-muted-foreground">Jede Aktion wird protokolliert.</span>
            </div>
          </div>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0,1,2,3].map(i => <SelectItem key={i} value={String(currentYear - i)}>{currentYear - i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Card className="p-5 glass">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-success" /> Einnahmen {year}</div>
            <div className="text-2xl font-bold mt-1">{eur(income)}</div>
            <div className="text-xs text-muted-foreground mt-1">{yearPayments.length} Zahlungen</div>
          </Card>
          <Card className="p-5 glass">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingDown className="h-4 w-4 text-destructive" /> Ausgaben {year}</div>
            <div className="text-2xl font-bold mt-1">{eur(expense)}</div>
            <div className="text-xs text-muted-foreground mt-1">{yearExpenses.length} Belege</div>
          </Card>
          <Card className="p-5 glass">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4 text-primary" /> Überschuss</div>
            <div className="text-2xl font-bold mt-1">{eur(income - expense)}</div>
            <div className="text-xs text-muted-foreground mt-1">Anlage-V-Vorbereitung</div>
          </Card>
        </div>

        <Card className="p-5 glass">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Objekte ({properties.length})</h2>
          <div className="space-y-2">
            {properties.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-border/60 last:border-0">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{[p.zip, p.city].filter(Boolean).join(" ")} · {p.area_sqm ?? "—"} m²</div>
                </div>
                <div className="text-xs text-muted-foreground">{p.purchase_date ? `gekauft ${date(p.purchase_date)}` : ""}</div>
              </div>
            ))}
            {properties.length === 0 && <p className="text-sm text-muted-foreground">Keine Objekte.</p>}
          </div>
        </Card>

        <Card className="p-5 glass">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Ausgaben nach Kategorie ({year})</h2>
          <div className="space-y-1.5 text-sm">
            {Object.entries(byCat).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-muted-foreground">{CAT_LABEL[k] ?? k}</span><span className="font-mono">{eur(v)}</span></div>
            ))}
            {Object.keys(byCat).length === 0 && <p className="text-muted-foreground">Keine Belege in {year}.</p>}
          </div>
        </Card>

        <Card className="p-5 glass">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Letzte Zahlungen</h2>
          <div className="space-y-1 text-sm">
            {yearPayments.slice(0, 20).map((p) => (
              <div key={p.id} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                <span className="text-muted-foreground">{date(p.paid_on)} · {p.type}</span>
                <span className="font-mono">{eur(p.amount)}</span>
              </div>
            ))}
            {yearPayments.length === 0 && <p className="text-muted-foreground">Keine Zahlungen in {year}.</p>}
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          Du sieht nur Daten dieses Mandanten · Zugriff durch Vermieter widerrufbar · DSGVO-konform
        </p>
      </main>
    </div>
  );
}
