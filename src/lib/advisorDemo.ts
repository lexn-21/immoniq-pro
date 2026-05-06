// Demo-Mandant für die Steuerberater-Read-only-Ansicht.
// Keine DB-Abfrage, kein Login — rein clientseitig.

export const ADVISOR_DEMO_TOKEN = "demo";

export const advisorDemoData = {
  owner_name: "Max Mustermann (Demo-Mandant)",
  is_demo: true,
  properties: [
    {
      id: "demo-prop-1",
      name: "MFH Lindenstraße 12",
      street: "Lindenstraße 12",
      zip: "40217",
      city: "Düsseldorf",
      build_year: 1998,
      afa_rate: 2,
      purchase_price: 480000,
      purchase_date: "2019-06-01",
    },
    {
      id: "demo-prop-2",
      name: "ETW Goethestraße 4",
      street: "Goethestraße 4",
      zip: "50667",
      city: "Köln",
      build_year: 2012,
      afa_rate: 2,
      purchase_price: 295000,
      purchase_date: "2021-09-15",
    },
  ],
  tenants: [
    { id: "t1", full_name: "Anna Becker", email: "anna.becker@example.de", lease_start: "2020-01-01", deposit: 1800 },
    { id: "t2", full_name: "Thomas Wagner", email: "t.wagner@example.de", lease_start: "2021-04-01", deposit: 1500 },
    { id: "t3", full_name: "Sarah Klein", email: "sarah.klein@example.de", lease_start: "2022-10-01", deposit: 2100 },
    { id: "t4", full_name: "Michael Hoffmann", email: "m.hoffmann@example.de", lease_start: "2023-03-15", deposit: 1650 },
  ],
  payments: (() => {
    const y = new Date().getFullYear();
    const out: any[] = [];
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, "0");
      out.push({ id: `p-${m}-1`, paid_on: `${y}-${mm}-03`, kind: "rent_cold", amount: 850, note: "Anna Becker · Kaltmiete" });
      out.push({ id: `p-${m}-2`, paid_on: `${y}-${mm}-05`, kind: "utilities", amount: 180, note: "Anna Becker · NK-Vorauszahlung" });
      out.push({ id: `p-${m}-3`, paid_on: `${y}-${mm}-04`, kind: "rent_cold", amount: 720, note: "Thomas Wagner · Kaltmiete" });
      out.push({ id: `p-${m}-4`, paid_on: `${y}-${mm}-06`, kind: "utilities", amount: 150, note: "Thomas Wagner · NK-Vorauszahlung" });
      out.push({ id: `p-${m}-5`, paid_on: `${y}-${mm}-02`, kind: "rent_cold", amount: 980, note: "Sarah Klein · Kaltmiete" });
      out.push({ id: `p-${m}-6`, paid_on: `${y}-${mm}-07`, kind: "rent_cold", amount: 760, note: "Michael Hoffmann · Kaltmiete" });
    }
    return out;
  })(),
  expenses: (() => {
    const y = new Date().getFullYear();
    return [
      { id: "e1", spent_on: `${y}-02-14`, description: "Heizungswartung", vendor: "Müller Heizung GmbH", category: "immediate", amount: 320, property_id: "demo-prop-1" },
      { id: "e2", spent_on: `${y}-03-22`, description: "Maler — Treppenhaus", vendor: "Farbwerk Düsseldorf", category: "immediate", amount: 1850, property_id: "demo-prop-1" },
      { id: "e3", spent_on: `${y}-04-08`, description: "Grundsteuer Q2", vendor: "Stadt Düsseldorf", category: "immediate", amount: 412, property_id: "demo-prop-1" },
      { id: "e4", spent_on: `${y}-05-30`, description: "Darlehenszinsen Mai", vendor: "Sparkasse", category: "financing", amount: 980, property_id: "demo-prop-1" },
      { id: "e5", spent_on: `${y}-06-12`, description: "Sanitär Reparatur Bad", vendor: "Bauer Sanitär", category: "immediate", amount: 645, property_id: "demo-prop-2" },
      { id: "e6", spent_on: `${y}-07-04`, description: "Hausverwaltung Q2", vendor: "HV Köln GmbH", category: "immediate", amount: 240, property_id: "demo-prop-2" },
      { id: "e7", spent_on: `${y}-08-19`, description: "Versicherung Wohngebäude", vendor: "Allianz", category: "immediate", amount: 480, property_id: "demo-prop-1" },
      { id: "e8", spent_on: `${y}-09-02`, description: "Darlehenszinsen Sept", vendor: "ING-DiBa", category: "financing", amount: 740, property_id: "demo-prop-2" },
      { id: "e9", spent_on: `${y}-10-15`, description: "Fenstertausch Erdgeschoss", vendor: "Fensterbau Schmidt", category: "depreciable", amount: 4200, property_id: "demo-prop-1" },
      { id: "e10", spent_on: `${y}-11-08`, description: "Müllabfuhr Jahresgebühr", vendor: "AWISTA", category: "utilities_passthrough", amount: 720, property_id: "demo-prop-1" },
      { id: "e11", spent_on: `${y}-11-28`, description: "Schornsteinfeger", vendor: "Bezirkskaminkehrer", category: "utilities_passthrough", amount: 95, property_id: "demo-prop-2" },
      { id: "e12", spent_on: `${y}-12-05`, description: "Steuerberater-Honorar", vendor: "StB Müller", category: "other", amount: 850, property_id: "demo-prop-1" },
    ];
  })(),
};
