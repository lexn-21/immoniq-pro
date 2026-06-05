import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Page, Stagger, Item } from "@/components/motion/Primitives";
import { eur, num, pct } from "@/lib/format";
import { estimateValue, AvmResult } from "@/lib/avm";
import { TrendingUp, MapPin, Home, Sparkles, Info, Building2, Scale, Wand2 } from "lucide-react";

type Prop = { id: string; name: string; zip: string | null; city: string | null; purchase_price: number | null };
type Unit = { property_id: string; living_space: number | null; rent_cold: number | null };

const Valuation = () => {
  const [props, setProps] = useState<Prop[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [propId, setPropId] = useState<string>("");
  const [zip, setZip] = useState("");
  const [livingSpace, setLivingSpace] = useState<number>(75);
  const [monthlyRent, setMonthlyRent] = useState<number>(950);
  const [result, setResult] = useState<AvmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase.from("properties").select("id,name,zip,city,purchase_price");
      const { data: us } = await supabase.from("units").select("property_id,living_space,rent_cold");
      setProps((ps ?? []) as Prop[]);
      setUnits((us ?? []) as Unit[]);
    })();
  }, []);

  const applyProperty = (id: string) => {
    setPropId(id);
    const p = props.find(x => x.id === id);
    if (!p) return;
    if (p.zip) setZip(p.zip);
    const u = units.filter(x => x.property_id === id);
    const space = u.reduce((s, x) => s + Number(x.living_space ?? 0), 0);
    const rent = u.reduce((s, x) => s + Number(x.rent_cold ?? 0), 0);
    if (space > 0) setLivingSpace(space);
    if (rent > 0) setMonthlyRent(rent);
  };

  const annualRent = useMemo(() => monthlyRent * 12, [monthlyRent]);

  const calc = async () => {
    if (!zip || zip.length < 4) {
      setError("Bitte gültige PLZ eingeben (mind. 4 Ziffern).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await estimateValue(zip, livingSpace, annualRent);
      setResult(r);
    } catch (e: any) {
      setError(e.message || "Bewertung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  const range = useMemo(() => {
    if (!result?.value_blended) return null;
    const mid = result.value_blended;
    return { low: mid * 0.88, mid, high: mid * 1.12 };
  }, [result]);

  const selectedProp = props.find(p => p.id === propId);
  const grossYield = result && result.value_blended ? (annualRent / result.value_blended) * 100 : 0;

  return (
    <Page>
      <Stagger className="space-y-6">
        <Item>
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-3 w-3" /> AVM · Bandbreiten-Bewertung
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Was ist Ihre Immobilie heute wert?</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Wählen Sie Ihr Objekt — wir ziehen Wohnfläche, Miete und PLZ automatisch und schätzen einen <strong>realistischen Wertkorridor</strong>, ähnlich wie eine Bank vor der Beleihung.
          </p>
        </Item>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
          <Item>
            <Card className="p-6 space-y-5 border-border/60">
              {props.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Eigene Immobilie wählen
                  </Label>
                  <Select value={propId} onValueChange={applyProperty}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Objekt auswählen — Daten werden automatisch übernommen" />
                    </SelectTrigger>
                    <SelectContent>
                      {props.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.zip ? `· ${p.zip}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProp && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Wand2 className="h-3 w-3" /> Daten aus „{selectedProp.name}" übernommen
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Postleitzahl</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="z. B. 10115" className="pl-9 text-lg font-mono" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Wohnfläche (m²)</Label>
                <Input type="number" value={livingSpace} onChange={(e) => setLivingSpace(+e.target.value)} className="text-lg" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kaltmiete pro Monat</Label>
                <Input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(+e.target.value)} className="text-lg" />
                <p className="text-xs text-muted-foreground">Jahresnettomiete: <strong className="text-foreground">{eur(annualRent)}</strong></p>
              </div>

              <Button onClick={calc} disabled={loading} className="w-full h-11">
                {loading ? "Berechne …" : "Wertkorridor ermitteln"}
              </Button>
            </Card>
          </Item>

          <Item variant="scale">
            {loading ? (
              <Card className="p-8 h-full flex flex-col items-center justify-center border-dashed gap-3 min-h-[280px]">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Vergleiche mit Marktdaten der PLZ {zip} …</p>
              </Card>
            ) : error ? (
              <Card className="p-8 h-full flex flex-col items-center justify-center border-destructive/40 bg-destructive/5 gap-3 min-h-[280px] text-center">
                <Info className="h-8 w-8 text-destructive" />
                <p className="font-semibold">Bewertung nicht möglich</p>
                <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
                <Button onClick={calc} variant="outline" size="sm">Erneut versuchen</Button>
              </Card>
            ) : result && range ? (
              <Card className="relative overflow-hidden p-8 border-primary/20" style={{ background: "var(--gradient-card, hsl(var(--card)))" }}>
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="relative space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Home className="h-3 w-3" /> Geschätzter Wertkorridor
                    </p>
                    <motion.div
                      key={range.mid}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 18 }}
                      className="font-display text-3xl md:text-4xl font-bold tracking-tight bg-gradient-gold bg-clip-text text-transparent"
                    >
                      {eur(range.low)} – {eur(range.high)}
                    </motion.div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Realistisch: <strong className="text-foreground">{eur(range.mid)}</strong> · Korridor ±12 %
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary" className="font-normal">
                        Bruttorendite {pct(grossYield)}
                      </Badge>
                      <Badge variant="secondary" className="font-normal">
                        Faktor {num(result.yield_factor ?? 0, 1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Visuelle Range-Bar */}
                  <div className="space-y-1.5">
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                      <div className="absolute inset-y-0 left-[10%] right-[10%] bg-gradient-to-r from-success/40 via-primary to-success/40 rounded-full" />
                      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Vorsichtig {eur(range.low)}</span>
                      <span>Realistisch</span>
                      <span>Optimistisch {eur(range.high)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sachwert (40 %)</p>
                      <p className="text-lg font-semibold mt-1">{eur(result.value_sqm_method)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{eur(result.avg_purchase_sqm)}/m² · PLZ {result.zip}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ertragswert (60 %)</p>
                      <p className="text-lg font-semibold mt-1">{eur(result.value_income_method)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{num(result.yield_factor ?? 0, 1)}× Jahresmiete</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Indikative Bandbreite</strong> nach ImmoWertV §§ 17/27 — vergleichbar mit dem Vor-Check einer Bank.
                      Ersetzt <strong>kein Verkehrswertgutachten</strong> nach § 194 BauGB.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 h-full flex items-center justify-center border-dashed">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Objekt wählen oder PLZ eingeben</p>
                </div>
              </Card>
            )}
          </Item>
        </div>

        {/* Methodik */}
        <Item>
          <Card className="p-6 border-border/60">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Scale className="h-4 w-4 text-primary" /> So bewerten Banken Immobilien
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1.5">
                <p className="font-semibold text-foreground">1. Vergleichswertverfahren</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Was kostet eine ähnliche Wohnung in der gleichen Lage? Basis sind tatsächliche Verkaufspreise (Gutachterausschuss, § 193 BauGB).
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-foreground">2. Sachwertverfahren</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Bodenwert + Gebäudewert (Herstellungskosten – Alterswertminderung). Für Eigennutzer-Objekte üblich (§ 21 ImmoWertV).
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-foreground">3. Ertragswertverfahren</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Jahresnettomiete × Vervielfältiger (regional 18–32×). Für vermietete Objekte das wichtigste Verfahren (§ 27 ImmoWertV).
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4 pt-4 border-t border-border/60">
              ImmonIQ kombiniert Ertrags- (60 %) und Sachwert (40 %) und legt einen Korridor von ±12 % um den Punktwert — das entspricht ungefähr der Streuung, die Banken in ihrer internen Beleihungswert-Vorprüfung ansetzen.
            </p>
          </Card>
        </Item>
      </Stagger>
    </Page>
  );
};

export default Valuation;
