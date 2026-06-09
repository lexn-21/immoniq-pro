import { useEffect, useRef, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { TenantCtx } from "./TenantLayout";

type Msg = { id: string; direction: "out" | "in"; body: string; sent_at: string; read_at: string | null; status: string };

export default function TenantChat() {
  const ctx = useOutletContext<TenantCtx>();
  if (!ctx.tenant) return <Navigate to="/mein-immoniq/verbinden" replace />;
  return <TenantChatInner ctx={ctx as TenantCtx & { tenant: NonNullable<TenantCtx["tenant"]> }} />;
}

function TenantChatInner({ ctx }: { ctx: TenantCtx & { tenant: NonNullable<TenantCtx["tenant"]> } }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("tenant_messages")
      .select("id, direction, body, sent_at, read_at, status")
      .eq("tenant_id", ctx.tenant.id)
      .order("sent_at", { ascending: true });
    setMsgs((data as Msg[] | null) ?? []);
    // mark landlord messages as read
    await supabase.from("tenant_messages")
      .update({ read_at: new Date().toISOString(), status: "read" })
      .eq("tenant_id", ctx.tenant.id).eq("direction", "out").is("read_at", null);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`tenant-chat:${ctx.tenant.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tenant_messages", filter: `tenant_id=eq.${ctx.tenant.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [ctx.tenant.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("tenant_messages").insert({
      user_id: ctx.tenant.user_id,
      tenant_id: ctx.tenant.id,
      direction: "in",
      channel: "portal",
      body,
      status: "delivered",
    });
    setSending(false);
    if (error) return toast.error("Senden fehlgeschlagen");
    setText("");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat mit Vermieter</h1>
        <p className="text-sm text-muted-foreground">Direkt, dokumentiert, jederzeit nachlesbar.</p>
      </div>
      <Card className="flex flex-col h-[calc(100vh-260px)] min-h-[440px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/10">
          {msgs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
              <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Noch keine Nachrichten</p>
              <p className="text-xs text-muted-foreground max-w-[280px]">Schreib einfach los — dein Vermieter sieht es sofort.</p>
            </div>
          ) : msgs.map(m => {
            const mine = m.direction === "in";
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
          <div ref={endRef} />
        </div>
        <div className="border-t p-3 flex items-end gap-2 bg-background">
          <Textarea value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
            placeholder="Nachricht an Vermieter…" rows={2} className="resize-none min-h-[44px] max-h-32" />
          <Button size="icon" onClick={send} disabled={!text.trim() || sending} className="shrink-0 h-11 w-11 rounded-full">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
