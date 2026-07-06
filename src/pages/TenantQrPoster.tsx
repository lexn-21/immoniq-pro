import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

/**
 * Druckbares A5-Poster mit QR-Code. Öffnet den Mieter-Portal-Link, den es
 * bei Bedarf on-the-fly anlegt. Ziel: Vermieter druckt aus, klebt an die
 * Wohnungstür, Mieter scannt → in 60 Sek. verbunden.
 */
export default function TenantQrPoster() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [params] = useSearchParams();
  const [url, setUrl] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>("");
  const [propertyName, setPropertyName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!tenantId) return;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setError("Bitte einloggen.");
        return;
      }

      // Tenant + Property laden
      const { data: t } = await supabase
        .from("tenants")
        .select("id, full_name, unit_id, property_id, properties(name)")
        .eq("id", tenantId)
        .maybeSingle();
      if (!t) {
        setError("Mieter nicht gefunden.");
        return;
      }
      setTenantName(t.full_name);
      setPropertyName((t as any).properties?.name ?? "");

      // Existierenden Token wiederverwenden oder neuen erzeugen
      const { data: existing } = await supabase
        .from("tenant_portal_links")
        .select("token")
        .eq("tenant_id", tenantId)
        .eq("revoked", false)
        .maybeSingle();

      let token = existing?.token;
      if (!token && t.unit_id) {
        const ins = await supabase
          .from("tenant_portal_links")
          .insert({ user_id: auth.user.id, tenant_id: tenantId, unit_id: t.unit_id })
          .select("token")
          .single();
        if (ins.error) {
          setError(ins.error.message);
          return;
        }
        token = ins.data.token;
      }
      if (!token) {
        setError("Kein aktiver Portal-Link. Erst eine Wohnung zuweisen.");
        return;
      }
      setUrl(`${window.location.origin}/mieter/${token}`);
    })();
  }, [tenantId]);

  const size = params.get("size") ?? "a5";
  const qrSize = 640;
  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=8&data=${encodeURIComponent(url)}`
    : null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: ${size === "a4" ? "A4" : "A5"} portrait; margin: 12mm; }
          body { background: white; }
        }
      `}</style>

      <div className="min-h-screen bg-neutral-100 py-8 print:py-0 print:bg-white">
        <div className="no-print max-w-2xl mx-auto mb-4 flex items-center justify-between px-4">
          <div className="text-sm text-muted-foreground">
            Vorschau · A5 · Zum Ausdrucken bereit
          </div>
          <Button onClick={() => window.print()} disabled={!url}>
            <Printer className="h-4 w-4 mr-2" /> Drucken
          </Button>
        </div>

        <div className="mx-auto bg-white shadow-lg print:shadow-none max-w-[148mm] aspect-[148/210] p-8 flex flex-col items-center justify-between text-center">
          {error ? (
            <div className="m-auto text-destructive text-sm">{error}</div>
          ) : !url ? (
            <div className="m-auto text-muted-foreground text-sm">Lade…</div>
          ) : (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">
                  Dein Mieter-Bereich
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                  Willkommen{tenantName ? `, ${tenantName.split(" ")[0]}` : ""}
                </h1>
                {propertyName && (
                  <p className="text-sm text-neutral-500 mt-1">{propertyName}</p>
                )}
              </div>

              <div className="my-6">
                <div className="border-8 border-neutral-900 p-3 bg-white inline-block">
                  <img
                    src={qrSrc!}
                    alt="QR-Code Mieter-Portal"
                    className="w-56 h-56 block"
                    width={qrSize}
                    height={qrSize}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-3">
                  Mit dem Smartphone scannen · kein Passwort nötig
                </p>
              </div>

              <div className="space-y-3 w-full">
                <div className="text-sm text-neutral-700 leading-relaxed">
                  <p className="font-semibold mb-1">Was dich erwartet:</p>
                  <ul className="text-xs text-neutral-600 space-y-0.5">
                    <li>· Zählerstände & Zahlungen einsehen</li>
                    <li>· Schäden melden — mit Foto</li>
                    <li>· Nebenkosten-Abrechnung als PDF</li>
                    <li>· Direkter Chat mit deiner Vermietung</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-neutral-200">
                  <p className="text-[10px] text-neutral-400">
                    Powered by ImmonIQ · immoniq.xyz
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
