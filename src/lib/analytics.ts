/**
 * Zentrales, DSGVO-taugliches Event-Tracking.
 *
 * - Schreibt immer in die eigene Tabelle `analytics_events` (mit
 *   consent_analytics-Flag), sodass wir jederzeit selbst auswerten können.
 * - Leitet Events zusätzlich an externe Analytics-Setups weiter, sobald der
 *   Nutzer Analyse-Cookies akzeptiert hat: `window.dataLayer` (GTM/GA4),
 *   `window.gtag`, `window.plausible`, `window.umami`.
 * - Keine externe Ausleitung ohne Consent.
 */

import { supabase } from "@/integrations/supabase/client";
import { getConsent } from "@/components/CookieBanner";

const SESSION_KEY = "immoniq.analytics.session.v1";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (name: string, opts?: { props?: Record<string, unknown> }) => void;
    umami?: { track: (name: string, data?: Record<string, unknown>) => void };
  }
}

export type EventType = "cta" | "form" | "download" | "page" | "outbound" | "custom";

export interface TrackOptions {
  /** Freies Metadaten-Objekt — z. B. { plan: "verwalten_plus", src: "hero" }. */
  metadata?: Record<string, unknown>;
  /** Werbequelle / Herkunft (?src=…) — überschreibt die URL-Auto-Erkennung. */
  source?: string;
  /** Explizit setzen, wenn ein Event von einer anderen URL berichtet werden soll. */
  path?: string;
}

function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) return cached;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "unknown";
  }
}

function consentGranted(): boolean {
  const c = getConsent();
  return !!c?.analytics;
}

function forwardToExternalAnalytics(
  type: EventType,
  name: string,
  props: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !consentGranted()) return;
  const payload = { event_type: type, ...props };

  // GTM / GA4 (dataLayer)
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: name, ...payload });
  }
  // GA4 (gtag)
  if (typeof window.gtag === "function") {
    window.gtag("event", name, payload);
  }
  // Plausible
  if (typeof window.plausible === "function") {
    window.plausible(name, { props: payload as Record<string, unknown> });
  }
  // Umami
  if (window.umami && typeof window.umami.track === "function") {
    window.umami.track(name, payload);
  }
}

/**
 * Sende ein Analytics-Event.
 * Fehler werden geschluckt — Tracking darf niemals die App blockieren.
 */
export async function trackEvent(
  type: EventType,
  name: string,
  opts: TrackOptions = {},
): Promise<void> {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const source =
    opts.source ??
    url.searchParams.get("src") ??
    url.searchParams.get("utm_source") ??
    null;
  const path = opts.path ?? url.pathname + url.search;
  const consent = consentGranted();
  const metadata = opts.metadata ?? {};

  // Externe Setups sofort feuern (synchron, aber non-blocking).
  forwardToExternalAnalytics(type, name, { ...metadata, path, source });

  // First-party log — auch ohne Consent (nur pseudonyme, nicht personen­bezogene Felder).
  try {
    await supabase.from("analytics_events").insert({
      event_type: type,
      event_name: name,
      path,
      source,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: sessionId(),
      consent_analytics: consent,
      metadata,
    });
  } catch {
    // absichtlich still
  }
}

// ---- Convenience wrappers ------------------------------------------------

export const trackCta = (name: string, opts: TrackOptions = {}) =>
  trackEvent("cta", name, opts);

export const trackFormSubmit = (name: string, opts: TrackOptions = {}) =>
  trackEvent("form", name, opts);

export const trackDownload = (fileName: string, opts: TrackOptions = {}) =>
  trackEvent("download", fileName, opts);

export const trackPageView = (opts: TrackOptions = {}) =>
  trackEvent("page", "page_view", opts);
