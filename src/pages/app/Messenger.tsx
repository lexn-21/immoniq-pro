import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Send, Search, ArrowLeft, Heart, Inbox as InboxIcon, Archive } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { toastError } from "@/lib/errors";
import { eur } from "@/lib/format";

interface Thread {
  application_id: string;
  listing_id: string;
  listing_title: string;
  other_user_id: string;
  other_name: string;
  role: "owner" | "seeker";
  status: string | null;
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

const STATUS_LABEL: Record<string, string> = {
  sent: "Gesendet", shortlisted: "Favorit", rejected: "Abgelehnt",
  accepted: "Angenommen", withdrawn: "Zurückgezogen",
};

export default function Messenger() {
  const [me, setMe] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "applications" | "tenants" | "saved" | "archive">("all");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = "Postfach · ImmonIQ"; }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancel) return setLoading(false);
      setMe(user.id);

      const [appsRes, savesRes] = await Promise.all([
        supabase
          .from("applications")
          .select("id, listing_id, owner_user_id, seeker_user_id, snapshot_profile, status, created_at")
          .or(`owner_user_id.eq.${user.id},seeker_user_id.eq.${user.id}`)
          .order("created_at", { ascending: false }),
        supabase.from("listing_saves").select("listing_id, listings(*)"),
      ]);
      const apps = appsRes.data ?? [];
      if (appsRes.error) { toastError(appsRes.error); setLoading(false); return; }
      setSaved(savesRes.data ?? []);

      const appIds = apps.map((a: any) => a.id);
      const listingIds = Array.from(new Set(apps.map((a: any) => a.listing_id).filter(Boolean)));
      const [{ data: lastMsgs }, { data: listingsData }] = await Promise.all([
        appIds.length ? supabase.from("listing_messages")
          .select("application_id, body, created_at, sender_user_id, read_at")
          .in("application_id", appIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        listingIds.length ? supabase.from("listings").select("id, title").in("id", listingIds as string[])
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const titleMap = new Map<string, string>((listingsData ?? []).map((l: any) => [l.id, l.title]));
      const map = new Map<string, { body: string; at: string; unread: number }>();
      (lastMsgs ?? []).forEach((m: any) => {
        const cur = map.get(m.application_id);
        const bump = m.sender_user_id !== user.id && !m.read_at ? 1 : 0;
        if (!cur) map.set(m.application_id, { body: m.body, at: m.created_at, unread: bump });
        else cur.unread += bump;
      });

      const built: Thread[] = apps.map((a: any) => {
        const role = a.owner_user_id === user.id ? "owner" : "seeker";
        const otherId = role === "owner" ? a.seeker_user_id : a.owner_user_id;
        const snap = a.snapshot_profile || {};
        const otherName = role === "owner" ? (snap.full_name || snap.name || "Bewerber:in") : "Eigentümer:in";
        const last = map.get(a.id);
        return {
          application_id: a.id,
          listing_id: a.listing_id,
          listing_title: titleMap.get(a.listing_id) || "Inserat",
          other_user_id: otherId,
          other_name: otherName,
          role,
          status: a.status,
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
      const { data } = await supabase.from("listing_messages").select("*")
        .eq("application_id", active.application_id).order("created_at");
      if (cancel) return;
      setMsgs((data as Msg[]) ?? []);
      if (me) {
        await supabase.from("listing_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("application_id", active.application_id)
          .neq("sender_user_id", me).is("read_at", null);
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
      application_id: active.application_id, sender_user_id: me, body,
    });
    if (error) toastError(error);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = threads;
    if (tab === "applications") list = list.filter((t) => t.role === "seeker");
    else if (tab === "tenants") list = list.filter((t) => t.role === "owner");
    else if (tab === "archive") list = list.filter((t) => t.status === "rejected" || t.status === "withdrawn");
    else if (tab === "all") list = list.filter((t) => t.status !== "rejected" && t.status !== "withdrawn");
    if (!s) return list;
    return list.filter((t) =>
      t.other_name.toLowerCase().includes(s) ||
      t.listing_title.toLowerCase().includes(s) ||
      (t.last_body || "").toLowerCase().includes(s)
    );
  }, [threads, q, tab]);

  const unreadAll = threads.reduce((n, t) => n + t.unread, 0);
  const unreadApps = threads.filter(t => t.role === "seeker").reduce((n, t) => n + t.unread, 0);
  const unreadTen = threads.filter(t => t.role === "owner").reduce((n, t) => n + t.unread, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <InboxIcon className="h-7 w-7" /> Postfach
        </h1>
        <p className="text-muted-foreground mt-1">
          Chats, Bewerbungen, gespeicherte Inserate — alles an einem Ort.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setActive(null); }} className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="all" className="gap-1">Alle {unreadAll > 0 && <Badge className="h-4 px-1 text-[9px]">{unreadAll}</Badge>}</TabsTrigger>
          <TabsTrigger value="applications" className="gap-1">Meine Bewerbungen {unreadApps > 0 && <Badge className="h-4 px-1 text-[9px]">{unreadApps}</Badge>}</TabsTrigger>
          <TabsTrigger value="tenants" className="gap-1">Bewerber & Mieter {unreadTen > 0 && <Badge className="h-4 px-1 text-[9px]">{unreadTen}</Badge>}</TabsTrigger>
          <TabsTrigger value="saved" className="gap-1"><Heart className="h-3 w-3" /> Gespeichert</TabsTrigger>
          <TabsTrigger value="archive" className="gap-1"><Archive className="h-3 w-3" /> Archiv</TabsTrigger>
        </TabsList>

        <TabsContent value="saved">
          {saved.length === 0 ? (
            <Card className="p-8 glass"><EmptyState icon={Heart} title="Keine gespeicherten Inserate" description="Im Markt auf das Herz tippen, um Inserate hier zu sehen." /></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {saved.map((s) => (
                <Link key={s.listing_id} to={`/markt/${s.listing_id}`}>
                  <Card className="p-4 glass hover:shadow-gold transition">
                    <p className="font-semibold truncate">{s.listings?.title}</p>
                    <p className="text-xs text-muted-foreground">{eur(s.listings?.price)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {(["all", "applications", "tenants", "archive"] as const).map((t) => (
          <TabsContent key={t} value={t}>
            <Card className="glass overflow-hidden">
              <div className="grid md:grid-cols-[320px_1fr] min-h-[520px]">
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
                        <EmptyState icon={MessageSquare} title="Noch keine Chats" description="Sobald ein Match entsteht, erscheint hier der Chat." />
                      </div>
                    ) : filtered.map((th) => (
                      <button
                        key={th.application_id}
                        onClick={() => setActive(th)}
                        className={`w-full text-left px-4 py-3 border-b border-border/40 hover:bg-muted/40 transition ${active?.application_id === th.application_id ? "bg-muted/60" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{th.other_name}</span>
                          {th.unread > 0 && <Badge className="h-5 px-1.5 text-[10px]">{th.unread}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {th.listing_title}
                          {th.status && th.status !== "sent" && <Badge variant="outline" className="text-[9px] h-4 px-1">{STATUS_LABEL[th.status] ?? th.status}</Badge>}
                        </div>
                        {th.last_body && <div className="text-xs text-muted-foreground/80 truncate mt-0.5">{th.last_body}</div>}
                      </button>
                    ))}
                  </div>
                </div>

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
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{active.other_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            <Link to={`/markt/${active.listing_id}`} className="hover:underline">{active.listing_title}</Link> · {active.role === "owner" ? "Bewerbung erhalten" : "Eigene Bewerbung"}
                          </div>
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
