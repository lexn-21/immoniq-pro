import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Building2, RefreshCw, CheckCircle2, Banknote, Loader2, Sparkles, X, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { eur, date } from "@/lib/format";
import { PlanGate } from "@/components/PlanGate";

const COUNTRIES = [
  { code: "DE", label: "🇩🇪 Deutschland" },
  { code: "AT", label: "🇦🇹 Österreich" },
  { code: "FR", label: "🇫🇷 Frankreich" },
  { code: "NL", label: "🇳🇱 Niederlande" },
  { code: "FI", label: "🇫🇮 Finnland" },
];

const Banking = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("DE");
  const [banks, setBanks] = useState<any[]>([]);
  const [bankFilter, setBankFilter] = useState("");
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [busyTx, setBusyTx] = useState<string | null>(null);
  const [rematching, setRematching] = useState(false);
  // Pro Ausgabe-Vorschlag: lokal gewählte Zuordnung (property, category)
  const [expenseForm, setExpenseForm] = useState<Record<string, { property_id?: string; category?: string; nka?: boolean }>>({});

  useEffect(() => { document.title = "Banking · ImmonIQ"; }, []);

  // Handle OAuth return: ?code=…&bank=…&country=…
  useEffect(() => {
    const code = searchParams.get("code");
    const bank = searchParams.get("bank");
    const ctry = searchParams.get("country");
    if (code && bank && ctry) {
      (async () => {
        toast.info("Verbinde mit deiner Bank…");
        const { data, error } = await supabase.functions.invoke("enable-banking", {
          body: { action: "complete_auth", code, bank_name: bank, country: ctry },
        });
        if (error || data?.error) {
          toast.error("Verbindung fehlgeschlagen", { description: data?.error ?? error?.message });
        } else {
          toast.success(`✓ Bank verbunden — ${data.accounts} Konten`);
        }
        setSearchParams({}, { replace: true });
        load();
      })();
    } else {
      load();
    }
  }, []); // eslint-disable-line

  const load = async () => {
    setLoading(true);
    const [c, a, t, s, te, pr] = await Promise.all([
      supabase.from("bank_connections").select("*").order("created_at", { ascending: false }),
      supabase.from("bank_accounts").select("*"),
      supabase.from("bank_transactions").select("*").order("booking_date", { ascending: false }).limit(50),
      supabase.from("bank_transactions").select("*").eq("match_status", "suggested").order("booking_date", { ascending: false }),
      supabase.from("tenants").select("id,full_name,iban,unit_id"),
      supabase.from("properties").select("id,name"),
    ]);
    setConnections(c.data ?? []);
    setAccounts(a.data ?? []);
    setTransactions(t.data ?? []);
    setSuggestions(s.data ?? []);
    setTenants(te.data ?? []);
    setProperties(pr.data ?? []);
    // Rules separat (Pro-Function-Call, kein Crash wenn 404)
    supabase.functions.invoke("enable-banking", { body: { action: "list_rules" } })
      .then(({ data }) => setRules(data?.rules ?? [])).catch(() => {});
    setLoading(false);
  };

  const loadBanks = async (ctry: string) => {
    setLoadingBanks(true);
    const { data, error } = await supabase.functions.invoke("enable-banking", {
      body: { action: "list_banks", country: ctry },
    });
    if (error || data?.error) {
      toast.error("Banken konnten nicht geladen werden", { description: data?.error ?? error?.message });
      setBanks([]);
    } else {
      setBanks(data.banks ?? []);
    }
    setLoadingBanks(false);
  };

  useEffect(() => { if (open) loadBanks(country); }, [open, country]);

  const startAuth = async (bankName: string) => {
    setConnecting(true);
    const redirect_url = `${window.location.origin}/app/banking?bank=${encodeURIComponent(bankName)}&country=${country}`;
    const { data, error } = await supabase.functions.invoke("enable-banking", {
      body: { action: "start_auth", bank_name: bankName, country, redirect_url },
    });
    setConnecting(false);
    if (error || data?.error) {
      toast.error("Konnte Auth nicht starten", { description: data?.error ?? error?.message });
      return;
    }
    window.location.href = data.url;
  };

  const sync = async (connId: string) => {
    setSyncing(connId);
    const { data, error } = await supabase.functions.invoke("enable-banking", {
      body: { action: "sync", connection_id: connId },
    });
    setSyncing(null);
    if (error || data?.error) {
      toast.error("Sync fehlgeschlagen", { description: data?.error ?? error?.message });
    } else {
      const parts = [`${data.synced ?? 0} neue Transaktionen`];
      if (data.auto_matched) parts.push(`${data.auto_matched} Mieten verbucht`);
      if (data.auto_expenses) parts.push(`${data.auto_expenses} Ausgaben verbucht`);
      if (data.suggested) parts.push(`${data.suggested} Vorschläge`);
      toast.success("✓ " + parts.join(" · "));
      load();
    }
  };

  const rematch = async () => {
    setRematching(true);
    const { data, error } = await supabase.functions.invoke("enable-banking", { body: { action: "rematch" } });
    setRematching(false);
    if (error || data?.error) {
      toast.error("Re-Match fehlgeschlagen", { description: data?.error ?? error?.message });
    } else {
      toast.success(`✓ ${data.auto_matched ?? 0} Mieten · ${data.auto_expenses ?? 0} Ausgaben · ${data.suggested ?? 0} Vorschläge`);
      load();
    }
  };

  const bookExpense = async (tx: any) => {
    const form = expenseForm[tx.id] ?? {};
    const property_id = form.property_id ?? (properties.length === 1 ? properties[0].id : tx.matched_property_id) ?? undefined;
    const category = form.category ?? tx.category ?? "immediate";
    if (!property_id) {
      toast.error("Bitte Immobilie wählen");
      return;
    }
    setBusyTx(tx.id);
    const { data, error } = await supabase.functions.invoke("enable-banking", {
      body: {
        action: "book_expense",
        transaction_id: tx.id,
        property_id,
        category,
        classification: "maintenance",
        nka_eligible: form.nka ?? (category === "utilities_passthrough"),
        learn: true,
      },
    });
    setBusyTx(null);
    if (error || data?.error) toast.error("Fehler", { description: data?.error ?? error?.message });
    else { toast.success("✓ Als Ausgabe verbucht & Regel gemerkt"); load(); }
  };

  const confirmMatch = async (txId: string, tenantId?: string) => {
    setBusyTx(txId);
    const { data, error } = await supabase.functions.invoke("enable-banking", {
      body: { action: "confirm_match", transaction_id: txId, tenant_id: tenantId },
    });
    setBusyTx(null);
    if (error || data?.error) toast.error("Fehler", { description: data?.error ?? error?.message });
    else { toast.success("✓ Als Miete verbucht"); load(); }
  };

  const ignoreMatch = async (txId: string) => {
    setBusyTx(txId);
    const { error } = await supabase.functions.invoke("enable-banking", {
      body: { action: "unmatch", transaction_id: txId },
    });
    setBusyTx(null);
    if (error) toast.error("Fehler"); else { toast.success("Ignoriert"); load(); }
  };

  const filteredBanks = banks.filter(b =>
    !bankFilter || (b.name?.toLowerCase().includes(bankFilter.toLowerCase()))
  );

  return (
    <PlanGate requires="pro" feature="Bank-Sync" description="Bank verbinden, Mieten automatisch zuordnen und Ausgaben kategorisieren — Teil von ImmonIQ Pro.">
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Banking</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Verbinde dein Konto — Mieten & Ausgaben werden automatisch erkannt.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-gold text-primary-foreground shadow-gold w-full sm:w-auto">
              <Plus className="h-5 w-5 mr-2" /> Bank verbinden
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Bank wählen</DialogTitle>
              <p className="text-xs text-muted-foreground">Sichere PSD2-Verbindung via Enable Banking — 180 Tage gültig.</p>
            </DialogHeader>
            <div className="space-y-3 overflow-hidden flex flex-col">
              <div>
                <Label className="text-xs">Land</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Bank suchen…" value={bankFilter} onChange={e => setBankFilter(e.target.value)} />
              <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-1 min-h-[300px]">
                {loadingBanks ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Lade Banken…
                  </div>
                ) : filteredBanks.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Keine Banken gefunden.</p>
                ) : filteredBanks.map((b, i) => (
                  <button
                    key={`${b.name}-${i}`}
                    onClick={() => startAuth(b.name)}
                    disabled={connecting}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition text-left disabled:opacity-50"
                  >
                    {b.logo ? (
                      <img src={b.logo} alt="" className="h-8 w-8 rounded object-contain bg-white" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.name}</p>
                      {b.psu_types && <p className="text-[10px] text-muted-foreground">{b.psu_types.join(" · ")}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : connections.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="Noch keine Bank verbunden"
          description="Verbinde dein Konto sicher per PSD2 — Mieteingänge und Ausgaben landen automatisch hier."
          action={{ label: "Bank verbinden", onClick: () => setOpen(true), icon: Plus }}
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {connections.map(c => {
              const accs = accounts.filter(a => a.connection_id === c.id);
              return (
                <Card key={c.id} className="p-4 glass">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                        {c.institution_name ?? c.institution_id}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {accs.length} Konto{accs.length === 1 ? "" : "s"}
                        {c.last_sync_at ? ` · Sync ${date(c.last_sync_at)}` : " · noch nicht synct"}
                        {c.valid_until && ` · gültig bis ${date(c.valid_until)}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sync(c.id)}
                      disabled={syncing === c.id}
                    >
                      {syncing === c.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />}
                      <span className="ml-1.5 text-xs">Sync</span>
                    </Button>
                  </div>
                  {accs.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {accs.map(a => (
                        <div key={a.id} className="flex items-center justify-between text-xs border-t pt-2">
                          <span className="font-mono truncate">{a.iban ?? a.external_id.slice(0, 12)}</span>
                          {a.balance_cents != null && (
                            <span className="font-semibold tabular">{eur(a.balance_cents / 100)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Hinweis: IBAN bei Mietern eintragen */}
          {tenants.length > 0 && tenants.every(t => !t.iban) && (
            <Card className="p-4 glass border-warning/40 bg-warning/5">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">Tipp: IBAN bei deinen Mietern hinterlegen</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Dann werden Mieteingänge zu 100 % automatisch verbucht. Sonst läuft das Matching nur über Betrag + Name.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate("/app/tenants")}>
                    Zu den Mietern
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Eingangs-Vorschläge (Mieten) */}
          {suggestions.filter(s => s.amount_cents > 0).length > 0 && (
            <Card className="glass overflow-hidden border-primary/30">
              <div className="px-4 py-2.5 bg-gradient-gold/10 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" /> Mieteingänge ({suggestions.filter(s => s.amount_cents > 0).length})
                </p>
                <Button size="sm" variant="ghost" onClick={rematch} disabled={rematching}>
                  {rematching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  <span className="ml-1.5 text-xs">Neu prüfen</span>
                </Button>
              </div>
              <div className="divide-y divide-border">
                {suggestions.filter(s => s.amount_cents > 0).map(t => {
                  const tenant = tenants.find(x => x.id === t.matched_tenant_id);
                  return (
                    <div key={t.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{t.counterparty_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {date(t.booking_date)}{t.purpose ? ` · ${t.purpose}` : ""}
                          </p>
                        </div>
                        <p className="font-semibold whitespace-nowrap tabular text-success">
                          +{eur(t.amount_cents / 100)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">→</span>
                        <Select
                          value={t.matched_tenant_id ?? ""}
                          onValueChange={(v) => confirmMatch(t.id, v)}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1 min-w-[160px]">
                            <SelectValue placeholder="Mieter wählen…" />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map(te => (
                              <SelectItem key={te.id} value={te.id} className="text-xs">{te.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" disabled={busyTx === t.id || !tenant}
                          onClick={() => confirmMatch(t.id)}
                          className="h-8 bg-gradient-gold text-primary-foreground">
                          <Check className="h-3.5 w-3.5 mr-1" /> Verbuchen
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyTx === t.id} onClick={() => ignoreMatch(t.id)} className="h-8">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Ausgaben-Vorschläge (mit Lern-Memory) */}
          {suggestions.filter(s => s.amount_cents < 0).length > 0 && (
            <Card className="glass overflow-hidden border-warning/30">
              <div className="px-4 py-2.5 bg-warning/10 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" /> Ausgaben ({suggestions.filter(s => s.amount_cents < 0).length})
                </p>
                {rules.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{rules.length} Regel{rules.length === 1 ? "" : "n"} gelernt</span>
                )}
              </div>
              <div className="divide-y divide-border">
                {suggestions.filter(s => s.amount_cents < 0).map(t => {
                  const form = expenseForm[t.id] ?? {};
                  const propId = form.property_id ?? (properties.length === 1 ? properties[0].id : t.matched_property_id) ?? "";
                  const cat = form.category ?? t.category ?? "immediate";
                  return (
                    <div key={t.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{t.counterparty_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {date(t.booking_date)}{t.purpose ? ` · ${t.purpose}` : ""}
                          </p>
                        </div>
                        <p className="font-semibold whitespace-nowrap tabular text-destructive">
                          {eur(t.amount_cents / 100)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {properties.length > 1 && (
                          <Select
                            value={propId}
                            onValueChange={(v) => setExpenseForm(f => ({ ...f, [t.id]: { ...f[t.id], property_id: v } }))}
                          >
                            <SelectTrigger className="h-8 text-xs flex-1 min-w-[140px]">
                              <SelectValue placeholder="Immobilie…" />
                            </SelectTrigger>
                            <SelectContent>
                              {properties.map(p => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Select
                          value={cat}
                          onValueChange={(v) => setExpenseForm(f => ({ ...f, [t.id]: { ...f[t.id], category: v } }))}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1 min-w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate" className="text-xs">Sofort abzugsfähig</SelectItem>
                            <SelectItem value="utilities_passthrough" className="text-xs">Umlagefähig (NK)</SelectItem>
                            <SelectItem value="depreciable" className="text-xs">Abschreibung</SelectItem>
                            <SelectItem value="financing" className="text-xs">Finanzierung</SelectItem>
                            <SelectItem value="other" className="text-xs">Sonstige</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" disabled={busyTx === t.id}
                          onClick={() => bookExpense(t)}
                          className="h-8 bg-gradient-gold text-primary-foreground">
                          <Check className="h-3.5 w-3.5 mr-1" /> Verbuchen & merken
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyTx === t.id} onClick={() => ignoreMatch(t.id)} className="h-8">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2 bg-muted/30 border-t text-[11px] text-muted-foreground">
                💡 Klick „Verbuchen & merken" — beim nächsten Sync wird dieselbe Gegenseite automatisch gebucht.
              </div>
            </Card>
          )}

          {transactions.length > 0 && (
            <Card className="glass overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide">Letzte Transaktionen</p>
              </div>
              <div className="divide-y divide-border">
                {transactions.map(t => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {t.counterparty_name ?? "—"}
                        {(t.match_status === "auto" || t.match_status === "confirmed") && (
                          <span className="text-[10px] bg-success/15 text-success px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                            ✓ verbucht
                          </span>
                        )}
                        {t.match_status === "suggested" && (
                          <span className="text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded font-medium">
                            Vorschlag
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {date(t.booking_date)}{t.purpose ? ` · ${t.purpose}` : ""}
                      </p>
                    </div>
                    <p className={`font-semibold whitespace-nowrap tabular ${t.amount_cents >= 0 ? "text-success" : ""}`}>
                      {t.amount_cents >= 0 ? "+" : ""}{eur(t.amount_cents / 100)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
    </PlanGate>
  );
};

export default Banking;
