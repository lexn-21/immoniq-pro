import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { eur } from "@/lib/format";
import { ArrowLeft, MapPin, Bed, Maximize2, Calendar, Euro, ShieldCheck, Heart, Target } from "lucide-react";
import { toast } from "sonner";
import { SponsoredSlot } from "@/components/market/SponsoredSlot";
import LegalSnippet from "@/components/LegalSnippet";
import { usePageSeo } from "@/hooks/usePageSeo";
import { LegalFooter } from "@/components/LegalFooter";

const MarktDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [l, setL] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [seeker, setSeeker] = useState<any>(null);
  const [applied, setApplied] = useState(false);
  const [dlg, setDlg] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      setL(data);
      if (data) document.title = `${data.title} · ImmonIQ`;
      await supabase.rpc("listing_inc_view", { _listing_id: id });

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const [{ data: sp }, { data: ap }] = await Promise.all([
          supabase.from("seeker_profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("applications").select("id").eq("listing_id", id).eq("seeker_user_id", user.id).maybeSingle(),
        ]);
        setSeeker(sp);
        setApplied(!!ap);
      }
    })();
  }, [id]);

  const photoUrl = (p?: string) =>
    p ? supabase.storage.from("listing-photos").getPublicUrl(p).data.publicUrl : null;

  const heroImage = l?.photos?.[0] ? photoUrl(l.photos[0]) : undefined;
  usePageSeo({
    title: l ? `${l.title} · ImmonIQ` : "Inserat · ImmonIQ",
    description: l
      ? `${l.kind === "rent" ? "Zur Miete" : l.kind === "sale" ? "Zum Kauf" : "WG-Zimmer"} in ${[l.zip, l.city].filter(Boolean).join(" ") || "Deutschland"} — direkt vom Eigentümer auf ImmonIQ.`
      : "Wohnungsinserat — direkt vom Eigentümer auf ImmonIQ.",
    canonicalPath: id ? `/markt/${id}` : "/markt",
    ogImage: heroImage || undefined,
    jsonLdId: "listing",
    jsonLd: l
      ? {
          "@context": "https://schema.org",
          "@type": l.kind === "sale" ? "Product" : "Accommodation",
          name: l.title,
          description: l.description || `${l.kind === "rent" ? "Mietwohnung" : l.kind === "sale" ? "Kaufobjekt" : "WG-Zimmer"} in ${l.city || ""}`.trim(),
          url: `https://immoniq.xyz/markt/${l.id}`,
          image: heroImage,
          numberOfRooms: l.rooms ?? l.wg_total_rooms ?? undefined,
          floorSize: l.living_space
            ? { "@type": "QuantitativeValue", value: l.living_space, unitCode: "MTK" }
            : undefined,
          address: {
            "@type": "PostalAddress",
            streetAddress: l.street_public || undefined,
            postalCode: l.zip || undefined,
            addressLocality: l.city || undefined,
            addressCountry: "DE",
          },
          offers: l.price
            ? {
                "@type": "Offer",
                price: Number(l.price),
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock",
                url: `https://immoniq.xyz/markt/${l.id}`,
              }
            : undefined,
        }
      : undefined,
  });


  const apply = async () => {
    if (!user) { nav(`/auth?redirect=/markt/${id}`); return; }
    if (!seeker || !seeker.full_name) {
      toast.error("Bitte erst Bewerber-Profil ausfüllen.");
      nav("/app/profile-seeker");
      return;
    }
    const appId = crypto.randomUUID();
    const { error } = await supabase.from("applications").insert({
      id: appId,
      listing_id: l.id,
      seeker_user_id: user.id,
      owner_user_id: l.user_id,
      cover_message: msg || null,
      snapshot_profile: seeker,
    });
    if (error) return toast.error(error.message);
    setApplied(true);
    setDlg(false);
    toast.success("Bewerbung gesendet!");

    // Notify owner via email (best-effort, non-blocking)
    try {
      const { data: ownerInfo } = await supabase.rpc("notify_get_listing_owner_email", { _listing_id: l.id });
      const info = ownerInfo as { email?: string; opted_in?: boolean; listing_title?: string } | null;
      if (info?.email && info.opted_in) {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "new-application",
            recipientEmail: info.email,
            idempotencyKey: `new-application-${appId}`,
            templateData: {
              listingTitle: info.listing_title,
              applicantName: seeker.full_name,
              coverMessage: msg || undefined,
              applicationId: l.id,
            },
          },
        });
      }
    } catch (e) { console.warn("notify owner failed", e); }
  };


  const save = async () => {
    if (!user) { nav(`/auth?redirect=/markt/${id}`); return; }
    const { error } = await supabase.from("listing_saves").insert({ user_id: user.id, listing_id: l.id });
    if (error) toast.error(error.message); else toast.success("Gespeichert");
  };

  if (!l) return <div className="container py-10 text-muted-foreground">Lade…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass border-b border-border/60">
        <div className="container max-w-5xl flex items-center justify-between h-14">
          <Link to="/markt" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Markt
          </Link>
          <Logo />
          <div className="w-12" />
        </div>
      </header>

      <main className="container max-w-5xl py-6 space-y-6">
        {l.photos?.length ? (
          <div className="grid grid-cols-4 gap-2 rounded-xl overflow-hidden">
            <div className="col-span-4 sm:col-span-3 aspect-video bg-muted">
              <img src={photoUrl(l.photos[0])!} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:grid grid-cols-1 gap-2">
              {l.photos.slice(1, 3).map((p: string) => (
                <div key={p} className="aspect-video bg-muted"><img src={photoUrl(p)!} className="w-full h-full object-cover" alt="" /></div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>

              <div className="flex gap-2 mb-2 flex-wrap">
                <Badge className={l.kind === "wg_room" ? "bg-violet-500 text-white" : ""}>
                  {l.kind === "rent" ? "Zur Miete" : l.kind === "sale" ? "Zum Kauf" : "WG-Zimmer"}
                </Badge>
                {l.energy_class && <Badge variant="outline">Energie {l.energy_class}</Badge>}
                {l.kind === "wg_room" && l.wg_furnished && <Badge variant="outline" className="border-violet-500/40 text-violet-700 dark:text-violet-300">möbliert</Badge>}
              </div>
              <h1 className="text-3xl font-bold">{l.title}</h1>
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" /> {[l.street_public, l.zip, l.city].filter(Boolean).join(", ")}
              </p>
            </div>

            <Card className="p-5 glass grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">{l.kind === "wg_room" ? "Zimmergröße" : "Zimmer"}</p><p className="font-semibold flex items-center gap-1"><Bed className="h-3 w-3" /> {l.kind === "wg_room" ? `${l.wg_room_size_sqm ?? "—"} m²` : (l.rooms ?? "—")}</p></div>
              <div><p className="text-muted-foreground text-xs">{l.kind === "wg_room" ? "WG gesamt" : "Wohnfläche"}</p><p className="font-semibold flex items-center gap-1"><Maximize2 className="h-3 w-3" /> {l.kind === "wg_room" ? `${l.wg_total_rooms ?? "—"} Zi.` : `${l.living_space ?? "—"} m²`}</p></div>
              <div><p className="text-muted-foreground text-xs">Verfügbar</p><p className="font-semibold flex items-center gap-1"><Calendar className="h-3 w-3" /> {l.available_from ? new Date(l.available_from).toLocaleDateString("de-DE") : "sofort"}</p></div>
            </Card>

            {l.kind === "wg_room" && (
              <Card className="p-6 glass border-violet-500/30">
                <h2 className="font-bold mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-violet-500" /> WG-Details
                </h2>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {l.wg_current_flatmates != null && (
                    <div><span className="text-muted-foreground">Aktuelle Mitbewohner: </span><strong>{l.wg_current_flatmates}</strong></div>
                  )}
                  {(l.wg_flatmate_age_min || l.wg_flatmate_age_max) && (
                    <div><span className="text-muted-foreground">Alter Mitbewohner: </span><strong>{l.wg_flatmate_age_min ?? "?"}–{l.wg_flatmate_age_max ?? "?"} J.</strong></div>
                  )}
                  {l.wg_flatmate_gender_pref && l.wg_flatmate_gender_pref !== "any" && (
                    <div><span className="text-muted-foreground">Gesucht: </span><strong className="capitalize">{l.wg_flatmate_gender_pref}</strong></div>
                  )}
                </div>
                {l.wg_shared_facilities && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(l.wg_shared_facilities as Record<string, boolean>).filter(([, v]) => v).map(([k]) => (
                      <Badge key={k} variant="secondary" className="capitalize text-[10px]">{k} geteilt</Badge>
                    ))}
                  </div>
                )}
              </Card>
            )}


            {l.description && (
              <Card className="p-6 glass">
                <h2 className="font-bold mb-2">Beschreibung</h2>
                <p className="text-sm whitespace-pre-line text-muted-foreground">{l.description}</p>
              </Card>
            )}

            {l.features && Object.values(l.features).some(Boolean) && (
              <Card className="p-6 glass">
                <h2 className="font-bold mb-3">Ausstattung</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(l.features).filter(([, v]) => v).map(([k]) => (
                    <Badge key={k} variant="secondary" className="capitalize">{k.replace("_", " ")}</Badge>
                  ))}
                </div>
              </Card>
            )}

            <LegalSnippet
              title={l.kind === "rent" ? "Mietrecht — was du wissen solltest" : "Kaufrecht — was du wissen solltest"}
              keys={l.kind === "rent" ? ["bgb_535", "bgb_551", "bgb_556", "betrkv", "geg_80"] : ["geg_80", "estg_21", "estg_7b"]}
            />

            {l.energy_class && (
              <Card className="p-6 glass">
                <h2 className="font-bold mb-2">Energieausweis</h2>
                <p className="text-sm">Klasse <strong>{l.energy_class}</strong>{l.energy_value ? ` · ${l.energy_value} kWh/m²·a` : ""}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Pflichtangabe nach <a className="underline" href="https://www.gesetze-im-internet.de/geg/" target="_blank" rel="noreferrer">GEG § 87</a>.</p>
              </Card>
            )}
          </div>

          <aside className="space-y-4">
            <Card className="p-6 glass sticky top-20">
              <p className="text-3xl font-bold text-gradient-gold">{eur(l.price)}<span className="text-sm text-muted-foreground font-normal">{l.kind === "rent" ? " / Monat" : ""}</span></p>
              {l.kind === "rent" && (
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  {l.utilities ? <p className="flex justify-between"><span>Nebenkosten</span><span>{eur(l.utilities)}</span></p> : null}
                  {l.deposit ? <p className="flex justify-between"><span>Kaution</span><span>{eur(l.deposit)}</span></p> : null}
                </div>
              )}
              <div className="space-y-2 mt-4">
                {applied ? (
                  <Button disabled className="w-full">Bereits beworben ✓</Button>
                ) : (
                  <Button onClick={() => setDlg(true)} className="w-full bg-gradient-gold text-primary-foreground shadow-gold">
                    Jetzt bewerben
                  </Button>
                )}
                <Button variant="outline" onClick={save} className="w-full"><Heart className="h-4 w-4 mr-2" /> Speichern</Button>
                <Link to={`/markt?near=${l.id}&r=10`}>
                  <Button variant="ghost" className="w-full"><Target className="h-4 w-4 mr-2" /> Ähnliche in der Nähe</Button>
                </Link>
              </div>
              <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary" /> Direkt vom Eigentümer · keine Maklerprovision
              </p>
              <a
                href={`mailto:leonboomgaarden@gmail.com?subject=${encodeURIComponent(`Inserat melden: ${l.id}`)}&body=${encodeURIComponent(`Hallo,\n\nIch möchte das folgende Inserat melden:\n${typeof window !== "undefined" ? window.location.href : ""}\n\nGrund (z. B. irreführend, betrügerisch, Diskriminierung, Urheberrechtsverstoß):\n\n`)}`}
                className="block text-[11px] text-muted-foreground hover:text-foreground mt-2 underline"
              >
                Inserat melden
              </a>
            </Card>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Hilfe in deiner Nähe
              </p>
              <SponsoredSlot
                placement="listing_sidebar"
                zip={l.zip}
                city={l.city}
                kind={l.kind}
                contextListingId={l.id}
                limit={1}
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                Klar gekennzeichnet, getrennt vom Inserat.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bewerbung senden</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Dein Bewerber-Profil wird sicher übermittelt. Der Eigentümer sieht: Name, Einkommen, Beschäftigung, Haushaltsgröße, SCHUFA-Status.
            </p>
            <Textarea rows={5} placeholder="Persönliche Nachricht (optional)…" value={msg} onChange={(e) => setMsg(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(false)}>Abbrechen</Button>
            <Button onClick={apply} className="bg-gradient-gold text-primary-foreground shadow-gold">
              <Euro className="h-4 w-4 mr-1" /> Bewerbung senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LegalFooter />
      </div>
  );
};

export default MarktDetail;
