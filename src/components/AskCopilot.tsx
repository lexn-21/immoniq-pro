import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Darf ich die Miete nach 2 Jahren erhöhen?",
  "Wie hoch ist die Kappungsgrenze in Berlin?",
  "Welche Belege brauche ich für Anlage V?",
  "Was muss in eine NK-Abrechnung?",
];

export const AskCopilot = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-copilot`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: next }),
      });
      if (res.status === 429) { toast.error("Zu viele Anfragen, bitte kurz warten."); setLoading(false); return; }
      if (res.status === 402) { toast.error("KI-Kontingent aufgebraucht."); setLoading(false); return; }
      if (!res.ok || !res.body) { toast.error("Fehler bei der Anfrage."); setLoading(false); return; }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let assistant = "";
      setMsgs([...next, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMsgs([...next, { role: "assistant", content: assistant }]);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
        className="fixed right-4 sm:!bottom-6 sm:right-6 z-30 h-12 sm:h-13 pl-3 pr-4 rounded-full bg-gradient-gold shadow-gold flex items-center gap-2 text-primary-foreground font-semibold text-sm"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring" }}
        aria-label="ImmonIQ-Assistent öffnen"
      >
        <span className="h-8 w-8 rounded-full bg-black/15 flex items-center justify-center">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline">Frag ImmonIQ</span>
        <span className="sm:hidden">Hilfe</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center sm:justify-end p-0 sm:p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full sm:w-[440px] sm:h-[640px] h-[85vh] bg-card border-t sm:border border-border sm:rounded-2xl shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-gold flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Ask ImmonIQ</p>
                    <p className="text-[10px] text-muted-foreground">Dein KI-Vermieter-Co-Pilot</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Ich beantworte rechtliche & steuerliche Vermieter-Fragen mit Verweis auf BGB/EStG.</p>
                    <div className="space-y-2">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} onClick={() => send(s)}
                          className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition text-sm">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>{m.content || (loading && i === msgs.length - 1 ? "…" : "")}</div>
                  </div>
                ))}
                {loading && msgs[msgs.length - 1]?.role === "user" && (
                  <div className="flex justify-start"><div className="bg-muted px-3 py-2 rounded-2xl"><Loader2 className="h-4 w-4 animate-spin" /></div></div>
                )}
              </div>

              <div className="px-3 pt-2 text-[10px] text-muted-foreground text-center">
                KI-Antworten können Fehler enthalten. Keine Rechts- oder Steuerberatung.
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 border-t border-border flex gap-2">
                <input
                  value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Frage stellen…"
                  className="flex-1 px-3 py-2 rounded-xl bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={loading}
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()} className="bg-gradient-gold text-primary-foreground">
                  <Send className="h-4 w-4" />
                </Button>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
