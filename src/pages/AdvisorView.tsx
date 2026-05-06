import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { Building2, Users, Wallet, Receipt, Calculator, ShieldCheck, Download, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { eur, date } from "@/lib/format";
import { toast } from "sonner";
import { ADVISOR_DEMO_TOKEN, advisorDemoData } from "@/lib/advisorDemo";

const CAT_LABEL: Record<string, string> = {
  immediate: "Erhaltungsaufwand", depreciable: "AfA-fähig", utilities_passthrough: "NK-umlagefähig",
  financing: "Finanzierungskosten", other: "Sonstige",
};
const KIND_LABEL: Record<string, string> = {
  rent_cold: "Kaltmiete", utilities: "Nebenkosten", deposit: "Kaution", other: "Sonstige",
};

const AdvisorView = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  useEffect(() => {
    document.title = "Steuerberater-Ansicht · ImmonIQ";
    if (!token) { setError("Ungültiger Link"); setLoading(false); return; }
    if (token === ADVISOR_DEMO_TOKEN) {
      setData(advisorDemoData);
      setLoading(false);
      return;
    }
    (async () => {
      const { data: payload, error: e1 } = await supabase.rpc("advisor_get_data", { _token: token });
      if (e1 || !payload) {
        setError("Dieser Link ist ungültig, abgelaufen oder wurde widerrufen.");
        setLoading(false);
        return;
      }
      setData(payload);
      setLoading(false);
      // log access (fire-and-forget)
      supabase.rpc("advisor_touch_token", { _token: token });
    })();
  }, [token]);

  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;

  const yearPayments = useMemo(() => (data?.payments ?? []).filter((p: any) => p.paid_on >= yStart && p.paid_on <= yEnd), [data, year]);
  const yearExpenses = useMemo(() => (data?.expenses ?? []).filter((e: any) => e.spent_on >= yStart && e.spent_on <= yEnd), [data, year]);

  const income = yearPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const byCat: Record<string, number> = yearExpenses.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});
  const totalExpenses = Object.values(byCat).reduce<number>((s, v) => s + v, 0);
  const afaTotal = (data?.properties ?? []).reduce((s: number, p: any) => {
    if (!p.purchase_price) return s;
    return s + Number(p.purchase_price) * 0.8 * (Number(p.afa_rate ?? 2) / 100);
  }, 0);
  const taxResult = income - (byCat.immediate ?? 0) - (byCat.financing ?? 0) - afaTotal;

  const exportCSV = () => {
    const properties = data?.properties ?? [];
    const rows = [
      ["Belegart","Datum","Beschreibung","Lieferant","Objekt","Kategorie","Betrag (EUR)"],
      ...yearPayments.map((p: any) => ["Einnahme", p.paid_on, p.note ?? "", "", "", KIND_LABEL[p.kind], String(p.amount).replace(".",",")]),
      ...yearExpenses.map((e: any) => {
        const propName = properties.find((p: any) => p.id === e.property_id)?.name ?? "";
        return ["Ausgabe", e.spent_on, e.description ?? "", e.vendor ?? "", propName, CAT_LABEL[e.category], String(e.amount).replace(".",",")];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ImmonIQ_Steuerexport_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV heruntergeladen.");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-10 max-w-md text-center glass">
        <ShieldCheck className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Zugriff nicht möglich</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <p className="text-xs text-muted-foreground mt-4">Bitte den Mandanten um einen neuen Link bitten.</p>
      </Card>
    </div>
  );

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container max-w-6xl py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge className="bg-primary/15 text-primary border-primary/30">Steuerberater · Read-only</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Mandant: <span className="font-medium text-foreground">{data?.owner_name ?? "—"}</span></p>
        </div>
      </header>

      <main className="container max-w-6xl py-8 space-y-8 animate-fade-in">
        {/* Year selector + Tax bridge KPIs */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" /> Steuer-Brücke {year}</h2>
              <p className="text-sm text-muted-foreground mt-1">Anlage V Vorbereitung · DATEV-kompatibler Export</p>
            </div>
            <div className="flex gap-2">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={exportCSV} className="bg-gradient-gold text-primary-foreground shadow-gold">
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 glass">
              <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Einnahmen</p><TrendingUp className="h-4 w-4 text-success" /></div>
              <p className="text-2xl font-bold">{eur(income)}</p>
            </Card>
            <Card className="p-5 glass">
              <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Werbungskosten</p><TrendingDown className="h-4 w-4 text-destructive" /></div>
              <p className="text-2xl font-bold">{eur((byCat.immediate ?? 0) + (byCat.financing ?? 0))}</p>
            </Card>
            <Card className="p-5 glass">
              <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">AfA</p><Building2 className="h-4 w-4 text-primary" /></div>
              <p className="text-2xl font-bold">{eur(afaTotal)}</p>
            </Card>
            <Card className={`p-5 glass border-2 ${taxResult >= 0 ? "border-success/30" : "border-destructive/30"}`}>
              <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Überschuss / Verlust</p><FileText className="h-4 w-4 text-primary" /></div>
              <p className={`text-2xl font-bold ${taxResult >= 0 ? "text-success" : "text-destructive"}`}>{eur(taxResult)}</p>
            </Card>
          </div>

          <Card className="p-6 glass">
            <h3 className="font-bold mb-4">Aufschlüsselung Werbungskosten {year}</h3>
            {Object.keys(byCat).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Keine Belege im Jahr {year}.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(byCat).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm">{CAT_LABEL[cat]}</span>
                    <span className="font-semibold">{eur(amount as number)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t-2 border-primary/30">
                  <span className="font-bold">Summe</span>
                  <span className="font-bold text-gradient-gold">{eur(totalExpenses)}</span>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Properties */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Objekte ({data?.properties?.length ?? 0})</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {(data?.properties ?? []).map((p: any) => (
              <Card key={p.id} className="p-4 glass">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{[p.street, p.zip, p.city].filter(Boolean).join(", ") || "—"}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div><span className="text-muted-foreground">Baujahr:</span> {p.build_year ?? "—"}</div>
                  <div><span className="text-muted-foreground">AfA:</span> {p.afa_rate ?? 2}%</div>
                  <div><span className="text-muted-foreground">Kaufpreis:</span> {p.purchase_price ? eur(p.purchase_price) : "—"}</div>
                  <div><span className="text-muted-foreground">Kauf am:</span> {p.purchase_date ? date(p.purchase_date) : "—"}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Tenants */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Mieter ({data?.tenants?.length ?? 0})</h2>
          <Card className="glass overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr><th className="text-left p-3">Name</th><th className="text-left p-3">E-Mail</th><th className="text-left p-3">Mietbeginn</th><th className="text-right p-3">Kaution</th></tr>
              </thead>
              <tbody>
                {(data?.tenants ?? []).map((t: any) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="p-3 font-medium">{t.full_name}</td>
                    <td className="p-3 text-muted-foreground">{t.email ?? "—"}</td>
                    <td className="p-3">{t.lease_start ? date(t.lease_start) : "—"}</td>
                    <td className="p-3 text-right">{t.deposit ? eur(t.deposit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        {/* Payments */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Zahlungen {year} ({yearPayments.length})</h2>
          <Card className="glass overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr><th className="text-left p-3">Datum</th><th className="text-left p-3">Art</th><th className="text-left p-3">Notiz</th><th className="text-right p-3">Betrag</th></tr>
              </thead>
              <tbody>
                {yearPayments.map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">{date(p.paid_on)}</td>
                    <td className="p-3 text-muted-foreground">{KIND_LABEL[p.kind]}</td>
                    <td className="p-3 text-muted-foreground">{p.note ?? "—"}</td>
                    <td className="p-3 text-right font-semibold text-success">+{eur(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        {/* Expenses */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Belege {year} ({yearExpenses.length})</h2>
          <Card className="glass overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr><th className="text-left p-3">Datum</th><th className="text-left p-3">Beschreibung</th><th className="text-left p-3">Lieferant</th><th className="text-left p-3">Kategorie</th><th className="text-right p-3">Betrag</th></tr>
              </thead>
              <tbody>
                {yearExpenses.map((e: any) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="p-3">{date(e.spent_on)}</td>
                    <td className="p-3">{e.description ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{e.vendor ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{CAT_LABEL[e.category]}</td>
                    <td className="p-3 text-right font-semibold">{eur(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-8 pb-4 border-t border-border">
          Read-only-Zugang via ImmonIQ · Daten Stand {date(new Date().toISOString())}
        </footer>
      </main>
    </div>
  );
};

export default AdvisorView;
