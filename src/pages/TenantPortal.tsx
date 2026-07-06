import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { eur, date } from "@/lib/format";
import { Home, AlertTriangle, Plus, ShieldCheck, Loader2, FileText, Download, Camera, Mic, Square, Sparkles, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { LegalFooter } from "@/components/LegalFooter";

type Resolved = {
  tenant: { full_name: string; email: string | null; phone: string | null };
  unit: { label: string; rent_cold: number; utilities: number; living_space: number };
  property: { name: string; street: string; zip: string; city: string };
  issues: Array<{ id: string; title: string; description: string; severity: string; status: string; reported_at: string; category: string }>;
};

type NkaItem = {
  id: string; period_id: string; year: number;
  period_start: string; period_end: string;
  vorauszahlung_summe: number; ist_summe: number; saldo: number;
  pdf_path: string | null; sent_at: string | null;
};

const SEV_TONE: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  minor: "bg-info/15 text-info",
  major: "bg-warning/15 text-warning",
  urgent: "bg-destructive/15 text-destructive",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Offen", acknowledged: "Erhalten", in_progress: "In Bearbeitung", resolved: "Gelöst", closed: "Geschlossen"
};

type ChatMsg = {
  id: string; direction: "out" | "in"; channel: string; body: string;
  status: string; sent_at: string; read_at: string | null;
};

const TenantPortal = () => {
  const { token } = useParams();
  const [data, setData] = useState<Resolved | null>(null);
  const [nka, setNka] = useState<NkaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "sanitaer", severity: "minor", title: "", description: "" });
  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatText, setChatText] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

  const analyzeWith = async (payload: { imageBase64?: string; audioBase64?: string; mimeType?: string }) => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-issue-analyze", { body: payload });
      if (error) throw error;
      if (data?.title) setForm(f => ({
        ...f,
        title: data.title ?? f.title,
        description: data.description ?? f.description,
        severity: data.severity ?? f.severity,
        category: data.category ?? f.category,
      }));
      toast.success("KI-Analyse fertig — bitte prüfen & anpassen");
    } catch (e: any) {
      toast.error("KI-Analyse fehlgeschlagen: " + (e?.message ?? "unbekannt"));
    } finally {
      setAnalyzing(false);
    }
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Bild zu groß (max 8 MB)");
    const b64 = await blobToBase64(file);
    await analyzeWith({ imageBase64: b64, mimeType: file.type });
    e.target.value = "";
  };

  const toggleRecord = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 500) return toast.error("Aufnahme zu kurz");
        const b64 = await blobToBase64(blob);
        await analyzeWith({ audioBase64: b64, mimeType: "audio/webm" });
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      toast.error("Mikrofon-Zugriff verweigert");
    }
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const [{ data: r }, { data: n }] = await Promise.all([
      supabase.rpc("tenant_portal_resolve", { _token: token }),
      supabase.rpc("tenant_portal_get_nka", { _token: token }),
    ]);
    setData(r as unknown as Resolved);
    setNka(((n as unknown) as NkaItem[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); loadChat(); /* eslint-disable-next-line */ }, [token]);

  useEffect(() => {
    if (!token || !data) return;
    const ch = supabase.channel(`portal-chat:${token}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tenant_messages" },
        () => loadChat())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [token, data]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const loadChat = async () => {
    if (!token) return;
    const { data: msgs } = await supabase.rpc("tenant_portal_list_messages", { _token: token });
    setChat(((msgs as unknown) as ChatMsg[]) ?? []);
    await supabase.rpc("tenant_portal_mark_read", { _token: token });
  };

  const sendChat = async () => {
    const body = chatText.trim();
    if (!body || !token) return;
    setSending(true);
    const { error } = await supabase.rpc("tenant_portal_send_message", { _token: token, _body: body });
    setSending(false);
    if (error) return toast.error("Senden fehlgeschlagen");
    setChatText("");
    loadChat();
  };

  const downloadPdf = async (item: NkaItem) => {
    if (!item.pdf_path) return toast.error("Noch keine PDF verfügbar");
    const { data: signed, error } = await supabase.storage
      .from("documents").createSignedUrl(item.pdf_path, 60);
    if (error || !signed?.signedUrl) return toast.error("Download fehlgeschlagen");
    window.open(signed.signedUrl, "_blank");
  };

  const submit = async () => {
    const { error } = await supabase.rpc("tenant_portal_report_issue", {
      _token: token!, _category: form.category, _severity: form.severity as any,
      _title: form.title, _description: form.description,
    });
    if (error) { toast.error("Fehler: " + error.message); return; }
    toast.success("Schaden gemeldet — Ihr Vermieter wurde informiert");
    setOpen(false);
    setForm({ category: "sanitaer", severity: "minor", title: "", description: "" });
    load();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-warning" />
        <h2 className="font-display text-xl font-semibold mb-2">Link ungültig</h2>
        <p className="text-sm text-muted-foreground">Dieser Mieter-Link ist abgelaufen oder wurde widerrufen.</p>
      </Card>
    </div>
  );

  const total = Number(data.unit.rent_cold ?? 0) + Number(data.unit.utilities ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="container max-w-4xl py-4 flex items-center justify-between">
          <Logo />
          <Badge variant="secondary" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />Mieter-Portal</Badge>
        </div>
      </header>

      <main className="container max-w-4xl py-8 space-y-6">
        {/* WOW: Account-CTA */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/30">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Hol dir deinen kostenlosen Mieter-Account</p>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Chat mit Vermieter · Dokumenten-Tresor · Schadensmeldungen mit KI · Nebenkosten-Einsicht · Mietrechte verständlich erklärt — alles gratis und für immer.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href={`/auth?claim=${encodeURIComponent(token!)}`}>
                    <Button className="gap-2">Account erstellen <Sparkles className="h-3.5 w-3.5" /></Button>
                  </a>
                  <a href={`/auth?claim=${encodeURIComponent(token!)}`}>
                    <Button variant="outline">Schon ein Konto? Anmelden</Button>
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-muted-foreground">Hallo</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">{data.tenant.full_name}</h1>
        </motion.div>



        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{data.property.name} · {data.unit.label}</p>
                <p className="text-sm text-muted-foreground">{data.property.street}, {data.property.zip} {data.property.city}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Kaltmiete</p>
                <p className="font-mono font-semibold mt-1">{eur(data.unit.rent_cold)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nebenkosten</p>
                <p className="font-mono font-semibold mt-1">{eur(data.unit.utilities)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Warmmiete</p>
                <p className="font-mono font-semibold mt-1 text-primary">{eur(total)}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {nka.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Nebenkostenabrechnungen
            </h2>
            <Card className="divide-y">
              {nka.map((n) => (
                <div key={n.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">Abrechnung {n.year}</p>
                    <p className="text-xs text-muted-foreground">
                      {date(n.period_start)} – {date(n.period_end)} · Vorauszahlung {eur(n.vorauszahlung_summe)} · Ist {eur(n.ist_summe)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {n.saldo > 0 ? "Nachzahlung" : n.saldo < 0 ? "Erstattung" : "Saldo"}
                      </p>
                      <p className={`font-mono font-bold ${n.saldo > 0 ? "text-destructive" : n.saldo < 0 ? "text-success" : ""}`}>
                        {eur(Math.abs(n.saldo))}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => downloadPdf(n)} disabled={!n.pdf_path}>
                      <Download className="h-3 w-3 mr-1" /> PDF
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Schadensmeldungen</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Schaden melden</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Neuer Schaden</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Card className="p-3 bg-primary/5 border-primary/20">
                  <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> KI füllt das Formular automatisch
                  </p>
                  <div className="flex gap-2">
                    <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
                    <Button type="button" variant="outline" size="sm" className="flex-1" disabled={analyzing || recording} onClick={() => photoRef.current?.click()}>
                      {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1.5" />}
                      Foto
                    </Button>
                    <Button type="button" variant={recording ? "destructive" : "outline"} size="sm" className="flex-1" disabled={analyzing} onClick={toggleRecord}>
                      {recording ? <Square className="h-3.5 w-3.5 mr-1.5" /> : <Mic className="h-3.5 w-3.5 mr-1.5" />}
                      {recording ? "Stoppen" : "Sprachnotiz"}
                    </Button>
                  </div>
                </Card>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Kategorie</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sanitaer">Sanitär / Wasser</SelectItem>
                        <SelectItem value="elektrik">Elektrik</SelectItem>
                        <SelectItem value="heizung">Heizung</SelectItem>
                        <SelectItem value="fenster">Fenster / Türen</SelectItem>
                        <SelectItem value="schimmel">Schimmel</SelectItem>
                        <SelectItem value="laerm">Lärm / Nachbarn</SelectItem>
                        <SelectItem value="sonstiges">Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dringlichkeit</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({...form, severity: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="minor">Klein</SelectItem>
                        <SelectItem value="major">Groß</SelectItem>
                        <SelectItem value="urgent">Dringend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Titel</Label>
                  <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="z. B. Heizung im Wohnzimmer kalt" />
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Textarea rows={4} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
                </div>
                <Button onClick={submit} disabled={!form.title} className="w-full h-11">Senden</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          {data.issues.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              Keine offenen Meldungen. Alles in Ordnung. ✨
            </div>
          ) : (
            <div className="divide-y">
              {data.issues.map(i => (
                <div key={i.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="font-medium">{i.title}</p>
                    <div className="flex gap-1.5">
                      <Badge className={SEV_TONE[i.severity]}>{i.severity}</Badge>
                      <Badge variant="outline">{STATUS_LABEL[i.status]}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{date(i.reported_at)} · {i.category}</p>
                  {i.description && <p className="text-sm text-muted-foreground mt-2">{i.description}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Chat mit Vermieter */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" /> Chat mit Vermieter
          </h2>
          <Card className="flex flex-col h-[480px] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/10">
              {chat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
                  <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Noch keine Nachrichten</p>
                  <p className="text-xs text-muted-foreground max-w-[280px]">
                    Schreib direkt — keine WhatsApp-App, keine Telefonnummer nötig.
                  </p>
                </div>
              ) : chat.map(m => {
                const mine = m.direction === "in"; // tenant = incoming to landlord
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
                    }`}>
                      <p className="whitespace-pre-wrap leading-snug">{m.body}</p>
                      <div className={`text-[10px] mt-1 text-right ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {new Date(m.sent_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t p-3 flex items-end gap-2 bg-background">
              <Textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendChat(); } }}
                placeholder="Nachricht an Vermieter…"
                rows={2}
                className="resize-none min-h-[44px] max-h-32"
              />
              <Button size="icon" onClick={sendChat} disabled={!chatText.trim() || sending} className="shrink-0 h-11 w-11 rounded-full">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>



        <p className="text-xs text-center text-muted-foreground py-4">
          Sicher · DSGVO · End-to-End verschlüsselt · ImmonIQ
        </p>
      </main>
      <LegalFooter />
      </div>
  );
};

export default TenantPortal;
