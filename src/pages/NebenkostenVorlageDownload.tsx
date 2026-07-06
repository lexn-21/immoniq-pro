import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePageSeo } from "@/hooks/usePageSeo";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Mail,
} from "lucide-react";

const DOWNLOAD_PATH = "/downloads/nebenkostenabrechnung-vorlage-immoniq.xlsx";
const FILE_NAME = "nebenkostenabrechnung-vorlage-immoniq.xlsx";
const SLUG = "nebenkostenabrechnung-vorlage";
const CANONICAL = "/nebenkostenabrechnung-vorlage/download";

export default function NebenkostenVorlageDownload() {
  const [params] = useSearchParams();
  const source = params.get("src") ?? "direct";
  const [triggered, setTriggered] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const logged = useRef(false);

  usePageSeo({
    title: "Download startet · Nebenkostenabrechnung Vorlage · ImmonIQ",
    description:
      "Deine kostenlose Excel-Vorlage für die Nebenkostenabrechnung wird jetzt heruntergeladen.",
    canonicalPath: CANONICAL,
    noindex: true,
  });

  // Auto-Download + Tracking (einmalig pro Seitenaufruf).
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;

    // Fire-and-forget Tracking.
    void supabase.from("download_events").insert({
      file_path: DOWNLOAD_PATH,
      slug: SLUG,
      source,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    // Download nach ~400 ms auslösen, damit UI erst rendert.
    const t = setTimeout(() => {
      linkRef.current?.click();
      setTriggered(true);
    }, 400);
    return () => clearTimeout(t);
  }, [source]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-bold text-lg">
            ImmonIQ
          </Link>
          <Link
            to="/nebenkostenabrechnung-vorlage"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Zurück zur Vorlage
          </Link>
        </div>
      </header>

      <section className="container py-16 md:py-24 max-w-2xl">
        {/* Versteckter Download-Trigger */}
        <a
          ref={linkRef}
          href={DOWNLOAD_PATH}
          download={FILE_NAME}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        >
          Download
        </a>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Bestätigung
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {triggered
                ? "Dein Download läuft."
                : "Dein Download startet gleich …"}
            </h1>
          </div>
        </div>

        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          Wir haben dir die <strong>Nebenkostenabrechnung-Vorlage 2026</strong>{" "}
          als Excel-Datei ({FILE_NAME}) geschickt. Falls sich nichts tut,
          starte den Download manuell:
        </p>

        <Card className="p-5 flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3 min-w-0">
            <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium truncate">{FILE_NAME}</div>
              <div className="text-xs text-muted-foreground">
                Excel · ~8 KB · § 556 BGB / BetrKV
              </div>
            </div>
          </div>
          <a href={DOWNLOAD_PATH} download={FILE_NAME}>
            <Button size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Erneut laden
            </Button>
          </a>
        </Card>

        <h2 className="text-xl font-semibold mb-4">So geht es weiter</h2>
        <ol className="space-y-3 mb-10 text-muted-foreground">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-muted text-foreground text-xs font-semibold flex items-center justify-center shrink-0">
              1
            </span>
            <span>
              Öffne die Datei in Excel, Numbers oder LibreOffice und trage
              deine Objekt- und Mieterdaten in die gelben Felder ein.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-muted text-foreground text-xs font-semibold flex items-center justify-center shrink-0">
              2
            </span>
            <span>
              Wähle den Umlageschlüssel (Wohnfläche, Personen, Verbrauch oder
              Wohneinheiten). Formeln rechnen automatisch.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-muted text-foreground text-xs font-semibold flex items-center justify-center shrink-0">
              3
            </span>
            <span>
              Als PDF exportieren und innerhalb von 12 Monaten nach Ende des
              Abrechnungszeitraums an den Mieter zustellen (§ 556 Abs. 3 BGB).
            </span>
          </li>
        </ol>

        <Card className="p-6 bg-muted/40 border-dashed">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">
                Keine Lust auf Excel? Lass ImmonIQ es machen.
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Belege hochladen, KI verbucht &amp; erstellt die Abrechnung —
                DSGVO-konform per E-Mail an den Mieter. 30 Tage kostenlos.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link to="/auth">
                  <Button size="sm" className="gap-2">
                    Jetzt kostenlos testen
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/preise">
                  <Button size="sm" variant="outline">
                    Preise ansehen
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-xs text-muted-foreground mt-10 flex items-center gap-2">
          <Mail className="w-3 h-3" />
          Fragen zur Vorlage? Antwortet dir das Team unter hallo@immoniq.xyz.
        </p>
      </section>
    </div>
  );
}
