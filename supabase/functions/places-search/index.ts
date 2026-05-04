// Google Places (New) Suche mit Cache + Quota.
// Liefert echte Handwerker / Steuerberater rund um eine deutsche PLZ.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// PLZ → ungefähre Koordinaten (erste 2 Stellen)
const PLZ2: Record<string, [number, number]> = {
  "01":[51.05,13.74],"02":[51.18,14.43],"03":[51.76,14.33],"04":[51.34,12.37],
  "06":[51.48,11.97],"07":[50.93,11.59],"08":[50.72,12.49],"09":[50.83,12.92],
  "10":[52.52,13.40],"12":[52.46,13.45],"13":[52.55,13.36],"14":[52.40,13.06],
  "15":[52.34,14.55],"16":[52.84,13.23],"17":[53.56,13.26],"18":[54.09,12.13],
  "19":[53.63,11.41],"20":[53.55,9.99],"22":[53.59,10.05],"23":[53.86,10.69],
  "24":[54.32,10.13],"25":[54.19,9.10],"26":[53.14,8.21],"27":[53.18,8.58],
  "28":[53.08,8.80],"29":[52.90,10.48],"30":[52.37,9.73],"31":[52.15,9.95],
  "32":[52.02,8.53],"33":[51.51,8.60],"34":[51.31,9.49],"35":[50.80,8.77],
  "36":[50.55,9.68],"37":[51.53,9.93],"38":[52.27,10.52],"39":[52.13,11.62],
  "40":[51.22,6.78],"41":[51.18,6.44],"42":[51.26,7.15],"44":[51.51,7.46],
  "45":[51.45,7.01],"46":[51.66,6.62],"47":[51.43,6.76],"48":[52.96,7.62],
  "49":[52.27,8.04],"50":[50.94,6.96],"51":[50.99,7.10],"52":[50.78,6.08],
  "53":[50.74,7.10],"54":[49.75,6.64],"55":[50.00,8.27],"56":[50.36,7.59],
  "57":[50.88,7.99],"58":[51.36,7.46],"59":[51.57,7.97],"60":[50.11,8.68],
  "61":[50.32,8.74],"63":[50.10,8.96],"64":[49.87,8.65],"65":[50.08,8.24],
  "66":[49.24,7.00],"67":[49.45,8.43],"68":[49.49,8.47],"69":[49.41,8.69],
  "70":[48.78,9.18],"71":[48.83,9.01],"72":[48.52,9.06],"73":[48.80,9.78],
  "74":[49.14,9.22],"75":[48.89,8.70],"76":[49.01,8.40],"77":[48.46,7.94],
  "78":[47.99,8.83],"79":[47.99,7.84],"80":[48.14,11.58],"81":[48.10,11.62],
  "82":[48.04,11.27],"83":[47.86,12.12],"84":[48.55,12.15],"85":[48.27,11.43],
  "86":[48.37,10.90],"87":[47.73,10.31],"88":[47.78,9.61],"89":[48.40,9.99],
  "90":[49.45,11.08],"91":[49.59,11.00],"92":[49.32,12.13],"93":[49.01,12.10],
  "94":[48.57,13.45],"95":[50.09,11.81],"96":[50.25,10.96],"97":[49.79,9.93],
  "98":[50.66,10.71],"99":[50.97,11.03],
};

// Kategorie → Google Places "includedTypes" + optional Textsuche-Keyword
const CAT_MAP: Record<string, { types?: string[]; keyword?: string }> = {
  electrician:  { types: ["electrician"] },
  plumber:      { types: ["plumber"] },
  painter:      { types: ["painter"] },
  roofer:       { types: ["roofing_contractor"] },
  carpenter:    { keyword: "Tischler Schreiner" },
  handyman:     { types: ["general_contractor"], keyword: "Hausmeister" },
  tax:          { types: ["accounting"], keyword: "Steuerberater" },
  lawyer:       { types: ["lawyer"], keyword: "Mietrecht Anwalt" },
  cleaner:      { keyword: "Gebäudereinigung Reinigungsfirma" },
  gardener:     { keyword: "Gartenpflege Gärtner" },
  locksmith:    { types: ["locksmith"] },
};

function distKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const TIER_LIMITS: Record<string, number> = { pro: 200, verwalten_plus: 30, free: 5 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const category = String(body.category ?? "");
    const zip = String(body.zip ?? "");
    const radiusKm = Math.min(50, Math.max(1, Number(body.radius ?? 15)));

    if (!/^\d{5}$/.test(zip)) {
      return new Response(JSON.stringify({ error: "Ungültige PLZ" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cat = CAT_MAP[category];
    if (!cat) {
      return new Response(JSON.stringify({ error: "Kategorie nicht unterstützt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const center2 = PLZ2[zip.slice(0, 2)];
    if (!center2) {
      return new Response(JSON.stringify({ error: "PLZ-Region unbekannt" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const center = { lat: center2[0], lng: center2[1] };

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Cache lookup
    const { data: cached } = await admin
      .from("places_cache")
      .select("payload, expires_at")
      .eq("zip", zip).eq("category", category).eq("radius_km", radiusKm)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached?.payload) {
      return new Response(JSON.stringify({ source: "cache", places: cached.payload }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Quota nur wenn wir wirklich Google rufen
    const { data: tierRow } = await admin.rpc("user_plan_tier", { _user_id: userId });
    const tier = (tierRow as string) ?? "free";
    const limit = TIER_LIMITS[tier] ?? 5;

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: usedCount } = await admin
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("function_name", "places-search")
      .gt("created_at", since);

    if ((usedCount ?? 0) >= limit) {
      return new Response(JSON.stringify({
        error: `Tageslimit erreicht (${limit} Suchen/Tag im Plan ${tier}). Upgrade für mehr.`,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!GOOGLE_KEY) {
      return new Response(JSON.stringify({ error: "Google Places nicht konfiguriert" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Google Places (New) — searchNearby oder searchText
    const fieldMask = [
      "places.id","places.displayName","places.formattedAddress",
      "places.location","places.nationalPhoneNumber","places.internationalPhoneNumber",
      "places.websiteUri","places.googleMapsUri","places.rating","places.userRatingCount",
      "places.businessStatus","places.regularOpeningHours.weekdayDescriptions",
      "places.shortFormattedAddress","places.primaryTypeDisplayName",
    ].join(",");

    let placesRaw: any[] = [];

    if (cat.types && cat.types.length) {
      const r = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_KEY,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          includedTypes: cat.types,
          maxResultCount: 20,
          languageCode: "de",
          regionCode: "DE",
          locationRestriction: {
            circle: {
              center: { latitude: center.lat, longitude: center.lng },
              radius: radiusKm * 1000,
            },
          },
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        console.error("Google Places error", j);
        return new Response(JSON.stringify({ error: "Google Places Fehler", details: j }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      placesRaw = j.places ?? [];
    }

    // Falls Keyword vorhanden und (kein Type ODER zu wenig Treffer) → searchText
    if (cat.keyword && placesRaw.length < 8) {
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_KEY,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          textQuery: cat.keyword,
          languageCode: "de",
          regionCode: "DE",
          locationBias: {
            circle: {
              center: { latitude: center.lat, longitude: center.lng },
              radius: radiusKm * 1000,
            },
          },
          pageSize: 20,
        }),
      });
      const j = await r.json();
      if (r.ok && j.places) {
        const seen = new Set(placesRaw.map((p: any) => p.id));
        for (const p of j.places) if (!seen.has(p.id)) placesRaw.push(p);
      }
    }

    const places = placesRaw.map((p: any) => {
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      return {
        id: p.id,
        name: p.displayName?.text ?? "",
        address: p.shortFormattedAddress ?? p.formattedAddress ?? "",
        phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        google_maps: p.googleMapsUri ?? null,
        rating: p.rating ?? null,
        rating_count: p.userRatingCount ?? null,
        category: p.primaryTypeDisplayName?.text ?? null,
        opening_hours: p.regularOpeningHours?.weekdayDescriptions ?? null,
        lat, lng,
        distance_km: lat && lng ? distKm(center, { lat, lng }) : null,
      };
    })
    .filter((p) => p.name)
    .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
    .slice(0, 30);

    // 4) Cache + Usage-Log schreiben
    await admin.from("places_cache").upsert({
      zip, category, radius_km: radiusKm,
      payload: places,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    }, { onConflict: "zip,category,radius_km" });

    await admin.from("ai_usage_log").insert({ user_id: userId, function_name: "places-search" });

    return new Response(JSON.stringify({ source: "google", places }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("places-search error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
