// Baked snapshot for SEO landing pages (kept in sync with market_index seed).
// Live values are fetched from Supabase on mount; this list drives the /mietspiegel
// hub, sitemap, and per-PLZ page copy without a network round-trip.
export type MietspiegelRow = {
  zip: string;
  city: string;
  avg_rent_sqm: number;
  avg_purchase_sqm: number;
  yield_factor: number;
  avg_utilities_sqm: number;
  sample_size: number;
};

export const MIETSPIEGEL_ROWS: MietspiegelRow[] = [
  { zip: "10115", city: "Berlin Mitte", avg_rent_sqm: 16.8, avg_purchase_sqm: 7200, yield_factor: 28.5, avg_utilities_sqm: 2.8, sample_size: 420 },
  { zip: "10243", city: "Berlin Friedrichshain", avg_rent_sqm: 15.2, avg_purchase_sqm: 6500, yield_factor: 29.0, avg_utilities_sqm: 2.7, sample_size: 380 },
  { zip: "10785", city: "Berlin Tiergarten", avg_rent_sqm: 18.5, avg_purchase_sqm: 8100, yield_factor: 27.0, avg_utilities_sqm: 3.0, sample_size: 310 },
  { zip: "28195", city: "Bremen Mitte", avg_rent_sqm: 11.8, avg_purchase_sqm: 4100, yield_factor: 31.5, avg_utilities_sqm: 2.55, sample_size: 260 },
  { zip: "44135", city: "Dortmund Mitte", avg_rent_sqm: 10.4, avg_purchase_sqm: 3400, yield_factor: 33.5, avg_utilities_sqm: 2.45, sample_size: 310 },
  { zip: "01067", city: "Dresden Innere Altstadt", avg_rent_sqm: 12.2, avg_purchase_sqm: 4400, yield_factor: 31.0, avg_utilities_sqm: 2.55, sample_size: 290 },
  { zip: "40213", city: "Düsseldorf Altstadt", avg_rent_sqm: 16.8, avg_purchase_sqm: 7400, yield_factor: 28.0, avg_utilities_sqm: 2.95, sample_size: 270 },
  { zip: "40476", city: "Düsseldorf Derendorf", avg_rent_sqm: 15.2, avg_purchase_sqm: 6500, yield_factor: 29.0, avg_utilities_sqm: 2.8, sample_size: 250 },
  { zip: "99084", city: "Erfurt Altstadt", avg_rent_sqm: 10.2, avg_purchase_sqm: 3300, yield_factor: 33.5, avg_utilities_sqm: 2.45, sample_size: 180 },
  { zip: "45127", city: "Essen Stadtkern", avg_rent_sqm: 10.8, avg_purchase_sqm: 3600, yield_factor: 33.0, avg_utilities_sqm: 2.5, sample_size: 290 },
  { zip: "60486", city: "Frankfurt Bockenheim", avg_rent_sqm: 16.8, avg_purchase_sqm: 7200, yield_factor: 28.0, avg_utilities_sqm: 2.8, sample_size: 290 },
  { zip: "60311", city: "Frankfurt Innenstadt", avg_rent_sqm: 19.2, avg_purchase_sqm: 8800, yield_factor: 26.5, avg_utilities_sqm: 3.0, sample_size: 310 },
  { zip: "79098", city: "Freiburg Altstadt", avg_rent_sqm: 16.2, avg_purchase_sqm: 7000, yield_factor: 28.5, avg_utilities_sqm: 2.85, sample_size: 200 },
  { zip: "22767", city: "Hamburg Altona", avg_rent_sqm: 16.1, avg_purchase_sqm: 6900, yield_factor: 29.0, avg_utilities_sqm: 2.8, sample_size: 340 },
  { zip: "20095", city: "Hamburg Altstadt", avg_rent_sqm: 17.4, avg_purchase_sqm: 7800, yield_factor: 28.0, avg_utilities_sqm: 2.9, sample_size: 290 },
  { zip: "20355", city: "Hamburg Neustadt", avg_rent_sqm: 18.2, avg_purchase_sqm: 8400, yield_factor: 27.5, avg_utilities_sqm: 3.1, sample_size: 260 },
  { zip: "30159", city: "Hannover Mitte", avg_rent_sqm: 12.8, avg_purchase_sqm: 4800, yield_factor: 30.5, avg_utilities_sqm: 2.6, sample_size: 310 },
  { zip: "76133", city: "Karlsruhe Innenstadt", avg_rent_sqm: 13.5, avg_purchase_sqm: 5400, yield_factor: 30.0, avg_utilities_sqm: 2.7, sample_size: 230 },
  { zip: "50667", city: "Köln Altstadt", avg_rent_sqm: 15.8, avg_purchase_sqm: 6800, yield_factor: 28.5, avg_utilities_sqm: 2.8, sample_size: 330 },
  { zip: "50937", city: "Köln Sülz", avg_rent_sqm: 14.5, avg_purchase_sqm: 6200, yield_factor: 29.5, avg_utilities_sqm: 2.7, sample_size: 280 },
  { zip: "04109", city: "Leipzig Zentrum", avg_rent_sqm: 11.5, avg_purchase_sqm: 3900, yield_factor: 32.0, avg_utilities_sqm: 2.5, sample_size: 380 },
  { zip: "39104", city: "Magdeburg Altstadt", avg_rent_sqm: 9.5, avg_purchase_sqm: 2900, yield_factor: 34.5, avg_utilities_sqm: 2.4, sample_size: 160 },
  { zip: "55116", city: "Mainz Altstadt", avg_rent_sqm: 14.8, avg_purchase_sqm: 6100, yield_factor: 29.0, avg_utilities_sqm: 2.75, sample_size: 210 },
  { zip: "80331", city: "München Altstadt", avg_rent_sqm: 24.5, avg_purchase_sqm: 11500, yield_factor: 24.0, avg_utilities_sqm: 3.2, sample_size: 310 },
  { zip: "81675", city: "München Bogenhausen", avg_rent_sqm: 21.5, avg_purchase_sqm: 10200, yield_factor: 25.0, avg_utilities_sqm: 3.0, sample_size: 280 },
  { zip: "80801", city: "München Schwabing", avg_rent_sqm: 22.8, avg_purchase_sqm: 10800, yield_factor: 24.5, avg_utilities_sqm: 3.1, sample_size: 420 },
  { zip: "90402", city: "Nürnberg Altstadt", avg_rent_sqm: 13.8, avg_purchase_sqm: 5600, yield_factor: 29.5, avg_utilities_sqm: 2.7, sample_size: 270 },
  { zip: "66111", city: "Saarbrücken Mitte", avg_rent_sqm: 9.8, avg_purchase_sqm: 3100, yield_factor: 34.0, avg_utilities_sqm: 2.45, sample_size: 170 },
  { zip: "70173", city: "Stuttgart Mitte", avg_rent_sqm: 17.2, avg_purchase_sqm: 7600, yield_factor: 27.5, avg_utilities_sqm: 2.9, sample_size: 260 },
  { zip: "70197", city: "Stuttgart West", avg_rent_sqm: 16.4, avg_purchase_sqm: 7100, yield_factor: 28.0, avg_utilities_sqm: 2.85, sample_size: 240 },
];

export const MIETSPIEGEL_BY_ZIP: Record<string, MietspiegelRow> = Object.fromEntries(
  MIETSPIEGEL_ROWS.map((r) => [r.zip, r]),
);

export const NATIONAL_AVG_RENT = 15.4; // Ø aus market_index (gerundet)
export const NATIONAL_AVG_PURCHASE = 7000;
