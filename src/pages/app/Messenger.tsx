import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Search, ArrowLeft } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { toastError } from "@/lib/errors";

interface Thread {
  application_id: string;
  listing_id: string;
  listing_title: string;
  other_user_id: string;
  other_name: string;
  role: "owner" | "seeker";
  last_body: string | null;
  last_at: string | null;
  unread: number;
}

interface Msg {
  id: string;
  application_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export default function Messenger() {
  const [me, setMe] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancel) return setLoading(false);
      setMe(user.id);

      // Alle Apps, wo ich beteiligt bin
      const { data: apps, error } = await supabase
        .from("applications")
        .select("id, listing_id, owner_user_id, seeker_user_id, snapshot_profile, created_at")
        .or(`owner_user_id.eq.${user.id},seeker_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) { toastError(error); setLoading(false); return; }

      const appIds = (apps ?? []).map((a: any) => a.id);
      const listingIds = Array.from(new Set((apps ?? []).map((a: any) => a.listing_id).filter(Boolean)));
      const [{ data: lastMsgs }, { data: listingsData }] = await Promise.all([
        appIds.length
          ? supabase
              .from("listing_messages")
              .select("application_id, body, created_at, sender_user_id, read_at")
              .in("application_id", appIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        listingIds.length
          ? supabase.from("listings").select("id, title").in("id", listingIds as string[])
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const titleMap = new Map<string, string>((listingsData ?? []).map((l: any) => [l.id, l.title]));

      const map = new Map<string, { body: string; at: string; unread: number }>();
      (lastMsgs ?? []).forEach((m: any) => {
        const cur = map.get(m.application_id);
        const unreadBump = m.sender_user_id !== user.id && !m.read_at ? 1 : 0;
        if (!cur) {
          map.set(m.application_id, { body: m.body, at: m.created_at, unread: unreadBump });
        } else {
          cur.unread += unreadBump;
        }
      });

      const built: Thread[] = (apps ?? []).map((a: any) => {
        const role = a.owner_user_id === user.id ? "owner" : "seeker";
        const otherId = role === "owner" ? a.seeker_user_id : a.owner_user_id;
        const snap = a.snapshot_profile || {};
        const otherName = role === "owner"
          ? (snap.full_name || snap.name || "Bewerber:in")
          : "Eigentümer:in";
        const last = map.get(a.id);
        return {
          application_id: a.id,
          listing_id: a.listing_id,
          listing_title: titleMap.get(a.listing_id) || "Inserat",
          other_user_id: otherId,
          other_name: otherName,
          role,
          last_body: last?.body ?? null,
          last_at: last?.at ?? a.created_at,
          unread: last?.unread ?? 0,
        };
      });
      built.sort((a, b) => (b.last_at || "").localeCompare(a.last_at || ""));
      if (!cancel) { setThreads(built); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("listing_messages")
        .select("*")
        .eq("application_id", active.application_id)
        .order("created_at");
      if (cancel) return;
      setMsgs((data as Msg[]) ?? []);
      // mark unread incoming as read
      if (me) {
        await supabase
          .from("listing_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("application_id", active.application_id)
          .neq("sender_user_id", me)
          .is("read_at", null);
        setThreads((t) => t.map((x) => x.application_id === active.application_id ? { ...x, unread: 0 } : x));
      }
    })();
    const ch = supabase.channel(`msgr:${active.application_id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "listing_messages", filter: `application_id=eq.${active.application_id}` },
        (p) => setMsgs((m) => [...m, p.new as Msg]))
      .subscribe();
    return () => { cancel = true; supabase.removeChannel(ch); };
  }, [active, me]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !me || !active) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("listing_messages").insert({
      application_id: active.application_id,
      sender_user_id: me,
      body,
    });
    if (error) toastError(error);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return threads;
    return threads.filter((t) =>
      t.other_name.toLowerCase().includes(s) ||
      t.listing_title.toLowerCase().includes(s) ||
      (t.last_body || "").toLowerCase().includes(s)
    );
  }, [threads, q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-7 w-7" /> Nachrichten
        </h1>
        <p className="text-muted-foreground mt-1">
          Alle Chats mit Bewerbern, Mietern und Eigentümern an einem Ort — in Echtzeit.
        </p>
      </div>

      <Card className="glass overflow-hidden">
        <div className="grid md:grid-cols-[320px_1fr] min-h-[520px]">
          {/* Thread list */}
          <div className={`border-r border-border/60 ${active ? "hidden md:block" : ""}`}>
            <div className="p-3 border-b border-border/60">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen…" className="pl-9 h-9" />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[500px]">
              {loading ? (
                <div className="p-3"><ListSkeleton rows={4} /></div>
              ) : filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState icon={MessageSquare} title="Noch keine Chats" description="Sobald jemand sich auf ein Inserat bewirbt oder du dich bewirbst, erscheint hier der Chat." />
                </div>
              ) : filtered.map((t) => (
                <button
                  key={t.application_id}
                  onClick={() => setActive(t)}
                  className={`w-full text-left px-4 py-3 border-b border-border/40 hover:bg-muted/40 transition ${active?.application_id === t.application_id ? "bg-muted/60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{t.other_name}</span>
                    {t.unread > 0 && <Badge className="h-5 px-1.5 text-[10px]">{t.unread}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{t.listing_title}</div>
                  {t.last_body && <div className="text-xs text-muted-foreground/80 truncate mt-0.5">{t.last_body}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Chat panel */}
          <div className={`flex flex-col ${active ? "" : "hidden md:flex"}`}>
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">
                Wähle links einen Chat aus.
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setActive(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{active.other_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{active.listing_title} · {active.role === "owner" ? "Bewerbung" : "Anfrage"}</div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
                  {msgs.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Noch keine Nachrichten — schreib die erste.</p>}
                  {msgs.map((m) => {
                    const mine = m.sender_user_id === me;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                          {m.body}
                          <div className={`text-[10px] mt-0.5 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <div className="p-3 border-t border-border/60 flex gap-2">
                  <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Nachricht schreiben…" />
                  <Button onClick={send} disabled={!text.trim()} className="bg-gradient-gold text-primary-foreground shadow-gold">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
