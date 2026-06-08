import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";
import { whatsappLink, waTemplates } from "@/lib/whatsapp";
import { toast } from "sonner";

type Template = keyof typeof waTemplates;

interface Props {
  phone: string | null | undefined;
  tenantName: string;
  defaultMessage?: string;
  templates?: Array<{ id: Template; label: string; args?: any[] }>;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  className?: string;
  iconOnly?: boolean;
}

export const WhatsappButton = ({
  phone, tenantName, defaultMessage = "",
  templates = [], variant = "outline", size = "sm", className, iconOnly,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(defaultMessage);

  const send = () => {
    const url = whatsappLink(phone, text);
    if (!url) {
      toast.error("Keine gültige Telefonnummer beim Mieter hinterlegt.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  if (!phone) {
    return null;
  }

  // Fast-path: kein Dialog, direkt öffnen
  if (templates.length === 0 && defaultMessage) {
    return (
      <Button
        variant={variant} size={size} className={className}
        onClick={() => {
          const url = whatsappLink(phone, defaultMessage);
          if (url) window.open(url, "_blank", "noopener,noreferrer");
        }}
      >
        <MessageCircle className="h-4 w-4 mr-2" />{iconOnly ? "" : "WhatsApp"}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setText(defaultMessage); }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <MessageCircle className="h-4 w-4 mr-2" />{iconOnly ? "" : "WhatsApp"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>WhatsApp an {tenantName}</DialogTitle></DialogHeader>
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <Button
                key={t.id} variant="secondary" size="sm"
                onClick={() => setText((waTemplates[t.id] as any)(...(t.args ?? [])))}
              >
                {t.label}
              </Button>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <Label>Nachricht</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Hi…" />
          <p className="text-xs text-muted-foreground">
            Wird in WhatsApp Web/App geöffnet — Nachricht ist vorausgefüllt, du musst nur senden.
          </p>
        </div>
        <Button onClick={send} className="bg-gradient-gold text-primary-foreground">
          <MessageCircle className="h-4 w-4 mr-2" /> In WhatsApp öffnen
        </Button>
      </DialogContent>
    </Dialog>
  );
};
