import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = { landlordUserId: string };

type Existing = {
  id: string;
  stars: number;
  category_communication: number | null;
  category_maintenance: number | null;
  category_fairness: number | null;
  comment: string | null;
};

const CATS: { key: "category_communication" | "category_maintenance" | "category_fairness"; label: string }[] = [
  { key: "category_communication", label: "Kommunikation" },
  { key: "category_maintenance", label: "Instandhaltung" },
  { key: "category_fairness", label: "Fairness" },
];

export function LandlordRatingCard({ landlordUserId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Existing | null>(null);
  const [stars, setStars] = useState(0);
  const [cats, setCats] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data } = await supabase
        .from("landlord_ratings_public")
        .select("id, stars, category_communication, category_maintenance, category_fairness, comment")
        .eq("landlord_user_id", landlordUserId)
        .eq("rated_by_user_id", user.id)
        .maybeSingle();
      if (data) {
        setExisting(data as Existing);
        setStars(data.stars);
        setCats({
          category_communication: data.category_communication ?? 0,
          category_maintenance: data.category_maintenance ?? 0,
          category_fairness: data.category_fairness ?? 0,
        });
        setComment(data.comment ?? "");
      }
      setLoading(false);
    })();
  }, [landlordUserId]);

  const save = async () => {
    if (stars < 1) return toast.error("Bitte mindestens 1 Stern vergeben.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const payload: any = {
      landlord_user_id: landlordUserId,
      rated_by_user_id: user.id,
      stars,
      category_communication: cats.category_communication || null,
      category_maintenance: cats.category_maintenance || null,
      category_fairness: cats.category_fairness || null,
      comment: comment.trim() ? comment.trim().slice(0, 2000) : null,
    };
    const { error } = await supabase
      .from("landlord_ratings_public")
      .upsert(payload, { onConflict: "landlord_user_id,rated_by_user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(existing ? "Bewertung aktualisiert." : "Danke — deine Bewertung ist online.");
    setExisting({ id: existing?.id ?? "new", stars, comment, ...(cats as any) });
  };

  if (loading) {
    return (
      <Card className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Lade Bewertung …
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Star className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">Bewerte deinen Vermieter</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Öffentlich sichtbar — hilft anderen Mietern, sich zu orientieren. Du kannst jederzeit anpassen.
          </p>
        </div>
      </div>

      <StarRow value={stars} onChange={setStars} size="lg" label="Gesamt" />

      <div className="grid sm:grid-cols-3 gap-3">
        {CATS.map((c) => (
          <StarRow
            key={c.key}
            value={cats[c.key] ?? 0}
            onChange={(v) => setCats((s) => ({ ...s, [c.key]: v }))}
            label={c.label}
          />
        ))}
      </div>

      <Textarea
        placeholder="Kurzes Feedback (optional) — bleib fair und sachlich."
        value={comment}
        maxLength={2000}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Verifiziert (nur aktive Mieter dürfen bewerten).
        </p>
        <Button onClick={save} disabled={saving} size="sm">
          {saving && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
          {existing ? "Aktualisieren" : "Bewertung abgeben"}
        </Button>
      </div>
    </Card>
  );
}

function StarRow({
  value, onChange, label, size = "md",
}: { value: number; onChange: (v: number) => void; label: string; size?: "md" | "lg" }) {
  const s = size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} Sterne`}
            onClick={() => onChange(n === value ? 0 : n)}
            className="rounded focus-visible:ring-2 focus-visible:ring-ring outline-none"
          >
            <Star className={`${s} transition ${n <= value ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
