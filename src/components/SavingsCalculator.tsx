import { useMemo, useState } from "react";
import { Calculator, ArrowRight, Building2, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import BeispielrechnungActions from "@/components/BeispielrechnungActions";

const fmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

interface InputSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  display?: string;
  onChange: (value: number) => void;
}

function InputSlider({ label, value, min, max, step, unit, display, onChange }: InputSliderProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2 text-[13px] md:text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {display ?? fmt.format(value)} {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        aria-label={label}
      />
    </div>
  );
}

interface ResultRowProps {
  label: string;
  before: number;
  after: number;
  unit: string;
}

function ResultRow({ label, before, after, unit }: ResultRowProps) {
  const reduction = before > 0 ? Math.round(((before - after) / before) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center text-[13px] md:text-sm mb-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">
          {fmt.format(before)} {unit} →{" "}
          <span className="text-primary">{fmt.format(after)} {unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${reduction}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{reduction}% weniger</p>
    </div>
  );
}

export default function SavingsCalculator() {
  const [units, setUnits] = useState(5);
  // Stunden pro Objekt pro Monat (in Zehntel-Stunden über den Slider)
  const [hoursPerUnitMonthTenths, setHoursPerUnitMonthTenths] = useState(5); // = 0.5 h
  // Stunden pro Objekt pro Quartal (Nebenkosten etc.)
  const [hoursPerUnitQuarterTenths, setHoursPerUnitQuarterTenths] = useState(10); // = 1.0 h
  const [hourlyRate, setHourlyRate] = useState(45);

  const hoursPerUnitMonth = hoursPerUnitMonthTenths / 10;
  const hoursPerUnitQuarter = hoursPerUnitQuarterTenths / 10;

  const result = useMemo(() => {
    const yearlyAdminHours =
      units * hoursPerUnitMonth * 12 + units * hoursPerUnitQuarter * 4;
    const yearlyAdminCost = yearlyAdminHours * hourlyRate;

    const savedAdminHours = yearlyAdminHours * 0.6;
    const afterYearlyAdminHours = yearlyAdminHours - savedAdminHours;
    const afterYearlyAdminCost = afterYearlyAdminHours * hourlyRate;
    const totalSaved = yearlyAdminCost - afterYearlyAdminCost;

    return {
      yearlyAdminHours,
      afterYearlyAdminHours,
      yearlyAdminCost,
      afterYearlyAdminCost,
      totalSaved,
    };
  }, [units, hoursPerUnitMonth, hoursPerUnitQuarter, hourlyRate]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-3xl border border-border/40 bg-background/60 backdrop-blur-xl p-6 md:p-10 overflow-hidden">
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground mb-4">
            <Calculator className="h-3.5 w-3.5" />
            Interaktiver Rechner
          </div>
          <h3 className="font-display font-medium tracking-[-0.02em] leading-[1] text-[clamp(1.6rem,5vw,2.75rem)]">
            Was du mit ImmonIQ sparst
          </h3>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Stelle Wohneinheiten, Stunden pro Objekt und Stunden pro Quartal ein — der Rechner aktualisiert deine Einsparung sofort.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-10">
          {/* Inputs */}
          <div className="space-y-6">
            <InputSlider
              label="Wohneinheiten"
              value={units}
              min={1}
              max={50}
              step={1}
              unit="WE"
              onChange={setUnits}
            />
            <InputSlider
              label="Stunden pro Objekt / Monat"
              value={hoursPerUnitMonthTenths}
              min={1}
              max={40}
              step={1}
              unit="h"
              display={fmt1.format(hoursPerUnitMonth)}
              onChange={setHoursPerUnitMonthTenths}
            />
            <InputSlider
              label="Stunden pro Objekt / Quartal"
              value={hoursPerUnitQuarterTenths}
              min={0}
              max={80}
              step={1}
              unit="h"
              display={fmt1.format(hoursPerUnitQuarter)}
              onChange={setHoursPerUnitQuarterTenths}
            />
            <InputSlider
              label="Zeitwert oder Steuerberater-Satz"
              value={hourlyRate}
              min={20}
              max={120}
              step={5}
              unit="€/h"
              onChange={setHourlyRate}
            />
          </div>

          {/* Results */}
          <div className="rounded-2xl border border-border/40 bg-background/80 p-5 md:p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <ResultRow
                label="Verwaltungszeit / Jahr"
                before={result.yearlyAdminHours}
                after={result.afterYearlyAdminHours}
                unit="h"
              />
              <ResultRow
                label="Verwaltungskosten / Jahr"
                before={result.yearlyAdminCost}
                after={result.afterYearlyAdminCost}
                unit="€"
              />
            </div>

            <div className="mt-8 pt-6 border-t border-border/40">
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                Jährliche Einsparung
              </p>
              <div className="font-display text-3xl md:text-4xl font-medium tracking-tight text-primary tabular-nums">
                ≈ {fmt.format(result.totalSaved)} €
              </div>
              <p className="mt-3 text-[11px] md:text-xs text-muted-foreground leading-relaxed">
                Annahme: 60% weniger Verwaltungszeit durch Automatisierung. Rechnung: (WE × h/Monat × 12 + WE × h/Quartal × 4) × Stundensatz. ImmonIQ Founders ist aktuell 0 €/Jahr.
              </p>

              <BeispielrechnungActions
                input={{
                  units,
                  hoursPerUnitMonth,
                  hoursPerUnitQuarter,
                  hourlyRate,
                  yearlyAdminHours: result.yearlyAdminHours,
                  afterYearlyAdminHours: result.afterYearlyAdminHours,
                  yearlyAdminCost: result.yearlyAdminCost,
                  afterYearlyAdminCost: result.afterYearlyAdminCost,
                  totalSaved: result.totalSaved,
                }}
              />

              {/* Kontext-CTA — passt sich Portfolio-Größe an */}
              {units < 10 ? (
                <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-primary/90 mb-2">
                    <Rocket className="h-3.5 w-3.5" />
                    Privat-Portfolio · {units} {units === 1 ? "Einheit" : "Einheiten"}
                  </div>
                  <p className="text-[12px] md:text-[13px] text-muted-foreground leading-relaxed mb-3">
                    Founders-Zugang ist für dein Portfolio dauerhaft 0 €. Starte in 60 Sekunden.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90 h-10 text-[13px] font-medium"
                  >
                    <Link to="/auth">
                      Sofort loslegen <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-primary/90 mb-2">
                    <Building2 className="h-3.5 w-3.5" />
                    Portfolio · {units} Einheiten
                  </div>
                  <p className="text-[12px] md:text-[13px] text-muted-foreground leading-relaxed mb-3">
                    Ab 10 Einheiten prüfen wir Kontingent, Rollen und Steuerberater-Zugriff individuell.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90 h-10 text-[13px] font-medium"
                  >
                    <Link to="/pricing">
                      Für mein Kontingent prüfen <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
