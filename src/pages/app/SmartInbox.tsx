import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Inbox as InboxIcon, Copy, Sparkles, Check, Mail, Calendar, Euro, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errors";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";

interface InboxItem {
  id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  received_at: string;
  status: string;
  ai_category: string | null;
  ai_sender: string | null;
  ai_amount: number | null;
  ai_due_date: string | null;
  ai_contract_end: string | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  task_id: string | null;
  body_text: string | null;
}

const INBOX_DOMAIN = "inbox.immoniq.xyz";

const categoryColors: Record<string, string> = {
  rechnung: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  vertrag: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  versicherung: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  behoerde: "bg-red-500/10 text-red-600 border-red-500/20",
  miete: "bg-green-500/10 text-green-600 border-green-500/20",
  bank: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  sonstiges: "bg-muted text-muted-foreground",
};

export default function SmartInbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [alias, setAlias] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "done">("all");

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [{ data: p }, { data: it }] = await Promise.all([
      supabase.from("profiles").select("inbox_alias").eq("user_id", user.id).maybeSingle(),
      supabase.from("inbox_items").select("*").order("received_at", { ascending: false }).limit(200),
    ]);
    setAlias((p as any)?.inbox_alias || "");
    setItems((it as InboxItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const email = alias ? `${alias}@${INBOX_DOMAIN}` : "";

  const copy = () => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    toast.success("E-Mail-Adresse kopiert");
  };

  const markDone = async (id: string) => {
    const { error } = await supabase.from("inbox_items").update({ status: "done" }).eq("id", id);
    if (error) return toastError(error);
    setItems((s) => s.map((i) => (i.id === id ? { ...i, status: "done" } : i)));
  };

  const filtered = items.filter((i) => filter === "all" || i.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <InboxIcon className="h-7 w-7" /> Smart Inbox
          <Badge variant="secondary" className="ml-2">AI</Badge>
        </h1>
        <p className="text-muted-foreground mt-1">
          Leite Rechnungen, Verträge & Behördenpost an deine ImmonIQ-Adresse — wir lesen Absender, Frist & Betrag aus und legen Aufgaben automatisch an.
        </p>
      </div>

      <Card className="glass border-primary/20">
        <CardContent className="p-5 space-y-3">
          <div className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Deine persönliche Posteingangs-Adresse
          </div>
          <div className="flex gap-2">
            <Input readOnly value={email || "wird geladen …"} className="font-mono text-sm" />
            <Button onClick={copy} disabled={!email}><Copy className="h-4 w-4 mr-1.5" />Kopieren</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tipp: Speicher die Adresse als Kontakt „ImmonIQ Inbox" und leite eingehende Mails per Weiterleitungs-Regel hierhin.
            Jedes Dokument landet sofort sortiert in deinem Konto — Frist als Aufgabe, Datei im Tresor.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {(["all", "new", "done"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "Alle" : f === "new" ? "Neu" : "Erledigt"}
            <span className="ml-1.5 text-xs opacity-70">
              {f === "all" ? items.length : items.filter((i) => i.status === f).length}
            </span>
          </Button>
        ))}
      </div>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Noch keine Mails verarbeitet"
          description="Schick eine Test-Mail an deine Inbox-Adresse — innerhalb von Sekunden taucht sie hier strukturiert auf."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <Card key={it.id} className={`glass ${it.status === "done" ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {it.ai_category && (
                        <Badge variant="outline" className={categoryColors[it.ai_category] || ""}>
                          {it.ai_category}
                        </Badge>
                      )}
                      <span className="font-medium truncate">{it.ai_sender || it.from_name || it.from_email || "Unbekannt"}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(it.received_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {it.subject && <p className="text-sm mt-1 truncate">{it.subject}</p>}
                    {it.ai_summary && (
                      <p className="text-sm text-muted-foreground mt-1.5 flex items-start gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" /> {it.ai_summary}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {it.ai_amount != null && (
                        <span className="inline-flex items-center gap-1"><Euro className="h-3 w-3" />{it.ai_amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
                      )}
                      {it.ai_due_date && (
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Fällig: {new Date(it.ai_due_date).toLocaleDateString("de-DE")}</span>
                      )}
                      {it.ai_contract_end && (
                        <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />Vertragsende: {new Date(it.ai_contract_end).toLocaleDateString("de-DE")}</span>
                      )}
                      {it.task_id && (
                        <span className="inline-flex items-center gap-1 text-primary"><ExternalLink className="h-3 w-3" />Aufgabe angelegt</span>
                      )}
                    </div>
                  </div>
                  {it.status !== "done" && (
                    <Button size="sm" variant="ghost" onClick={() => markDone(it.id)}>
                      <Check className="h-4 w-4 mr-1" />Erledigt
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
