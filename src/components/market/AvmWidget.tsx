import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2, Sparkles } from "lucide-react";
import { eur } from "@/lib/format";
import { motion } from "framer-motion";

type AvmResult = {
  zip: string;
  match: "exact" | "prefix3" | "prefix2" | "national";
  avg_purchase_sqm: number;
  avg_rent_sqm: number;
  yield_factor: number;
  value_sqm_method: number;
  value_income_method: number;
  value_blended: number;
};

const MATCH_LABEL = {
  exact: "exakte PLZ-Daten",
  prefix3: "PLZ-Region (3-stellig)",
  prefix2: "PLZ-Bereich (2-stellig)",
  national: "Bundesdurchschnitt",
};

type Props = {
  zip?: string | null;
  livingSpace?: number | null;
  annualRent?: number | null;
  purchasePrice?: number | null;
};

export const AvmWidget = ({ zip, livingSpace, annualRent, purchasePrice }: Props) => {
  const [data, setData] = useState<AvmResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!zip || !livingSpace) return;
    setLoading(true);
    supabase
      .rpc("avm_estimate", { _zip: zip, _living_space: livingSpace, _annual_rent: annualRent ?? 0 })
      .then(({ data }) => {
        setData(data as unknown as AvmResult);
        setLoading(false);
      });
  }, [zip, livingSpace, annualRent]);

  if (!zip || !livingSpace) return null;
  if (loading) {
    return (
      <Card className="p-5 glass flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Marktwert wird berechnet …
      </Card>
    );
  }
  if (!data) return null;

  const delta = purchasePrice ? data.value_blended - Number(purchasePrice) : null;
  const deltaPct = purchasePrice && Number(purchasePrice) > 0
    ? ((data.value_blended - Number(purchasePrice)) / Number(purchasePrice)) * 100
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5 glass">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Geschätzter Marktwert
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              KI-Schätzung · Basis: {MATCH_LABEL[data.match]}
            </p>
          </div>
          {deltaPct !== null && (
            <Badge variant={deltaPct >= 0 ? "default" : "destructive"} className="font-mono">
              <TrendingUp className="h-3 w-3 mr-1" />
              {deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%
            </Badge>
          )}
        </div>

        <div className="text-3xl font-display font-bold text-gradient-gold">
          {eur(data.value_blended)}
        </div>
        {delta !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            {delta >= 0 ? "Wertzuwachs" : "Differenz"} ggü. Kaufpreis: {eur(Math.abs(delta))}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/40">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vergleichswert (m²)</p>
            <p className="font-mono font-semibold mt-1">{eur(data.value_sqm_method)}</p>
            <p className="text-[10px] text-muted-foreground">{eur(data.avg_purchase_sqm)}/m²</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ertragswert</p>
            <p className="font-mono font-semibold mt-1">{eur(data.value_income_method)}</p>
            <p className="text-[10px] text-muted-foreground">Faktor {Number(data.yield_factor).toFixed(1)}</p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 italic">
          Hinweis: Automatisierte Schätzung ohne Gutachterwert. Für offizielle Bewertungen Sachverständigen beauftragen.
        </p>
      </Card>
    </motion.div>
  );
};
