import { jsPDF } from "jspdf";

export interface BeispielrechnungInput {
  units: number;
  hoursPerUnitMonth: number;
  hoursPerUnitQuarter: number;
  hourlyRate: number;
  yearlyAdminHours: number;
  afterYearlyAdminHours: number;
  yearlyAdminCost: number;
  afterYearlyAdminCost: number;
  totalSaved: number;
}

const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long" });

export function generateBeispielrechnungPdf(i: BeispielrechnungInput): {
  blob: Blob;
  fileName: string;
  savingsFormatted: string;
} {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 56;

  // Header — gold bar
  doc.setFillColor(201, 162, 39); // #c9a227
  doc.rect(0, 0, W, 6, "F");

  // Brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(10, 10, 10);
  doc.text("ImmonIQ", M, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(dateFmt.format(new Date()), W - M, y, { align: "right" });

  y += 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(10, 10, 10);
  doc.text("Deine Beispielrechnung", M, y);

  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "Ersparnispotenzial mit ImmonIQ auf Basis deiner Portfolio-Angaben.",
    M,
    y
  );

  // Highlight
  y += 34;
  doc.setFillColor(250, 250, 245);
  doc.setDrawColor(230, 230, 220);
  doc.roundedRect(M, y, W - M * 2, 90, 10, 10, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 130, 60);
  doc.text("JÄHRLICHE ERSPARNIS", M + 20, y + 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(10, 10, 10);
  doc.text(`≈ ${nf0.format(i.totalSaved)} €`, M + 20, y + 66);

  y += 118;

  // Deine Angaben
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(10, 10, 10);
  doc.text("Deine Angaben", M, y);
  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(M, y, W - M, y);
  y += 18;

  const rows: [string, string][] = [
    ["Wohneinheiten", `${nf0.format(i.units)} WE`],
    ["Stunden pro Objekt / Monat", `${nf1.format(i.hoursPerUnitMonth)} h`],
    ["Stunden pro Objekt / Quartal", `${nf1.format(i.hoursPerUnitQuarter)} h`],
    ["Zeitwert / Stundensatz", `${nf0.format(i.hourlyRate)} €/h`],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  for (const [k, v] of rows) {
    doc.setTextColor(110, 110, 110);
    doc.text(k, M, y);
    doc.setTextColor(10, 10, 10);
    doc.text(v, W - M, y, { align: "right" });
    y += 20;
  }

  // Ergebnis
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(10, 10, 10);
  doc.text("Ergebnis pro Jahr", M, y);
  y += 6;
  doc.line(M, y, W - M, y);
  y += 18;

  const results: [string, string, string][] = [
    [
      "Verwaltungszeit",
      `${nf0.format(i.yearlyAdminHours)} h`,
      `${nf0.format(i.afterYearlyAdminHours)} h`,
    ],
    [
      "Verwaltungskosten",
      `${nf0.format(i.yearlyAdminCost)} €`,
      `${nf0.format(i.afterYearlyAdminCost)} €`,
    ],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(110, 110, 110);
  doc.text("Position", M, y);
  doc.text("Ohne ImmonIQ", M + 240, y);
  doc.text("Mit ImmonIQ", W - M, y, { align: "right" });
  y += 16;
  for (const [k, before, after] of results) {
    doc.setTextColor(10, 10, 10);
    doc.text(k, M, y);
    doc.setTextColor(110, 110, 110);
    doc.text(before, M + 240, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(150, 120, 30);
    doc.text(after, W - M, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 20;
  }

  // Formel & Annahmen
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text("Annahmen & Formel", M, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  const notes = doc.splitTextToSize(
    "Rechnung: (WE × h/Monat × 12 + WE × h/Quartal × 4) × Stundensatz. Annahme: 60 % Zeitersparnis durch Automatisierung. Alle Zahlen sind unverbindliche Beispielwerte. Deine tatsächliche Ersparnis hängt von Portfolio, Prozessen und Steuerberater ab.",
    W - M * 2
  );
  doc.text(notes, M, y);
  y += notes.length * 14 + 24;

  // CTA
  doc.setFillColor(10, 10, 10);
  doc.roundedRect(M, y, W - M * 2, 70, 10, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("30 Tage kostenlos testen", M + 20, y + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text("immoniq.xyz/auth  ·  Founders-Zugang für Privat-Portfolios 0 €", M + 20, y + 52);

  // Footer
  const H = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "ImmonIQ · ENTERVENTUS · Made in Germany · Zahlen ohne Gewähr",
    M,
    H - 24
  );

  const savingsFormatted = nf0.format(i.totalSaved);
  const fileName = `immoniq-beispielrechnung-${i.units}we-${nf0
    .format(i.totalSaved)
    .replace(/\./g, "")}eur.pdf`;
  const blob = doc.output("blob");
  return { blob, fileName, savingsFormatted };
}
