import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Landmark, TrendingUp, Wrench, Heart, ShieldAlert, Info } from "lucide-react";
import { usePageSeo } from "@/hooks/usePageSeo";

const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function KPI({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "neutral" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-foreground";
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-display font-bold mt-1 ${color}`}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

// ─────────────────────────── AfA ───────────────────────────
function AfARechner() {
  const [gebaeudewert, setGebaeudewert] = useState(300000);
  const [baujahr, setBaujahr] = useState(2010);
  const [denkmal, setDenkmal] = useState(false);
  const [sonderAfA7b, setSonderAfA7b] = useState(false); // Neubau Mietwohnung
  const [steuersatz, setSteuersatz] = useState(42);

  const linearRate = baujahr >= 2023 ? 0.03 : baujahr >= 1925 ? 0.02 : 0.025;
  const linearAfA = gebaeudewert * linearRate;
  const denkmalAfA = denkmal ? gebaeudewert * 0.09 : 0; // Jahre 1-8: 9%
  const sonder7bAfA = sonderAfA7b ? gebaeudewert * 0.05 : 0; // §7b, Jahre 1-4
  const gesamtJahr1 = linearAfA + denkmalAfA + sonder7bAfA;
  const steuerErsparnisJahr1 = gesamtJahr1 * (steuersatz / 100);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div><Label>Gebäudewert (ohne Grundstück)</Label><Input type="number" value={gebaeudewert} onChange={e => setGebaeudewert(+e.target.value)} /></div>
          <div><Label>Baujahr</Label><Input type="number" value={baujahr} onChange={e => setBaujahr(+e.target.value)} /></div>
          <div><Label>Persönlicher Steuersatz: {steuersatz}%</Label><Slider min={14} max={45} step={1} value={[steuersatz]} onValueChange={([v]) => setSteuersatz(v)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={denkmal} onChange={e => setDenkmal(e.target.checked)} /> Denkmal-AfA §7i (9% p.a. Jahre 1–8)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sonderAfA7b} onChange={e => setSonderAfA7b(e.target.checked)} /> Sonder-AfA §7b Neubau-Mietwohnung (5% Jahre 1–4)</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <KPI label="Lineare AfA" value={eur(linearAfA)} hint={`${(linearRate * 100).toFixed(1)}% p.a.`} />
          {denkmal && <KPI label="+ Denkmal-AfA" value={eur(denkmalAfA)} tone="good" />}
          {sonderAfA7b && <KPI label="+ Sonder-AfA §7b" value={eur(sonder7bAfA)} tone="good" />}
          <KPI label="Gesamt Jahr 1" value={eur(gesamtJahr1)} tone="good" />
          <KPI label="Steuerersparnis Jahr 1" value={eur(steuerErsparnisJahr1)} tone="good" hint={`bei ${steuersatz}% Grenzsteuersatz`} />
        </div>
      </div>
      <Alert><Info className="h-4 w-4" /><AlertTitle>Rechtsgrundlage</AlertTitle><AlertDescription>§ 7 Abs. 4 EStG (lineare AfA), § 7b EStG (Sonder-AfA Neubau), § 7i EStG (Denkmal). Die Sonder-AfA §7b läuft für Baubeginne bis 30.09.2029 und Baukosten bis 5.200 €/m² (Förderfähigkeit 4.000 €/m²).</AlertDescription></Alert>
    </div>
  );
}

// ─────────────────────────── 15%-Grenze ───────────────────────────
function ErhaltungHerstellung() {
  const [kaufpreis, setKaufpreis] = useState(400000);
  const [gebaeudeAnteil, setGebaeudeAnteil] = useState(75);
  const [ausgaben, setAusgaben] = useState(30000);
  const gebWert = kaufpreis * (gebaeudeAnteil / 100);
  const grenze = gebWert * 0.15;
  const ueber = ausgaben > grenze;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div><Label>Kaufpreis</Label><Input type="number" value={kaufpreis} onChange={e => setKaufpreis(+e.target.value)} /></div>
          <div><Label>Gebäudeanteil (%)</Label><Input type="number" value={gebaeudeAnteil} onChange={e => setGebaeudeAnteil(+e.target.value)} /></div>
          <div><Label>Geplante Modernisierung in ersten 3 Jahren</Label><Input type="number" value={ausgaben} onChange={e => setAusgaben(+e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <KPI label="Gebäudewert" value={eur(gebWert)} />
          <KPI label="15%-Grenze" value={eur(grenze)} hint="Netto ohne USt." />
          <KPI label="Deine Ausgaben" value={eur(ausgaben)} tone={ueber ? "bad" : "good"} />
          <KPI label={ueber ? "⚠ Anschaffungsnaher Aufwand" : "✓ Sofort abzugsfähig"} value={ueber ? "Über AfA" : "Erhaltung"} tone={ueber ? "bad" : "good"} />
        </div>
      </div>
      <Alert variant={ueber ? "destructive" : "default"}>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{ueber ? "Falle: 15%-Grenze überschritten" : "Sicher unter der Grenze"}</AlertTitle>
        <AlertDescription>
          § 6 Abs. 1 Nr. 1a EStG: Aufwendungen in den ersten 3 Jahren nach Anschaffung über 15% des Gebäudewerts (netto) werden zu Herstellungskosten und müssen über die AfA (2–3% p.a.) statt sofort abgesetzt werden. Tipp: Modernisierungen strecken oder klar von Erhaltung trennen.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ─────────────────────────── Erbfolge ───────────────────────────
function VorwegErbfolge() {
  const [wert, setWert] = useState(500000);
  const [ehegatte, setEhegatte] = useState(false);
  const [kinder, setKinder] = useState(2);
  const freibetragProKind = 400000;
  const gesFreibetrag = (ehegatte ? 500000 : 0) + kinder * freibetragProKind;
  const uebertragBar = Math.min(wert, gesFreibetrag);
  const uebertragMitNiessbrauch = Math.min(wert * 1.25, gesFreibetrag * 1.25); // Nießbrauch senkt Steuerwert ~20-30%
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div><Label>Immobilienwert</Label><Input type="number" value={wert} onChange={e => setWert(+e.target.value)} /></div>
          <div><Label>Anzahl Kinder</Label><Input type="number" min={0} value={kinder} onChange={e => setKinder(+e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ehegatte} onChange={e => setEhegatte(e.target.checked)} /> Ehepartner/-in beteiligt</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <KPI label="Freibetrag Ehegatte" value={eur(ehegatte ? 500000 : 0)} />
          <KPI label={`Freibetrag Kinder (${kinder})`} value={eur(kinder * 400000)} />
          <KPI label="Gesamt-Freibetrag" value={eur(gesFreibetrag)} tone="good" />
          <KPI label="Steuerfrei übertragbar" value={eur(uebertragBar)} tone="good" hint="alle 10 Jahre erneuerbar" />
          <KPI label="Mit Nießbrauch ca." value={eur(uebertragMitNiessbrauch)} tone="good" hint="Kapitalwert senkt Steuerwert" />
        </div>
      </div>
      <Alert><Heart className="h-4 w-4" /><AlertTitle>Nießbrauch-Strategie</AlertTitle><AlertDescription>Übertragung unter Vorbehalt eines Nießbrauchs (§ 1030 BGB) senkt den Schenkungssteuer-Wert um den Kapitalwert des Nießbrauchs (§ 14 BewG). Freibeträge (§ 16 ErbStG) sind alle 10 Jahre erneut nutzbar — frühzeitiges Übertragen spart massiv Erbschaftssteuer.</AlertDescription></Alert>
    </div>
  );
}

// ─────────────────────────── GmbH ───────────────────────────
function GmbHVsPrivat() {
  const [mieteinnahmen, setMieteinnahmen] = useState(60000);
  const [kosten, setKosten] = useState(20000);
  const [pStSatz, setPStSatz] = useState(42);
  const gewinn = mieteinnahmen - kosten;
  const privatSteuer = gewinn * (pStSatz / 100);
  const gmbhKSt = gewinn * 0.15; // KSt
  const gmbhGewSt = gewinn * 0.033; // Erweiterte Kürzung §9 Nr. 1 GewStG → nur SolZ auf KSt
  const gmbhSolz = gmbhKSt * 0.055;
  const gmbhGesamt = gmbhKSt + gmbhSolz; // erweiterte Kürzung: keine GewSt
  const ersparnisReinvest = privatSteuer - gmbhGesamt;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div><Label>Jährliche Mieteinnahmen (netto kalt)</Label><Input type="number" value={mieteinnahmen} onChange={e => setMieteinnahmen(+e.target.value)} /></div>
          <div><Label>Werbungskosten (Zinsen, AfA, Instandh.)</Label><Input type="number" value={kosten} onChange={e => setKosten(+e.target.value)} /></div>
          <div><Label>Persönlicher Steuersatz: {pStSatz}%</Label><Slider min={14} max={45} step={1} value={[pStSatz]} onValueChange={([v]) => setPStSatz(v)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <KPI label="Gewinn" value={eur(gewinn)} />
          <KPI label="Privat" value={eur(privatSteuer)} hint={`${pStSatz}% ESt`} tone="bad" />
          <KPI label="Vermögensverw. GmbH" value={eur(gmbhGesamt)} hint="15% KSt + SolZ (Erw. Kürzung)" tone="good" />
          <KPI label="Ersparnis bei Reinvest" value={eur(Math.max(0, ersparnisReinvest))} tone="good" />
        </div>
      </div>
      <Alert><Landmark className="h-4 w-4" /><AlertTitle>Vermögensverwaltende GmbH</AlertTitle><AlertDescription>Bei rein vermögensverwaltender Tätigkeit (§ 9 Nr. 1 S. 2 GewStG „erweiterte Kürzung") entfällt die Gewerbesteuer. Effektive Belastung ≈ 15,8% statt bis zu 47,5% privat. Sinnvoll ab ~5–10 Objekten und wenn Gewinne reinvestiert werden. Ausschüttung an dich privat kostet zusätzlich 26,375% KapESt oder Teileinkünfteverfahren.</AlertDescription></Alert>
    </div>
  );
}

export default function SteuerModelle() {
  usePageSeo({ title: "Steuer-Modelle & Optimierung — ImmonIQ", description: "Interaktive Rechner: AfA, 15%-Grenze, Vorwegnahme Erbfolge, GmbH vs. Privat." });
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold">Steuer-Modelle</h1>
        <p className="text-muted-foreground mt-1">Live-Rechner für die 4 wichtigsten Vermieter-Hebel. Alle Werte sind Näherungen — Details mit deinem Steuerberater.</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Badge variant="secondary">§ 7 EStG</Badge>
          <Badge variant="secondary">§ 6 Abs. 1 Nr. 1a</Badge>
          <Badge variant="secondary">§ 16 ErbStG</Badge>
          <Badge variant="secondary">§ 9 Nr. 1 GewStG</Badge>
        </div>
      </div>

      <Tabs defaultValue="afa" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="afa"><TrendingUp className="h-4 w-4 mr-1" /> AfA</TabsTrigger>
          <TabsTrigger value="erh"><Wrench className="h-4 w-4 mr-1" /> 15%-Grenze</TabsTrigger>
          <TabsTrigger value="erb"><Heart className="h-4 w-4 mr-1" /> Erbfolge</TabsTrigger>
          <TabsTrigger value="gmbh"><Landmark className="h-4 w-4 mr-1" /> GmbH?</TabsTrigger>
        </TabsList>
        <TabsContent value="afa"><Card><CardHeader><CardTitle>AfA-Optimierung</CardTitle></CardHeader><CardContent><AfARechner /></CardContent></Card></TabsContent>
        <TabsContent value="erh"><Card><CardHeader><CardTitle>Erhaltung vs. Herstellung</CardTitle></CardHeader><CardContent><ErhaltungHerstellung /></CardContent></Card></TabsContent>
        <TabsContent value="erb"><Card><CardHeader><CardTitle>Vorweggenommene Erbfolge</CardTitle></CardHeader><CardContent><VorwegErbfolge /></CardContent></Card></TabsContent>
        <TabsContent value="gmbh"><Card><CardHeader><CardTitle>Vermögensverwaltende GmbH</CardTitle></CardHeader><CardContent><GmbHVsPrivat /></CardContent></Card></TabsContent>
      </Tabs>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Rechtlicher Hinweis</AlertTitle>
        <AlertDescription>Diese Rechner ersetzen keine Steuerberatung. Sie liefern grobe Orientierung nach EStG, ErbStG, GewStG und BewG (Stand 2026). Für verbindliche Aussagen wende dich an eine/n Steuerberater/in — direkt aus ImmonIQ heraus über „Steuerberater" freigebbar.</AlertDescription>
      </Alert>
    </div>
  );
}
