import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Building2, Receipt, Wallet, FileText, TrendingUp, TrendingDown, FileDown, Plus, Users, LogOut } from "lucide-react";
import { eur, date } from "@/lib/format";
import { toast } from "sonner";
import jsPDF from "jspdf";

const CAT_LABEL: Record<string, string> = {
  immediate: "Erhaltungsaufwand", depreciable: "AfA-fähig", utilities_passthrough: "NK-umlagefähig",
  financing: "Finanzierungskosten", other: "Sonstige",
};
const CATEGORIES = Object.keys(CAT_LABEL);
const PAYMENT_KINDS = ["rent_cold", "rent_warm", "utilities", "deposit", "other"];

export default function AdvisorMandate() {
  const { landlordId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mandates, setMandates] = useState<any[]>([]);
  const [landlordName, setLandlordName] = useState("Mandant");
  const [canWrite, setCanWrite] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [advisorId, setAdvisorId] = useState<string | null>(null);

  // Forms
  const [expOpen, setExpOpen] = useState(false);
  const [expForm, setExpForm] = useState({
    spent_on: new Date().toISOString().slice(0, 10),
    amount: "", vendor: "", description: "", category: "immediate",
    property_id: "", advisor_note: "",
  });
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    paid_on: new Date().toISOString().slice(0, 10),
    amount: "", kind: "rent_cold", note: "",
    property_id: "", advisor_note: "",
  });

  const reload = async () => {
    if (!landlordId) return;
    const [pr, pa, ex] = await Promise.all([
      supabase.from("properties").select("*").eq("user_id", landlordId).order("created_at"),
      supabase.from("payments").select("*").eq("user_id", landlordId).order("paid_on", { ascending: false }),
      supabase.from("expenses").select("*").eq("user_id", landlordId).order("spent_on", { ascending: false }),
    ]);
    setProperties(pr.data ?? []);
    setPayments(pa.data ?? []);
    setExpenses(ex.data ?? []);
  };

  useEffect(() => {
    if (!landlordId) return;
    document.title = "Mandant · ImmonIQ Steuerberater";
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAdvisorId(user?.id ?? null);

      const { error: tErr } = await supabase.rpc("advisor_touch_mandate", { _landlord: landlordId });
      if (tErr) { navigate("/berater", { replace: true }); return; }

      const { data: mList } = await supabase.rpc("advisor_list_mandates");
      setMandates(mList ?? []);
      const me = (mList ?? []).find((m: any) => m.landlord_user_id === landlordId);
      if (me) { setLandlordName(me.landlord_name); setCanWrite(me.can_write); }

      await reload();
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

  const submitExpense = async () => {
    if (!landlordId || !advisorId) return;
    if (!expForm.amount || !expForm.spent_on) return toast.error("Datum & Betrag fehlen");
    const { error } = await supabase.from("expenses").insert({
      user_id: landlordId,
      advisor_user_id: advisorId,
      source: "advisor",
      spent_on: expForm.spent_on,
      amount: Number(expForm.amount.replace(",", ".")),
      vendor: expForm.vendor || null,
      description: expForm.description || null,
      category: expForm.category as any,
      property_id: expForm.property_id || null,
      advisor_note: expForm.advisor_note || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Beleg gebucht · markiert als „vom Steuerberater"");
    setExpOpen(false);
    setExpForm({ ...expForm, amount: "", vendor: "", description: "", advisor_note: "" });
    reload();
  };

  const submitPayment = async () => {
    if (!landlordId || !advisorId) return;
    if (!payForm.amount || !payForm.paid_on) return toast.error("Datum & Betrag fehlen");
    const { error } = await supabase.from("payments").insert({
      user_id: landlordId,
      advisor_user_id: advisorId,
      source: "advisor",
      paid_on: payForm.paid_on,
      amount: Number(payForm.amount.replace(",", ".")),
      kind: payForm.kind as any,
      note: payForm.note || null,
      property_id: payForm.property_id || null,
      advisor_note: payForm.advisor_note || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Zahlung gebucht · markiert als „vom Steuerberater"");
    setPayOpen(false);
    setPayForm({ ...payForm, amount: "", note: "", advisor_note: "" });
    reload();
  };

  const exportAnlageV = () => {
    if (properties.length === 0) return toast.error("Keine Objekte vorhanden.");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    properties.forEach((prop, idx) => {
      if (idx > 0) doc.addPage();
      const pPay = yearPayments.filter(p => p.property_id === prop.id);
      const pExp = yearExpenses.filter(e => e.property_id === prop.id);
      const pIncome = pPay.reduce((s, p) => s + Number(p.amount), 0);
      const pCat: Record<string, number> = pExp.reduce((a: Record<string, number>, e) => {
        a[e.category] = (a[e.category] ?? 0) + Number(e.amount); return a;
      }, {});
      const pAfa = prop.purchase_price
        ? Number(prop.purchase_price) * 0.8 * (Number(prop.afa_rate ?? 2) / 100) : 0;
      const sumWk = (pCat.immediate ?? 0) + (pCat.financing ?? 0) + pAfa + (pCat.other ?? 0);
      const result = pIncome - sumWk;

      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("Anlage V", 15, 20);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Einkünfte aus Vermietung und Verpachtung · ${year} · Mandant: ${landlordName}`, 15, 26);
      doc.setDrawColor(200); doc.line(15, 30, pageW - 15, 30);

      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Objektangaben", 15, 38);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(`Bezeichnung: ${prop.name ?? "—"}`, 15, 44);
      doc.text(`Anschrift: ${[prop.street, prop.zip, prop.city].filter(Boolean).join(", ") || "—"}`, 15, 49);
      doc.text(`Anschaffungsdatum: ${prop.purchase_date ?? "—"}`, 15, 54);
      doc.text(`Anschaffungskosten: ${prop.purchase_price ? eur(prop.purchase_price) : "—"}`, 15, 59);
      doc.text(`Wohnfläche: ${prop.area_sqm ?? "—"} m²`, 15, 64);

      let y = 76;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Einnahmen (Zeile 9 ff.)", 15, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text("Miete + Nebenkostenvorauszahlungen", 15, y);
      doc.text(eur(pIncome), pageW - 15, y, { align: "right" });
      y += 8;

      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Werbungskosten (Zeile 33 ff.)", 15, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const rows: Array<[string, number, string]> = [
        ["Erhaltungsaufwand (§ 9 EStG)", pCat.immediate ?? 0, "Zeile 40"],
        ["Schuldzinsen / Finanzierungskosten", pCat.financing ?? 0, "Zeile 36"],
        ["AfA Gebäude (linear, 80/20)", pAfa, "Zeile 33"],
        ["Sonstige Werbungskosten", pCat.other ?? 0, "Zeile 50"],
      ];
      rows.forEach(([l, a, r]) => {
        doc.text(l, 15, y);
        doc.setTextColor(150); doc.text(r, pageW - 50, y, { align: "right" });
        doc.setTextColor(0); doc.text(eur(a), pageW - 15, y, { align: "right" });
        y += 5;
      });
      doc.setDrawColor(180); doc.line(15, y, pageW - 15, y); y += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Summe Werbungskosten", 15, y);
      doc.text(eur(sumWk), pageW - 15, y, { align: "right" });
      y += 12;

      doc.setFontSize(12);
      doc.setFillColor(result >= 0 ? 220 : 255, result >= 0 ? 245 : 230, result >= 0 ? 220 : 230);
      doc.rect(15, y - 5, pageW - 30, 10, "F");
      doc.text(result >= 0 ? "Überschuss" : "Verlust", 18, y + 1);
      doc.text(eur(result), pageW - 18, y + 1, { align: "right" });

      doc.setFontSize(7); doc.setTextColor(150);
      doc.text(`Erstellt mit ImmonIQ · ${new Date().toLocaleDateString("de-DE")} · vom Steuerberater`, 15, 287);
      doc.text(`Seite ${idx + 1} von ${properties.length}`, pageW - 15, 287, { align: "right" });
    });
    doc.save(`Anlage_V_${landlordName.replace(/\s+/g, "_")}_${year}.pdf`);
    toast.success("Anlage V heruntergeladen.");
  };

  const exportCSV = () => {
    const rows = [
      ["Belegart","Datum","Beschreibung","Lieferant","Objekt","Kategorie","Quelle","Betrag (EUR)"],
      ...yearPayments.map(p => ["Einnahme", p.paid_on, p.note ?? "", "", properties.find(pr => pr.id === p.property_id)?.name ?? "", p.kind, p.source, String(p.amount).replace(".", ",")]),
      ...yearExpenses.map(e => ["Ausgabe", e.spent_on, e.description ?? "", e.vendor ?? "", properties.find(pr => pr.id === e.property_id)?.name ?? "", CAT_LABEL[e.category], e.source, String(e.amount).replace(".", ",")]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${landlordName.replace(/\s+/g, "_")}_Steuerexport_${year}.csv`;
    a.click();
    toast.success("CSV exportiert.");
  };

  if (loading) return <div className="container py-10 text-sm text-muted-foreground">Lade Mandanten-Daten…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container py-3 flex items-center justify-between gap-2 flex-wrap">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-2">
            {mandates.length > 1 && (
              <Select value={landlordId!} onValueChange={(v) => navigate(`/berater/${v}`)}>
                <SelectTrigger className="w-[220px]"><Users className="h-4 w-4 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mandates.map((m) => (
                    <SelectItem key={m.landlord_user_id} value={m.landlord_user_id}>
                      {m.landlord_name}{m.can_write ? " ✎" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/berater")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Mandanten
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
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
              <span className="text-xs text-muted-foreground">Jede Aktion wird protokolliert · DSGVO-konform</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0,1,2,3,4].map(i => <SelectItem key={i} value={String(currentYear - i)}>{currentYear - i}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={exportAnlageV} className="bg-gradient-gold text-primary-foreground shadow-gold">
              <FileDown className="h-4 w-4 mr-2" /> Anlage V PDF
            </Button>
            <Button onClick={exportCSV} variant="outline">
              <FileDown className="h-4 w-4 mr-2" /> CSV
            </Button>
          </div>
        </div>

        {canWrite && (
          <Card className="p-4 glass border-primary/30 bg-gradient-to-br from-primary/5 to-transparent flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">Du hast Schreibrechte für diesen Mandant</p>
              <p className="text-xs text-muted-foreground">Belege & Zahlungen, die du eintragst, werden als „vom Steuerberater" markiert.</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={expOpen} onOpenChange={setExpOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Beleg buchen</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Beleg / Ausgabe buchen</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Datum *</Label><Input type="date" value={expForm.spent_on} onChange={e => setExpForm({...expForm, spent_on: e.target.value})} /></div>
                      <div><Label>Betrag (EUR) *</Label><Input value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} placeholder="129,90" /></div>
                    </div>
                    <div><Label>Lieferant</Label><Input value={expForm.vendor} onChange={e => setExpForm({...expForm, vendor: e.target.value})} placeholder="z. B. Stadtwerke" /></div>
                    <div><Label>Beschreibung</Label><Input value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Kategorie</Label>
                        <Select value={expForm.category} onValueChange={v => setExpForm({...expForm, category: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CAT_LABEL[c]}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Objekt</Label>
                        <Select value={expForm.property_id || "none"} onValueChange={v => setExpForm({...expForm, property_id: v === "none" ? "" : v})}>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— keins —</SelectItem>
                            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Notiz für Mandant</Label><Textarea value={expForm.advisor_note} onChange={e => setExpForm({...expForm, advisor_note: e.target.value})} placeholder="z. B. „Aus DATEV übernommen"" rows={2} /></div>
                  </div>
                  <DialogFooter><Button onClick={submitExpense} className="bg-gradient-gold text-primary-foreground shadow-gold">Buchen</Button></DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Zahlung buchen</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Einnahme buchen</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Datum *</Label><Input type="date" value={payForm.paid_on} onChange={e => setPayForm({...payForm, paid_on: e.target.value})} /></div>
                      <div><Label>Betrag (EUR) *</Label><Input value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} placeholder="850,00" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Art</Label>
                        <Select value={payForm.kind} onValueChange={v => setPayForm({...payForm, kind: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PAYMENT_KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Objekt</Label>
                        <Select value={payForm.property_id || "none"} onValueChange={v => setPayForm({...payForm, property_id: v === "none" ? "" : v})}>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— keins —</SelectItem>
                            {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Notiz</Label><Input value={payForm.note} onChange={e => setPayForm({...payForm, note: e.target.value})} /></div>
                    <div><Label>Notiz für Mandant</Label><Textarea value={payForm.advisor_note} onChange={e => setPayForm({...payForm, advisor_note: e.target.value})} rows={2} /></div>
                  </div>
                  <DialogFooter><Button onClick={submitPayment} className="bg-gradient-gold text-primary-foreground shadow-gold">Buchen</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        )}

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
          <h2 className="font-bold mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Letzte Belege & Zahlungen</h2>
          <div className="space-y-1 text-sm">
            {yearExpenses.slice(0, 10).map((e) => (
              <div key={e.id} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                <span className="text-muted-foreground truncate">
                  {date(e.spent_on)} · {e.description || e.vendor || CAT_LABEL[e.category]}
                  {e.source === "advisor" && <Badge variant="outline" className="ml-2 text-[10px]">🧾 vom StB</Badge>}
                </span>
                <span className="font-mono text-destructive">−{eur(e.amount)}</span>
              </div>
            ))}
            {yearPayments.slice(0, 10).map((p) => (
              <div key={p.id} className="flex justify-between py-1 border-b border-border/40 last:border-0">
                <span className="text-muted-foreground">
                  {date(p.paid_on)} · {p.kind}
                  {p.source === "advisor" && <Badge variant="outline" className="ml-2 text-[10px]">🧾 vom StB</Badge>}
                </span>
                <span className="font-mono text-success">+{eur(p.amount)}</span>
              </div>
            ))}
            {yearExpenses.length === 0 && yearPayments.length === 0 && <p className="text-muted-foreground">Keine Bewegungen in {year}.</p>}
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          Mandant: {landlordName} · Zugriff jederzeit durch Vermieter widerrufbar · alle Aktionen werden protokolliert
        </p>
      </main>
    </div>
  );
}
