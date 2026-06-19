import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionRow = {
  id: string;
  status: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string;
};

export type PlanTier = "free" | "verwalten_plus" | "pro";

export type PlanState = {
  loading: boolean;
  tier: PlanTier;
  isPro: boolean;            // hat Pro-Zugriff (Pro-Abo ODER Trial)
  hasManageAccess: boolean;  // Verwalten+ ODER Pro ODER Trial
  isTrial: boolean;          // 30-Tage-Pro-Trial aktiv
  trialDaysLeft: number;
  hasActiveSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
  subscription: SubscriptionRow | null;
};

// Mapping: Welcher price_id gehört zu welchem Tier?
const PRO_PRICES = new Set(["pro_monthly", "pro_monthly_v2", "pro_yearly"]);
const VERWALTEN_PRICES = new Set([
  "verwalten_plus_monthly",
  "verwalten_plus_monthly_v2",
  "verwalten_plus_yearly",
]);

const tierFromPriceId = (priceId: string | null | undefined): PlanTier => {
  if (!priceId) return "free";
  if (PRO_PRICES.has(priceId)) return "pro";
  if (VERWALTEN_PRICES.has(priceId)) return "verwalten_plus";
  return "free";
};

export const useSubscription = (): PlanState => {
  const { user } = useAuth();
  const [state, setState] = useState<PlanState>({
    loading: true,
    tier: "free",
    isPro: false,
    hasManageAccess: false,
    isTrial: false,
    trialDaysLeft: 0,
    hasActiveSubscription: false,
    cancelAtPeriodEnd: false,
    periodEnd: null,
    subscription: null,
  });

  useEffect(() => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const load = async () => {
      const env = getStripeEnvironment();

      let sub: any = null, trialDays: any = null, hasPro: any = null;
      try {
        const [r1, r2, r3] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("environment", env)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.rpc("trial_days_left", { _user_id: user.id }),
          supabase.rpc("has_pro_access", { _user_id: user.id, _env: env }),
        ]);
        sub = r1.data; trialDays = r2.data; hasPro = r3.data;
        if (r1.error) console.warn("[useSubscription] subscriptions:", r1.error.message);
        if (r2.error) console.warn("[useSubscription] trial_days_left:", r2.error.message);
        if (r3.error) console.warn("[useSubscription] has_pro_access:", r3.error.message);
      } catch (e) {
        console.error("[useSubscription] load failed", e);
      }

      const days = (trialDays as number | null) ?? 0;
      const active = !!sub && (
        (["active", "trialing", "past_due"].includes(sub.status) &&
          (!sub.current_period_end || new Date(sub.current_period_end) > new Date())) ||
        (sub.status === "canceled" && sub.current_period_end && new Date(sub.current_period_end) > new Date())
      );

      const subTier = active ? tierFromPriceId(sub?.price_id) : "free";
      // Trial gibt Pro-Zugriff, sofern kein bezahltes Abo existiert
      const trialActive = days > 0 && !active;
      const tier: PlanTier = active ? subTier : (trialActive ? "pro" : "free");

      setState({
        loading: false,
        tier,
        isPro: tier === "pro" || !!hasPro,
        hasManageAccess: tier === "pro" || tier === "verwalten_plus" || !!hasPro,
        isTrial: trialActive,
        trialDaysLeft: days,
        hasActiveSubscription: active,
        cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
        periodEnd: sub?.current_period_end ?? null,
        subscription: (sub as SubscriptionRow | null) ?? null,
      });
    };

    load();

    const channel = supabase
      .channel(`sub-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return state;
};
