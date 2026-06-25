import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Megaphone, Plus, Eye, MousePointerClick, Calendar, AlertCircle,
  CheckCircle2, Clock, XCircle, CreditCard, Target, Users, TrendingUp,
  Sparkles, ExternalLink, Trash2, HelpCircle, Calculator, ShieldCheck,
  Zap, Wrench, Building2, Banknote, Lightbulb, ArrowRight, Quote,
} from "lucide-react";
import { toast } from "sonner";
import { usePageSeo } from "@/hooks/usePageSeo";

const MYADS_FAQ = [
  {
    q: "Wie schnell ist meine Anzeige live?",
    a: "Nach Erstellung prüfen wir innerhalb von 24 Stunden. Sobald freigegeben, einmal \"Buchen\" klicken — und sie ist sofort online.",
  },
  {
    q: "Was wird geprüft?",
    a: "Dass dein Link funktioniert, der Inhalt seriös ist (kein Spam, keine Schufa-Versprechen, keine irreführende Werbung) und zu Immobilien passt.",
  },
  {
    q: "Was passiert wenn niemand klickt?",
    a: "Du siehst die Stats live. Wenn nach 3 Tagen keine Klicks kommen: Überschrift überarbeiten oder anderes PLZ-Targeting probieren — neue Anzeigen kostenfrei einreichbar.",
  },
  {
    q: "Kann ich Rechnung bekommen?",
    a: "Ja — nach Zahlung erhältst du automatisch eine Rechnung mit MwSt. per E-Mail.",
  },
] as const;

type AdSlot = {
  id: string;
  title: string;
  subtitle: string | null;
  sponsor_name: string | null;
  click_url: string;
  cta_label: string | null;
  placement: string;
  target_zips: string[];
  target_cities: string[];
  target_kind: string | null;
  active: boolean;
  moderation_status: "pending" | "approved" | "rejected" | "paused";
  paid_until: string | null;
  impressions_count: number;
  clicks_count: number;
  rejection_reason: string | null;
  created_at: string;
};

const PLACEMENTS = [
  { value: "market_top", label: "Markt – Banner oben", desc: "Maximale Sichtbarkeit, ganz oben über allen Inseraten", reach: "ca. 800–1.200 Views/Woche" },
  { value: "market_grid", label: "Markt – im Grid", desc: "Erscheint zwischen den Inseraten wie ein Premium-Listing", reach: "ca. 500–900 Views/Woche" },
  { value: "marketplace_category", label: "Handwerker-Kategorie", desc: "Innerhalb der Handwerker-Suche — perfekt für Dienstleister", reach: "ca. 200–400 Views/Woche" },
];

const PRICE_PER_WEEK = 49;

export default function MyAds() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [bookSlot, setBookSlot] = useState<AdSlot | null>(null);
  const [weeks, setWeeks] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    sponsor_name: "",
    click_url: "",
    cta_label: "Mehr erfahren",
    placement: "market_grid",
    target_zips: "",
    target_cities: "",
    target_kind: "any",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ad_slots")
      .select("*")
      .eq("advertiser_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Fehler beim Laden");
    else setSlots((data as AdSlot[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Titel ist Pflicht");
    if (!form.click_url.match(/^https?:\/\//)) return toast.error("Link muss mit https:// beginnen");

    const zips = form.target_zips.split(",").map(s => s.trim()).filter(Boolean);
    const cities = form.target_cities.split(",").map(s => s.trim()).filter(Boolean);

    const { error } = await supabase.from("ad_slots").insert({
      advertiser_user_id: user.id,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      sponsor_name: form.sponsor_name.trim() || null,
      click_url: form.click_url.trim(),
      cta_label: form.cta_label.trim() || "Mehr erfahren",
      placement: form.placement,
      target_zips: zips,
      target_cities: cities,
      target_kind: form.target_kind === "any" ? null : form.target_kind,
      active: false,
      moderation_status: "pending",
    });
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("✓ Anzeige erstellt — wir prüfen sie innerhalb 24h.");
    setCreateOpen(false);
    setForm({ ...form, title: "", subtitle: "", sponsor_name: "", click_url: "", target_zips: "", target_cities: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Anzeige wirklich löschen?")) return;
    const { error } = await supabase.from("ad_slots").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gelöscht");
    load();
  };

  const statusBadge = (slot: AdSlot) => {
    const paid = slot.paid_until && new Date(slot.paid_until) > new Date();
    if (slot.moderation_status === "pending") return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Wird geprüft</Badge>;
    if (slot.moderation_status === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Abgelehnt</Badge>;
    if (slot.moderation_status === "paused") return <Badge variant="outline">Pausiert</Badge>;
    if (slot.moderation_status === "approved" && !paid) return <Badge variant="outline" className="border-amber-500 text-amber-600"><AlertCircle className="h-3 w-3 mr-1" />Bereit zum Buchen</Badge>;
    if (slot.moderation_status === "approved" && paid) return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Live</Badge>;
    return null;
  };

  const totalImpressions = slots.reduce((s, x) => s + x.impressions_count, 0);
  const totalClicks = slots.reduce((s, x) => s + x.clicks_count, 0);
  const liveCount = slots.filter(s => s.moderation_status === "approved" && s.paid_until && new Date(s.paid_until) > new Date()).length;

  return (
    <div className="space-y-6">
      {/* HERO — psychological no-brainer */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="p-6 md:p-8 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <Badge className="mb-3 bg-emerald-600 text-white border-0 gap-1">
              <Sparkles className="h-3 w-3" /> Erste Woche 50 % günstiger — nur <strong className="ml-1">24,50 €</strong>
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              <span className="text-primary">1 Mieter.</span> 6.000 € Jahresmiete.<br />
              Dein Werbeplatz: <span className="text-primary">49 €/Woche.</span>
            </h1>
            <p className="text-muted-foreground mt-3 text-sm md:text-base">
              Du sprichst direkt Eigentümer, Mieter und Käufer an — ohne Streuverluste.
              Keine Mindestlaufzeit. Pausieren jederzeit. Wenn unter 500 Views: <strong className="text-foreground">Geld zurück.</strong>
            </p>
            <div className="flex gap-2 mt-5 flex-wrap">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2 bg-gradient-gold text-primary-foreground shadow-gold">
                    <Plus className="h-4 w-4" /> Anzeige in 2 Min. erstellen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Anzeige erstellen — in 3 Schritten</DialogTitle>
                    <DialogDescription>
                      1. Anzeige beschreiben → 2. Wir prüfen (max. 24h) → 3. Du buchst & gehst live.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Schritt 1 */}
                    <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">Schritt 1 — Was bewirbst du?</p>
                      <div>
                        <Label>Überschrift *</Label>
                        <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder='z.B. "Kostenlose Marktwert-Analyse für Berlin"' maxLength={80} />
                        <p className="text-xs text-muted-foreground mt-1">{form.title.length}/80 — kurz & klickstark</p>
                      </div>
                      <div>
                        <Label>Untertitel (optional)</Label>
                        <Input value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} placeholder="z.B. Erfahrener Makler · 200+ verkaufte Objekte" maxLength={120} />
                      </div>
                      <div>
                        <Label>Dein Firmenname / Anbieter</Label>
                        <Input value={form.sponsor_name} onChange={e => setForm({...form, sponsor_name: e.target.value})} placeholder='z.B. "Mustermann Immobilien GmbH"' maxLength={60} />
                      </div>
                      <div>
                        <Label>Link bei Klick * <span className="text-muted-foreground">(deine Website)</span></Label>
                        <Input value={form.click_url} onChange={e => setForm({...form, click_url: e.target.value})} placeholder="https://deine-website.de" />
                      </div>
                      <div>
                        <Label>Button-Text</Label>
                        <Input value={form.cta_label} onChange={e => setForm({...form, cta_label: e.target.value})} maxLength={30} placeholder="z.B. Termin buchen" />
                      </div>
                    </div>

                    {/* Schritt 2 */}
                    <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">Schritt 2 — Wo & für wen?</p>
                      <div>
                        <Label>Platzierung</Label>
                        <Select value={form.placement} onValueChange={v => setForm({...form, placement: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PLACEMENTS.map(p => (
                              <SelectItem key={p.value} value={p.value}>
                                <div>
                                  <div className="font-medium">{p.label}</div>
                                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Geschätzte Reichweite: <strong>{PLACEMENTS.find(p => p.value === form.placement)?.reach}</strong>
                        </p>
                      </div>
                      <div>
                        <Label>PLZ-Bereich (optional, kommagetrennt)</Label>
                        <Input value={form.target_zips} onChange={e => setForm({...form, target_zips: e.target.value})} placeholder="10115, 10117, 80331" />
                        <p className="text-xs text-muted-foreground mt-1">Tipp: Auch 3-stellig möglich (z.B. "101" trifft alle 101xx)</p>
                      </div>
                      <div>
                        <Label>Städte (optional)</Label>
                        <Input value={form.target_cities} onChange={e => setForm({...form, target_cities: e.target.value})} placeholder="Berlin, München" />
                      </div>
                      <div>
                        <Label>Wer soll deine Anzeige sehen?</Label>
                        <Select value={form.target_kind} onValueChange={v => setForm({...form, target_kind: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Alle Nutzer</SelectItem>
                            <SelectItem value="rent">Nur Mieter / Mietinteressenten</SelectItem>
                            <SelectItem value="sale">Nur Käufer / Kaufinteressenten</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Vorschau */}
                    <div className="rounded-lg border-2 border-dashed border-primary/30 p-4 bg-background">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Live-Vorschau
                      </p>
                      <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-lg bg-gradient-gold flex items-center justify-center flex-shrink-0">
                            <Megaphone className="h-5 w-5 text-primary-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Badge variant="outline" className="text-[9px] mb-1">ANZEIGE</Badge>
                            <p className="font-semibold leading-tight">{form.title || "Deine Überschrift hier"}</p>
                            {form.subtitle && <p className="text-sm text-muted-foreground">{form.subtitle}</p>}
                            {form.sponsor_name && <p className="text-xs text-muted-foreground mt-1">— {form.sponsor_name}</p>}
                            <Button size="sm" className="mt-2 h-7 text-xs" disabled>{form.cta_label || "Mehr erfahren"}</Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button onClick={submit} className="w-full" size="lg">
                      Zur Prüfung einreichen — kostenlos
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Erstellen ist kostenlos. Bezahlt wird erst, wenn du nach Freigabe wirklich buchst.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
              <a href="#roi" className="inline-flex">
                <Button size="lg" variant="outline" className="gap-2"><Calculator className="h-4 w-4" /> Lohnt sich das?</Button>
              </a>
            </div>
            <div className="flex items-center gap-3 mt-5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-primary" /> Geld-zurück-Garantie</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> Live in 24h</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Rechnung mit MwSt.</span>
            </div>
          </div>

          {/* Vs comparison */}
          <div className="grid gap-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">So viel zahlst du anderswo:</p>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 bg-muted/40 border-dashed">
                <p className="text-xs text-muted-foreground">ImmoScout24 Pro</p>
                <p className="text-2xl font-bold line-through text-muted-foreground">499 €</p>
                <p className="text-[11px] text-muted-foreground">/ Monat · Bindung</p>
              </Card>
              <Card className="p-4 bg-primary/10 border-primary shadow-gold">
                <p className="text-xs text-primary font-semibold">ImmonIQ</p>
                <p className="text-2xl font-bold text-primary">49 €</p>
                <p className="text-[11px] text-muted-foreground">/ Woche · keine Bindung</p>
              </Card>
            </div>
            <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
              <p className="text-xs flex items-start gap-2">
                <Quote className="h-3 w-3 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>3 Klicks → 1 ernsthafte Anfrage.</strong> Bei 49 € macht jeder Lead unter 17 € — billiger als jede Maklerprovision.</span>
              </p>
            </Card>
          </div>
        </div>
      </Card>

      {/* ROI Calculator */}
      <Card id="roi" className="p-5 md:p-6 border-primary/20">
        <div className="flex items-start gap-3 mb-4">
          <Calculator className="h-6 w-6 text-primary shrink-0" />
          <div>
            <p className="font-bold text-lg">Lohnt sich das für dich?</p>
            <p className="text-sm text-muted-foreground">Stell deinen Use-Case ein — wir rechnen ehrlich nach.</p>
          </div>
        </div>
        <RoiCalculator />
      </Card>

      {/* Use-Case Templates */}
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Wer wirbt erfolgreich auf ImmonIQ?</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { Icon: Building2, role: "Makler", outcome: "1 Mandat = 8.000 €+ Provision", angle: "PLZ-genaue Eigentümer-Ansprache" },
            { Icon: Wrench, role: "Handwerker", outcome: "1 Auftrag = 1.500 €+ Umsatz", angle: "Sichtbar wenn Eigentümer Schäden suchen" },
            { Icon: Banknote, role: "Finanzierer", outcome: "1 Baufi-Abschluss = 3.000 €+", angle: "Käufer im Suchprozess abfangen" },
            { Icon: Lightbulb, role: "Energieberater", outcome: "1 GEG-Beratung = 800 €", angle: "Eigentümer mit altem Energieausweis" },
          ].map((u, i) => (
            <Card key={i} className="p-4 hover:shadow-md hover:border-primary/40 transition cursor-pointer group" onClick={() => setCreateOpen(true)}>
              <u.Icon className="h-6 w-6 text-primary mb-2" />
              <p className="font-semibold text-sm">{u.role}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">{u.outcome}</p>
              <p className="text-xs text-muted-foreground mt-1">{u.angle}</p>
              <p className="text-xs text-primary mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
                Vorlage nutzen <ArrowRight className="h-3 w-3" />
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Trust strip */}
      <Card className="p-4 bg-muted/30">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div><p className="text-xl font-bold text-primary">24h</p><p className="text-[11px] text-muted-foreground">Freigabe</p></div>
          <div><p className="text-xl font-bold text-primary">0 €</p><p className="text-[11px] text-muted-foreground">Setup</p></div>
          <div><p className="text-xl font-bold text-primary">500+</p><p className="text-[11px] text-muted-foreground">Views-Garantie</p></div>
          <div><p className="text-xl font-bold text-primary">∞</p><p className="text-[11px] text-muted-foreground">Pausieren</p></div>
        </div>
      </Card>

      <div className="pt-2 border-t">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> Deine Anzeigen
        </h2>
      </div>

      {/* Stats */}
      {slots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Aktiv</p>
            <p className="text-2xl font-bold">{liveCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Impressions gesamt</p>
            <p className="text-2xl font-bold">{totalImpressions.toLocaleString("de-DE")}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Klicks gesamt</p>
            <p className="text-2xl font-bold">{totalClicks.toLocaleString("de-DE")}</p>
          </Card>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <p className="text-muted-foreground">Lädt...</p>
      ) : slots.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-gold-soft flex items-center justify-center mb-4">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <p className="font-semibold text-lg">Noch keine Anzeige</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Erreiche genau die Eigentümer, Käufer oder Mieter, die dich brauchen. In 2 Minuten erstellt.
          </p>
          <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Erste Anzeige erstellen
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {slots.map(slot => {
            const paid = slot.paid_until && new Date(slot.paid_until) > new Date();
            const ctr = slot.impressions_count > 0
              ? ((slot.clicks_count / slot.impressions_count) * 100).toFixed(2)
              : "0";
            return (
              <Card key={slot.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{slot.title}</p>
                      {statusBadge(slot)}
                    </div>
                    {slot.subtitle && <p className="text-sm text-muted-foreground mt-0.5">{slot.subtitle}</p>}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Target className="h-3 w-3" />{PLACEMENTS.find(p => p.value === slot.placement)?.label}</span>
                      {slot.target_zips.length > 0 && <span>PLZ: {slot.target_zips.join(", ")}</span>}
                      {slot.target_cities.length > 0 && <span>{slot.target_cities.join(", ")}</span>}
                    </div>
                    {slot.rejection_reason && (
                      <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                        <strong>Ablehnungsgrund:</strong> {slot.rejection_reason}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-3 text-sm">
                      <span className="flex items-center gap-1" title="Impressions"><Eye className="h-3.5 w-3.5" /> {slot.impressions_count}</span>
                      <span className="flex items-center gap-1" title="Klicks"><MousePointerClick className="h-3.5 w-3.5" /> {slot.clicks_count}</span>
                      <span className="text-muted-foreground" title="Click-Through-Rate">CTR {ctr}%</span>
                    </div>
                    {paid && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" /> bis {new Date(slot.paid_until!).toLocaleDateString("de-DE")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {slot.moderation_status === "approved" && (
                    <Button size="sm" onClick={() => { setBookSlot(slot); setWeeks(1); }} className="gap-1">
                      <CreditCard className="h-3.5 w-3.5" /> {paid ? "Verlängern" : "Jetzt buchen & live gehen"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <a href={slot.click_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Link testen
                    </a>
                  </Button>
                  {!paid && (
                    <Button size="sm" variant="ghost" onClick={() => remove(slot.id)} className="text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* FAQ */}
      <Card className="p-5">
        <p className="font-semibold flex items-center gap-2 mb-3"><HelpCircle className="h-4 w-4" /> Häufige Fragen</p>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Wie schnell ist meine Anzeige live?</p>
            <p className="text-muted-foreground text-xs">Nach Erstellung prüfen wir innerhalb von 24h. Sobald freigegeben, einmal "Buchen" klicken — und sie ist sofort online.</p>
          </div>
          <div>
            <p className="font-medium">Was wird geprüft?</p>
            <p className="text-muted-foreground text-xs">Dass dein Link funktioniert, der Inhalt seriös ist (kein Spam, keine Schufa-Versprechen, keine irreführende Werbung) und zu Immobilien passt.</p>
          </div>
          <div>
            <p className="font-medium">Was passiert wenn niemand klickt?</p>
            <p className="text-muted-foreground text-xs">Du siehst die Stats live. Wenn nach 3 Tagen keine Klicks kommen: Überschrift überarbeiten oder anderes PLZ-Targeting probieren — neue Anzeigen kostenfrei einreichbar.</p>
          </div>
          <div>
            <p className="font-medium">Kann ich Rechnung bekommen?</p>
            <p className="text-muted-foreground text-xs">Ja — nach Zahlung erhältst du automatisch eine Rechnung mit MwSt. per E-Mail.</p>
          </div>
        </div>
      </Card>

      {/* Buchungs-Dialog */}
      <Dialog open={!!bookSlot && !showCheckout} onOpenChange={() => { setBookSlot(null); setShowCheckout(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buchung abschließen</DialogTitle>
            <DialogDescription>{bookSlot?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Wie lange soll die Anzeige laufen?</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[1, 2, 4, 8].map(w => (
                  <Button
                    key={w}
                    variant={weeks === w ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWeeks(w)}
                  >
                    {w} Wo.
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                max={52}
                value={weeks}
                onChange={e => setWeeks(Math.max(1, Math.min(52, Number(e.target.value) || 1)))}
                className="mt-2"
              />
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
              <div className="flex justify-between"><span>{weeks} × 7 Tage à 49 €</span><span className="font-semibold">{weeks * PRICE_PER_WEEK},00 €</span></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>davon MwSt. 19%</span><span>{((weeks * PRICE_PER_WEEK / 1.19) * 0.19).toFixed(2)} €</span></div>
              <div className="text-xs text-muted-foreground border-t pt-1 mt-1">Einmalige Zahlung · keine automatische Verlängerung</div>
            </div>
            <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
              <CreditCard className="h-4 w-4 mr-2" /> Jetzt {weeks * PRICE_PER_WEEK},00 € bezahlen
            </Button>
            <p className="text-xs text-center text-muted-foreground">Sicher bezahlen mit Kreditkarte, SEPA oder Apple/Google Pay</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckout} onOpenChange={(o) => { if (!o) { setShowCheckout(false); setBookSlot(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bezahlung</DialogTitle>
          </DialogHeader>
          {bookSlot && showCheckout && (
            <AdCheckout
              adSlotId={bookSlot.id}
              weeks={weeks}
              onDone={() => { setShowCheckout(false); setBookSlot(null); load(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdCheckout({ adSlotId, weeks, onDone }: { adSlotId: string; weeks: number; onDone: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const env = (import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string)?.startsWith("pk_test_") ? "sandbox" : "live";
      const { data, error } = await supabase.functions.invoke("create-ad-checkout", {
        body: {
          adSlotId,
          weeks,
          environment: env,
          returnUrl: `${window.location.origin}/app/ads?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if (error || !data?.clientSecret) {
        setError(error?.message || "Checkout konnte nicht erstellt werden");
        return;
      }
      setClientSecret(data.clientSecret);
    })();
  }, [adSlotId, weeks]);

  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (!clientSecret) return <p className="text-muted-foreground text-sm">Lädt sichere Bezahlung...</p>;

  return <StripeEmbeddedCheckoutInline clientSecret={clientSecret} />;
}

import { EmbeddedCheckoutProvider, EmbeddedCheckout as StripeEC } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

function StripeEmbeddedCheckoutInline({ clientSecret }: { clientSecret: string }) {
  const fetchClientSecret = async () => clientSecret;
  return (
    <div id="ad-checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <StripeEC />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

type SliderRowProps = {
  label: string;
  hint?: string;
  value: number;
  set: (n: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  presets?: { label: string; value: number }[];
  format?: (n: number) => string;
};

function SliderRow({ label, hint, value, set, min, max, step, suffix, presets, format }: SliderRowProps) {
  const display = format ? format(value) : `${value}${suffix ?? ""}`;
  const dec = () => set(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => set(Math.min(max, +(value + step).toFixed(2)));

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button" variant="outline" size="icon"
            onClick={dec} disabled={value <= min}
            className="h-8 w-8 shrink-0"
            aria-label="Weniger"
          >−</Button>
          <span className="font-bold text-primary tabular-nums min-w-[64px] text-center bg-primary/10 rounded-md px-2 py-1.5 text-sm">
            {display}
          </span>
          <Button
            type="button" variant="outline" size="icon"
            onClick={inc} disabled={value >= max}
            className="h-8 w-8 shrink-0"
            aria-label="Mehr"
          >+</Button>
        </div>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={(v) => set(v[0])}
        className="touch-none"
      />
      {presets && presets.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {presets.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => set(p.value)}
              className={`text-[11px] px-2 py-1 rounded-full border transition ${
                value === p.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoiCalculator() {
  const [weeks, setWeeks] = useState(4);
  const [ctr, setCtr] = useState(2.5);
  const [convRate, setConvRate] = useState(15);
  const [leadValue, setLeadValue] = useState(2000);
  const [closeRate, setCloseRate] = useState(20);

  const cost = weeks * 49;
  const impressions = weeks * 800;
  const clicks = Math.round(impressions * (ctr / 100));
  const leads = Math.round(clicks * (convRate / 100));
  const deals = Math.max(0, Math.round(leads * (closeRate / 100)));
  const revenue = deals * leadValue;
  const roi = cost > 0 ? Math.round(((revenue - cost) / cost) * 100) : 0;
  const profit = revenue - cost;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-5">
        <SliderRow
          label="Laufzeit" hint="Wie lange soll deine Anzeige laufen?"
          value={weeks} set={setWeeks} min={1} max={12} step={1} suffix=" Wo."
          presets={[{label:"1 Wo", value:1},{label:"4 Wo", value:4},{label:"8 Wo", value:8},{label:"12 Wo", value:12}]}
        />
        <SliderRow
          label="Klickrate" hint="Branchenschnitt 2–4 %"
          value={ctr} set={setCtr} min={0.5} max={6} step={0.1}
          format={(v) => `${v.toFixed(1).replace(".", ",")} %`}
          presets={[{label:"konservativ", value:1.5},{label:"normal", value:2.5},{label:"stark", value:4}]}
        />
        <SliderRow
          label="Anteil ernsthafter Anfragen" hint="Wie viele Klicks werden zu echten Leads?"
          value={convRate} set={setConvRate} min={5} max={40} step={1} suffix=" %"
          presets={[{label:"10 %", value:10},{label:"15 %", value:15},{label:"25 %", value:25}]}
        />
        <SliderRow
          label="Abschlussquote bei Leads" hint="Wie viele Leads werden zu Kunden?"
          value={closeRate} set={setCloseRate} min={5} max={50} step={1} suffix=" %"
          presets={[{label:"10 %", value:10},{label:"20 %", value:20},{label:"30 %", value:30}]}
        />
        <SliderRow
          label="Gewinn pro Abschluss" hint="Was bringt dir ein neuer Kunde / Auftrag?"
          value={leadValue} set={setLeadValue} min={100} max={10000} step={100}
          format={(v) => `${v.toLocaleString("de-DE")} €`}
          presets={[
            {label:"Handwerker 1.500 €", value:1500},
            {label:"Makler 8.000 €", value:8000},
            {label:"Energieberater 800 €", value:800},
          ]}
        />
      </div>
      <div className="space-y-3 md:sticky md:top-4 self-start">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Du investierst</p>
            <p className="text-2xl font-bold">{cost} €</p>
            <p className="text-[11px] text-muted-foreground">{weeks} × 49 €</p>
          </Card>
          <Card className="p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Geschätzte Views</p>
            <p className="text-2xl font-bold">{impressions.toLocaleString("de-DE")}</p>
            <p className="text-[11px] text-muted-foreground">{clicks} Klicks erwartet</p>
          </Card>
        </div>
        <Card className={`p-4 transition ${profit > 0 ? "bg-emerald-500/10 border-emerald-500/40" : "bg-amber-500/10 border-amber-500/40"}`}>
          <p className="text-xs text-muted-foreground">Erwarteter Gewinn (Umsatz − Werbekosten)</p>
          <p className={`text-3xl font-bold tabular-nums ${profit > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
            {profit >= 0 ? "+" : ""}{profit.toLocaleString("de-DE")} €
          </p>
          <p className="text-xs mt-1">
            ≈ <strong>{deals}</strong> Abschlüsse · ROI <strong>{roi}%</strong>
          </p>
        </Card>
        {profit > 0 && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Aus jedem Euro werden statistisch <strong>{(revenue / Math.max(cost,1)).toFixed(1)} €</strong> Umsatz.</span>
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Konservative Schätzung — keine Garantie. Ergebnisse hängen von Anzeige, Targeting und Angebot ab.
        </p>
      </div>
    </div>
  );
}

