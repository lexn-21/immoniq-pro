import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, BookOpen, TrendingUp, Info, MapPin } from "lucide-react";
import { num } from "@/lib/format";

type Props = {
  zip?: string | null;
  city?: string | null;
};

/** Direktlinks zu offiziellen kommunalen Mietspiegeln. */
const OFFICIAL_MIETSPIEGEL: Record<string, { name: string; url: string }> = {
  berlin: { name: "Mietspiegel Berlin (offiziell)", url: "https://mietspiegel.berlin.de/" },
  münchen: { name: "Mietspiegel München (offiziell)", url: "https://stadt.muenchen.de/infos/mietspiegel.html" },
  munchen: { name: "Mietspiegel München (offiziell)", url: "https://stadt.muenchen.de/infos/mietspiegel.html" },
  hamburg: { name: "Mietenspiegel Hamburg (offiziell)", url: "https://www.hamburg.de/mietenspiegel/" },
  köln: { name: "Mietspiegel Köln (offiziell)", url: "https://www.stadt-koeln.de/artikel/06421/index.html" },
  koln: { name: "Mietspiegel Köln (offiziell)", url: "https://www.stadt-koeln.de/artikel/06421/index.html" },
  frankfurt: { name: "Mietspiegel Frankfurt (offiziell)", url: "https://frankfurt.de/themen/planen-bauen-und-wohnen/wohnen/informationen-zum-wohnungsmarkt/mietspiegel" },
  stuttgart: { name: "Mietspiegel Stuttgart (offiziell)", url: "https://www.stuttgart.de/leben/wohnen/rund-ums-wohnen/mietpreise-und-mietspiegel" },
  düsseldorf: { name: "Mietspiegel Düsseldorf (offiziell)", url: "https://miete-duesseldorf.de/" },
  dusseldorf: { name: "Mietspiegel Düsseldorf (offiziell)", url: "https://miete-duesseldorf.de/" },
  leipzig: { name: "Mietspiegel Leipzig (offiziell)", url: "https://www.leipzig.de/buergerservice-und-verwaltung/aemter-und-behoerdengaenge/behoerden-und-dienstleistungen/dienstleistung/mietspiegel-der-stadt-leipzig-5360b46eb0425" },
  dresden: { name: "Mietspiegel Dresden (offiziell)", url: "https://www.dresden.de/de/leben/wohnen/wohnungsmarkt/mietspiegel.php" },
  hannover: { name: "Mietspiegel Hannover (offiziell)", url: "https://www.hannover.de/Leben-in-der-Region-Hannover/Planen,-Bauen,-Wohnen/Wohnen-Immobilien/Mietspiegel/Mietspiegel-f%C3%BCr-Hannover" },
  nürnberg: { name: "Mietenspiegel Nürnberg (offiziell)", url: "https://www.nuernberg.de/internet/wohnen/mietenspiegel.html" },
  nurnberg: { name: "Mietenspiegel Nürnberg (offiziell)", url: "https://www.nuernberg.de/internet/wohnen/mietenspiegel.html" },
  dortmund: { name: "Mietspiegel Dortmund (offiziell)", url: "https://www.dortmund.de/themen/wohnen/mietspiegel/" },
};

function officialLink(city?: string | null): { name: string; url: string; isOfficial: boolean } {
  const key = (city ?? "").trim().toLowerCase();
  if (key && OFFICIAL_MIETSPIEGEL[key]) return { ...OFFICIAL_MIETSPIEGEL[key], isOfficial: true };
  const year = new Date().getFullYear();
  const q = encodeURIComponent(`"Mietspiegel" ${city ?? "Deutschland"} ${year} site:.de`);
  return {
    name: city ? `Mietspiegel ${city} suchen` : "Mietspiegel suchen",
    url: `https://www.google.com/search?q=${q}`,
    isOfficial: false,
  };
}

export const MietspiegelCard = ({ zip, city }: Props) => {
  const [stats, setStats] = useState<any>(null);
  const [nearby, setNearby] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!zip) { setLoading(false); return; }
      const exact = await supabase.from("market_index").select("*").eq("zip", zip).maybeSingle();
      setStats(exact.data);
      if (!exact.data && zip.length >= 3) {
        // Umkreis via PLZ-Präfix
        const near = await supabase
          .from("market_index")
          .select("*")
          .like("zip", `${zip.slice(0, 3)}%`)
          .limit(5);
        setNearby(near.data ?? []);
      }
      setLoading(false);
    })();
  }, [zip]);

  const off = officialLink(city);
  const nearbyAvg = nearby.length
    ? nearby.reduce((s, r) => s + Number(r.avg_rent_sqm ?? 0), 0) / nearby.length
    : null;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Mietspiegel & Vergleichswerte
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {city ?? zip ?? "—"}{zip && city ? ` · PLZ ${zip}` : ""}
          </p>
        </div>
        {off.isOfficial && <Badge className="bg-success/15 text-success border-success/30 text-[10px]">Offizielle Quelle</Badge>}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Lade Vergleichswerte…</p>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Ø Miete" value={stats.avg_rent_sqm ? `${num(Number(stats.avg_rent_sqm), 2)} €/m²` : "—"} />
          <Stat label="Ø Kauf" value={stats.avg_purchase_sqm ? `${num(Number(stats.avg_purchase_sqm), 0)} €/m²` : "—"} />
          <Stat label="Faktor" value={stats.yield_factor ? `${num(Number(stats.yield_factor), 1)}×` : "—"} icon={<TrendingUp className="h-3 w-3" />} />
        </div>
      ) : nearbyAvg ? (
        <div className="space-y-2">
          <div className="rounded-lg border border-border/60 p-3 bg-background/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Ø Miete im Umkreis ({zip?.slice(0, 3)}xx · {nearby.length} PLZ)
            </p>
            <p className="text-xl font-bold tabular-nums mt-0.5">{num(nearbyAvg, 2)} €/m²</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Für PLZ <strong>{zip}</strong> liegen keine exakten Daten vor — Schätzung aus benachbarten Postleitzahlen.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Für {zip ? `PLZ ${zip}` : "diese Region"} liegen aktuell keine ImmonIQ-Vergleichswerte vor. Nutze die offizielle Quelle ↓
        </p>
      )}

      <a href={off.url} target="_blank" rel="noopener noreferrer" className="block">
        <Button variant={off.isOfficial ? "default" : "outline"} className={`w-full justify-between ${off.isOfficial ? "bg-gradient-gold text-primary-foreground shadow-gold" : ""}`}>
          <span className="text-sm">{off.name}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </a>

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-md">
        <Info className="h-3 w-3 shrink-0 mt-0.5" />
        <span>ImmonIQ-Werte = aggregierte Marktdaten. Rechtlich maßgeblich ist der offizielle Mietspiegel (§ 558c BGB).</span>
      </div>
    </Card>
  );
};

const Stat = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
  <div className="rounded-lg border border-border/60 p-2.5 bg-background/40">
    <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider">{icon}{label}</p>
    <p className="text-sm font-bold tabular-nums mt-0.5">{value}</p>
  </div>
);

export default MietspiegelCard;
