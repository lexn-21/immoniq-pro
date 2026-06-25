import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface Props {
  app: any;
  onClose: () => void;
}

const ChatDialog = ({ app, onClose }: Props) => {
  const [me, setMe] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setMe(user?.id ?? null);
      const { data } = await supabase.from("listing_messages")
        .select("*").eq("application_id", app.id).order("created_at");
      setMessages(data ?? []);
    })();
    const ch = supabase.channel(`msgs:${app.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "listing_messages", filter: `application_id=eq.${app.id}` },
        (payload) => setMessages((m) => [...m, payload.new]))
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [app.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !me) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("listing_messages").insert({
      application_id: app.id, sender_user_id: me, body,
    });
    if (error) console.error(error);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chat</DialogTitle>
        </DialogHeader>
        <div className="h-80 overflow-y-auto space-y-2 p-2 bg-muted/30 rounded-lg">
          {messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Noch keine Nachrichten.</p>}
          {messages.map((m) => {
            const mine = m.sender_user_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Nachricht…" />
          <Button onClick={send} aria-label="Nachricht senden" className="bg-gradient-gold text-primary-foreground shadow-gold"><Send className="h-4 w-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;
