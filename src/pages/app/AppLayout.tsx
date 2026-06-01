import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Building2, Users, Wallet, Receipt, Calculator,
  LogOut, Settings as SettingsIcon, ShieldCheck,
  Lock, Wrench, Bell, Search, Scale,
  TrendingUp, Megaphone, Inbox,
  FileText, Plus, Home, Menu, X, CalendarCheck, Search as SearchIcon, ScanLine, PartyPopper,
  Trees, Landmark, IdCard, MessageSquare, Sparkles, ToggleLeft, ToggleRight,
} from "lucide-react";
import { AskCopilot } from "@/components/AskCopilot";
import { DocScanner } from "@/components/DocScanner";
import { pendingIngest } from "@/lib/ingest";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Persona = "privat" | "vermieter" | "suchender" | "pro";

type NavItem = {
  to: string;
  label: string;
  icon: any;
  end?: boolean;
  badge?: string;
  hint?: string;
  personas?: Persona[]; // wenn leer = immer sichtbar (Kernfunktion)
};
type NavGroup = { title: string; items: NavItem[]; personas?: Persona[] };

// Persona-basiert: jede Rolle bekommt nur ihre Kern-Items.
// "Profi-Modus" oder Persona "pro" zeigt alles.
const groups: NavGroup[] = [
  {
    title: "Start",
    items: [
      { to: "/app", label: "Dashboard", icon: Home, end: true },
      { to: "/app/tasks", label: "Mein Plan", icon: CalendarCheck },
      { to: "/app/messenger", label: "Nachrichten", icon: MessageSquare },
      { to: "/app/inbox", label: "Smart Inbox", icon: Inbox, personas: ["vermieter", "pro"] },
      { to: "/app/feed", label: "Community", icon: PartyPopper, personas: ["pro"] },
    ],
  },
  {
    title: "Verwalten",
    personas: ["privat", "vermieter", "pro"],
    items: [
      { to: "/app/properties", label: "Objekte", icon: Building2 },
      { to: "/app/tenants", label: "Mieter", icon: Users, personas: ["vermieter", "pro"] },
      { to: "/app/payments", label: "Einnahmen", icon: Wallet },
      { to: "/app/expenses", label: "Ausgaben", icon: Receipt },
      { to: "/app/nebenkosten", label: "Nebenkosten", icon: Calculator, personas: ["vermieter", "pro"] },
      { to: "/app/parcels", label: "Grundstücke", icon: Trees, personas: ["pro"] },
      { to: "/app/org", label: "Organisation", icon: Landmark, personas: ["pro"] },
      { to: "/app/templates", label: "Vorlagen", icon: FileText, personas: ["vermieter", "pro"] },
    ],
  },
  {
    title: "Tresor",
    items: [
      { to: "/app/vault", label: "Immo-Tresor", icon: Lock, personas: ["privat", "vermieter", "pro"] },
      { to: "/app/vault?scope=personal", label: "Lebensbürokratie", icon: Lock },
      { to: "/app/law", label: "Rechts-Ecke", icon: Scale, personas: ["pro"] },
      { to: "/app/advisor", label: "Steuerberater", icon: ShieldCheck, personas: ["vermieter", "pro"] },
    ],
  },
  {
    title: "Vermieten",
    personas: ["vermieter", "suchender", "pro"],
    items: [
      { to: "/markt", label: "Markt", icon: SearchIcon },
      { to: "/app/listings", label: "Meine Inserate", icon: Megaphone, personas: ["vermieter", "pro"] },
      { to: "/app/applications", label: "Bewerbungen", icon: Inbox, personas: ["vermieter", "pro"] },
      { to: "/app/marketplace", label: "Experten", icon: Wrench, personas: ["pro"] },
      { to: "/app/ads", label: "Werben", icon: Megaphone, personas: ["pro"] },
    ],
  },
  {
    title: "Mehr",
    items: [
      { to: "/app/profile", label: "Mein Profil", icon: IdCard },
      { to: "/app/valuation", label: "Bewertung", icon: TrendingUp, personas: ["vermieter", "pro"] },
      { to: "/app/calculator", label: "Rechner", icon: Calculator, personas: ["pro"] },
      { to: "/app/tax", label: "Steuer-Export", icon: Calculator, personas: ["vermieter", "pro"] },
    ],
  },
];

const PERSONA_LABEL: Record<Persona, string> = {
  privat: "Privat",
  vermieter: "Vermieter",
  suchender: "Suche",
  pro: "Profi",
};

// 4 Tabs + zentraler "+" FAB für Mobile
const bottomLeft: NavItem[] = [
  { to: "/app", label: "Start", icon: Home, end: true },
  { to: "/app/tasks", label: "Plan", icon: CalendarCheck },
];
const bottomRight: NavItem[] = [
  { to: "/app/properties", label: "Objekte", icon: Building2 },
  { to: "/app/vault", label: "Tresor", icon: Lock },
];

type QuickAction =
  | { kind: "link"; to: string; icon: any; label: string; desc: string; highlight?: boolean }
  | { kind: "action"; id: "scan"; icon: any; label: string; desc: string; highlight?: boolean };

const QUICK_CREATE: QuickAction[] = [
  { kind: "action", id: "scan", icon: ScanLine, label: "Dokument scannen", desc: "Mit Kamera in den Tresor", highlight: true },
  { kind: "link", to: "/app/properties", icon: Building2, label: "Objekt anlegen", desc: "Wohnung, Haus, MFH" },
  { kind: "link", to: "/app/listings/new", icon: Megaphone, label: "Inserat erstellen", desc: "Vermieten in 60 Sek." },
  { kind: "link", to: "/app/payments", icon: Wallet, label: "Zahlung erfassen", desc: "Mieteingang buchen" },
  { kind: "link", to: "/app/expenses", icon: Receipt, label: "Beleg hochladen", desc: "Steuer-relevant" },
  { kind: "link", to: "/app/tenants", icon: Users, label: "Mieter hinzufügen", desc: "Mit Vertrag" },
  { kind: "link", to: "/app/vault", icon: Lock, label: "Dokument sichern", desc: "Verschlüsselt" },
  { kind: "link", to: "/app/vault?scope=personal", icon: Lock, label: "Lebensbürokratie", desc: "Ausweis, Bank, Verträge…" },
];

const AppLayout = () => {
  const { user, signOut } = useAuth();
  const { tier, isTrial, trialDaysLeft } = useSubscription();
  const planLabel = tier === "pro" ? (isTrial ? `Pro-Trial · ${trialDaysLeft} T.` : "Pro") :
                    tier === "verwalten_plus" ? "Verwalten+" : "Free";
  const navigate = useNavigate();
  const location = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [persona, setPersona] = useState<Persona>(() =>
    (typeof window !== "undefined" && (localStorage.getItem("immoniq_persona") as Persona)) || "vermieter"
  );
  useEffect(() => { localStorage.setItem("immoniq_persona", persona); }, [persona]);
  const [showAll, setShowAll] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem("immoniq_show_all") === "1"
  );
  useEffect(() => { localStorage.setItem("immoniq_show_all", showAll ? "1" : "0"); }, [showAll]);

  const personaMatch = (p?: Persona[]) => !p || p.length === 0 || p.includes(persona) || persona === "pro";
  const visibleGroups = showAll || persona === "pro"
    ? groups
    : groups
        .filter((g) => personaMatch(g.personas))
        .map((g) => ({ ...g, items: g.items.filter((i) => personaMatch(i.personas)) }))
        .filter((g) => g.items.length > 0);

  const hiddenCount = groups.reduce((acc, g) => acc + g.items.length, 0)
    - visibleGroups.reduce((acc, g) => acc + g.items.length, 0);
  const handleSignOut = async () => { await signOut(); navigate("/", { replace: true }); };

  // Schließe Drawer bei Routenwechsel
  useEffect(() => { setMobileNavOpen(false); setCreateOpen(false); }, [location.pathname]);

  // Auto-Redirect ins Onboarding für neue User (0 Objekte, noch nicht übersprungen)
  useEffect(() => {
    if (!user) return;
    const key = `onboarding_seen_${user.id}`;
    if (localStorage.getItem(key)) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (cancelled) return;
      if ((count ?? 0) === 0) {
        navigate("/app/onboarding", { replace: true });
      } else {
        localStorage.setItem(key, "1");
      }
    })();
    return () => { cancelled = true; };
  }, [user, navigate]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background">
        {/* Background ambient */}
        <div className="fixed inset-0 pointer-events-none opacity-50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-hero-glow" />
        </div>

        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border/60 bg-sidebar/80 backdrop-blur-xl z-30">
          <div className="p-6"><Link to="/app" aria-label="Zum Dashboard"><Logo /></Link></div>

          {/* Quick-Create CTA */}
          <div className="px-4 pb-3">
            <Button
              onClick={() => setCreateOpen(true)}
              className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 shadow-gold h-10 justify-start gap-2"
            >
              <Plus className="h-4 w-4" /> Schnell anlegen
              <span className="ml-auto text-[10px] opacity-70 bg-black/10 px-1.5 py-0.5 rounded">N</span>
            </Button>
          </div>

          <nav className="flex-1 px-3 space-y-4 overflow-y-auto pb-4">
            {visibleGroups.map((g) => (
              <div key={g.title}>
                {mode === "full" && (
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                    {g.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {g.items.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      title={n.hint}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <n.icon className="h-[18px] w-[18px]" />
                          <span className="flex-1 truncate">{n.label}</span>
                          {isActive && (
                            <motion.div
                              layoutId="active-nav-pill"
                              className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>


          <div className="p-4 border-t border-border/60 space-y-2">
            <button
              onClick={() => setMode(mode === "simple" ? "full" : "simple")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
              title="Zwischen einfachem und vollem Modus wechseln"
            >
              {mode === "simple" ? <ToggleLeft className="h-[18px] w-[18px]" /> : <ToggleRight className="h-[18px] w-[18px] text-primary" />}
              <span className="flex-1 text-left">{mode === "simple" ? "Einfach-Modus" : "Profi-Modus"}</span>
              <Sparkles className="h-3 w-3 opacity-60" />
            </button>
            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
                }`
              }
            >
              <SettingsIcon className="h-[18px] w-[18px]" /> Einstellungen
            </NavLink>
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/40">
              <div className="h-8 w-8 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                {(user?.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="text-xs min-w-0 flex-1">
                <p className="font-medium truncate">{user?.email}</p>
                <p className="text-muted-foreground text-[10px]">{planLabel}</p>
              </div>
              <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground p-1" title="Abmelden">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 glass border-b border-border/60">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={() => setMobileNavOpen(true)} aria-label="Menü">
                <Menu className="h-5 w-5" />
              </Button>
              <Link to="/app" aria-label="Zum Dashboard"><Logo /></Link>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Suche" onClick={() => navigate("/app")}>
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Benachrichtigungen">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile slide-over nav */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            >
              <motion.aside
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="absolute inset-y-0 left-0 w-[82%] max-w-[320px] bg-sidebar border-r border-border flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <Logo />
                  <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex-1 overflow-y-auto p-3 space-y-5">
                  {visibleGroups.map((g) => (
                    <div key={g.title}>
                      <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80 mb-2">{g.title}</p>
                      <div className="space-y-0.5">
                        {g.items.map((n) => (
                          <NavLink
                            key={n.to}
                            to={n.to}
                            end={n.end}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                                isActive ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted/60"
                              }`
                            }
                          >
                            <n.icon className="h-5 w-5" />
                            <span className="flex-1">{n.label}</span>
                            {n.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{n.badge}</span>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
                <div className="p-4 border-t border-border">
                  <button onClick={handleSignOut} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <LogOut className="h-4 w-4" /> Abmelden
                  </button>
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="lg:pl-64 relative">
          <div className="container py-6 lg:py-10 max-w-6xl pb-32 lg:pb-10">
            <PaymentTestModeBanner />
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile bottom nav with center FAB */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/60">
          <div className="relative flex items-end justify-around px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {bottomLeft.map((n) => (
              <BottomTab key={n.to} item={n} />
            ))}

            {/* Center FAB */}
            <button
              onClick={() => setCreateOpen(true)}
              aria-label="Schnell anlegen"
              className="relative -mt-7 h-14 w-14 rounded-full bg-gradient-gold shadow-gold flex items-center justify-center text-primary-foreground active:scale-95 transition-transform"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>

            {bottomRight.map((n) => (
              <BottomTab key={n.to} item={n} />
            ))}
          </div>
        </nav>

        {/* Quick-Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">Was möchtest du anlegen?</DialogTitle>
              <p className="text-sm text-muted-foreground">In wenigen Sekunden erledigt.</p>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {QUICK_CREATE.map((q) => {
                const Inner = (
                  <>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform ${q.highlight ? "bg-gradient-gold shadow-gold" : "bg-gradient-gold-soft"}`}>
                      <q.icon className={`h-5 w-5 ${q.highlight ? "text-primary-foreground" : "text-primary"}`} />
                    </div>
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      {q.label}
                      {q.highlight && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">NEU</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{q.desc}</p>
                  </>
                );
                const cls = "p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition group text-left";
                if (q.kind === "link") {
                  return (
                    <Link
                      key={q.to}
                      to={q.to}
                      onClick={() => setCreateOpen(false)}
                      className={cls}
                    >
                      {Inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key="scan"
                    type="button"
                    onClick={() => { setCreateOpen(false); setScannerOpen(true); }}
                    className={cls}
                  >
                    {Inner}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Document Scanner */}
        <DocScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          suggestedName="Scan"
          onComplete={async (file) => {
            pendingIngest.set(file);
            navigate("/app/vault?ingest=1");
          }}
        />

        <AskCopilot />
      </div>
    </TooltipProvider>
  );
};

const BottomTab = ({ item }: { item: NavItem }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className={({ isActive }) =>
      `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[64px] transition-colors ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`
    }
  >
    {({ isActive }) => (
      <>
        <motion.div
          animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -2 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
          <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
        </motion.div>
        <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
      </>
    )}
  </NavLink>
);

export default AppLayout;
