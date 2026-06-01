import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles, FileText, Calculator, Scale, ScrollText, FolderLock,
  Calendar, MessageSquare, TrendingUp, Receipt, Banknote, Building2,
} from "lucide-react";

/**
 * "Bau dir dein ImmonIQ" – User aktiviert nur was er braucht.
 * Free = grün; Pro = preis-Badge. Wird in localStorage gespeichert
 * und gemeinsam mit `immoniq_persona` von der Sidebar gelesen.
 */

export type FeatureKey =
  | "tasks" | "messenger" | "vault" | "templates" | "calculator"
  | "advisor" | "law" | "deadlines" | "nebenkosten" | "expenses"
  | "payments" | "valuation" | "benchmark" | "dunning" | "taxbridge"
  | "landparcels" | "orgunits";

type Feature = {
  key: FeatureKey;
  label: string;
  desc: string;
  icon: any;
  price?: number; // EUR/Monat (undefined = free)
};

export const FEATURES: Feature[] = [
  { key: "tasks", label: "Aufgaben", desc: "To-Dos & Erinnerungen", icon: ScrollText },
  { key: "messenger", label: "Nachrichten", desc: "Bewerbungen & Chats an einem Ort", icon: MessageSquare },
  { key: "vault", label: "Tresor", desc: "Verschlüsselte Dokumente", icon: FolderLock },
  { key: "templates", label: "Vorlagen", desc: "Briefe & Verträge per PDF", icon: FileText },
  { key: "calculator", label: "Rechner", desc: "Rendite, Kaufnebenkosten, Tilgung", icon: Calculator },
  { key: "deadlines", label: "Fristen", desc: "Mietrechtliche Fristen tracken", icon: Calendar },
  { key: "nebenkosten", label: "Nebenkosten", desc: "Abrechnung erzeugen", icon: Receipt, price: 4 },
  { key: "expenses", label: "Ausgaben", desc: "Kosten & Belege", icon: Banknote },
  { key: "payments", label: "Mietkonto", desc: "Eingänge automatisch zuordnen", icon: Banknote, price: 6 },
  { key: "valuation", label: "Bewertung (AVM)", desc: "Marktwert-Schätzung", icon: TrendingUp, price: 9 },
  { key: "benchmark", label: "Benchmark", desc: "Vergleich mit Region", icon: TrendingUp, price: 4 },
  { key: "advisor", label: "KI-Berater", desc: "Fragen zu Steuer/Recht", icon: Sparkles, price: 9 },
  { key: "law", label: "Rechtsecke", desc: "Aktuelle Urteile", icon: Scale },
  { key: "dunning", label: "Mahnwesen", desc: "Mahnstufen & Briefe", icon: ScrollText, price: 4 },
  { key: "taxbridge", label: "Steuer-Export", desc: "DATEV / Elster", icon: Receipt, price: 9 },
  { key: "landparcels", label: "Grundstücke", desc: "Flurstücke verwalten", icon: Building2 },
  { key: "orgunits", label: "Organisationen", desc: "WEG / GbR / mehrere User", icon: Building2, price: 12 },
];

const STORAGE_KEY = "immoniq_features";

export function getEnabledFeatures(): Set<FeatureKey> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch { return new Set(); }
}

export function isFeatureEnabled(key: FeatureKey): boolean {
  return getEnabledFeatures().has(key);
}

export default function FeatureToggles() {
  const [enabled, setEnabled] = useState<Set<FeatureKey>>(() => getEnabledFeatures());

  const persist = (next: Set<FeatureKey>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    setEnabled(new Set(next));
    window.dispatchEvent(new Event("immoniq:features-changed"));
  };

  const toggle = (f: Feature, on: boolean) => {
    const next = new Set(enabled);
    if (on) next.add(f.key); else next.delete(f.key);
    persist(next);
    if (on && f.price) {
      toast.success(`${f.label} aktiviert`, { description: `Pro-Funktion · ${f.price} €/Monat – wird mit deinem Plan verrechnet.` });
    } else if (on) {
      toast.success(`${f.label} aktiviert`);
    }
  };

  const proCount = FEATURES.filter(f => f.price && enabled.has(f.key)).length;
  const proSum = FEATURES.filter(f => f.price && enabled.has(f.key)).reduce((s, f) => s + (f.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold">Bau dir dein ImmonIQ</div>
            <p className="text-sm text-muted-foreground">Aktiviere nur Tools, die du wirklich brauchst – der Rest bleibt aus dem Weg.</p>
          </div>
          {proCount > 0 && (
            <Badge className="bg-primary/15 text-primary border-primary/30">
              {proCount} Pro · {proSum} €/Monat
            </Badge>
          )}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {FEATURES.map(f => {
          const Icon = f.icon;
          const on = enabled.has(f.key);
          return (
            <Card key={f.key} className={`p-4 transition ${on ? "border-primary/40 bg-primary/[0.03]" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{f.label}</span>
                    {f.price ? (
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Pro · {f.price} €/M</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">Gratis</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
                <Switch checked={on} onCheckedChange={(v) => toggle(f, v)} />
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tipp: Deaktivierte Tools verschwinden aus der Seitenleiste. Du kannst sie hier jederzeit zurückholen.
      </p>
    </div>
  );
}
