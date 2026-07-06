import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IdCard, ShieldCheck, Home as HomeIcon, Star, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

type Pass = {
  pass_code: string;
  display_name: string | null;
  headline: string | null;
  verified_income: any;
  verified_schufa: any;
  verified_mietschuldenfrei: any;
  rental_history: any[];
  landlord_ratings: any[];
  is_public: boolean;
  score: number | null;
  score_computed_at: string | null;
};

export default function PassPublic() {
  const { code } = useParams();
  const [pass, setPass] = useState<Pass | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing" | "private">("loading");

  useEffect(() => {
    (async () => {
      if (!code) return setState("missing");
      const { data, error } = await supabase
        .from("tenant_pass" as any)
        .select("pass_code,display_name,headline,verified_income,verified_schufa,verified_mietschuldenfrei,rental_history,landlord_ratings,is_public,score,score_computed_at")
        .eq("pass_code", code)
        .maybeSingle();
      if (error || !data) return setState("missing");
      const p = data as any as Pass;
      if (!p.is_public) return setState("private");
      setPass(p);
      setState("ok");
      document.title = `Mieter-Pass · ${p.display_name ?? code} · ImmonIQ`;
    })();
  }, [code]);

  if (state === "loading") {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Lädt …</div>;
  }
  if (state === "missing" || state === "private") {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="p-8 max-w-md text-center space-y-3">
          <IdCard className="h-10 w-10 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">
            {state === "missing" ? "Pass nicht gefunden" : "Dieser Pass ist privat"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {state === "missing"
              ? "Der Pass-Code existiert nicht oder wurde widerrufen."
              : "Der Inhaber hat den Pass auf privat gestellt. Bitte direkt anfragen."}
          </p>
          <Button asChild variant="outline"><Link to="/">Zur Startseite</Link></Button>
        </Card>
      </div>
    );
  }

  const p = pass!;
  const checks = [
    { label: "Einkommen verifiziert", ok: Object.keys(p.verified_income || {}).length > 0 },
    { label: "SCHUFA verifiziert", ok: Object.keys(p.verified_schufa || {}).length > 0 },
    { label: "Mietschuldenfreiheit", ok: Object.keys(p.verified_mietschuldenfrei || {}).length > 0 },
  ];
  const stars = (p.landlord_ratings || []).reduce((s, r: any) => s + (r?.stars || 0), 0) / Math.max(1, (p.landlord_ratings || []).length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/40">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold tracking-tight">ImmonIQ</Link>
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" />Verifizierter Mieter-Pass</Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Mieter-Pass</div>
          <h1 className="text-3xl font-bold">{p.display_name || "Anonym"}</h1>
          {p.headline && <p className="text-muted-foreground mt-1">{p.headline}</p>}
          <div className="mt-3 font-mono text-xs text-muted-foreground">#{p.pass_code}</div>
        </Card>

        {p.score != null && (
          <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-blue-500/5 border-emerald-500/30">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-emerald-600" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">ImmonIQ Score</div>
                  <div className="text-4xl font-bold text-emerald-600 leading-none">{p.score} <span className="text-lg text-muted-foreground font-normal">/ 1000</span></div>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground max-w-[220px]">
                Transparent berechnet aus verifizierten Angaben — mit Einwilligung des Mieters (Art. 22 DSGVO).
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Bonität & Verifizierungen</h2>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between text-sm">
                <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
                {c.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Badge variant="outline">offen</Badge>}
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><HomeIcon className="h-4 w-4 text-primary" />Wohn-Historie</h2>
            {(p.rental_history?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Einträge.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {p.rental_history.map((r: any, i: number) => (
                  <li key={i} className="border-l-2 border-primary/30 pl-3">
                    <div className="font-medium">{r.address || "Wohnung"}</div>
                    <div className="text-xs text-muted-foreground">{r.from} – {r.to ?? "heute"}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-primary" />Vermieter-Bewertungen</h2>
            {(p.landlord_ratings?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Bewertungen.</p>
            ) : (
              <>
                <div className="text-2xl font-bold">{stars.toFixed(1)} <span className="text-sm text-muted-foreground font-normal">/ 5</span></div>
                <div className="text-xs text-muted-foreground">{p.landlord_ratings.length} Bewertungen</div>
              </>
            )}
          </Card>
        </div>

        <Card className="p-5 bg-muted/30">
          <p className="text-sm">
            Du bist Vermieter? Mit ImmonIQ erhältst du sofort vollständige, verifizierte Bewerberprofile — keine PDFs, keine Lücken.
          </p>
          <Button asChild className="mt-3 gap-2"><Link to="/">Kostenlos starten <ArrowRight className="h-4 w-4" /></Link></Button>
        </Card>
      </main>
    </div>
  );
}
