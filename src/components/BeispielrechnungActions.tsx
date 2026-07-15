import { useState } from "react";
import { Download, Share2, Mail, Loader2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackDownload, trackCta } from "@/lib/analytics";
import {
  generateBeispielrechnungPdf,
  type BeispielrechnungInput,
} from "@/lib/beispielrechnungPdf";

interface Props {
  input: BeispielrechnungInput;
}

const BUCKET = "shared-beispielrechnungen";

export default function BeispielrechnungActions({ input }: Props) {
  const [loading, setLoading] = useState<null | "download" | "share" | "mail">(
    null
  );
  const [mailOpen, setMailOpen] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [note, setNote] = useState("");
  const [mailSent, setMailSent] = useState(false);

  async function handleDownload() {
    setLoading("download");
    try {
      const { blob, fileName } = generateBeispielrechnungPdf(input);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      void trackDownload(fileName, {
        source: "savings_calculator",
        metadata: { units: input.units, totalSaved: input.totalSaved },
      });
      toast.success("PDF heruntergeladen");
    } catch (e) {
      console.error(e);
      toast.error("PDF konnte nicht erstellt werden.");
    } finally {
      setLoading(null);
    }
  }

  async function handleShare() {
    setLoading("share");
    try {
      const { blob, fileName, savingsFormatted } =
        generateBeispielrechnungPdf(input);
      const file = new File([blob], fileName, { type: "application/pdf" });
      const shareData: ShareData = {
        title: "Meine ImmonIQ-Beispielrechnung",
        text: `Mit ImmonIQ spare ich ca. ${savingsFormatted} € pro Jahr. Rechne selbst nach:`,
        url: "https://immoniq.xyz/#rechner",
        files: [file],
      };

      const nav: any = typeof navigator !== "undefined" ? navigator : null;
      const canShareFile =
        nav && typeof nav.canShare === "function" && nav.canShare({ files: [file] });

      if (canShareFile && typeof nav.share === "function") {
        await nav.share(shareData);
        void trackCta("beispielrechnung_share_native", {
          source: "savings_calculator",
          metadata: { units: input.units },
        });
      } else if (nav && typeof nav.share === "function") {
        await nav.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
        });
      } else {
        await nav.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success("Link in Zwischenablage kopiert");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        toast.error("Teilen nicht möglich – Link wurde kopiert.");
        try {
          await navigator.clipboard.writeText("https://immoniq.xyz/#rechner");
        } catch {}
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleMailSend() {
    if (!toEmail || !/.+@.+\..+/.test(toEmail)) {
      toast.error("Bitte gültige E-Mail-Adresse eingeben.");
      return;
    }
    setLoading("mail");
    setMailSent(false);
    try {
      const { blob, fileName, savingsFormatted } =
        generateBeispielrechnungPdf(input);

      // 1) Upload PDF to Storage
      const path = `${crypto.randomUUID()}/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: false,
        });
      if (upErr) throw upErr;

      // 2) Signed URL (7 days)
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("No URL");

      // 3) Send transactional email with link
      const { error: sendErr } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "beispielrechnung-share",
            recipientEmail: toEmail.trim(),
            idempotencyKey: `beispielrechnung-${path}`,
            templateData: {
              savings: savingsFormatted,
              units: input.units,
              hourlyRate: input.hourlyRate,
              downloadUrl: signed.signedUrl,
              fileName,
              senderNote: note.trim().slice(0, 500) || undefined,
            },
          },
        }
      );
      if (sendErr) throw sendErr;

      void trackCta("beispielrechnung_email_sent", {
        source: "savings_calculator",
        metadata: {
          units: input.units,
          totalSaved: input.totalSaved,
        },
      });
      setMailSent(true);
      toast.success("E-Mail wird zugestellt.");
    } catch (e) {
      console.error("mail send failed", e);
      toast.error("Versand fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button
        onClick={handleDownload}
        disabled={loading === "download"}
        size="sm"
        variant="outline"
        className="rounded-full h-9 gap-2"
      >
        {loading === "download" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        PDF herunterladen
      </Button>

      <Button
        onClick={handleShare}
        disabled={loading === "share"}
        size="sm"
        variant="outline"
        className="rounded-full h-9 gap-2"
      >
        {loading === "share" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Share2 className="h-3.5 w-3.5" />
        )}
        Teilen
      </Button>

      <Dialog
        open={mailOpen}
        onOpenChange={(o) => {
          setMailOpen(o);
          if (!o) setMailSent(false);
        }}
      >
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full h-9 gap-2"
          >
            <Mail className="h-3.5 w-3.5" />
            Per E-Mail
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Beispielrechnung per E-Mail schicken</DialogTitle>
            <DialogDescription>
              Wir generieren das PDF und schicken einen sicheren Download-Link
              (7 Tage gültig) an die angegebene Adresse.
            </DialogDescription>
          </DialogHeader>

          {mailSent ? (
            <div className="py-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="font-medium">E-Mail wird zugestellt</p>
              <p className="text-sm text-muted-foreground">
                Prüfe ggf. den Spam-Ordner.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMailOpen(false)}
                className="mt-2"
              >
                Schließen
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="br-email">Empfänger-E-Mail</Label>
                  <Input
                    id="br-email"
                    type="email"
                    placeholder="name@beispiel.de"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="br-note">
                    Persönliche Nachricht{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="br-note"
                    placeholder="Kurze Zeile an den Empfänger …"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const subject = encodeURIComponent(
                        "Meine ImmonIQ-Beispielrechnung"
                      );
                      const body = encodeURIComponent(
                        `Hi,\n\nich habe mit dem ImmonIQ-Rechner ausgerechnet, dass ich ca. ${new Intl.NumberFormat(
                          "de-DE"
                        ).format(
                          input.totalSaved
                        )} € pro Jahr sparen könnte.\n\nRechne selbst nach:\nhttps://immoniq.xyz/#rechner\n\n${note}`
                      );
                      window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;
                    } catch {}
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Als mailto öffnen
                </Button>
                <Button
                  onClick={handleMailSend}
                  disabled={loading === "mail"}
                  size="sm"
                  className="gap-2"
                >
                  {loading === "mail" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  Senden
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
