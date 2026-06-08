import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Activity, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type Pulse = {
  id: string; week_start: string; city: string | null; zip_prefix: string | null;
  metric: string; value: number; delta_pct: number | null; caption: string | null;
};

const METRIC_LABEL: Record<string, string> = {
  rent_sqm: "€/m² Miete",
  purchase_sqm: "€/m² Kauf",
  listings_count: "Neue Inserate",
  yield_factor: "Mietrendite",
  vacancy_rate: "Leerstand",
};

export function MarketPulseWidget() {
  const [items, setItems] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("market_pulse")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(6);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (!items.length) return null;

  return (
    <Card className="p-5 glass">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Markt-Puls</h3>
            <p className="text-[11px] text-muted-foreground">Wochen-Trends in deiner Region</p>
          </div>
        </div>
        <Link to="/markt" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
          Markt <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {items.map((p) => {
          const up = (p.delta_pct ?? 0) > 0;
          const down = (p.delta_pct ?? 0) < 0;
          return (
            <div key={p.id} className="p-3 rounded-lg border border-border/40 bg-card/50">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {METRIC_LABEL[p.metric] ?? p.metric}
                </span>
                {p.delta_pct != null && (
                  <Badge variant="outline" className={`text-[10px] ${up ? "text-success border-success/30" : down ? "text-destructive border-destructive/30" : ""}`}>
                    {up && <TrendingUp className="h-3 w-3 mr-0.5" />}
                    {down && <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {p.delta_pct > 0 ? "+" : ""}{p.delta_pct.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="text-lg font-bold tabular">{Number(p.value).toLocaleString("de-DE", { maximumFractionDigits: 2 })}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {p.city ?? (p.zip_prefix ? `PLZ ${p.zip_prefix}xx` : "Bundesweit")}
                {p.caption && ` · ${p.caption}`}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
