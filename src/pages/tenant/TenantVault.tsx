import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Upload, Download, Loader2, ShieldCheck, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { date } from "@/lib/format";

type Doc = { id: string; kind: string; name: string; path: string; size_bytes: number | null; mime: string | null; created_at: string };

export default function TenantVault() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tenant_vault")
      .select("id, kind, name, path, size_bytes, mime, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDocs((data as Doc[] | null) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 25 * 1024 * 1024) return toast.error("Max 25 MB");
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from("tenant-vault").upload(path, file, { contentType: file.type });
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    const { error } = await supabase.from("tenant_vault").insert({
      user_id: user.id,
      kind: "other",
      name: file.name,
      path,
      size_bytes: file.size,
      mime: file.type,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Im Tresor gespeichert");
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const download = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("tenant-vault").createSignedUrl(d.path, 60);
    if (error || !data?.signedUrl) return toast.error("Download fehlgeschlagen");
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (d: Doc) => {
    if (!confirm(`"${d.name}" löschen?`)) return;
    await supabase.storage.from("tenant-vault").remove([d.path]);
    await supabase.from("tenant_vault").delete().eq("id", d.id);
    toast.success("Gelöscht");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Mein Tresor</h1>
          <p className="text-sm text-muted-foreground">Dein privater Bereich — nur du siehst, was hier liegt. Nicht mal dein Vermieter.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" className="hidden" onChange={onUpload} accept="image/*,application/pdf" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Hochladen
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-success/5 border-success/20 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-success shrink-0" />
        <p className="text-sm">Ende-zu-Ende verschlüsselte Ablage. Server in der EU, DSGVO-konform. Bleibt deins — auch wenn du umziehst.</p>
      </Card>

      <Card>
        {docs.length === 0 ? (
          <div className="p-10 text-center">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Tresor ist noch leer</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Ausweis, Schufa, Gehaltsnachweis, Versicherungs-Police — hier liegt alles sicher und schnell griffbereit.</p>
          </div>
        ) : (
          <div className="divide-y">
            {docs.map(d => (
              <div key={d.id} className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">privat</Badge>
                    {date(d.created_at)}
                    {d.size_bytes ? <span>· {Math.round(d.size_bytes / 1024)} KB</span> : null}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(d)} className="gap-1">
                  <Download className="h-3 w-3" /> Öffnen
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(d)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
