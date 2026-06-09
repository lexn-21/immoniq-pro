import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, FileText, AlertTriangle, Scale, LogOut, Loader2, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

export type TenantCtx = {
  tenant: {
    id: string;
    full_name: string;
    user_id: string;
    unit_id: string | null;
    property_id: string | null;
    lease_start: string | null;
    lease_end: string | null;
    deposit: number | null;
  };
  unit: { id: string; label: string; rent_cold: number; utilities: number; living_space: number } | null;
  property: { id: string; name: string; street: string; zip: string; city: string } | null;
};

const NAV = [
  { to: "/mein-immoniq", label: "Übersicht", icon: Home, end: true },
  { to: "/mein-immoniq/chat", label: "Chat", icon: MessageCircle },
  { to: "/mein-immoniq/dokumente", label: "Dokumente", icon: FileText },
  { to: "/mein-immoniq/schaeden", label: "Schäden", icon: AlertTriangle },
  { to: "/mein-immoniq/rechte", label: "Mietrechte", icon: Scale },
];

export default function TenantLayout() {
  const { user, loading } = useAuth();
  const [ctx, setCtx] = useState<TenantCtx | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase
        .from("tenants")
        .select("id, full_name, user_id, unit_id, property_id, lease_start, lease_end, deposit")
        .eq("claimed_by_user_id", user.id)
        .is("archived_at", null)
        .maybeSingle();
      if (!t) { setLoaded(true); return; }
      const [{ data: u }, { data: p }] = await Promise.all([
        t.unit_id ? supabase.from("units").select("id, label, rent_cold, utilities, living_space").eq("id", t.unit_id).maybeSingle() : Promise.resolve({ data: null }),
        t.property_id ? supabase.from("properties").select("id, name, street, zip, city").eq("id", t.property_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setCtx({ tenant: t as any, unit: u as any, property: p as any });
      setLoaded(true);
    })();
  }, [user]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Abgemeldet.");
    navigate("/");
  };

  if (loading || !loaded) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!ctx) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Home className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Noch keine Wohnung verknüpft</h1>
          <p className="text-sm text-muted-foreground">
            Bitte deinen Vermieter um deinen persönlichen Mieter-Link (beginnt mit <span className="font-mono">/mieter/</span>) und öffne ihn — dann verbindet sich dein Account automatisch mit deiner Wohnung.
          </p>
          <Button onClick={signOut} variant="outline" className="gap-2"><LogOut className="h-4 w-4" />Abmelden</Button>
        </div>
      </div>
    );
  }

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {NAV.map(n => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:bg-muted hover:text-foreground"
            }`
          }
        >
          <n.icon className="h-4 w-4" /> {n.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 backdrop-blur-xl">
        <div className="container max-w-6xl py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <div className="mb-6"><Logo /></div>
                <NavList onClick={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link to="/mein-immoniq"><Logo /></Link>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px]">Mein ImmonIQ</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm text-muted-foreground">{ctx.tenant.full_name}</span>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="hidden md:block">
          <div className="sticky top-20"><NavList /></div>
        </aside>
        <main className="min-w-0">
          <Outlet context={ctx} />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border/60">
        <div className="grid grid-cols-5">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              <n.icon className="h-4 w-4" /><span>{n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="md:hidden h-16" />
    </div>
  );
}
