import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { RouteSuspenseFallback } from "@/components/RouteSuspenseFallback";
import CookieBanner from "./components/CookieBanner";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

// Eager: Erstkontakt-Seiten (Landing, Auth, 404).
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";
const TenantQrPoster = lazy(() => import("./pages/TenantQrPoster"));

// Lazy: alles andere — verkleinert das Initial-Bundle drastisch und
// verhindert Mobile-Timeouts beim ersten Laden.
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Properties = lazy(() => import("./pages/app/Properties"));
const PropertyDetail = lazy(() => import("./pages/app/PropertyDetail"));
const Tenants = lazy(() => import("./pages/app/Tenants"));
const TenantDetail = lazy(() => import("./pages/app/TenantDetail"));
const Payments = lazy(() => import("./pages/app/Payments"));
const Expenses = lazy(() => import("./pages/app/Expenses"));
const TaxBridge = lazy(() => import("./pages/app/TaxBridge"));
const Dunning = lazy(() => import("./pages/app/Dunning"));
const Nebenkosten = lazy(() => import("./pages/app/Nebenkosten"));
const Settings = lazy(() => import("./pages/app/Settings"));
const Onboarding = lazy(() => import("./pages/app/Onboarding"));
const Advisor = lazy(() => import("./pages/app/Advisor"));
const Vault = lazy(() => import("./pages/app/Vault"));
const Marketplace = lazy(() => import("./pages/app/Marketplace"));
const Deadlines = lazy(() => import("./pages/app/Deadlines"));
const LawCorner = lazy(() => import("./pages/app/LawCorner"));
const Legal = lazy(() => import("./pages/app/Legal"));
const AdvisorView = lazy(() => import("./pages/AdvisorView"));
const AdvisorDashboard = lazy(() => import("./pages/advisor/AdvisorDashboard"));
const AdvisorMandate = lazy(() => import("./pages/advisor/AdvisorMandate"));
const AdvisorAcceptInvite = lazy(() => import("./pages/advisor/AdvisorAcceptInvite"));
const TenantPortal = lazy(() => import("./pages/TenantPortal"));
const Markt = lazy(() => import("./pages/Markt"));
const MarktDetail = lazy(() => import("./pages/MarktDetail"));
const MarktVergleich = lazy(() => import("./pages/MarktVergleich"));
const Valuation = lazy(() => import("./pages/app/Valuation"));
const Financing = lazy(() => import("./pages/app/Financing"));
const Benchmark = lazy(() => import("./pages/app/Benchmark"));
const Bookings = lazy(() => import("./pages/app/Bookings"));
const Listings = lazy(() => import("./pages/app/Listings"));
const ListingEditor = lazy(() => import("./pages/app/ListingEditor"));
const ListingApplications = lazy(() => import("./pages/app/ListingApplications"));
// Legacy: SeekerProfile + MyApplications + TenantPass → consolidated into Profile / Messenger
const Calculator = lazy(() => import("./pages/app/Calculator"));
const Tasks = lazy(() => import("./pages/app/Tasks"));
const Templates = lazy(() => import("./pages/app/Templates"));
const MyAds = lazy(() => import("./pages/app/MyAds"));
const AdminAds = lazy(() => import("./pages/app/AdminAds"));
const Impressum = lazy(() => import("./pages/Impressum"));
const Datenschutz = lazy(() => import("./pages/Datenschutz"));
const AGB = lazy(() => import("./pages/AGB"));
const Widerruf = lazy(() => import("./pages/Widerruf"));
const AppLayout = lazy(() => import("./pages/app/AppLayout"));
const Pricing = lazy(() => import("./pages/Pricing"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Install = lazy(() => import("./pages/Install"));
const WgCasting = lazy(() => import("./pages/WgCasting"));
const Feed = lazy(() => import("./pages/app/Feed"));
const LandParcels = lazy(() => import("./pages/app/LandParcels"));
const OrgUnits = lazy(() => import("./pages/app/OrgUnits"));
const Banking = lazy(() => import("./pages/app/Banking"));

const SmartInbox = lazy(() => import("./pages/app/SmartInbox"));
const Tickets = lazy(() => import("./pages/app/Tickets"));
const PassPublic = lazy(() => import("./pages/PassPublic"));
const Connect = lazy(() => import("./pages/Connect"));
const NebenkostenVorlage = lazy(() => import("./pages/NebenkostenVorlage"));
const Messenger = lazy(() => import("./pages/app/Messenger"));
const Chat = lazy(() => import("./pages/app/Chat"));
const Profile = lazy(() => import("./pages/app/Profile"));
const TenantPass = lazy(() => import("./pages/app/TenantPass"));

const TenantLayout = lazy(() => import("./pages/tenant/TenantLayout"));
const TenantHome = lazy(() => import("./pages/tenant/TenantHome"));
const TenantChat = lazy(() => import("./pages/tenant/TenantChat"));
const TenantDocs = lazy(() => import("./pages/tenant/TenantDocs"));
const TenantIssues = lazy(() => import("./pages/tenant/TenantIssues"));
const TenantRights = lazy(() => import("./pages/tenant/TenantRights"));
const TenantVault = lazy(() => import("./pages/tenant/TenantVault"));
const TenantConnect = lazy(() => import("./pages/tenant/TenantConnect"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile-freundlich: 1× Retry bei Netzwerkfehlern statt sofort scheitern
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineIndicator />
      <BrowserRouter>
        <RouteErrorBoundary>
          <Suspense fallback={<RouteSuspenseFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/mieter-qr/:tenantId" element={<ProtectedRoute><TenantQrPoster /></ProtectedRoute>} />
              <Route path="/advisor/:token" element={<AdvisorView />} />
              <Route path="/berater/einladung/:token" element={<AdvisorAcceptInvite />} />
              <Route path="/berater" element={<ProtectedRoute><AdvisorDashboard /></ProtectedRoute>} />
              <Route path="/berater/:landlordId" element={<ProtectedRoute><AdvisorMandate /></ProtectedRoute>} />
              <Route path="/mieter/:token" element={<TenantPortal />} />
              <Route path="/mein-immoniq" element={<TenantLayout />}>
                <Route index element={<TenantHome />} />
                <Route path="chat" element={<TenantChat />} />
                <Route path="dokumente" element={<TenantDocs />} />
                <Route path="schaeden" element={<TenantIssues />} />
                <Route path="tresor" element={<TenantVault />} />
                <Route path="rechte" element={<TenantRights />} />
                <Route path="verbinden" element={<TenantConnect />} />
              </Route>
              <Route path="/wg-casting/:token" element={<WgCasting />} />
              <Route path="/pass/:code" element={<PassPublic />} />
              <Route path="/connect" element={<Connect />} />
              <Route path="/verbinden-ai" element={<Connect />} />
              <Route path="/nebenkostenabrechnung-vorlage" element={<NebenkostenVorlage />} />
              <Route path="/markt" element={<Markt />} />
              <Route path="/markt/vergleich" element={<MarktVergleich />} />
              <Route path="/markt/:id" element={<MarktDetail />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/agb" element={<AGB />} />
              <Route path="/widerruf" element={<Widerruf />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/checkout/return" element={<CheckoutReturn />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/install" element={<Install />} />
              <Route
                path="/app/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="properties" element={<Properties />} />
                <Route path="properties/:id" element={<PropertyDetail />} />
                <Route path="tenants" element={<Tenants />} />
                <Route path="tenants/:id" element={<TenantDetail />} />
                <Route path="payments" element={<Payments />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="dunning" element={<Dunning />} />
                <Route path="nebenkosten" element={<Nebenkosten />} />
                <Route path="tax" element={<TaxBridge />} />
                <Route path="advisor" element={<Advisor />} />
                <Route path="vault" element={<Vault />} />
                <Route path="valuation" element={<Valuation />} />
                <Route path="financing" element={<Financing />} />
                <Route path="benchmark" element={<Benchmark />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="listings" element={<Listings />} />
                <Route path="listings/new" element={<ListingEditor />} />
                <Route path="listings/:id/edit" element={<ListingEditor />} />
                <Route path="listings/:id/applications" element={<ListingApplications />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile-seeker" element={<Profile />} />
                <Route path="pass" element={<Profile />} />
                <Route path="seeker" element={<Profile />} />
                <Route path="tenant-pass" element={<TenantPass />} />
                <Route path="mieter-pass" element={<TenantPass />} />
                <Route path="score" element={<TenantPass />} />
                <Route path="applications" element={<Messenger />} />
                <Route path="my-applications" element={<Messenger />} />
                <Route path="marketplace" element={<Marketplace />} />
                <Route path="calculator" element={<Calculator />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="templates" element={<Templates />} />
                <Route path="deadlines" element={<Deadlines />} />
                <Route path="law" element={<LawCorner />} />
                <Route path="legal" element={<Legal />} />
                <Route path="feed" element={<Feed />} />
                <Route path="parcels" element={<LandParcels />} />
                <Route path="org" element={<OrgUnits />} />
                <Route path="inbox" element={<SmartInbox />} />
                <Route path="tickets" element={<Tickets />} />
                <Route path="messenger" element={<Messenger />} />
                <Route path="chat" element={<Chat />} />
                <Route path="ads" element={<MyAds />} />
                <Route path="admin/ads" element={<AdminAds />} />
                <Route path="settings" element={<Settings />} />
                <Route path="banking" element={<Banking />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
        <CookieBanner />
        <PWAInstallPrompt />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
