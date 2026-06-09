import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, FileText, AlertTriangle, Scale, LogOut, Loader2, Menu, Lock, Link2 } from "lucide-react";
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
  } | null;
  unit: { id: string; label: string; rent_cold: number; utilities: number; living_space: number } | null;
  property: { id: string; name: string; street: string; zip: string; city: string } | null;
};

type NavItem = { to: string; label: string; icon: any; end?: boolean; needsLink?: boolean };

const NAV: NavItem[] = [
  { to: "/mein-immoniq", label: "Übersicht", icon: Home, end: true },
  { to: "/mein-immoniq/chat", label: "Chat", icon: MessageCircle, needsLink: true },
  { to: "/mein-immoniq/dokumente", label: "Dokumente", icon: FileText, needsLink: true },
  { to: "/mein-immoniq/schaeden", label: "Schäden", icon: AlertTriangle, needsLink: true },
  { to: "/mein-immoniq/tresor", label: "Tresor", icon: Lock },
  { to: "/mein-immoniq/rechte", label: "Rechte", icon: Scale },
];

export default function TenantLayout() {
  const { user, loading } = useAuth();
  const [ctx, setCtx] = useState<TenantCtx>({ tenant: null, unit: null, property: null });
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
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!t) { setCtx({ tenant: null, unit: null, property: null }); setLoaded(true); return; }
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
  if (!user) return <Navigate to="/auth?as=tenant" replace />;

  const isLinked = !!ctx.tenant;
  const visible = NAV.filter(n => isLinked || !n.needsLink);

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {visible.map(n => (
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
      {!isLinked && (
        <NavLink
          to="/mein-immoniq/verbinden"
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition mt-2 border ${
              isActive ? "bg-primary text-primary-foreground border-primary" : "border-dashed border-primary/40 text-primary hover:bg-primary/5"
            }`
          }
        >
          <Link2 className="h-4 w-4" /> Vermieter verbinden
        </NavLink>
      )}
    </nav>
  );

  // Mobile bottom nav: max 5 items
  const bottom = (isLinked
    ? [NAV[0], NAV[1], NAV[2], NAV[4], NAV[5]]
    : [NAV[0], NAV[4], NAV[5], { to: "/mein-immoniq/verbinden", label: "Verbinden", icon: Link2 } as NavItem]
  );

  return (
    <div className="min-h-screen bg-background">
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
            <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[200px]">
              {ctx.tenant?.full_name ?? user.email}
            </span>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="hidden md:block">
          <div className="sticky top-20"><NavList /></div>
        </aside>
        <main className="min-w-0 pb-20 md:pb-0">
          <Outlet context={ctx} />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border/60">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${bottom.length}, minmax(0, 1fr))` }}>
          {bottom.map(n => (
            <NavLink key={n.to} to={n.to} end={(n as any).end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              <n.icon className="h-4 w-4" /><span>{n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
