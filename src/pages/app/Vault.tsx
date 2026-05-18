import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stagger, Item } from "@/components/motion/Primitives";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { num, date } from "@/lib/format";
import { pendingIngest } from "@/lib/ingest";
import { useSearchParams } from "react-router-dom";
import {
  Lock, ShieldCheck, KeyRound, FileText, Eye, EyeOff,
  Fingerprint, ServerCrash, CheckCircle2, AlertTriangle,
  Upload, Search, Download, Trash2, Building2, Filter,
  FileImage, FileType2, Sparkles, Clock, Camera, Zap,
} from "lucide-react";
import {
  buildVerifier, verifyPin, encryptBytes, decryptBytes, b64, randomBytes, deriveKey,
} from "@/lib/vaultCrypto";
import {
  platformAuthenticatorAvailable, hasBiometricSetup,
  enrollBiometric, unlockWithBiometric, clearBiometric,
} from "@/lib/vaultBiometric";
import { VaultUnlockAnimation } from "@/components/VaultUnlockAnimation";
import { AnimatePresence as AP } from "framer-motion";

type VaultDoc = {
  id: string;
  property_id: string | null;
  category: string;
  scope: "immo" | "personal";
  display_name: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number;
  storage_path: string;
  enc_iv: string;
  enc_salt: string;
  notes: string | null;
  retention_until: string | null;
  created_at: string;
};

type Property = { id: string; name: string };

type Cat = { value: string; label: string; emoji: string };

const IMMO_CATEGORIES: Cat[] = [
  { value: "kaufvertrag", label: "Kaufvertrag", emoji: "📜" },
  { value: "mietvertrag", label: "Mietvertrag", emoji: "🤝" },
  { value: "nebenkostenabrechnung", label: "Nebenkostenabrechnung", emoji: "🧾" },
  { value: "versicherung", label: "Versicherung", emoji: "🛡️" },
  { value: "steuerbescheid", label: "Steuerbescheid", emoji: "🏛️" },
  { value: "grundbuch", label: "Grundbuchauszug", emoji: "📕" },
  { value: "energieausweis", label: "Energieausweis", emoji: "⚡" },
  { value: "rechnung", label: "Rechnung", emoji: "💶" },
  { value: "protokoll", label: "Protokoll", emoji: "📋" },
  { value: "korrespondenz", label: "Korrespondenz", emoji: "✉️" },
  { value: "foto", label: "Foto", emoji: "📸" },
  { value: "sonstiges", label: "Sonstiges", emoji: "📁" },
];

const PERSONAL_CATEGORIES: Cat[] = [
  { value: "ausweis", label: "Personalausweis / Pass", emoji: "🪪" },
  { value: "fuehrerschein", label: "Führerschein", emoji: "🚗" },
  { value: "mietvertrag", label: "Eigener Mietvertrag", emoji: "🤝" },
  { value: "arbeit", label: "Arbeit & Gehalt", emoji: "💼" },
  { value: "bank", label: "Bank & Finanzen", emoji: "🏦" },
  { value: "versicherung", label: "Versicherungen", emoji: "🛡️" },
  { value: "gesundheit", label: "Gesundheit", emoji: "🩺" },
  { value: "kfz", label: "KFZ & Mobilität", emoji: "🚙" },
  { value: "familie", label: "Familie & Urkunden", emoji: "👨‍👩‍👧" },
  { value: "schule", label: "Schule & Zeugnisse", emoji: "🎓" },
  { value: "steuerbescheid", label: "Steuerbescheid", emoji: "🏛️" },
  { value: "vertrag", label: "Verträge sonstige", emoji: "📄" },
  { value: "rechnung", label: "Rechnung / Beleg", emoji: "💶" },
  { value: "korrespondenz", label: "Behörden / Briefe", emoji: "✉️" },
  { value: "sonstiges", label: "Sonstiges", emoji: "📁" },
];

const CATEGORIES = [...IMMO_CATEGORIES, ...PERSONAL_CATEGORIES.filter(p => !IMMO_CATEGORIES.find(i => i.value === p.value))];

const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${num(n / 1024, 1)} KB`;
  return `${num(n / 1024 / 1024, 1)} MB`;
};

const Vault = () => {
  // Setup state
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [setupForm, setSetupForm] = useState({ pin: "", confirm: "" });
  const [unlocking, setUnlocking] = useState(false);

  // Unlock state
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [shake, setShake] = useState(false);
  const keyRef = useRef<CryptoKey | null>(null);

  // Biometrie + Animation
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnrolled, setBioEnrolled] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [showUnlockAnim, setShowUnlockAnim] = useState(false);
  const [enrollPromptOpen, setEnrollPromptOpen] = useState(false);
  const lastPinRef = useRef<string>("");

  // Data
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  // Filter
  const [search, setSearch] = useState("");
  const [filterProp, setFilterProp] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [scope, setScope] = useState<"immo" | "personal">("immo");

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    display_name: "", category: "sonstiges", property_id: "", notes: "", retention_until: "",
  });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    document.title = "Tresor · ImmonIQ";
    loadSettings();
    setBioEnrolled(hasBiometricSetup());
    platformAuthenticatorAvailable().then(setBioAvailable);
  }, []);

  // Wenn Scanner / externer Flow eine Datei "geliefert" hat, automatisch nach Unlock speichern.
  const [searchParams, setSearchParams] = useSearchParams();

  // Scope aus URL übernehmen (?scope=personal | immo)
  useEffect(() => {
    const s = searchParams.get("scope");
    if (s === "personal" || s === "immo") setScope(s);
  }, [searchParams]);

  useEffect(() => {
    if (unlocked && searchParams.get("ingest") === "1" && pendingIngest.has()) {
      const file = pendingIngest.take();
      if (file) {
        setTimeout(() => quickSaveFile(file), 200);
      }
      const next = new URLSearchParams(searchParams);
      next.delete("ingest");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, searchParams]);

  const switchScope = (s: "immo" | "personal") => {
    setScope(s);
    setFilterCat("all");
    setFilterProp("all");
    const next = new URLSearchParams(searchParams);
    if (s === "personal") next.set("scope", "personal"); else next.delete("scope");
    setSearchParams(next, { replace: true });
  };

  const loadSettings = async () => {
    const { data } = await supabase.from("vault_settings").select("*").maybeSingle();
    setHasPin(!!data);
  };

  const loadData = useCallback(async () => {
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("vault_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("id,name").order("name"),
    ]);
    setDocs((d ?? []) as any);
    setProperties((p ?? []) as any);
  }, []);

  // Auto-lock after 15 min idle
  useEffect(() => {
    if (!unlocked) return;
    const t = setTimeout(() => lock(), 15 * 60 * 1000);
    return () => clearTimeout(t);
  }, [unlocked, docs]);

  const setupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupForm.pin.length < 6) return toast.error("PIN muss mindestens 6 Zeichen haben");
    if (setupForm.pin !== setupForm.confirm) return toast.error("PINs stimmen nicht überein");
    setUnlocking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      const v = await buildVerifier(setupForm.pin);
      const { error } = await supabase.from("vault_settings").insert({
        user_id: user.id, ...v,
      });
      if (error) throw error;
      const key = await deriveKey(setupForm.pin, v.pin_salt);
      keyRef.current = key;
      lastPinRef.current = setupForm.pin;
      setUnlocked(true);
      setHasPin(true);
      await loadData();
      toast.success("Tresor erstellt & geöffnet");
      if (bioAvailable) setTimeout(() => setEnrollPromptOpen(true), 600);
    } catch (e: any) {
      toast.error(e.message ?? "Fehler beim Anlegen");
    } finally {
      setUnlocking(false);
    }
  };

  const finalizeUnlock = async (key: CryptoKey, rawPin: string, viaBio: boolean) => {
    keyRef.current = key;
    lastPinRef.current = rawPin;
    setShowUnlockAnim(true);
    await loadData();
    // Animation läuft ~1.1s; danach auf entsperrte Ansicht wechseln
    setTimeout(() => {
      setUnlocked(true);
      setPin("");
      setShowUnlockAnim(false);
      // Biometrie-Enroll anbieten, wenn verfügbar und noch nicht eingerichtet und gerade per PIN entsperrt
      if (!viaBio && bioAvailable && !hasBiometricSetup()) {
        setEnrollPromptOpen(true);
      }
    }, 1100);
  };

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setShake(true); setTimeout(() => setShake(false), 400); return;
    }
    setUnlocking(true);
    try {
      const { data, error } = await supabase.from("vault_settings").select("*").maybeSingle();
      if (error || !data) throw new Error("Tresor-Setup nicht gefunden");
      const key = await verifyPin(pin, data.pin_salt, data.verifier_iv, data.verifier_ct);
      if (!key) {
        setShake(true); setTimeout(() => setShake(false), 400);
        toast.error("Falscher PIN");
        return;
      }
      await finalizeUnlock(key, pin, false);
    } catch (e: any) {
      toast.error(e.message ?? "Fehler");
    } finally {
      setUnlocking(false);
    }
  };

  const unlockBio = async () => {
    if (!bioEnrolled) return;
    setBioBusy(true);
    try {
      const recoveredPin = await unlockWithBiometric();
      const { data, error } = await supabase.from("vault_settings").select("*").maybeSingle();
      if (error || !data) throw new Error("Tresor-Setup nicht gefunden");
      const key = await verifyPin(recoveredPin, data.pin_salt, data.verifier_iv, data.verifier_ct);
      if (!key) {
        // Lokaler PIN passt nicht mehr — Biometrie zurücksetzen
        clearBiometric();
        setBioEnrolled(false);
        toast.error("Biometrie ungültig — bitte PIN eingeben");
        return;
      }
      await finalizeUnlock(key, recoveredPin, true);
    } catch (e: any) {
      // NotAllowedError = abgebrochen — still
      if (e?.name !== "NotAllowedError") {
        toast.error(e?.message ?? "Biometrie fehlgeschlagen");
      }
    } finally {
      setBioBusy(false);
    }
  };

  const enrollBio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      await enrollBiometric(lastPinRef.current, user.id, user.email ?? "user");
      setBioEnrolled(true);
      setEnrollPromptOpen(false);
      toast.success("Biometrie aktiviert — beim nächsten Öffnen verfügbar");
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") {
        toast.error(e?.message ?? "Aktivierung fehlgeschlagen");
      }
    }
  };

  const disableBio = () => {
    clearBiometric();
    setBioEnrolled(false);
    toast.success("Biometrie deaktiviert");
  };

  const lock = () => {
    keyRef.current = null;
    lastPinRef.current = "";
    setUnlocked(false);
    setDocs([]);
  };

  // ---------- Upload ----------
  const handleFile = (f: File) => {
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Datei zu groß (max. 25 MB)");
      return;
    }
    setUploadFile(f);
    setUploadForm((s) => ({ ...s, display_name: s.display_name || f.name.replace(/\.[^.]+$/, "") }));
    setUploadOpen(true);
  };

  // Schnell-Scan: Datei direkt verschlüsseln & speichern, ohne Dialog
  const [quickSaving, setQuickSaving] = useState(false);
  const quickSaveFile = async (f: File) => {
    if (f.size > 25 * 1024 * 1024) return toast.error("Datei zu groß (max. 25 MB)");
    if (!keyRef.current) return toast.error("Tresor ist gesperrt");
    setQuickSaving(true);
    const t = toast.loading("Verschlüssele & speichere…");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");
      const buf = await f.arrayBuffer();
      const salt = b64.enc(randomBytes(16));
      const { iv, ct } = await encryptBytes(keyRef.current, buf);
      const path = `${user.id}/${crypto.randomUUID()}.bin`;
      const { error: upErr } = await supabase.storage
        .from("vault").upload(path, new Blob([ct]), { contentType: "application/octet-stream" });
      if (upErr) throw upErr;
      const niceName = f.name.replace(/\.[^.]+$/, "") || `Scan ${new Date().toLocaleString("de-DE")}`;
      const isImage = (f.type || "").startsWith("image/");
      const { error: dbErr } = await supabase.from("vault_documents").insert({
        user_id: user.id,
        property_id: scope === "immo" && filterProp !== "all" ? filterProp : null,
        scope,
        category: (isImage ? (scope === "personal" ? "sonstiges" : "foto") : "sonstiges") as any,
        display_name: niceName,
        original_name: f.name,
        mime_type: f.type || "application/octet-stream",
        size_bytes: f.size,
        storage_path: path,
        enc_iv: iv,
        enc_salt: salt,
        notes: null,
        retention_until: null,
      } as any);
      if (dbErr) throw dbErr;
      toast.success("Im Tresor gespeichert", { id: t });
      loadData();
    } catch (e: any) {
      toast.error(e.message ?? "Speichern fehlgeschlagen", { id: t });
    } finally {
      setQuickSaving(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const f of arr) await quickSaveFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const fs = e.dataTransfer.files;
    if (fs && fs.length > 0) handleFiles(fs);
  };

  const submitUpload = async () => {
    if (!uploadFile || !keyRef.current) return;
    if (!uploadForm.display_name.trim()) return toast.error("Name fehlt");
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const buf = await uploadFile.arrayBuffer();
      const salt = b64.enc(randomBytes(16));
      const fileKey = await deriveKey(
        // file-specific key derived again with random salt + same pin-derived "anchor"
        // simpler: reuse keyRef but bind iv/salt per file
        "binding", salt
      ).catch(() => keyRef.current!);
      // Use the unlocked master key directly (still unique IV per file)
      const masterKey = keyRef.current!;
      const { iv, ct } = await encryptBytes(masterKey, buf);

      const path = `${user.id}/${crypto.randomUUID()}.bin`;
      const { error: upErr } = await supabase.storage
        .from("vault")
        .upload(path, new Blob([ct]), { contentType: "application/octet-stream" });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("vault_documents").insert({
        user_id: user.id,
        property_id: scope === "immo" ? (uploadForm.property_id || null) : null,
        scope,
        category: uploadForm.category as any,
        display_name: uploadForm.display_name.trim(),
        original_name: uploadFile.name,
        mime_type: uploadFile.type || "application/octet-stream",
        size_bytes: uploadFile.size,
        storage_path: path,
        enc_iv: iv,
        enc_salt: salt,
        notes: uploadForm.notes || null,
        retention_until: uploadForm.retention_until || null,
      } as any);
      if (dbErr) throw dbErr;

      toast.success("Verschlüsselt & gespeichert");
      setUploadOpen(false);
      setUploadFile(null);
      setUploadForm({ display_name: "", category: "sonstiges", property_id: "", notes: "", retention_until: "" });
      loadData();
    } catch (e: any) {
      toast.error(e.message ?? "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (d: VaultDoc) => {
    if (!keyRef.current) return;
    try {
      const { data, error } = await supabase.storage.from("vault").download(d.storage_path);
      if (error || !data) throw error ?? new Error("Download fehlgeschlagen");
      const ct = await data.arrayBuffer();
      const plain = await decryptBytes(keyRef.current, d.enc_iv, ct);
      const blob = new Blob([plain], { type: d.mime_type ?? "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = d.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error("Entschlüsselung fehlgeschlagen");
    }
  };

  const deleteDoc = async (d: VaultDoc) => {
    if (!confirm(`"${d.display_name}" endgültig löschen?`)) return;
    await supabase.storage.from("vault").remove([d.storage_path]);
    await supabase.from("vault_documents").delete().eq("id", d.id);
    toast.success("Gelöscht");
    loadData();
  };

  // Derived
  const activeCats = scope === "personal" ? PERSONAL_CATEGORIES : IMMO_CATEGORIES;
  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if ((d.scope ?? "immo") !== scope) return false;
      if (scope === "immo" && filterProp !== "all" && d.property_id !== filterProp) return false;
      if (filterCat !== "all" && d.category !== filterCat) return false;
      if (search && !d.display_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [docs, search, filterProp, filterCat, scope]);
  const scopedDocs = useMemo(() => docs.filter((d) => (d.scope ?? "immo") === scope), [docs, scope]);

  const totalSize = docs.reduce((a, d) => a + d.size_bytes, 0);

  // ----- Render -----
  if (hasPin === null) {
    return <div className="h-64 flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  // PIN setup screen
  if (!hasPin) {
    return (
      <Stagger className="space-y-6 max-w-2xl mx-auto">
        <Item>
          <div className="text-center">
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">Erste Einrichtung</p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Erstelle deinen <span className="text-gradient-gold">Tresor-PIN</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Dieser PIN verschlüsselt alle deine Dokumente <strong>auf deinem Gerät</strong> —
              bevor sie unsere Server überhaupt sehen.
            </p>
          </div>
        </Item>
        <Item variant="scale">
          <Card className="vault-surface text-white p-8 lg:p-10">
            <form onSubmit={setupPin} className="space-y-5 max-w-sm mx-auto">
              <div>
                <Label className="text-white/80 text-xs">Tresor-PIN (mind. 6 Zeichen)</Label>
                <Input
                  type="password"
                  value={setupForm.pin}
                  onChange={(e) => setSetupForm({ ...setupForm, pin: e.target.value })}
                  className="mt-1.5 h-12 bg-white/5 border-white/20 text-white text-lg tracking-widest"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-white/80 text-xs">PIN bestätigen</Label>
                <Input
                  type="password"
                  value={setupForm.confirm}
                  onChange={(e) => setSetupForm({ ...setupForm, confirm: e.target.value })}
                  className="mt-1.5 h-12 bg-white/5 border-white/20 text-white text-lg tracking-widest"
                />
              </div>
              <Button type="submit" disabled={unlocking} size="lg" className="w-full bg-gradient-gold text-black hover:opacity-90 shadow-gold font-bold h-12">
                {unlocking ? "Wird erstellt…" : "Tresor erstellen"}
              </Button>
              <div className="text-[11px] text-white/50 leading-relaxed border-t border-white/10 pt-4">
                <p className="font-semibold text-white/70 mb-1 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-warning" /> Wichtig</p>
                Dein PIN wird <strong>NICHT</strong> auf unseren Servern gespeichert.
                Wenn du ihn vergisst, sind die Dokumente unwiederbringlich verloren —
                so funktioniert echte Zero-Knowledge-Sicherheit.
              </div>
            </form>
          </Card>
        </Item>
      </Stagger>
    );
  }

  // Unlock screen
  if (!unlocked) {
    return (
      <Stagger className="space-y-6 max-w-4xl mx-auto">
        <Item>
          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">Sicherer Bereich</p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Dokumenten-<span className="text-gradient-gold">Tresor</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Alles für dein Eigentum — verschlüsselt, sortiert, in Sekunden findbar.
            </p>
          </div>
        </Item>

        <Item>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: KeyRound, title: "AES-256 Zero-Knowledge", desc: "Auf deinem Gerät verschlüsselt" },
              { icon: ServerCrash, title: "Server in Frankfurt", desc: "DSGVO, DE-Jurisdiktion" },
              { icon: Fingerprint, title: "Auto-Lock 15 Min", desc: "Schließt nach Inaktivität" },
            ].map((b) => (
              <Card key={b.title} className="p-4 glass flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <b.icon className="h-[18px] w-[18px] text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{b.title}</p>
                  <p className="text-[11px] text-muted-foreground">{b.desc}</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
              </Card>
            ))}
          </div>
        </Item>

        <Item variant="scale">
          <motion.div animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}} transition={{ duration: 0.4 }}>
            <Card className="vault-surface text-white p-8 lg:p-12 text-center relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent pointer-events-none"
                animate={{ opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative">
                <motion.div
                  className="mx-auto w-20 h-20 rounded-3xl bg-gradient-gold flex items-center justify-center shadow-gold mb-6 vault-lock"
                  animate={{ rotate: [0, -2, 2, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Lock className="h-9 w-9 text-black" strokeWidth={2.5} />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2 text-white">Tresor verschlossen</h2>
                <p className="text-white/70 text-sm mb-8 max-w-sm mx-auto">
                  Gib deinen PIN ein. Wird lokal entschlüsselt — verlässt dein Gerät nicht.
                </p>
                <form onSubmit={unlock} className="max-w-xs mx-auto">
                  <div className="relative mb-4">
                    <input
                      type={showPin ? "text" : "password"}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      autoFocus
                      placeholder="• • • • • •"
                      className="w-full h-14 text-center text-2xl tabular tracking-[0.4em] bg-white/5 border border-white/20 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:border-primary focus:bg-white/10 transition-all"
                    />
                    <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2">
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="submit" disabled={unlocking} size="lg" className="w-full bg-gradient-gold text-black hover:opacity-90 shadow-gold font-bold h-12">
                    {unlocking ? "Entsperren…" : "Tresor öffnen"}
                  </Button>
                  {bioAvailable && bioEnrolled && (
                    <Button
                      type="button"
                      onClick={unlockBio}
                      disabled={bioBusy}
                      variant="outline"
                      size="lg"
                      className="w-full mt-3 h-12 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white gap-2"
                    >
                      <Fingerprint className="h-5 w-5" />
                      {bioBusy ? "Warte auf Freigabe…" : "Mit Biometrie öffnen"}
                    </Button>
                  )}
                  <p className="text-[11px] text-white/40 mt-6 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-3 w-3" /> Dein PIN verlässt niemals dein Gerät
                  </p>
                </form>
              </div>
            </Card>
          </motion.div>
        </Item>

        {/* Animation Overlay */}
        <AP>
          {showUnlockAnim && <VaultUnlockAnimation key="unlock-anim" onComplete={() => {}} />}
        </AP>
      </Stagger>
    );
  }

  // ===== UNLOCKED =====
  return (
    <Stagger className="space-y-6">
      <Item>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <p className="text-xs text-success font-semibold uppercase tracking-wider">Tresor entsperrt</p>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {scope === "personal" ? (
                <>Deine <span className="text-gradient-gold">Lebensbürokratie</span></>
              ) : (
                <>Dein <span className="text-gradient-gold">Eigentums-Archiv</span></>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {scope === "personal"
                ? "Personalausweis, Verträge, Bank, Versicherungen — alles griffbereit, alles verschlüsselt."
                : "Alle Dokumente zu deinen Objekten — verschlüsselt, sortiert, in Sekunden findbar."}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={lock}><Lock className="h-4 w-4 mr-2" />Sperren</Button>
            {bioAvailable && (
              bioEnrolled ? (
                <Button variant="outline" onClick={disableBio} className="gap-2" title="Biometrie für diesen Tresor entfernen">
                  <Fingerprint className="h-4 w-4 text-success" /> Biometrie aktiv
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setEnrollPromptOpen(true)} className="gap-2">
                  <Fingerprint className="h-4 w-4" /> Biometrie aktivieren
                </Button>
              )
            )}
            <input id="vault-camera-input" type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => e.target.files && handleFiles(e.target.files)} />
            <Button
              variant="outline"
              onClick={() => document.getElementById("vault-camera-input")?.click()}
              disabled={quickSaving}
              className="gap-2"
              title="Mit Kamera scannen — sofort verschlüsselt gespeichert"
            >
              <Camera className="h-4 w-4" /> Schnell-Scan
            </Button>
            <Button
              onClick={() => {
                setUploadForm((s) => ({ ...s, category: scope === "personal" ? "vertrag" : "sonstiges" }));
                setUploadOpen(true);
              }}
              className="bg-gradient-gold text-primary-foreground shadow-gold"
            >
              <Upload className="h-4 w-4 mr-2" />Mit Details
            </Button>
          </div>
        </div>
      </Item>

      {/* Scope-Toggle: Immo vs. Lebensbürokratie */}
      <Item>
        <div className="inline-flex p-1 rounded-xl bg-muted/60 border">
          <button
            onClick={() => switchScope("immo")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              scope === "immo" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🏠 Immobilien
          </button>
          <button
            onClick={() => switchScope("personal")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              scope === "personal" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🪪 Lebensbürokratie
          </button>
        </div>
      </Item>

      {/* Stats */}
      <Item>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: FileText, label: scope === "personal" ? "Persönlich" : "Objekt-Docs", value: num(scopedDocs.length) },
            { icon: Building2, label: scope === "personal" ? "Lebensbereiche" : "Objekte", value: num(scope === "personal" ? PERSONAL_CATEGORIES.length : properties.length) },
            { icon: Sparkles, label: "Speicher gesamt", value: formatBytes(totalSize) },
            { icon: ShieldCheck, label: "Verschlüsselt", value: "100 %" },
          ].map((s) => (
            <Card key={s.label} className="p-4 glass">
              <s.icon className="h-4 w-4 text-primary mb-2" />
              <p className="text-2xl font-bold tabular">{s.value}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </Card>
          ))}
        </div>
      </Item>

      {/* Filters */}
      <Item>
        <Card className="p-4 glass">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dokumente suchen…" className="pl-9" />
            </div>
            {scope === "immo" && (
              <Select value={filterProp} onValueChange={setFilterProp}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Objekte</SelectItem>
                  {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {activeCats.map((c) => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </Item>

      {/* Drop zone */}
      <Item>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById("vault-file-input")?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-6 text-center ${
            dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"
          } ${quickSaving ? "opacity-60 pointer-events-none" : ""}`}
        >
          {quickSaving ? (
            <>
              <div className="h-8 w-8 mx-auto mb-2 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-medium">Verschlüssele &amp; speichere…</p>
            </>
          ) : (
            <>
              <Zap className={`h-8 w-8 mx-auto mb-2 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-sm font-medium">Schnell ablegen — auch mehrere Dateien gleichzeitig</p>
              <p className="text-xs text-muted-foreground">Werden sofort verschlüsselt &amp; gespeichert · max. 25 MB pro Datei</p>
            </>
          )}
          <input id="vault-file-input" type="file" multiple hidden
            onChange={(e) => e.target.files && e.target.files.length > 0 && handleFiles(e.target.files)} />
        </div>
      </Item>

      {/* Documents */}
      {filtered.length === 0 ? (
        <Item>
          <Card className="p-10 text-center glass">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium mb-1">{scopedDocs.length === 0 ? (scope === "personal" ? "Noch keine persönlichen Dokumente" : "Tresor ist leer") : "Keine Treffer"}</p>
            <p className="text-sm text-muted-foreground">
              {scopedDocs.length === 0
                ? (scope === "personal"
                    ? "Personalausweis, Mietvertrag, Versicherungen, Bank-Unterlagen — einmal scannen, nie wieder suchen."
                    : "Lade dein erstes Dokument hoch — Kaufvertrag, Mietvertrag, Steuerbescheid.")
                : "Filter anpassen oder neu suchen."}
            </p>
          </Card>
        </Item>
      ) : (
        <Item>
          <div className="grid gap-2">
            <AnimatePresence>
              {filtered.map((d) => {
                const cat = CATEGORIES.find((c) => c.value === d.category);
                const prop = properties.find((p) => p.id === d.property_id);
                const isImage = d.mime_type?.startsWith("image/");
                return (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="p-4 glass interactive-card flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-gradient-gold-soft flex items-center justify-center flex-shrink-0 text-lg">
                        {cat?.emoji ?? "📁"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{d.display_name}</p>
                          <Badge variant="secondary" className="text-[10px]">{cat?.label}</Badge>
                          {prop && <Badge variant="outline" className="text-[10px]"><Building2 className="h-2.5 w-2.5 mr-1" />{prop.name}</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">{isImage ? <FileImage className="h-3 w-3" /> : <FileType2 className="h-3 w-3" />} {formatBytes(d.size_bytes)}</span>
                          <span>{date(d.created_at)}</span>
                          {d.retention_until && <span className="flex items-center gap-1 text-warning"><Clock className="h-3 w-3" />Aufbewahren bis {date(d.retention_until)}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => downloadDoc(d)} title="Herunterladen & entschlüsseln">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteDoc(d)} title="Löschen">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Item>
      )}

      <Item>
        <Card className="p-4 glass border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Aufbewahrung nach <strong>§ 147 AO</strong> (10 Jahre für Steuerunterlagen) und
              <strong> § 14b UStG</strong> (Rechnungen). ImmonIQ kann deine Inhalte nicht lesen —
              nur du mit deinem PIN.
            </p>
          </div>
        </Card>
      </Item>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Dokument verschlüsseln & speichern</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {uploadFile && (
              <div className="p-3 rounded-lg bg-muted/40 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="truncate flex-1">{uploadFile.name}</span>
                <span className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</span>
              </div>
            )}
            <div>
              <Label>Anzeigename *</Label>
              <Input value={uploadForm.display_name} onChange={(e) => setUploadForm({ ...uploadForm, display_name: e.target.value })} />
            </div>
            <div>
              <Label>Kategorie</Label>
              <Select value={uploadForm.category} onValueChange={(v) => setUploadForm({ ...uploadForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeCats.map((c) => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {scope === "immo" && (
              <div>
                <Label>Objekt (optional)</Label>
                <Select value={uploadForm.property_id || "none"} onValueChange={(v) => setUploadForm({ ...uploadForm, property_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Kein Objekt" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Objekt</SelectItem>
                    {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Aufbewahren bis</Label>
                <Input type="date" value={uploadForm.retention_until} onChange={(e) => setUploadForm({ ...uploadForm, retention_until: e.target.value })} />
              </div>
              <div>
                <Label className="opacity-0">.</Label>
                <p className="text-[10px] text-muted-foreground leading-tight pt-1">z.B. § 147 AO: 10 Jahre</p>
              </div>
            </div>
            <div>
              <Label>Notiz (optional)</Label>
              <Textarea rows={2} value={uploadForm.notes} onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Abbrechen</Button>
            <Button onClick={submitUpload} disabled={uploading} className="bg-gradient-gold text-primary-foreground shadow-gold">
              {uploading ? "Verschlüssele…" : "Verschlüsseln & speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll-Biometrie Dialog */}
      <Dialog open={enrollPromptOpen} onOpenChange={setEnrollPromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" /> Biometrie aktivieren?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Öffne den Tresor künftig per <strong>Fingerprint</strong>, <strong>Face ID</strong> oder
              <strong> Geräte-PIN</strong> — schneller und ohne PIN-Eingabe.
            </p>
            <div className="rounded-xl border bg-muted/40 p-3 text-[12px] leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> So sicher wie der PIN
              </p>
              Dein PIN wird nur <strong>auf diesem Gerät</strong> gespeichert — verschlüsselt mit einem
              Schlüssel, den nur deine Biometrie freigibt. Server sehen ihn nie. Bei Verlust des Geräts
              bleibt dein Tresor durch den ursprünglichen PIN geschützt.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollPromptOpen(false)}>Später</Button>
            <Button onClick={enrollBio} className="bg-gradient-gold text-primary-foreground shadow-gold gap-2">
              <Fingerprint className="h-4 w-4" /> Jetzt aktivieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock-Animation auch im entsperrten Zustand möglich (Edge-Cases) */}
      <AP>
        {showUnlockAnim && <VaultUnlockAnimation key="unlock-anim-2" onComplete={() => {}} />}
      </AP>
    </Stagger>
  );
};

export default Vault;
