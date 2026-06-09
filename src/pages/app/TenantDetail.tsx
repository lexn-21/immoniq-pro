import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Mail, Phone, Building2, CalendarDays, Wallet, FileText, Upload, MessageCircle,
  Download, Trash2, StickyNote, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Link2,
  Archive, ArchiveRestore,
} from "lucide-react";
import { eur, date } from "@/lib/format";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { CardGridSkeleton } from "@/components/ListSkeleton";
import EmptyState from "@/components/EmptyState";
import { waHref, mailHref } from "@/lib/contact";
import { WhatsappButton } from "@/components/WhatsappButton";
import TenantTicketsPanel from "@/components/tickets/TenantTicketsPanel";
import TenantChatSheet from "@/components/tenant/TenantChatSheet";

const DOC_KIND_LABEL: Record<string, string> = {
  contract: "Mietvertrag",
  id: "Personalausweis",
  schufa: "SCHUFA",
  income: "Einkommensnachweis",
  handover: "Übergabeprotokoll",
  other: "Sonstiges",
};

export default function TenantDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tenant, setTenant] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    document.title = "Mieter · ImmonIQ";
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    setLoading(true);
    const [t, p, d, n] = await Promise.all([
      supabase.from("tenants").select("*, properties(*)").eq("id", id).maybeSingle(),
      Promise.resolve(null),
      supabase.from("tenant_documents").select("*").eq("tenant_id", id).order("created_at", { ascending: false }),
      supabase.from("tenant_notes").select("*").eq("tenant_id", id).order("created_at", { ascending: false }),
    ]);
    if (t.data) {
      setTenant(t.data);
      setProperty(t.data.properties);
      const pay = await supabase.from("payments").select("*").eq("tenant_id", id).order("paid_on", { ascending: false });
      setPayments(pay.data ?? []);
    }
    setDocs(d.data ?? []);
    setNotes(n.data ?? []);
    setLoading(false);
  };

  // ── Auswertungen ────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!tenant) return null;
    const now = new Date();
    const ytd = payments.filter(p => new Date(p.paid_on).getFullYear() === now.getFullYear());
    const totalYtd = ytd.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalAll = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // Pünktlichkeitsscore: Zahlungen mit "month" YYYY-MM vs paid_on Datum
    let onTime = 0, late = 0, totalDays = 0, considered = 0;
    payments.forEach(p => {
      if (!p.month) return;
      const [yy, mm] = String(p.month).split("-").map(Number);
      if (!yy || !mm) return;
      const due = new Date(yy, mm - 1, 3); // "3. Werktag" Approximation
      const paidOn = new Date(p.paid_on);
      const diffDays = Math.floor((paidOn.getTime() - due.getTime()) / 86400000);
      considered++;
      totalDays += Math.max(0, diffDays);
      if (diffDays <= 5) onTime++; else late++;
    });
    const avgDelay = considered ? totalDays / considered : 0;
    const score = considered === 0 ? null : Math.max(0, Math.min(100, Math.round(100 - avgDelay * 4 - late * 3)));

    // Vertragslaufzeit
    let monthsLeft: number | null = null;
    if (tenant.lease_end) {
      monthsLeft = Math.max(0, Math.round((new Date(tenant.lease_end).getTime() - now.getTime()) / (86400000 * 30)));
    }
    const monthsActive = tenant.lease_start
      ? Math.max(0, Math.round((now.getTime() - new Date(tenant.lease_start).getTime()) / (86400000 * 30)))
      : 0;

    return { totalYtd, totalAll, onTime, late, considered, avgDelay, score, monthsLeft, monthsActive };
  }, [tenant, payments]);

  if (loading) return <CardGridSkeleton count={3} />;
  if (!tenant) {
    return (
      <EmptyState
        icon={Building2}
        title="Mieter nicht gefunden"
        description="Dieser Mieter existiert nicht oder wurde gelöscht."
        action={{ label: "Zurück zur Übersicht", to: "/app/tenants", icon: ArrowLeft }}
      />
    );
  }

  const scoreTone = insights?.score == null ? "muted" : insights.score >= 85 ? "success" : insights.score >= 60 ? "warning" : "destructive";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav("/app/tenants")} className="-ml-2"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              {tenant.full_name}
              {tenant.archived_at && <Badge variant="secondary" className="text-[10px]">Archiviert</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Building2 className="h-3.5 w-3.5" /> {property?.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tenant.phone && (
            <Button
              size="sm"
              onClick={() => setChatOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Chat
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={async () => {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth.user || !tenant.unit_id) return;
            const existing = await supabase.from("tenant_portal_links")
              .select("token").eq("tenant_id", tenant.id).eq("revoked", false).maybeSingle();
            let token = existing.data?.token;
            if (!token) {
              const ins = await supabase.from("tenant_portal_links").insert({
                user_id: auth.user.id, tenant_id: tenant.id, unit_id: tenant.unit_id,
              }).select("token").single();
              if (ins.error) { toast.error(ins.error.message); return; }
              token = ins.data.token;
            }
            const url = `${window.location.origin}/mieter/${token}`;
            await navigator.clipboard.writeText(url);
            toast.success("Mieter-Portal-Link kopiert", { description: url, duration: 5000 });
            if (tenant.phone) {
              const msg = `Hallo ${tenant.full_name}, hier ist dein persönlicher Mieter-Bereich für ${property?.name ?? "deine Wohnung"} — Zählerstände, Zahlungshistorie & Schadenmeldungen jederzeit online: ${url}`;
              const { whatsappLink } = await import("@/lib/whatsapp");
              const waUrl = whatsappLink(tenant.phone, msg);
              if (waUrl) {
                setTimeout(() => {
                  if (confirm("Link per WhatsApp an Mieter senden?")) {
                    window.open(waUrl, "_blank", "noopener,noreferrer");
                  }
                }, 300);
              }
            }
          }}>
            <Link2 className="h-3.5 w-3.5 mr-1.5" /> Portal-Link
          </Button>

          {tenant.archived_at ? (
            <Button variant="outline" size="sm" onClick={async () => {
              const { error } = await supabase.from("tenants").update({ archived_at: null }).eq("id", tenant.id);
              if (error) return toastError(error);
              toast.success("Mieter reaktiviert");
              load();
            }}>
              <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" /> Reaktivieren
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={async () => {
              if (!confirm(`"${tenant.full_name}" als ausgezogen markieren und archivieren?\n\nDer Mieter bleibt mit Zahlungshistorie & Dokumenten gespeichert, wird aber aus der aktiven Liste ausgeblendet.`)) return;
              const today = new Date().toISOString().slice(0,10);
              const patch: any = { archived_at: new Date().toISOString() };
              if (!tenant.lease_end) patch.lease_end = today;
              const { error } = await supabase.from("tenants").update(patch).eq("id", tenant.id);
              if (error) return toastError(error);
              // Portal-Link automatisch widerrufen
              await supabase.from("tenant_portal_links").update({ revoked: true }).eq("tenant_id", tenant.id).eq("revoked", false);
              toast.success("Mieter archiviert");
              nav("/app/tenants");
            }}>
              <Archive className="h-3.5 w-3.5 mr-1.5" /> Ausgezogen
            </Button>
          )}

          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={async () => {
            if (!confirm(`"${tenant.full_name}" UNWIDERRUFLICH löschen?\n\n⚠️ Damit gehen auch Notizen, Dokumente und Verknüpfungen verloren. Zahlungshistorie bleibt anonym erhalten.\n\nTipp: Bei Auszug lieber „Ausgezogen" wählen — dann bleibt alles dokumentiert.`)) return;
            // Dokumente aus Storage entfernen
            const { data: ds } = await supabase.from("tenant_documents").select("path").eq("tenant_id", tenant.id);
            if (ds && ds.length) {
              await supabase.storage.from("documents").remove(ds.map((x: any) => x.path).filter(Boolean));
            }
            const { error } = await supabase.from("tenants").delete().eq("id", tenant.id);
            if (error) return toastError(error);
            toast.success("Mieter gelöscht");
            nav("/app/tenants");
          }}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Löschen
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 glass">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Zahlungs-Score</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <p className={`text-2xl font-bold ${
              scoreTone === "success" ? "text-success" :
              scoreTone === "warning" ? "text-warning" :
              scoreTone === "destructive" ? "text-destructive" : ""
            }`}>{insights?.score ?? "—"}</p>
            {insights?.score != null && <span className="text-xs text-muted-foreground">/ 100</span>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {insights?.considered ? `${insights.onTime} pünktlich · ${insights.late} verspätet` : "Noch keine Daten"}
          </p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gezahlt YTD</p>
          <p className="text-2xl font-bold mt-1 tabular">{eur(insights?.totalYtd || 0)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Gesamt: {eur(insights?.totalAll || 0)}</p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Kaution</p>
          <p className="text-2xl font-bold mt-1 tabular">{eur(tenant.deposit || 0)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{tenant.deposit ? "Hinterlegt" : "Keine erfasst"}</p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vertragsdauer</p>
          <p className="text-2xl font-bold mt-1 tabular">
            {insights?.monthsActive ?? 0} <span className="text-sm font-normal text-muted-foreground">Mon.</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {insights?.monthsLeft != null ? `noch ${insights.monthsLeft} Mon.` : "unbefristet"}
          </p>
        </Card>
      </div>

      {/* Avg-Delay Hinweis */}
      {insights?.avgDelay != null && insights.avgDelay > 5 && (
        <Card className="p-4 border-warning/40 bg-warning/10 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Ø Verzug: {insights.avgDelay.toFixed(1)} Tage</p>
            <p className="text-muted-foreground mt-0.5">Erwäge eine freundliche Zahlungserinnerung als Standard-Workflow.</p>
          </div>
        </Card>
      )}

      <Tabs defaultValue="contract" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="contract">Vertrag</TabsTrigger>
          <TabsTrigger value="payments">Zahlungen</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="docs">Dokumente</TabsTrigger>
          <TabsTrigger value="notes">Notizen</TabsTrigger>
        </TabsList>

        {/* Vertrag */}
        <TabsContent value="contract">
          <ContractPanel tenant={tenant} property={property} reload={load} />
        </TabsContent>

        {/* Zahlungen */}
        <TabsContent value="payments">
          <Card className="p-5 glass">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Wallet className="h-4 w-4" /> Zahlungshistorie</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Zahlungen erfasst.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {payments.slice(0, 24).map(p => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <div>
                        <p className="font-medium">{eur(p.amount)} {p.month && <span className="text-xs text-muted-foreground">· {p.month}</span>}</p>
                        <p className="text-xs text-muted-foreground">{date(p.paid_on)} · {p.kind === "rent_cold" ? "Kaltmiete" : p.kind === "rent_warm" ? "Warmmiete" : p.kind || "Zahlung"}</p>
                      </div>
                    </div>
                    {p.note && <span className="text-xs text-muted-foreground truncate max-w-[40%]">{p.note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        {/* Tickets */}
        <TabsContent value="tickets">
          <TenantTicketsPanel tenantId={tenant.id} />
        </TabsContent>

        {/* Dokumente */}
        <TabsContent value="docs">
          <DocsPanel tenantId={tenant.id} docs={docs} reload={load} />
        </TabsContent>

        {/* Notizen */}
        <TabsContent value="notes">
          <NotesPanel tenantId={tenant.id} notes={notes} reload={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) {
  return (
    <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-muted/30">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-medium flex items-center gap-1.5">{Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}{value}</span>
    </div>
  );
}

function DocsPanel({ tenantId, docs, reload }: { tenantId: string; docs: any[]; reload: () => void }) {
  const [kind, setKind] = useState<string>("contract");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) return toast.error("Datei zu groß (max. 20 MB)");
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const path = `${auth.user.id}/tenants/${tenantId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const up = await supabase.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const ins = await supabase.from("tenant_documents").insert({
        user_id: auth.user.id, tenant_id: tenantId, kind: kind as any,
        name: file.name, path, size_bytes: file.size, mime: file.type,
      });
      if (ins.error) throw ins.error;
      toast.success("Dokument hochgeladen");
      reload();
    } catch (e: any) { toastError(e); } finally { setBusy(false); }
  };

  const download = async (d: any) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.path, 60);
    if (error || !data?.signedUrl) return toast.error("Download fehlgeschlagen");
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (d: any) => {
    if (!confirm(`"${d.name}" löschen?`)) return;
    await supabase.storage.from("documents").remove([d.path]);
    const { error } = await supabase.from("tenant_documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Gelöscht");
    reload();
  };

  return (
    <Card className="p-5 glass space-y-4">
      <div className="flex items-start gap-3 flex-wrap">
        <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-[200px]">
          <h3 className="font-semibold">Dokumenten-Akte</h3>
          <p className="text-xs text-muted-foreground">Verschlüsselt gespeichert. Nur du hast Zugriff.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="sm:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(DOC_KIND_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Label htmlFor="doc-upload" className="flex-1">
          <div className={`flex items-center justify-center gap-2 h-10 rounded-md border-2 border-dashed cursor-pointer hover:bg-muted/30 transition ${busy ? "opacity-50" : ""}`}>
            <Upload className="h-4 w-4" />
            <span className="text-sm">{busy ? "Lade hoch…" : "Datei wählen oder hier ablegen"}</span>
          </div>
          <input id="doc-upload" type="file" className="hidden" disabled={busy} onChange={(e) => {
            const f = e.target.files?.[0]; if (f) upload(f); e.target.value = "";
          }} />
        </Label>
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Noch keine Dokumente hinterlegt.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {docs.map(d => (
            <li key={d.id} className="flex items-center justify-between py-2.5 gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    <Badge variant="secondary" className="mr-1.5 text-[10px] py-0">{DOC_KIND_LABEL[d.kind] || d.kind}</Badge>
                    {date(d.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => download(d)}><Download className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(d)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NotesPanel({ tenantId, notes, reload }: { tenantId: string; notes: any[]; reload: () => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from("tenant_notes").insert({ user_id: auth.user.id, tenant_id: tenantId, body: text });
    setBusy(false);
    if (error) return toastError(error);
    setBody(""); reload();
  };

  return (
    <Card className="p-5 glass space-y-4">
      <div className="flex items-start gap-3">
        <StickyNote className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold">Notizen & Vorgänge</h3>
          <p className="text-xs text-muted-foreground">Telefonate, Vereinbarungen, Beobachtungen — chronologisch.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Textarea placeholder="Was ist passiert? (z.B. Telefonat zu Heizung am …)" value={body} onChange={e => setBody(e.target.value)} rows={3} />
        <Button onClick={submit} disabled={busy || !body.trim()} className="bg-gradient-gold text-primary-foreground shadow-gold">
          Notiz hinzufügen
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Noch keine Notizen.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map(n => (
            <li key={n.id} className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Clock className="h-3 w-3" /> {date(n.created_at)}</p>
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ContractPanel({ tenant, property, reload }: { tenant: any; property: any; reload: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    full_name: tenant.full_name ?? "",
    email: tenant.email ?? "",
    phone: tenant.phone ?? "",
    lease_start: tenant.lease_start ?? "",
    lease_end: tenant.lease_end ?? "",
    deposit: tenant.deposit ?? "",
    move_in: tenant.move_in ?? "",
    move_out: tenant.move_out ?? "",
    iban: tenant.iban ?? "",
  });

  const save = async () => {
    if (!f.full_name.trim()) return toast.error("Name fehlt");
    setBusy(true);
    const payload: any = {
      full_name: f.full_name.trim(),
      email: f.email || null,
      phone: f.phone || null,
      lease_start: f.lease_start || null,
      lease_end: f.lease_end || null,
      deposit: f.deposit === "" ? null : Number(f.deposit),
      move_in: f.move_in || null,
      move_out: f.move_out || null,
      iban: f.iban.replace(/\s/g, "").toUpperCase() || null,
    };
    const { error } = await supabase.from("tenants").update(payload).eq("id", tenant.id);
    setBusy(false);
    if (error) return toastError(error);
    toast.success("Gespeichert.");
    setEditing(false);
    reload();
  };

  if (!editing) {
    return (
      <Card className="p-5 glass space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Vertragsdetails</h3>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Bearbeiten</Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Row label="Mietbeginn" value={tenant.lease_start ? date(tenant.lease_start) : "—"} />
          <Row label="Mietende" value={tenant.lease_end ? date(tenant.lease_end) : "unbefristet"} />
          <Row label="Einzug" value={tenant.move_in ? date(tenant.move_in) : "—"} />
          <Row label="Auszug" value={tenant.move_out ? date(tenant.move_out) : "—"} />
          <Row label="E-Mail" value={tenant.email || "—"} icon={Mail} />
          <Row label="Telefon" value={tenant.phone || "—"} icon={Phone} />
          <Row label="Kaution" value={tenant.deposit ? eur(tenant.deposit) : "—"} />
          <Row label="Kaltmiete (Objekt)" value={eur(property?.cold_rent || 0)} />
          <Row label="IBAN" value={tenant.iban ? <span className="font-mono text-xs">{tenant.iban}</span> : "—"} />
        </div>
        <ContactBar email={tenant.email} phone={tenant.phone} name={tenant.full_name} />
      </Card>
    );
  }

  return (
    <Card className="p-5 glass space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Vertrag bearbeiten</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Label>Voller Name</Label><Input value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></div>
        <div><Label>E-Mail</Label><Input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
        <div><Label>Telefon</Label><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>Mietbeginn</Label><Input type="date" value={f.lease_start} onChange={e => setF({ ...f, lease_start: e.target.value })} /></div>
        <div><Label>Mietende <span className="text-muted-foreground text-[10px]">(leer = unbefristet)</span></Label><Input type="date" value={f.lease_end} onChange={e => setF({ ...f, lease_end: e.target.value })} /></div>
        <div><Label>Einzug</Label><Input type="date" value={f.move_in} onChange={e => setF({ ...f, move_in: e.target.value })} /></div>
        <div><Label>Auszug</Label><Input type="date" value={f.move_out} onChange={e => setF({ ...f, move_out: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Kaution (€)</Label><Input type="number" step="0.01" value={f.deposit} onChange={e => setF({ ...f, deposit: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>IBAN <span className="text-muted-foreground text-[10px]">(für automatische Zuordnung von Banküberweisungen)</span></Label><Input value={f.iban} onChange={e => setF({ ...f, iban: e.target.value })} placeholder="DE..." className="font-mono" /></div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>Abbrechen</Button>
        <Button onClick={save} disabled={busy} className="bg-gradient-gold text-primary-foreground shadow-gold">{busy ? "Speichere…" : "Speichern"}</Button>
      </div>
    </Card>
  );
}

function ContactBar({ email, phone, name }: { email?: string | null; phone?: string | null; name?: string }) {
  const ma = mailHref(email);
  if (!phone && !ma) return null;
  const monthLabel = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  return (
    <div className="flex gap-2 pt-2 border-t border-border/40 flex-wrap">
      {phone && (
        <div className="flex-1 min-w-[140px]">
          <WhatsappButton
            phone={phone}
            tenantName={name ?? ""}
            defaultMessage={`Hallo ${name ?? ""}, `}
            templates={[
              { id: "rentReminder", label: "Miet-Erinnerung", args: [name ?? "", "—", monthLabel] },
              { id: "meterReading", label: "Zählerstände", args: [name ?? ""] },
              { id: "appointment", label: "Termin", args: [name ?? "", "tt.mm.", "Begehung"] },
            ]}
            className="w-full"
          />
        </div>
      )}
      {ma && (
        <a href={ma} className="flex-1 min-w-[140px]">
          <Button variant="outline" size="sm" className="w-full"><Mail className="h-3.5 w-3.5 mr-1.5" /> E-Mail</Button>
        </a>
      )}
    </div>
  );
}
