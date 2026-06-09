import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Check, CheckCheck, AlertCircle, Sparkle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { whatsappLink, waTemplates } from "@/lib/whatsapp";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenant: { id: string; full_name: string; phone?: string | null };
  /** Optional context fürs Default-Template */
  context?: { month?: string; amount?: string; year?: string };
}

type Msg = {
  id: string;
  direction: "out" | "in";
  channel: string;
  body: string;
  status: string;
  sent_at: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, tenant.id]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenant_messages")
      .select("id, direction, channel, body, status, sent_at")
      .eq("tenant_id", tenant.id)
      .order("sent_at", { ascending: true })
      .limit(200);
    setMessages((data as Msg[] | null) ?? []);
    setLoading(false);
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const url = whatsappLink(tenant.phone, body);
    if (!url) {
      toast.error("Keine gültige Telefonnummer beim Mieter hinterlegt.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data, error } = await supabase.from("tenant_messages").insert({
      user_id: auth.user.id,
      tenant_id: tenant.id,
      direction: "out",
      channel: "whatsapp",
      body,
      status: "sent",
    }).select("id, direction, channel, body, status, sent_at").single();
    if (error) return toastError(error);
    setMessages(m => [...m, data as Msg]);
    setText("");
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp geöffnet — Nachricht ist vorausgefüllt.");
  };

  const quick = QUICK(tenant.full_name.split(" ")[0] || tenant.full_name, context);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b bg-gradient-to-b from-emerald-600/10 to-transparent">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-emerald-600/15 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{tenant.full_name}</p>
              <p className="text-[11px] font-normal text-muted-foreground">
                {tenant.phone ? `WhatsApp · ${tenant.phone}` : "Keine Telefonnummer hinterlegt"}
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Verlauf */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.3) 1px, transparent 1px)",
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
                Wähle eine Vorlage oder schreib frei. Beim Senden öffnet sich WhatsApp mit dem Text — du musst nur noch den Senden-Pfeil drücken.
              </p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.direction === "out"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-card border rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-snug">{m.body}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${m.direction === "out" ? "text-emerald-50/80" : "text-muted-foreground"}`}>
                    <span>{new Date(m.sent_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                    {m.direction === "out" && (
                      m.status === "failed" ? <AlertCircle className="h-3 w-3" /> :
                      m.status === "read" ? <CheckCheck className="h-3 w-3" /> :
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
              placeholder={tenant.phone ? "Nachricht schreiben…" : "Erst Telefonnummer beim Mieter hinterlegen"}
              rows={2}
              disabled={!tenant.phone}
              className="resize-none min-h-[44px] max-h-32"
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!text.trim() || !tenant.phone}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-11 w-11 rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4">Beta</Badge>
            Sendet via WhatsApp. Automatisches 2-Wege-Chat folgt mit WhatsApp Business API.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
