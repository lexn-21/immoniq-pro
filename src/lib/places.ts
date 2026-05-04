// Google Places (New) Client — ruft die Edge Function `places-search`.
// Fallback: OpenStreetMap (Overpass), falls Google nicht konfiguriert oder Quota voll.

import { supabase } from "@/integrations/supabase/client";
import { searchProviders as searchOsm, type OsmPlace } from "@/lib/overpass";

export type Provider = {
  id: string;
  name: string;
  address?: string;
  phone?: string | null;
  website?: string | null;
  google_maps?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  category?: string | null;
  opening_hours?: string[] | null;
  lat?: number | null;
  lng?: number | null;
  distance_km?: number | null;
  source: "google" | "osm";
};

export async function searchProviders(
  category: string,
  query: string,
  radiusKm = 15,
): Promise<{ providers: Provider[]; source: "google" | "osm" | "cache"; warning?: string; centerLabel?: string }> {
  const { data, error } = await supabase.functions.invoke("places-search", {
    body: { category, query, radius: radiusKm },
  });

  if (!error && data?.places) {
    const providers: Provider[] = (data.places as any[]).map((p) => ({ ...p, source: "google" }));
    return { providers, source: data.source ?? "google", centerLabel: data?.center?.label };
  }

  // Fallback OSM nur wenn PLZ
  const isZip = /^\d{5}$/.test(query.trim());
  const fallbackWarning =
    error?.message?.includes("Tageslimit")
      ? "Tageslimit der Premium-Suche erreicht — zeige OpenStreetMap-Ergebnisse als Backup."
      : "Premium-Suche nicht verfügbar — zeige OpenStreetMap-Ergebnisse als Backup.";

  if (!isZip) {
    throw new Error(error?.message ?? "Suche fehlgeschlagen");
  }

  try {
    const osm: OsmPlace[] = await searchOsm(category, query, radiusKm);
    const providers: Provider[] = osm.map((p) => ({
      id: String(p.id),
      name: p.name,
      address: [
        [p.street, p.housenumber].filter(Boolean).join(" "),
        [p.zip, p.city].filter(Boolean).join(" "),
      ].filter(Boolean).join(", "),
      phone: p.phone ?? null,
      website: p.website ?? null,
      google_maps: null,
      rating: null,
      rating_count: null,
      category: null,
      opening_hours: p.opening_hours ? [p.opening_hours] : null,
      lat: p.lat,
      lng: p.lon,
      distance_km: p.distance_km ?? null,
      source: "osm",
    }));
    return { providers, source: "osm", warning: fallbackWarning };
  } catch {
    throw new Error(error?.message ?? "Suche fehlgeschlagen");
  }
}
