import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { date } from "@/lib/format";
import type { TenantCtx } from "./TenantLayout";

type Doc = { id: string; kind: string; name: string; path: string; size_bytes: number | null; mime: string | null; created_at: string };

const KIND_LABEL: Record<string, string> = {
  contract: "Mietvertrag", id: "Ausweis", schufa: "SCHUFA", income: "Einkommen", handover: "Übergabe", other: "Sonstiges",
};

export default function TenantDocs() {
  const ctx = useOutletContext<TenantCtx>();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("tenant_documents")
      .select("id, kind, name, path, size_bytes, mime, created_at")
      .eq("tenant_id", ctx.tenant.id)
      .order("created_at", { ascending: false });
    setDocs((data as Doc[] | null) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [ctx.tenant.id]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("Max 20 MB");
    setUploading(true);
    const path = `tenants/${ctx.tenant.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    const { error } = await supabase.from("tenant_documents").insert({
      user_id: ctx.tenant.user_id,
      tenant_id: ctx.tenant.id,
      kind: "other",
      name: file.name,
      path,
      size_bytes: file.size,
      mime: file.type,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Hochgeladen");
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const download = async (d: Doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.path, 60);
    if (error || !data?.signedUrl) return toast.error("Download fehlgeschlagen");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dokumente</h1>
          <p className="text-sm text-muted-foreground">Mietvertrag, NK-Abrechnungen und deine eigenen Belege — sicher verschlüsselt.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" className="hidden" onChange={onUpload} accept="image/*,application/pdf" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Hochladen
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-success/5 border-success/20 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-success" />
        <p className="text-sm">Alle Dateien sind privat — nur du und dein Vermieter sehen sie. Server in der EU, DSGVO-konform.</p>
      </Card>

      <Card>
        {docs.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Noch keine Dokumente</p>
            <p className="text-xs text-muted-foreground mt-1">Lade z. B. deinen Mietvertrag oder Belege hoch.</p>
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
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">{KIND_LABEL[d.kind] ?? d.kind}</Badge>
                    {date(d.created_at)}
                    {d.size_bytes && <span>· {Math.round(d.size_bytes / 1024)} KB</span>}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(d)} className="gap-1">
                  <Download className="h-3 w-3" /> Öffnen
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
