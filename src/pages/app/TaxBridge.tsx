import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Download, FileText, TrendingUp, TrendingDown, Building2, FileDown } from "lucide-react";
import { eur } from "@/lib/format";
import { toast } from "sonner";
import jsPDF from "jspdf";

const CAT_LABEL: Record<string, string> = {
  immediate: "Erhaltungsaufwand", depreciable: "AfA-fähig", utilities_passthrough: "NK-umlagefähig",
  financing: "Finanzierungskosten", other: "Sonstige",
};

const TaxBridge = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Steuer-Brücke · ImmonIQ";
    (async () => {
      const [p, e, pr] = await Promise.all([
        supabase.from("payments").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("properties").select("*"),
      ]);
      setPayments(p.data ?? []);
      setExpenses(e.data ?? []);
      setProperties(pr.data ?? []);
    })();
  }, []);

  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;

  const yearPayments = useMemo(() => payments.filter(p => p.paid_on >= yStart && p.paid_on <= yEnd), [payments, year]);
  const yearExpenses = useMemo(() => expenses.filter(e => e.spent_on >= yStart && e.spent_on <= yEnd), [expenses, year]);

  const income = yearPayments.reduce((s, p) => s + Number(p.amount), 0);
  const byCat: Record<string, number> = yearExpenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);
  const totalExpenses = Object.values(byCat).reduce<number>((s, v) => s + v, 0);

  // AfA: 2% (oder Objekt-Satz) auf 80% des Kaufpreises (Gebäudeanteil-Annahme)
  const afaTotal = properties.reduce((s, p) => {
    if (!p.purchase_price) return s;
    const buildingShare = Number(p.purchase_price) * 0.8;
    const rate = Number(p.afa_rate ?? 2) / 100;
    return s + buildingShare * rate;
  }, 0);

  const taxResult = income - (byCat.immediate ?? 0) - (byCat.financing ?? 0) - afaTotal;

  const exportCSV = () => {
    const rows = [
      ["Belegart","Datum","Beschreibung","Lieferant","Objekt","Kategorie","Betrag (EUR)"],
      ...yearPayments.map(p => ["Einnahme", p.paid_on, p.note ?? "", "", "", p.kind, String(p.amount).replace(".",",")]),
      ...yearExpenses.map(e => {
        const propName = properties.find(p => p.id === e.property_id)?.name ?? "";
        return ["Ausgabe", e.spent_on, e.description ?? "", e.vendor ?? "", propName, CAT_LABEL[e.category], String(e.amount).replace(".",",")];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ImmonIQ_Steuerexport_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Steuer-Export heruntergeladen.");
  };

  const exportAnlageV_PDF = () => {
    if (properties.length === 0) {
      toast.error("Keine Immobilien vorhanden.");
      return;
    }
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    properties.forEach((prop, idx) => {
      if (idx > 0) doc.addPage();
      const propPayments = yearPayments.filter(p => p.property_id === prop.id);
      const propExpenses = yearExpenses.filter(e => e.property_id === prop.id);
      const propIncome = propPayments.reduce((s, p) => s + Number(p.amount), 0);
      const propByCat: Record<string, number> = propExpenses.reduce((acc: Record<string, number>, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
        return acc;
      }, {} as Record<string, number>);
      const propAfa = prop.purchase_price
        ? Number(prop.purchase_price) * 0.8 * (Number(prop.afa_rate ?? 2) / 100)
        : 0;
      const propResult = propIncome - (propByCat.immediate ?? 0) - (propByCat.financing ?? 0) - propAfa;

      // Header
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("Anlage V", 15, 20);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Einkünfte aus Vermietung und Verpachtung · Steuerjahr ${year}`, 15, 26);
      doc.setDrawColor(200); doc.line(15, 30, pageW - 15, 30);

      // Objektdaten
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Objektangaben", 15, 38);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(`Bezeichnung: ${prop.name ?? "—"}`, 15, 44);
      doc.text(`Anschrift: ${[prop.street, prop.zip, prop.city].filter(Boolean).join(", ") || "—"}`, 15, 49);
      doc.text(`Anschaffungsdatum: ${prop.purchase_date ?? "—"}`, 15, 54);
      doc.text(`Anschaffungskosten: ${prop.purchase_price ? eur(prop.purchase_price) : "—"}`, 15, 59);
      doc.text(`Wohnfläche: ${prop.area_sqm ?? "—"} m²`, 15, 64);

      // Einnahmen (Zeile 9 ff)
      let y = 76;
      doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("Einnahmen (Zeile 9 ff. Anlage V)", 15, y);
      y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text("Miete + Nebenkostenvorauszahlungen", 15, y);
      doc.text(eur(propIncome), pageW - 15, y, { align: "right" });
      y += 5;
      doc.setDrawColor(180); doc.line(15, y, pageW - 15, y);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Summe Einnahmen", 15, y);
      doc.text(eur(propIncome), pageW - 15, y, { align: "right" });

      // Werbungskosten
      y += 12;
      doc.setFontSize(11);
      doc.text("Werbungskosten (Zeile 33 ff. Anlage V)", 15, y);
      y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const rows: Array<[string, number, string]> = [
        ["Erhaltungsaufwand (§ 9 EStG)", propByCat.immediate ?? 0, "Zeile 40"],
        ["Schuldzinsen / Finanzierungskosten", propByCat.financing ?? 0, "Zeile 36"],
        ["AfA Gebäude (linear)", propAfa, "Zeile 33"],
        ["Sonstige Werbungskosten", propByCat.other ?? 0, "Zeile 50"],
      ];
      rows.forEach(([label, amt, ref]) => {
        doc.text(label, 15, y);
        doc.setTextColor(150); doc.text(ref, pageW - 50, y, { align: "right" });
        doc.setTextColor(0); doc.text(eur(amt), pageW - 15, y, { align: "right" });
        y += 5;
      });
      const sumWk = rows.reduce((s, r) => s + r[1], 0);
      doc.setDrawColor(180); doc.line(15, y, pageW - 15, y);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Summe Werbungskosten", 15, y);
      doc.text(eur(sumWk), pageW - 15, y, { align: "right" });

      // Ergebnis
      y += 12;
      doc.setFontSize(12);
      doc.setFillColor(propResult >= 0 ? 220 : 255, propResult >= 0 ? 245 : 230, propResult >= 0 ? 220 : 230);
      doc.rect(15, y - 5, pageW - 30, 10, "F");
      doc.text(propResult >= 0 ? "Überschuss" : "Verlust", 18, y + 1);
      doc.text(eur(propResult), pageW - 18, y + 1, { align: "right" });

      // Hinweis
      y += 18;
      doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(120);
      doc.text("Hinweis: Pauschale 80/20-Aufteilung Gebäude/Grundstück.", 15, y);
      doc.text("Für rechtssichere Steuererklärung: Steuerberater konsultieren.", 15, y + 4);

      // Footer
      doc.setFontSize(7); doc.setTextColor(150);
      doc.text(`Erstellt mit ImmonIQ · ${new Date().toLocaleDateString("de-DE")}`, 15, 287);
      doc.text(`Seite ${idx + 1} von ${properties.length}`, pageW - 15, 287, { align: "right" });
    });

    doc.save(`Anlage_V_${year}.pdf`);
    toast.success(`Anlage V (${properties.length} Objekt${properties.length === 1 ? "" : "e"}) heruntergeladen.`);
  };

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Calculator className="h-7 w-7 text-primary" /> Steuer-Brücke</h1>
          <p className="text-muted-foreground text-sm mt-1">Anlage V Vorbereitung · Export für deinen Steuerberater (DATEV-kompatibel)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={exportAnlageV_PDF} className="bg-gradient-gold text-primary-foreground shadow-gold">
            <FileDown className="h-4 w-4 mr-2" /> Anlage V PDF
          </Button>
          <Button onClick={exportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" /> CSV (DATEV)
          </Button>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 glass">
          <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Einnahmen {year}</p><TrendingUp className="h-4 w-4 text-success" /></div>
          <p className="text-2xl font-bold">{eur(income)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Anlage V, Zeile 9 ff.</p>
        </Card>
        <Card className="p-5 glass">
          <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Werbungskosten</p><TrendingDown className="h-4 w-4 text-destructive" /></div>
          <p className="text-2xl font-bold">{eur((byCat.immediate ?? 0) + (byCat.financing ?? 0))}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Erhaltungsaufwand + Zinsen</p>
        </Card>
        <Card className="p-5 glass">
          <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">AfA (linear)</p><Building2 className="h-4 w-4 text-primary" /></div>
          <p className="text-2xl font-bold">{eur(afaTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">§ 7 EStG · 80% Gebäudeanteil</p>
        </Card>
        <Card className={`p-5 glass border-2 ${taxResult >= 0 ? "border-success/30" : "border-destructive/30"}`}>
          <div className="flex items-center justify-between mb-2"><p className="text-xs text-muted-foreground">Überschuss / Verlust</p><FileText className="h-4 w-4 text-primary" /></div>
          <p className={`text-2xl font-bold ${taxResult >= 0 ? "text-success" : "text-destructive"}`}>{eur(taxResult)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Vorläufige Berechnung</p>
        </Card>
      </div>

      <Card className="p-6 glass">
        <h2 className="font-bold text-lg mb-4">Aufschlüsselung Werbungskosten {year}</h2>
        {Object.keys(byCat).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Keine Belege im Jahr {year}.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(byCat).map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm">{CAT_LABEL[cat]}</span>
                <span className="font-semibold">{eur(amount as number)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-primary/30">
              <span className="font-bold">Summe Belege</span>
              <span className="font-bold text-gradient-gold">{eur(totalExpenses)}</span>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 glass bg-gradient-to-br from-primary/5 to-transparent">
        <h2 className="font-bold text-lg mb-2">Hinweis für deinen Steuerberater</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der CSV-Export enthält alle Einnahmen und Belege chronologisch sortiert mit Kategorisierung
          (Erhaltungsaufwand · § 9 EStG / Anschaffungs- oder Herstellungskosten · § 7 EStG / NK-umlagefähig · BetrKV / Finanzierungskosten).
          Format: UTF-8 mit BOM, Semikolon-Trennung, deutsche Dezimalkomma — direkt in DATEV importierbar.
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          ⚠️ Die AfA-Berechnung verwendet eine pauschale 80/20-Aufteilung (Gebäude/Grundstück). Für genauere Aufteilung
          bitte mit Steuerberater abstimmen (Boris-Auszug oder Kaufvertrag-Aufteilung).
        </p>
      </Card>
    </div>
  );
};

export default TaxBridge;
