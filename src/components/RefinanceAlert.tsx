import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowRight } from "lucide-react";
import { Item } from "@/components/motion/Primitives";

const SPREAD = 1.5;
const THRESHOLD = 1.0; // 1 % below own rate

export default function RefinanceAlert() {
  const [count, setCount] = useState(0);
  const [marketRate, setMarketRate] = useState<number | null>(null);
  const [maxDiff, setMaxDiff] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.4F.KR.MRR_FR.LEV?format=jsondata&lastNObservations=1"
        );
        const j = await res.json();
        const obs = j?.dataSets?.[0]?.series?.["0:0:0:0:0:0:0"]?.observations ?? {};
        const keys = Object.keys(obs);
        if (!keys.length) return;
        const mr = (obs[String(Math.max(...keys.map(Number)))][0] as number) + SPREAD;
        setMarketRate(mr);

        const { data } = await supabase.from("financings").select("interest_rate");
        if (!data) return;
        const candidates = data.filter((f: any) => Number(f.interest_rate) - mr >= THRESHOLD);
        setCount(candidates.length);
        setMaxDiff(
          candidates.reduce((m: number, f: any) => Math.max(m, Number(f.interest_rate) - mr), 0)
        );
      } catch { /* ignore */ }
    })();
  }, []);

  if (!count || !marketRate) return null;

  return (
    <Item>
      <Card className="p-5 border-success/40 bg-success/5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Umfinanzierung prüfen</p>
            <p className="text-sm text-muted-foreground mt-1">
              {count} {count === 1 ? "Darlehen liegt" : "Darlehen liegen"} ~{maxDiff.toFixed(2)} % über dem aktuellen Marktzins ({marketRate.toFixed(2)} %). Ein Vergleichsangebot kostet nichts.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="flex-shrink-0">
            <Link to="/app/financing">
              Ansehen <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </Card>
    </Item>
  );
}
