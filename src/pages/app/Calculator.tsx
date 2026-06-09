import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Calculator as CalcIcon, TrendingUp, Home, ExternalLink, Percent } from "lucide-react";
import { HouseFill } from "@/components/calc/HouseFill";
import { YieldGauge } from "@/components/calc/YieldGauge";

const fmt = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const fmt2 = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);
const pct = (n: number) => `${(n || 0).toFixed(2)} %`;

export default function Calculator() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "afa";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Rechner</h1>
        <p className="text-muted-foreground mt-1">AfA, Rendite, Wert & Zins — alles auf einen Blick.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="afa"><CalcIcon className="h-4 w-4 mr-2" />AfA</TabsTrigger>
          <TabsTrigger value="yield"><TrendingUp className="h-4 w-4 mr-2" />Rendite</TabsTrigger>
          <TabsTrigger value="value"><Home className="h-4 w-4 mr-2" />Wert</TabsTrigger>
          <TabsTrigger value="zins"><Percent className="h-4 w-4 mr-2" />Zins</TabsTrigger>
        </TabsList>

        <TabsContent value="afa"><AfATab /></TabsContent>
        <TabsContent value="yield"><YieldTab /></TabsContent>
        <TabsContent value="value"><ValueTab /></TabsContent>
        <TabsContent value="zins"><ZinsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ZinsTab() {
  const [ursprung, setUrsprung] = useState(400000);
  const [restschuld, setRestschuld] = useState(250000);
  const [altzins, setAltzins] = useState(1.5);
  const [neuzins, setNeuzins] = useState(3.8);
  const [tilgung, setTilgung] = useState(2.0);

  const calc = useMemo(() => {
    const altRate = restschuld * (altzins + tilgung) / 100 / 12;
    const neuRate = restschuld * (neuzins + tilgung) / 100 / 12;
    const diffMonat = neuRate - altRate;
    const diffJahr = diffMonat * 12;
    const zinsMehr = restschuld * (neuzins - altzins) / 100;
    const getilgt = Math.max(0, ursprung - restschuld);
    const progress = ursprung > 0 ? getilgt / ursprung : 0;
    return { altRate, neuRate, diffMonat, diffJahr, zinsMehr, getilgt, progress };
  }, [ursprung, restschuld, altzins, neuzins, tilgung]);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Anschlussfinanzierung — Was-wäre-wenn</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Ursprüngliches Darlehen (€)" value={ursprung} onChange={setUrsprung} />
            <Field label="Restschuld bei Anschluss (€)" value={restschuld} onChange={setRestschuld} />
            <Field label="Tilgung (% p.a.)" value={tilgung} onChange={setTilgung} step="0.1" />
            <Field label="Alter Zins (%)" value={altzins} onChange={setAltzins} step="0.1" />
            <Field label="Neuer Zins (%)" value={neuzins} onChange={setNeuzins} step="0.1" />
          </div>
          <div className="justify-self-center md:justify-self-end">
            <HouseFill
              progress={calc.progress}
              label="Dein Haus gehört dir"
              caption={`${fmt(calc.getilgt)} von ${fmt(ursprung)} getilgt`}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border/60">
          <Stat label="Bisherige Rate / Monat" value={fmt2(calc.altRate)} />
          <Stat label="Neue Rate / Monat" value={fmt2(calc.neuRate)} highlight />
          <Stat label="Mehrbelastung / Monat" value={fmt2(calc.diffMonat)} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Stat label="Mehrbelastung / Jahr" value={fmt(calc.diffJahr)} />
          <Stat label="Zinsmehrkosten 1. Jahr" value={fmt(calc.zinsMehr)} />
        </div>

        {calc.diffMonat > 0 && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Tipp: Sondertilgung prüfen</p>
              Reduziere die Restschuld vor Anschluss, um den Zinsschock abzufedern. Forward-Darlehen bis zu 60 Monate vorher möglich.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AfATab() {
  const [purchase, setPurchase] = useState(400000);
  const [landPct, setLandPct] = useState(20);
  const [afaRate, setAfaRate] = useState(2);
  const [maintenance, setMaintenance] = useState(0);

  const calc = useMemo(() => {
    const buildingAk = purchase * (1 - landPct / 100);
    const afaYear = buildingAk * (afaRate / 100);
    const limit = buildingAk * 0.15;
    return { buildingAk, afaYear, limit, exceeded: maintenance > limit };
  }, [purchase, landPct, afaRate, maintenance]);

  return (
    <Card className="glass">
      <CardHeader><CardTitle>Abschreibung (AfA) berechnen</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Kaufpreis (€)" value={purchase} onChange={setPurchase} />
          <Field label="Grundstücksanteil (%)" value={landPct} onChange={setLandPct} />
          <Field label="AfA-Satz (%)" value={afaRate} onChange={setAfaRate} step="0.1" />
          <Field label="Instandhaltung erste 3 Jahre (€)" value={maintenance} onChange={setMaintenance} />
        </div>

        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border/60">
          <Stat label="Gebäude-AK" value={fmt(calc.buildingAk)} />
          <Stat label="AfA / Jahr" value={fmt(calc.afaYear)} highlight />
          <Stat label="15 %-Grenze (§ 6 EStG)" value={fmt(calc.limit)} />
        </div>

        {calc.exceeded && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-destructive">Anschaffungsnahe Herstellungskosten</p>
              <p className="text-muted-foreground mt-1">
                Deine Instandhaltung übersteigt 15 % der Gebäude-AK. Nach <strong>§ 6 Abs. 1 Nr. 1a EStG</strong> müssen
                diese Kosten aktiviert (über AfA verteilt) werden statt sofort abgezogen. Sprich mit deinem Steuerberater.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Sonder-AfA § 7b:</strong> Nur bei Neubauten mit Bauantrag 2023–2029,
          max. 4.000 €/m² Baukosten anrechenbar. Lass dich beraten.
        </div>
      </CardContent>
    </Card>
  );
}

function YieldTab() {
  const [purchase, setPurchase] = useState(400000);
  const [extraPct, setExtraPct] = useState(10);
  const [annualRent, setAnnualRent] = useState(18000);
  const [maintPct, setMaintPct] = useState(1);
  const [vacancyPct, setVacancyPct] = useState(5);

  const calc = useMemo(() => {
    const total = purchase * (1 + extraPct / 100);
    const gross = (annualRent / total) * 100;
    const net = ((annualRent * (1 - vacancyPct / 100) - purchase * (maintPct / 100)) / total) * 100;
    return { total, gross, net };
  }, [purchase, extraPct, annualRent, maintPct, vacancyPct]);

  return (
    <Card className="glass">
      <CardHeader><CardTitle>Rendite berechnen</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Kaufpreis (€)" value={purchase} onChange={setPurchase} />
          <Field label="Nebenkosten (%)" value={extraPct} onChange={setExtraPct} />
          <Field label="Jahresmiete (€)" value={annualRent} onChange={setAnnualRent} />
          <Field label="Instandhaltung (%/Jahr)" value={maintPct} onChange={setMaintPct} step="0.1" />
          <Field label="Leerstand (%)" value={vacancyPct} onChange={setVacancyPct} step="0.5" />
        </div>

        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border/60">
          <Stat label="Gesamtinvestition" value={fmt(calc.total)} />
          <Stat label="Brutto-Rendite" value={pct(calc.gross)} />
          <Stat label="Netto-Rendite" value={pct(calc.net)} highlight />
        </div>
      </CardContent>
    </Card>
  );
}

function ValueTab() {
  const [area, setArea] = useState(80);
  const [pricePerSqm, setPricePerSqm] = useState(3500);
  const [condition, setCondition] = useState("1.0");

  const value = useMemo(() => area * pricePerSqm * parseFloat(condition), [area, pricePerSqm, condition]);

  return (
    <Card className="glass">
      <CardHeader><CardTitle>Verkehrswert schätzen</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Wohnfläche (m²)" value={area} onChange={setArea} />
          <Field label="qm-Preis (€)" value={pricePerSqm} onChange={setPricePerSqm} />
          <div className="space-y-2">
            <Label>Zustand</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.7">Stark renovierungsbedürftig (×0,70)</SelectItem>
                <SelectItem value="0.85">Renovierungsbedürftig (×0,85)</SelectItem>
                <SelectItem value="1.0">Normal (×1,00)</SelectItem>
                <SelectItem value="1.15">Modernisiert (×1,15)</SelectItem>
                <SelectItem value="1.3">Neuwertig (×1,30)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t border-border/60">
          <Stat label="Geschätzter Verkehrswert" value={fmt(value)} highlight large />
        </div>

        <a
          href="https://www.bodenrichtwert-deutschland.de/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          Aktuelle qm-Preise via BORIS-D abrufen <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (n: number) => void; step?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </div>
  );
}

function Stat({ label, value, highlight, large }: { label: string; value: string; highlight?: boolean; large?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-primary/10 border border-primary/30" : "bg-muted/40"}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`font-semibold mt-1 ${large ? "text-3xl" : "text-xl"} ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
