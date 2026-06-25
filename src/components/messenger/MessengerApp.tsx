import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Send, Plus, Users, Home, MessageSquare, Bell, BellOff, ArrowLeft, Search, Check, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { showNotification, notifyPermission, requestNotifyPermission, canNotify } from "@/lib/notifications";
import { ensurePushSubscription } from "@/lib/pushNotifications";

type Kind = "direct" | "group" | "house";
type ConvRow = {
  id: string;
  kind: Kind;
  title: string | null;
  property_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_sender_id: string | null;
  unread_count: number;
  member_count: number;
  peer_user_id: string | null;
  peer_name: string | null;
};
type Member = { user_id: string; role: string; display_name: string; last_read_at: string | null };
type Message = { id: string; conversation_id: string; sender_id: string | null; body: string; created_at: string };
type Detail = { conversation: any; members: Member[]; property: any | null };

function initials(name?: string | null) {
  return (name ?? "?").split(/\s+/).map(s => s[0]).filter(Boolean).slice(0,2).join("").toUpperCase() || "?";
}
function timeShort(s: string) {
  const d = new Date(s);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default function MessengerApp({ mode = "landlord" }: { mode?: "landlord" | "tenant" }) {
  const { user } = useAuth();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [filter, setFilter] = useState("");
  const [permission, setPermission] = useState<NotificationPermission>(notifyPermission());
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const { data, error } = await supabase.rpc("messenger_list");
    if (!error) setConvs((data as ConvRow[]) ?? []);
    setLoadingList(false);
  }, []);

  const loadActive = useCallback(async (id: string) => {
    const [{ data: d }, { data: m }] = await Promise.all([
      supabase.rpc("messenger_get", { _conv: id }),
      supabase.from("messages").select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", id).is("deleted_at", null).order("created_at", { ascending: true }).limit(500),
    ]);
    setDetail(d as Detail | null);
    setMessages((m as Message[]) ?? []);
    await supabase.rpc("messenger_mark_read", { _conv: id });
    loadList();
  }, [loadList]);

  useEffect(() => { loadList(); }, [loadList]);

  // Realtime: any new message → refresh list; if in active conv, append
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`msg-all:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload: any) => {
        const m = payload.new as Message;
        // Only if user is a member — quick check via current conv list
        const isMember = (await supabase.from("conversation_members")
          .select("conversation_id").eq("conversation_id", m.conversation_id).eq("user_id", user.id).maybeSingle()).data;
        if (!isMember) return;
        if (m.conversation_id === activeId) {
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          await supabase.rpc("messenger_mark_read", { _conv: m.conversation_id });
        } else if (m.sender_id !== user.id) {
          // foreground notification + sound-less
          const conv = convs.find(c => c.id === m.conversation_id);
          showNotification(conv?.title || conv?.peer_name || "Neue Nachricht", m.body, () => setActiveId(m.conversation_id));
        }
        loadList();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, activeId, convs, loadList]);

  useEffect(() => { if (activeId) loadActive(activeId); }, [activeId, loadActive]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const active = useMemo(() => convs.find(c => c.id === activeId), [convs, activeId]);
  const filteredConvs = useMemo(() => {
    if (!filter.trim()) return convs;
    const q = filter.toLowerCase();
    return convs.filter(c => (c.title || c.peer_name || "").toLowerCase().includes(q) || (c.last_message_preview || "").toLowerCase().includes(q));
  }, [convs, filter]);
  const totalUnread = useMemo(() => convs.reduce((s, c) => s + (c.unread_count || 0), 0), [convs]);

  const send = async () => {
    const body = text.trim();
    if (!body || !activeId || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: activeId, sender_id: user.id, body });
    setSending(false);
    if (error) return toast.error("Senden fehlgeschlagen: " + error.message);
    setText("");
    // Fire-and-forget Web-Push to other members
    const conv = convs.find(c => c.id === activeId);
    const title = conv?.title || conv?.peer_name || "Neue Nachricht";
    supabase.functions.invoke("send-push", {
      body: { conversation_id: activeId, body, title, url: mode === "tenant" ? "/mein-immoniq/chat" : "/app/chat" },
    }).catch(() => {});
  };

  const enableNotifs = async () => {
    const p = await requestNotifyPermission();
    setPermission(p);
    if (p === "granted") {
      const ok = await ensurePushSubscription();
      toast.success(ok ? "Benachrichtigungen aktiviert (auch bei geschlossenem Tab)" : "Benachrichtigungen aktiviert");
    } else {
      toast.error("Benachrichtigungen blockiert — im Browser erlauben");
    }
  };

  // Auto-register push subscription if permission already granted
  useEffect(() => { if (permission === "granted") { ensurePushSubscription().catch(() => {}); } }, [permission]);

  // ---------- LIST ----------
  const ListPanel = (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b space-y-2 bg-card">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm flex-1 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Chats
            {totalUnread > 0 && <Badge variant="default" className="h-5 px-1.5 text-[10px]">{totalUnread}</Badge>}
          </h2>
          {mode === "landlord" && <NewGroupDialog onCreated={(id) => { setActiveId(id); loadList(); }} />}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Suchen…" className="h-8 pl-7 text-sm" />
        </div>
        {canNotify() && permission !== "granted" && (
          <button onClick={enableNotifs} className="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/15 transition">
            <Bell className="h-3 w-3" /> Benachrichtigungen aktivieren
          </button>
        )}
      </div>
      <ScrollArea className="flex-1">
        {loadingList ? (
          <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filteredConvs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-foreground">Noch keine Chats</p>
            <p className="text-xs mt-1">{mode === "landlord" ? "Sobald sich Mieter verbinden, erscheinen sie hier." : "Verbinde dich mit deinem Vermieter, um zu chatten."}</p>
          </div>
        ) : filteredConvs.map(c => {
          const isActive = c.id === activeId;
          const title = c.title || c.peer_name || "Chat";
          const icon = c.kind === "house" ? Home : c.kind === "group" ? Users : null;
          return (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 border-b transition ${isActive ? "bg-primary/10" : "hover:bg-muted/40"}`}>
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className={`text-xs ${c.kind === "house" ? "bg-primary/15 text-primary" : c.kind === "group" ? "bg-accent" : "bg-muted"}`}>
                  {icon ? <span className="flex items-center justify-center h-full w-full">{(() => { const I = icon; return <I className="h-4 w-4" />; })()}</span> : initials(title)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate flex-1">{title}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeShort(c.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`text-xs truncate flex-1 ${c.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {c.last_message_preview || <span className="italic">Noch keine Nachrichten</span>}
                  </p>
                  {c.unread_count > 0 && <Badge className="h-4 min-w-4 px-1 text-[10px] rounded-full">{c.unread_count}</Badge>}
                </div>
                {c.kind !== "direct" && <p className="text-[10px] text-muted-foreground mt-0.5">{c.member_count} Mitglieder</p>}
              </div>
            </button>
          );
        })}
      </ScrollArea>
    </div>
  );

  // ---------- CHAT ----------
  const ChatPanel = active ? (
    <div className="h-full flex flex-col bg-muted/5">
      <div className="border-b bg-card px-3 py-2.5 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Zurück zur Chat-Liste" className="md:hidden h-8 w-8" onClick={() => setActiveId(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className={`text-xs ${active.kind === "house" ? "bg-primary/15 text-primary" : active.kind === "group" ? "bg-accent" : "bg-muted"}`}>
            {active.kind === "house" ? <Home className="h-4 w-4" /> : active.kind === "group" ? <Users className="h-4 w-4" /> : initials(active.title || active.peer_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{active.title || active.peer_name || "Chat"}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {active.kind === "direct" ? "Direktnachricht" : `${active.member_count} Mitglieder${detail?.property ? ` · ${detail.property.name}` : ""}`}
          </p>
        </div>
        {active.kind !== "direct" && (
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Mitglieder anzeigen" className="h-8 w-8"><Users className="h-4 w-4" /></Button></SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>{active.title || "Gruppe"}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-2">
                {detail?.members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(m.display_name)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{m.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.role === "owner" ? "Admin" : "Mitglied"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Schreib die erste Nachricht</p>
            <p className="text-xs text-muted-foreground mt-1">Wird sofort und sicher zugestellt.</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-3xl mx-auto">
            {messages.map((m, i) => {
              const mine = m.sender_id === user?.id;
              const senderName = !mine && active.kind !== "direct"
                ? (detail?.members.find(x => x.user_id === m.sender_id)?.display_name ?? "Unbekannt")
                : null;
              const prev = messages[i - 1];
              const showGap = !prev || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60_000;
              return (
                <div key={m.id}>
                  {showGap && (
                    <div className="text-center my-3">
                      <span className="text-[10px] text-muted-foreground bg-card border px-2 py-0.5 rounded-full">
                        {new Date(m.created_at).toLocaleString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
                    }`}>
                      {senderName && <p className="text-[10px] font-semibold text-primary mb-0.5">{senderName}</p>}
                      <p className="whitespace-pre-wrap leading-snug break-words">{m.body}</p>
                      <div className={`text-[9px] mt-1 flex items-center gap-1 justify-end ${mine ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        {mine && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t bg-background p-2.5 flex items-end gap-2">
        <Textarea value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Nachricht schreiben… (Enter = senden, Shift+Enter = neue Zeile)"
          rows={1} className="resize-none min-h-[42px] max-h-32 text-sm" />
        <Button size="icon" aria-label="Nachricht senden" onClick={send} disabled={!text.trim() || sending} className="shrink-0 h-10 w-10 rounded-full">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  ) : (
    <div className="h-full hidden md:flex items-center justify-center bg-muted/5">
      <div className="text-center max-w-sm p-8">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-semibold">Wähle einen Chat</h3>
        <p className="text-sm text-muted-foreground mt-1">Direkt mit {mode === "landlord" ? "deinen Mietern" : "deinem Vermieter"} oder in Hausgruppen — alles verschlüsselt in deiner ImmonIQ-Inbox.</p>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden grid md:grid-cols-[320px_1fr] h-[calc(100vh-180px)] min-h-[520px]">
      <div className={`border-r ${activeId ? "hidden md:block" : "block"}`}>{ListPanel}</div>
      <div className={`${activeId ? "block" : "hidden md:block"}`}>{ChatPanel}</div>
    </Card>
  );
}

// ============ NEW GROUP DIALOG (landlord) ============
function NewGroupDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [propertyId, setPropertyId] = useState<string | "">("");
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; user_id: string; full_name: string; property_id: string | null }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: ps }, { data: ts }] = await Promise.all([
        supabase.from("properties").select("id, name").eq("user_id", user.id).order("name"),
        supabase.from("tenants").select("id, claimed_by_user_id, full_name, property_id")
          .eq("user_id", user.id).is("archived_at", null).not("claimed_by_user_id", "is", null),
      ]);
      setProperties((ps as any[]) ?? []);
      setTenants(((ts as any[]) ?? []).map(t => ({ id: t.id, user_id: t.claimed_by_user_id, full_name: t.full_name, property_id: t.property_id })));
    })();
  }, [open, user]);

  const visibleTenants = useMemo(() => propertyId ? tenants.filter(t => t.property_id === propertyId) : tenants, [tenants, propertyId]);

  const toggle = (uid: string) => setSelected(s => { const n = new Set(s); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });

  const create = async () => {
    if (!title.trim()) return toast.error("Titel fehlt");
    if (selected.size === 0) return toast.error("Mindestens eine Person auswählen");
    setSaving(true);
    const kind = propertyId ? "house" : "group";
    const { data, error } = await supabase.rpc("messenger_create_group", {
      _title: title.trim(), _user_ids: Array.from(selected), _property_id: propertyId || null, _kind: kind,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Gruppe erstellt");
    setOpen(false); setTitle(""); setSelected(new Set()); setPropertyId("");
    onCreated(data as string);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" variant="outline" aria-label="Neue Gruppe erstellen" className="h-8 w-8"><Plus className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Neue Gruppe</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Titel</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="z. B. Haus Goethestraße 12" />
          </div>
          <div>
            <Label>Objekt (optional — macht es zur Hausgruppe)</Label>
            <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">— Allgemeine Gruppe —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Mitglieder ({selected.size})</Label>
            {visibleTenants.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2 p-3 bg-muted/30 rounded-md">Keine verbundenen Mieter {propertyId ? "in diesem Objekt" : ""}. Mieter müssen sich erst über „Vermieter verbinden" anmelden.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto border rounded-md divide-y mt-1">
                {visibleTenants.map(t => (
                  <label key={t.user_id} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/40">
                    <input type="checkbox" checked={selected.has(t.user_id)} onChange={() => toggle(t.user_id)} className="h-4 w-4" />
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{initials(t.full_name)}</AvatarFallback></Avatar>
                    <span className="text-sm flex-1">{t.full_name}</span>
                    {selected.has(t.user_id) && <Check className="h-4 w-4 text-primary" />}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={create} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gruppe erstellen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
