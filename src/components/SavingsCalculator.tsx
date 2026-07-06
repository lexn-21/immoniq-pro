import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const fmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

interface InputSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

function InputSlider({ label, value, min, max, step, unit, onChange }: InputSliderProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2 text-[13px] md:text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {fmt.format(value)} {unit}
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
  const [adminMinutes, setAdminMinutes] = useState(30);
  const [hourlyRate, setHourlyRate] = useState(45);
  const [taxAdvisorYearly, setTaxAdvisorYearly] = useState(600);

  const result = useMemo(() => {
    const monthlyAdminHours = (units * adminMinutes) / 60;
    const quarterlyHoursPerUnit = 1;
    const yearlyAdminHours = monthlyAdminHours * 12 + units * quarterlyHoursPerUnit * 4;
    const yearlyAdminCost = yearlyAdminHours * hourlyRate;
    const totalYearlyCost = yearlyAdminCost + taxAdvisorYearly;

    const savedAdminHours = yearlyAdminHours * 0.6;
    const savedTaxAdvisor = taxAdvisorYearly * 0.5;
    const afterYearlyAdminHours = yearlyAdminHours - savedAdminHours;
    const afterTaxAdvisorCost = taxAdvisorYearly - savedTaxAdvisor;
    const afterTotalYearlyCost = afterYearlyAdminHours * hourlyRate + afterTaxAdvisorCost;
    const totalSaved = totalYearlyCost - afterTotalYearlyCost;

    return {
      yearlyAdminHours,
      afterYearlyAdminHours,
      totalYearlyCost,
      afterTotalYearlyCost,
      totalSaved,
    };
  }, [units, adminMinutes, hourlyRate, taxAdvisorYearly]);

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
            Stelle deine eigene Situation ein. Der Rechner zeigt Zeitaufwand, Steuerberater-Kosten und die potenzielle Einsparung für deine Beispielwohnung.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-10">
          {/* Inputs */}
          <div className="space-y-6">
            <InputSlider
              label="Wohnungen"
              value={units}
              min={1}
              max={50}
              step={1}
              unit="WE"
              onChange={setUnits}
            />
            <InputSlider
              label="Verwaltung pro Objekt / Monat"
              value={adminMinutes}
              min={15}
              max={120}
              step={5}
              unit="Min"
              onChange={setAdminMinutes}
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
            <InputSlider
              label="Steuerberater-Honorar / Jahr"
              value={taxAdvisorYearly}
              min={0}
              max={3000}
              step={100}
              unit="€/Jahr"
              onChange={setTaxAdvisorYearly}
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
                label="Gesamtkosten / Jahr"
                before={result.totalYearlyCost}
                after={result.afterTotalYearlyCost}
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
                Annahmen: 60% weniger Verwaltungszeit durch Automatisierung, 50% geringeres Steuerberater-Honorar durch DATEV-Export. ImmonIQ Founders ist aktuell 0 €/Jahr.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
