import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  Home, Building2, Users, Wrench, Wallet, Receipt, Calculator,
  Inbox, MessageSquare, CalendarCheck, FileText, Lock, Settings as SettingsIcon,
  Megaphone, TrendingUp, Search, IdCard, Scale, Banknote, ScanLine, Sparkles,
} from "lucide-react";

type NavCmd = { label: string; to: string; icon: any; hint?: string; keywords?: string };

const NAV: NavCmd[] = [
  { label: "Dashboard", to: "/app", icon: Home },
  { label: "Mein Plan / Aufgaben", to: "/app/tasks", icon: CalendarCheck, keywords: "tasks todo" },
  { label: "Nachrichten", to: "/app/messenger", icon: MessageSquare },
  { label: "Smart Inbox", to: "/app/inbox", icon: Inbox, keywords: "mail email" },
  { label: "Objekte", to: "/app/properties", icon: Building2, keywords: "immobilien properties" },
  { label: "Mieter", to: "/app/tenants", icon: Users },
  { label: "Tickets & Schäden", to: "/app/tickets", icon: Wrench, keywords: "issues schaden" },
  { label: "Zahlungen", to: "/app/payments", icon: Wallet },
  { label: "Mahnwesen", to: "/app/dunning", icon: Banknote, keywords: "mahnung dunning" },
  { label: "Ausgaben & Belege", to: "/app/expenses", icon: Receipt },
  { label: "Banking", to: "/app/banking", icon: Banknote },
  { label: "Nebenkosten (NKA)", to: "/app/nebenkosten", icon: Calculator },
  { label: "Steuer-Brücke", to: "/app/tax-bridge", icon: FileText, keywords: "steuer tax" },
  { label: "Inserate", to: "/app/listings", icon: Megaphone },
  { label: "Bewerbungen", to: "/app/listing-applications", icon: FileText },
  { label: "Marktplatz", to: "/app/marketplace", icon: Search },
  { label: "Bewertung / AVM", to: "/app/valuation", icon: TrendingUp },
  { label: "Benchmark", to: "/app/benchmark", icon: TrendingUp },
  { label: "Mein Pass", to: "/app/tenant-pass", icon: IdCard },
  { label: "Mieter-Suche-Profil", to: "/app/seeker-profile", icon: IdCard },
  { label: "Recht-Ecke", to: "/app/law", icon: Scale },
  { label: "Tresor / Vault", to: "/app/vault", icon: Lock },
  { label: "Vorlagen", to: "/app/templates", icon: FileText },
  { label: "Beraterzugang", to: "/app/advisor", icon: Sparkles },
  { label: "Einstellungen", to: "/app/settings", icon: SettingsIcon },
  { label: "Profil", to: "/app/profile", icon: SettingsIcon },
  { label: "Dokument scannen", to: "/app/vault?scan=1", icon: ScanLine, keywords: "scan ocr" },
];

interface Hit { id: string; label: string; sub?: string; to: string; icon: any; }

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || q.trim().length < 2) { setHits([]); return; }
    const term = `%${q.trim()}%`;
    let cancelled = false;
    (async () => {
      const [props, tenants, listings] = await Promise.all([
        supabase.from("properties").select("id,name,city,zip").ilike("name", term).limit(5),
        supabase.from("tenants").select("id,full_name").ilike("full_name", term).limit(5),
        supabase.from("listings").select("id,title,city").ilike("title", term).limit(5),
      ]);
      if (cancelled) return;
      const out: Hit[] = [
        ...(props.data || []).map((p: any) => ({
          id: `p-${p.id}`, label: p.name, sub: [p.zip, p.city].filter(Boolean).join(" · "),
          to: `/app/properties/${p.id}`, icon: Building2,
        })),
        ...(tenants.data || []).map((t: any) => ({
          id: `t-${t.id}`, label: t.full_name, sub: "Mieter",
          to: `/app/tenants/${t.id}`, icon: Users,
        })),
        ...(listings.data || []).map((l: any) => ({
          id: `l-${l.id}`, label: l.title, sub: l.city || "Inserat",
          to: `/markt/${l.id}`, icon: Megaphone,
        })),
      ];
      setHits(out);
    })();
    return () => { cancelled = true; };
  }, [q, open]);

  const go = (to: string) => { setOpen(false); setQ(""); nav(to); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Suchen oder springen … (⌘K)" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>Keine Treffer.</CommandEmpty>
        {hits.length > 0 && (
          <>
            <CommandGroup heading="Treffer">
              {hits.map((h) => (
                <CommandItem key={h.id} value={`${h.label} ${h.sub || ""}`} onSelect={() => go(h.to)}>
                  <h.icon className="mr-2 h-4 w-4" />
                  <span>{h.label}</span>
                  {h.sub && <span className="ml-2 text-xs text-muted-foreground">{h.sub}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Navigation">
          {NAV.map((n) => (
            <CommandItem key={n.to} value={`${n.label} ${n.keywords || ""}`} onSelect={() => go(n.to)}>
              <n.icon className="mr-2 h-4 w-4" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
