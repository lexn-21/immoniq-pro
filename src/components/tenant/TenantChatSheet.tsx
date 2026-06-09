import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Check, CheckCheck, AlertCircle, Sparkle, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { waTemplates } from "@/lib/whatsapp";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenant: { id: string; full_name: string; phone?: string | null };
  context?: { month?: string; amount?: string; year?: string };
}

type Msg = {
  id: string;
  direction: "out" | "in";
  channel: string;
  body: string;
  status: string;
  sent_at: string;
  read_at?: string | null;
};

const QUICK = (name: string, ctx: Props["context"]) => [
  { id: "reminder", label: "Miet-Erinnerung", build: () => waTemplates.rentReminder(name, ctx?.amount ?? "[Betrag]", ctx?.month ?? "diesen Monat") },
  { id: "dunning", label: "Mahnung", build: () => waTemplates.dunning1(name, ctx?.amount ?? "[Betrag]", ctx?.month ?? "diesen Monat") },
  { id: "meter", label: "Zählerstände", build: () => waTemplates.meterReading(name) },
  { id: "termin", label: "Termin", build: () => waTemplates.appointment(name, "[Datum/Zeit]", "[Thema]") },
  { id: "nka", label: "NKA bereit", build: () => waTemplates.nkaSent(name, ctx?.year ?? String(new Date().getFullYear() - 1)) },
];

export default function TenantChatSheet({ open, onOpenChange, tenant, context }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) { load(); loadPortal(); } /* eslint-disable-next-line */ }, [open, tenant.id]);

  // realtime — listen for new tenant -> landlord messages
  useEffect(() => {
    if (!open) return;
    const ch = supabase.channel(`tm:${tenant.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tenant_messages", filter: `tenant_id=eq.${tenant.id}` },
        (p) => setMessages(m => m.some(x => x.id === (p.new as any).id) ? m : [...m, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, tenant.id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenant_messages")
      .select("id, direction, channel, body, status, sent_at, read_at")
      .eq("tenant_id", tenant.id)
      .order("sent_at", { ascending: true })
      .limit(500);
    setMessages((data as Msg[] | null) ?? []);
    setLoading(false);
  };

  const loadPortal = async () => {
    const { data } = await supabase.from("tenant_portal_links")
      .select("token").eq("tenant_id", tenant.id).eq("revoked", false)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data?.token) setPortalUrl(`${window.location.origin}/mieter/${data.token}`);
    else setPortalUrl(null);
  };

  const createPortal = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: t } = await supabase.from("tenants").select("unit_id").eq("id", tenant.id).single();
    if (!t?.unit_id) { toast.error("Mieter hat keine Wohnung zugeordnet"); return; }
    const { data, error } = await supabase.from("tenant_portal_links")
      .insert({ user_id: auth.user.id, tenant_id: tenant.id, unit_id: t.unit_id })
      .select("token").single();
    if (error) return toastError(error);
    const url = `${window.location.origin}/mieter/${data.token}`;
    setPortalUrl(url);
    navigator.clipboard?.writeText(url).catch(() => {});
    toast.success("Portal-Link erstellt und kopiert");
  };

  const copyPortal = () => {
    if (!portalUrl) return;
    navigator.clipboard?.writeText(portalUrl);
    toast.success("Link kopiert — an Mieter senden");
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data, error } = await supabase.from("tenant_messages").insert({
      user_id: auth.user.id,
      tenant_id: tenant.id,
      direction: "out",
      channel: "portal",
      body,
      status: "sent",
    }).select("id, direction, channel, body, status, sent_at, read_at").single();
    if (error) return toastError(error);
    setMessages(m => [...m, data as Msg]);
    setText("");
  };

  const quick = QUICK(tenant.full_name.split(" ")[0] || tenant.full_name, context);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b bg-gradient-to-b from-primary/10 to-transparent">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{tenant.full_name}</p>
              <p className="text-[11px] font-normal text-muted-foreground">ImmonIQ-Chat · Mieter-Portal</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Portal Hint */}
        <div className="px-3 py-2 border-b bg-muted/30 text-[11px] flex items-center gap-2">
          {portalUrl ? (
            <>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0">Portal aktiv</Badge>
              <span className="truncate text-muted-foreground flex-1">{portalUrl}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={copyPortal}><Copy className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => window.open(portalUrl, "_blank")}><ExternalLink className="h-3 w-3" /></Button>
            </>
          ) : (
            <>
              <span className="text-muted-foreground flex-1">Mieter braucht den Portal-Link zum Chatten.</span>
              <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={createPortal}>Link erstellen</Button>
            </>
          )}
        </div>

        {/* Verlauf */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
          style={{
            backgroundImage: "radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.3) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          {loading ? (
            <p className="text-xs text-center text-muted-foreground py-8">Lade Verlauf…</p>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="inline-flex h-12 w-12 rounded-full bg-muted/40 items-center justify-center">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Noch keine Nachrichten</p>
              <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
                Schreib die erste Nachricht — der Mieter sieht sie in seinem Portal.
              </p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.direction === "out"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-snug">{m.body}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${m.direction === "out" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    <span>{new Date(m.sent_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                    {m.direction === "out" && (
                      m.status === "failed" ? <AlertCircle className="h-3 w-3" /> :
                      m.read_at || m.status === "read" ? <CheckCheck className="h-3 w-3" /> :
                      m.status === "delivered" ? <CheckCheck className="h-3 w-3 opacity-60" /> :
                      <Check className="h-3 w-3 opacity-60" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vorlagen */}
        <div className="px-3 py-2 border-t bg-muted/20">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {quick.map(q => (
              <Button
                key={q.id}
                size="sm"
                variant="secondary"
                className="shrink-0 text-xs h-7 rounded-full"
                onClick={() => setText(q.build())}
              >
                <Sparkle className="h-3 w-3 mr-1" /> {q.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t p-3 bg-background">
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
              }}
              placeholder="Nachricht an Mieter…"
              rows={2}
              className="resize-none min-h-[44px] max-h-32"
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!text.trim()}
              className="shrink-0 h-11 w-11 rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Cmd/Ctrl + Enter zum Senden · Mieter chattet direkt im Portal-Link.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
