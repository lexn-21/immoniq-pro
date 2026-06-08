import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Note {
  id: string;
  body: string;
  author_email: string | null;
  created_at: string;
}

interface Props {
  issueId: string | null;
  issueTitle?: string;
  onClose: () => void;
}

export default function TicketNotes({ issueId, issueTitle, onClose }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!issueId) return;
    setLoading(true);
    supabase
      .from("tenant_issue_notes")
      .select("id, body, author_email, created_at")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) toastError(error);
        setNotes((data as Note[]) || []);
        setLoading(false);
      });

    const ch = supabase
      .channel(`notes_${issueId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "tenant_issue_notes", filter: `issue_id=eq.${issueId}` },
        (payload) => setNotes((p) => [...p, payload.new as Note]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [issueId]);

  const post = async () => {
    if (!issueId || !draft.trim()) return;
    setPosting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPosting(false); return; }
    const { error } = await supabase.from("tenant_issue_notes").insert({
      issue_id: issueId,
      user_id: user.id,
      body: draft.trim(),
      author_email: user.email ?? null,
    });
    setPosting(false);
    if (error) return toastError(error);
    setDraft("");
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("tenant_issue_notes").delete().eq("id", id);
    if (error) return toastError(error);
    setNotes((p) => p.filter((n) => n.id !== id));
    toast.success("Notiz gelöscht");
  };

  return (
    <Sheet open={!!issueId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Verlauf
          </SheetTitle>
          {issueTitle && <p className="text-sm text-muted-foreground truncate">{issueTitle}</p>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Notizen. Halte hier Anrufe, Handwerker-Termine oder Mieter-Rückmeldungen fest.
            </p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="rounded-lg border bg-muted/30 p-3 group">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">
                    {n.author_email ?? "Du"} · {format(new Date(n.created_at), "dd. MMM yyyy, HH:mm", { locale: de })}
                  </span>
                  <button
                    onClick={() => del(n.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-3 space-y-2">
          <Textarea
            rows={3}
            placeholder="z. B. Klempner kommt Mo 10 Uhr. Mieterin informiert."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); post(); }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">⌘/Strg + Enter zum Senden</p>
            <Button size="sm" onClick={post} disabled={posting || !draft.trim()}>
              {posting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
              Senden
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
