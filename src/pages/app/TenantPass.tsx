import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { IdCard, Copy, ShieldCheck, Home as HomeIcon, Star, Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Pass = {
  id: string;
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
  score_breakdown: any;
  dsgvo_consent_at: string | null;
  dsgvo_consent_withdrawn_at: string | null;
};

const TenantPass = () => {
  const [pass, setPass] = useState<Pass | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [computing, setComputing] = useState(false);

  const ensurePass = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    let { data, error } = await supabase
      .from("tenant_pass" as any).select("*").eq("user_id", user.id).maybeSingle();
    if (!data && !error) {
      const ins = await supabase.from("tenant_pass" as any).insert({ user_id: user.id }).select("*").single();
      data = ins.data; error = ins.error as any;
    }
    if (error) toast.error(error.message);
    else setPass(data as any);
    setLoading(false);
  };

  useEffect(() => { ensurePass(); document.title = "Mein Mieter-Pass · ImmonIQ"; }, []);

  const update = async (patch: Partial<Pass>) => {
    if (!pass) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("tenant_pass" as any).update(patch as any).eq("id", pass.id).select("*").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setPass(data as any);
  };

  const grantConsent = async () => {
    if (!pass || !consentChecked) return;
    setComputing(true);
    const { error: gErr } = await supabase.rpc("grant_score_consent" as any, {
      _pass_id: pass.id, _ip: null, _ua: navigator.userAgent,
    });
    if (gErr) { setComputing(false); return toast.error(gErr.message); }
    const { error: cErr } = await supabase.rpc("compute_immoniq_score" as any, { _pass_id: pass.id });
    if (cErr) { setComputing(false); return toast.error(cErr.message); }
    setConsentOpen(false); setConsentChecked(false); setComputing(false);
    toast.success("ImmonIQ Score berechnet");
    await ensurePass();
  };

  const withdrawConsent = async () => {
    if (!pass) return;
    if (!confirm("Score-Berechnung widerrufen? Dein Score wird gelöscht.")) return;
    const { error } = await supabase.rpc("withdraw_score_consent" as any, { _pass_id: pass.id });
    if (error) return toast.error(error.message);
    toast.success("Einwilligung widerrufen, Score gelöscht");
    await ensurePass();
  };

  const recomputeScore = async () => {
    if (!pass) return;
    setComputing(true);
    const { error } = await supabase.rpc("compute_immoniq_score" as any, { _pass_id: pass.id });
    setComputing(false);
    if (error) return toast.error(error.message);
    toast.success("Score neu berechnet");
    await ensurePass();
  };

  const publicUrl = pass ? `${window.location.origin}/pass/${pass.pass_code}` : "";

  if (loading) return <Card className="p-8 text-center text-muted-foreground">Lädt…</Card>;
  if (!pass) return <Card className="p-8 text-center">Bitte anmelden.</Card>;

  const completeness = [
    pass.display_name, pass.headline,
    Object.keys(pass.verified_income || {}).length > 0,
    Object.keys(pass.verified_schufa || {}).length > 0,
    (pass.rental_history?.length ?? 0) > 0,
  ].filter(Boolean).length;
  const pct = Math.round((completeness / 5) * 100);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <IdCard className="h-7 w-7 text-primary" /> Mein Mieter-Pass
        </h1>
        <p className="text-muted-foreground mt-1">
          Dein persistentes Profil. Einmal pflegen — bei jeder Bewerbung mit einem Klick teilen.
        </p>
      </div>

      <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pass-Code</div>
            <div className="font-mono text-lg font-semibold">{pass.pass_code}</div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            navigator.clipboard.writeText(publicUrl);
            toast.success("Link kopiert");
          }}>
            <Copy className="h-4 w-4" /> Link kopieren
          </Button>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>Profil-Vollständigkeit</span><span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </Card>

      {/* ImmonIQ Score – DSGVO Art. 22 konform */}
      <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-emerald-500/20">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-emerald-600 mt-1" />
            <div>
              <h2 className="font-semibold text-lg">ImmonIQ Score</h2>
              <p className="text-xs text-muted-foreground max-w-md mt-0.5">
                Transparenter Bonitäts-Score (0–1000) aus deinen verifizierten Angaben.
                Wird nur mit deiner ausdrücklichen Zustimmung berechnet (Art. 22 DSGVO).
              </p>
            </div>
          </div>
          {pass.score != null && pass.dsgvo_consent_at && !pass.dsgvo_consent_withdrawn_at ? (
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-600">{pass.score}</div>
              <div className="text-[10px] text-muted-foreground">/ 1000</div>
            </div>
          ) : null}
        </div>

        {pass.dsgvo_consent_at && !pass.dsgvo_consent_withdrawn_at ? (
          <div className="mt-4 space-y-3">
            {pass.score_breakdown && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                {[
                  ["Basis", pass.score_breakdown.baseline],
                  ["Einkommen", pass.score_breakdown.income_pts],
                  ["SCHUFA", pass.score_breakdown.schufa_pts],
                  ["Mietschuldenfrei", pass.score_breakdown.mietschuldenfrei_pts],
                  ["Bewertungen", pass.score_breakdown.ratings_pts + pass.score_breakdown.history_pts],
                ].map(([l, v]) => (
                  <div key={l as string} className="bg-background/60 rounded p-2 text-center border">
                    <div className="text-muted-foreground">{l}</div>
                    <div className="font-semibold">{v as number}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={recomputeScore} disabled={computing}>
                Score neu berechnen
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={withdrawConsent}>
                Einwilligung widerrufen
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              Der Score ist deterministisch, transparent und keine vollautomatisierte Entscheidung.
              Vermieter sehen den Score nur, wenn du deinen Pass teilst. Du kannst jederzeit widerrufen.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <Button onClick={() => setConsentOpen(true)} className="gap-2">
              <Sparkles className="h-4 w-4" /> Score jetzt berechnen
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Einwilligung: ImmonIQ Score</DialogTitle>
            <DialogDescription>Nach Art. 6 Abs. 1 lit. a und Art. 22 DSGVO</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              ImmonIQ berechnet aus deinen verifizierten Angaben (Einkommen, SCHUFA, Mietschuldenfreiheit,
              Wohnhistorie, Vermieter-Bewertungen) einen Bonitäts-Score von 0–1000.
            </p>
            <div className="bg-muted p-3 rounded text-xs space-y-2">
              <p><strong>So funktioniert der Score:</strong> Deterministische Formel — keine „Black-Box-KI". Jeder Punkt ist einer Kategorie zugeordnet und für dich einsehbar.</p>
              <p><strong>Deine Rechte:</strong> Widerruf jederzeit (Score wird gelöscht). Recht auf menschliche Überprüfung. Auskunft über gespeicherte Daten (Art. 15 DSGVO).</p>
              <p><strong>Wer sieht ihn:</strong> Nur wenn du deinen Pass explizit teilst (öffentlicher Link mit Pass-Code).</p>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-1" />
              <span className="text-sm">
                Ich willige ausdrücklich in die Berechnung meines ImmonIQ Scores nach Art. 22 DSGVO ein und
                bestätige, dass ich die <a href="/legal" target="_blank" className="underline">Datenschutzerklärung</a> gelesen habe.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConsentOpen(false)}>Abbrechen</Button>
            <Button onClick={grantConsent} disabled={!consentChecked || computing}>
              {computing ? "Berechne…" : "Einwilligen & berechnen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Basis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Anzeigename</Label>
            <Input
              defaultValue={pass.display_name ?? ""}
              onBlur={(e) => e.target.value !== (pass.display_name ?? "") && update({ display_name: e.target.value })}
              placeholder="Vor- + Nachname"
            />
          </div>
          <div>
            <Label>Headline</Label>
            <Input
              defaultValue={pass.headline ?? ""}
              onBlur={(e) => e.target.value !== (pass.headline ?? "") && update({ headline: e.target.value })}
              placeholder="z. B. Berufstätig, ruhig, NR"
            />
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <div className="font-medium">Öffentlich teilbar</div>
            <div className="text-xs text-muted-foreground">Vermieter können mit Pass-Code Profil sehen</div>
          </div>
          <Switch checked={pass.is_public} onCheckedChange={(v) => update({ is_public: v })} disabled={saving} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Bonität</span></div>
          <div className="text-xs text-muted-foreground">SCHUFA, Einkommen, Mietschuldenfreiheit</div>
          <Badge variant="outline" className="mt-2">In Vorbereitung</Badge>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><HomeIcon className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Wohn-Historie</span></div>
          <div className="text-xs text-muted-foreground">{(pass.rental_history?.length ?? 0)} Einträge</div>
          <Badge variant="outline" className="mt-2">In Vorbereitung</Badge>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">Vermieter-Bewertungen</span></div>
          <div className="text-xs text-muted-foreground">{(pass.landlord_ratings?.length ?? 0)} Bewertungen</div>
          <Badge variant="outline" className="mt-2">In Vorbereitung</Badge>
        </Card>
      </div>

      <Card className="p-5 bg-muted/30">
        <h3 className="font-semibold mb-2">Warum ein ImmonIQ-Pass?</h3>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>✓ Bewerbung in 1 Klick — statt 20 Dokumente scannen</li>
          <li>✓ Du besitzt deine Daten, nicht der Vermieter (DSGVO)</li>
          <li>✓ Bleibt bei jedem Umzug — wie ein Linkedin für Wohnen</li>
          <li>✓ Verifizierte Vermieter-Bewertungen statt Maklerwillkür</li>
        </ul>
      </Card>
    </div>
  );
};

export default TenantPass;
