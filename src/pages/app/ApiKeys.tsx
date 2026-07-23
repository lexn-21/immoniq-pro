import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, KeyRound, Plus, Trash2, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { usePageSeo } from "@/hooks/usePageSeo";

type Row = {
  id: string;
  label: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `ilk_live_${hex}`;
}

export default function ApiKeys() {
  usePageSeo({ title: "API-Keys · ImmonIQ", description: "Verwalte deine API-Keys für die ImmonIQ Open API." });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("id,label,key_prefix,scopes,last_used_at,revoked_at,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const clean = label.trim();
    if (!clean) return toast.error("Bitte einen Namen für den Key vergeben.");
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      const key = randomKey();
      const hash = await sha256Hex(key);
      const prefix = key.slice(0, 16);
      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        label: clean,
        key_prefix: prefix,
        key_hash: hash,
        scopes: ["read"],
      });
      if (error) throw error;
      setFreshKey(key);
      setLabel("");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Fehler beim Erstellen");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Diesen Key wirklich widerrufen? Bestehende Integrationen brechen ab.")) return;
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Key widerrufen");
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Endgültig löschen?")) return;
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" /> API-Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zugriff für eigene Skripte, Zapier, n8n oder deinen Steuerberater — read-only auf Properties, Tenants & Payments.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/api-docs"><ExternalLink className="h-4 w-4" /> API-Dokumentation</Link>
        </Button>
      </header>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Neuen Key erstellen</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Label htmlFor="label">Bezeichnung</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Zapier-Integration" maxLength={80} />
          </div>
          <div className="md:self-end">
            <Button onClick={create} disabled={creating} className="gap-2 w-full md:w-auto">
              <Plus className="h-4 w-4" /> {creating ? "Erstelle …" : "Key erstellen"}
            </Button>
          </div>
        </div>

        {freshKey && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
            <div className="text-sm flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-amber-600" /> Einmalig sichtbar — jetzt kopieren!
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs md:text-sm bg-background rounded px-2 py-1 flex-1 break-all">{freshKey}</code>
              <Button size="sm" variant="outline" className="gap-1"
                onClick={() => { navigator.clipboard.writeText(freshKey); toast.success("Kopiert"); }}>
                <Copy className="h-3.5 w-3.5" /> Kopieren
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Wir speichern nur den Hash — nach dem Schließen ist der Key nicht wiederherstellbar.
            </p>
            <Button size="sm" variant="ghost" onClick={() => setFreshKey(null)}>Schließen</Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Aktive Keys</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Lädt …</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Keys vorhanden.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {r.label}
                    {r.revoked_at ? <Badge variant="destructive">widerrufen</Badge>
                      : <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">aktiv</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{r.key_prefix}…</div>
                  <div className="text-xs text-muted-foreground">
                    Erstellt {new Date(r.created_at).toLocaleDateString("de-DE")}
                    {r.last_used_at ? ` · zuletzt benutzt ${new Date(r.last_used_at).toLocaleDateString("de-DE")}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!r.revoked_at && (
                    <Button size="sm" variant="outline" onClick={() => revoke(r.id)}>Widerrufen</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="gap-1 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Löschen
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 bg-muted/30">
        <h2 className="font-semibold mb-2">Sicherheits-Hinweise</h2>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
          <li>Keys niemals in öffentlichen Repos oder Client-Code veröffentlichen.</li>
          <li>Pro Integration einen separaten Key — Widerruf betrifft dann nur diese Integration.</li>
          <li>Alle Anfragen werden protokolliert und ratelimitiert.</li>
        </ul>
      </Card>
    </div>
  );
}
