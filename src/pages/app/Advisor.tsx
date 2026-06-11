import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Copy, Trash2, Eye, Calendar, Mail, Link as LinkIcon, ShieldCheck, Send, Sparkles, UserCheck, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { date } from "@/lib/format";

const Advisor = () => {
  const [items, setItems] = useState<any[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [directory, setDirectory] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ advisor_name: "", advisor_email: "" });
  const [invForm, setInvForm] = useState({ advisor_name: "", advisor_email: "", can_write: false });
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);

  useEffect(() => { document.title = "Steuerberater · ImmonIQ"; load(); }, []);

  const load = async () => {
    const [links, dir, mand, inv] = await Promise.all([
      supabase.from("advisor_links").select("*").order("created_at", { ascending: false }),
      supabase.from("advisor_directory").select("*").order("partner_status", { ascending: true }).limit(5),
      supabase.from("advisor_mandates").select("*").order("created_at", { ascending: false }),
      supabase.from("advisor_invites").select("*").is("accepted_at", null).order("created_at", { ascending: false }),
    ]);
    setItems(links.data ?? []);
    setDirectory(dir.data ?? []);
    setMandates(mand.data ?? []);
    setInvites(inv.data ?? []);
  };

  const submit = async () => {
    if (!form.advisor_name.trim()) return toast.error("Name fehlt");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: any = { user_id: user.id, advisor_name: form.advisor_name.trim() };
    if (form.advisor_email.trim()) payload.advisor_email = form.advisor_email.trim();
    const { error } = await supabase.from("advisor_links").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Steuerberater-Link erstellt.");
    setOpen(false);
    setForm({ advisor_name: "", advisor_email: "" });
    load();
  };

  const linkFor = (token: string) => `${window.location.origin}/advisor/${token}`;

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(linkFor(token));
    toast.success("Link kopiert.");
  };

  const revoke = async (id: string) => {
    if (!confirm("Zugriff wirklich widerrufen? Der Link funktioniert dann nicht mehr.")) return;
    const { error } = await supabase.from("advisor_links").update({ revoked: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Zugriff widerrufen.");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    await supabase.from("advisor_links").delete().eq("id", id);
    load();
  };

  const inviteLinkFor = (token: string) => `${window.location.origin}/berater/einladung/${token}`;

  const createInvite = async () => {
    if (!invForm.advisor_name.trim() || !invForm.advisor_email.trim()) return toast.error("Name und E-Mail nötig");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("advisor_invites").insert({
      landlord_user_id: user.id,
      advisor_name: invForm.advisor_name.trim(),
      advisor_email: invForm.advisor_email.trim(),
      can_write: invForm.can_write,
    }).select("token").single();
    if (error) return toast.error(error.message);
    setCreatedInviteLink(inviteLinkFor(data.token));
    toast.success("Einladung erstellt.");
    setInvForm({ advisor_name: "", advisor_email: "", can_write: false });
    load();
  };

  const setWritable = async (mandateId: string, can_write: boolean) => {
    const { error } = await supabase.from("advisor_mandates").update({ can_write }).eq("id", mandateId);
    if (error) return toast.error(error.message);
    toast.success(can_write ? "Schreibrechte aktiv." : "Nur noch Leserechte.");
    load();
  };

  const revokeMandate = async (mandateId: string) => {
    if (!confirm("Zugriff für diesen Steuerberater wirklich entziehen?")) return;
    const { error } = await supabase.from("advisor_mandates").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", mandateId);
    if (error) return toast.error(error.message);
    toast.success("Zugriff entzogen.");
    load();
  };

  const deleteInvite = async (id: string) => {
    await supabase.from("advisor_invites").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" /> Steuerberater-Zugang</h1>
          <p className="text-muted-foreground text-sm mt-1">Read-only Link für deinen Steuerberater · 90 Tage gültig · jederzeit widerrufbar</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground shadow-gold">
              <UserPlus className="h-4 w-4 mr-2" /> Steuerberater einladen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Neuen Lese-Zugang erstellen</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.advisor_name} onChange={(e) => setForm({ ...form, advisor_name: e.target.value })} placeholder="z. B. StB Müller" /></div>
              <div><Label>E-Mail (optional)</Label><Input type="email" value={form.advisor_email} onChange={(e) => setForm({ ...form, advisor_email: e.target.value })} placeholder="kanzlei@example.de" /></div>
              <p className="text-xs text-muted-foreground">Es wird ein eindeutiger Link erzeugt. Du teilst diesen Link manuell (E-Mail/WhatsApp). Der Steuerberater braucht keinen Account.</p>
            </div>
            <DialogFooter><Button onClick={submit} className="bg-gradient-gold text-primary-foreground shadow-gold">Link erstellen</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* === Account-basierte Berater (empfohlen) === */}
      <Card className="p-5 glass border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="font-bold flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /> Steuerberater mit Account</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Sicher · DSGVO · Audit-Trail · optional Schreibrechte (Belege buchen, Anlage V vorbereiten)
            </p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setCreatedInviteLink(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground shadow-gold">
                <UserPlus className="h-4 w-4 mr-2" /> Berater einladen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Steuerberater einladen</DialogTitle></DialogHeader>
              {!createdInviteLink ? (
                <div className="space-y-3">
                  <div><Label>Name *</Label><Input value={invForm.advisor_name} onChange={(e) => setInvForm({ ...invForm, advisor_name: e.target.value })} placeholder="StB Müller" /></div>
                  <div><Label>E-Mail *</Label><Input type="email" value={invForm.advisor_email} onChange={(e) => setInvForm({ ...invForm, advisor_email: e.target.value })} placeholder="kanzlei@example.de" /></div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <p className="text-sm font-medium">Schreibrechte erlauben</p>
                      <p className="text-xs text-muted-foreground">Berater darf Belege & Buchungen eintragen (markiert als „vom Steuerberater")</p>
                    </div>
                    <Switch checked={invForm.can_write} onCheckedChange={(v) => setInvForm({ ...invForm, can_write: v })} />
                  </div>
                  <p className="text-xs text-muted-foreground">Berater bekommt einen Magic-Link. 1 Klick → Account erstellt / eingeloggt → Mandant verknüpft. Jederzeit widerrufbar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">Einladung erstellt. Schick diesen Link an deinen Berater:</p>
                  <div className="p-3 bg-muted/40 rounded-lg text-xs font-mono break-all">{createdInviteLink}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(createdInviteLink); toast.success("Link kopiert."); }}><Copy className="h-3.5 w-3.5 mr-1.5" />Kopieren</Button>
                    <a className="flex-1" href={`mailto:${invForm.advisor_email}?subject=${encodeURIComponent("Einladung: Mandanten-Zugriff bei ImmonIQ")}&body=${encodeURIComponent(`Hallo,\n\nüber folgenden Link kannst du dich kostenlos als mein Steuerberater bei ImmonIQ anmelden und siehst danach all meine Daten — sicher, DSGVO-konform, mit Audit-Trail:\n\n${createdInviteLink}\n\nDanke!`)}`}>
                      <Button className="w-full bg-gradient-gold text-primary-foreground shadow-gold"><Send className="h-3.5 w-3.5 mr-1.5" />Per E-Mail</Button>
                    </a>
                  </div>
                </div>
              )}
              {!createdInviteLink && <DialogFooter><Button onClick={createInvite} className="bg-gradient-gold text-primary-foreground shadow-gold">Einladung erstellen</Button></DialogFooter>}
            </DialogContent>
          </Dialog>
        </div>

        {mandates.filter((m) => m.status === "active").length === 0 && invites.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Noch keine Berater mit Account verknüpft.</p>
        ) : (
          <div className="space-y-2">
            {mandates.filter((m) => m.status === "active").map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-background/60 border border-border/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{m.advisor_name || m.advisor_email || "Berater"}</span>
                    <Badge className="bg-success/15 text-success border-success/30">Aktiv</Badge>
                    {m.can_write && <Badge variant="outline"><Pencil className="h-3 w-3 mr-1" />Schreibrechte</Badge>}
                  </div>
                  {m.advisor_email && <p className="text-xs text-muted-foreground">{m.advisor_email}</p>}
                  {m.last_accessed_at && <p className="text-[11px] text-muted-foreground">Zuletzt aktiv: {date(m.last_accessed_at)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <Switch checked={m.can_write} onCheckedChange={(v) => setWritable(m.id, v)} />
                    Schreiben
                  </label>
                  <Button size="sm" variant="outline" onClick={() => revokeMandate(m.id)}><X className="h-3.5 w-3.5 mr-1" />Entziehen</Button>
                </div>
              </div>
            ))}
            {invites.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-background/60 border border-dashed border-border/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{i.advisor_name}</span>
                    <Badge variant="secondary">Wartet auf Annahme</Badge>
                    {i.can_write && <Badge variant="outline">+ Schreibrechte</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{i.advisor_email} · läuft ab {date(i.expires_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(inviteLinkFor(i.token)); toast.success("Link kopiert."); }}><Copy className="h-3.5 w-3.5 mr-1" />Link</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteInvite(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 glass bg-gradient-to-br from-primary/5 to-transparent">
        <h2 className="font-bold mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Alt: Token-Link (ohne Account)</h2>
        <ul className="text-sm text-muted-foreground space-y-1 leading-relaxed">
          <li>• Du erstellst einen Link für deinen Steuerberater (z. B. deine Partnerin 😉)</li>
          <li>• Dein Steuerberater öffnet den Link — <strong>kein Account, kein Login</strong> nötig</li>
          <li>• Er sieht alle Objekte, Mieter, Zahlungen, Belege, Steuer-Brücke <strong>nur lesend</strong></li>
          <li>• Link läuft nach <strong>90 Tagen automatisch ab</strong>. Du kannst ihn jederzeit widerrufen.</li>
          <li>• Jeder Zugriff wird protokolliert (Anzahl Aufrufe, letzter Zugriff)</li>
        </ul>
      </Card>

      {items.length === 0 ? (
        <Card className="p-10 text-center glass">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Noch keine Steuerberater eingeladen.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const expired = new Date(it.expires_at) < new Date();
            const status = it.revoked ? "revoked" : expired ? "expired" : "active";
            return (
              <Card key={it.id} className="p-5 glass">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{it.advisor_name}</h3>
                      {status === "active" && <Badge className="bg-success/15 text-success border-success/30">Aktiv</Badge>}
                      {status === "revoked" && <Badge variant="destructive">Widerrufen</Badge>}
                      {status === "expired" && <Badge variant="secondary">Abgelaufen</Badge>}
                    </div>
                    {it.advisor_email && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" />{it.advisor_email}</p>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Läuft ab: {date(it.expires_at)}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{it.access_count} Zugriffe</span>
                      {it.last_accessed_at && <span>Zuletzt: {date(it.last_accessed_at)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {status === "active" && it.advisor_email && (
                      <a href={`mailto:${it.advisor_email}?subject=${encodeURIComponent("Lese-Zugang zu meinen Immobilien-Unterlagen")}&body=${encodeURIComponent(`Hallo ${it.advisor_name},\n\nüber den folgenden Link bekommst du 90 Tage lang Lese-Zugriff auf alle meine Objekte, Mieter, Zahlungen und Belege bei ImmonIQ — ohne Account, ohne Login:\n\n${linkFor(it.token)}\n\nViele Grüße`)}`}>
                        <Button size="sm" className="bg-gradient-gold text-primary-foreground shadow-gold">
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Einladung senden
                        </Button>
                      </a>
                    )}
                    {status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => copyLink(it.token)}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Link
                      </Button>
                    )}
                    {!it.revoked && (
                      <Button size="sm" variant="outline" onClick={() => revoke(it.id)}>
                        Widerrufen
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(it.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {status === "active" && (
                  <div className="mt-3 p-2.5 bg-muted/40 rounded-lg flex items-center gap-2 text-xs font-mono break-all">
                    <LinkIcon className="h-3 w-3 flex-shrink-0 text-primary" />
                    <span className="truncate">{linkFor(it.token)}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {directory.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border/60">
          <div>
            <h2 className="text-xl font-bold">Andere Steuerberater in deiner Nähe</h2>
            <p className="text-sm text-muted-foreground mt-1">Geprüftes Verzeichnis · sortiert nach Partner-Status.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {directory.map((d) => (
              <Card key={d.id} className="p-4 glass">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{d.name}</p>
                    {d.firm && <p className="text-sm text-muted-foreground truncate">{d.firm}</p>}
                  </div>
                  {d.partner_status === "partner" && (
                    <Badge className="bg-gradient-gold text-primary-foreground border-0">Partner</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{[d.zip, d.city].filter(Boolean).join(" ")}</p>
                {d.immobilien_focus && (
                  <Badge variant="outline" className="mt-2 text-[10px]">Immobilien-Schwerpunkt</Badge>
                )}
                <div className="flex flex-wrap gap-3 mt-3 text-xs">
                  {d.email && <a href={`mailto:${d.email}`} className="text-primary hover:underline flex items-center gap-1"><Mail className="h-3 w-3" />E-Mail</a>}
                  {d.website && <a href={d.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">Website ↗</a>}
                  {d.phone && <span className="text-muted-foreground">{d.phone}</span>}
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">
            Du bist Steuerberater? Werde Partner: <a href="mailto:leonboomgaarden@gmail.com" className="text-primary hover:underline">leonboomgaarden@gmail.com</a>
          </p>
        </div>
      )}
    </div>
  );
};

export default Advisor;
