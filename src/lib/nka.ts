// Nebenkostenabrechnung — Berechnungs-Engine & PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type DistKey = "qm" | "personen" | "einheiten" | "verbrauch_manual" | "direkt_zuordnung" | "heizkostenv_50_50";

export type NkaUnit = {
  id: string;
  label: string;
  living_space: number | null;
  persons_count: number | null;
  heating_share_pct?: number | null;
  tenant_id?: string;
  tenant_name?: string;
  vorauszahlung_summe: number;
};

export type NkaCostItem = {
  id: string;
  category_code: string;
  label: string | null;
  amount: number;
  distribution_key: DistKey;
  umlagefaehig: boolean;
  // Bei direkt_zuordnung / verbrauch_manual: Zuordnung pro unit_id
  manual_shares?: Record<string, number>;
};

export type NkaDistributionResult = {
  unit_id: string;
  tenant_id?: string;
  tenant_name?: string;
  unit_label: string;
  vorauszahlung: number;
  ist: number;
  saldo: number;
  breakdown: Array<{
    category_code: string;
    label: string;
    distribution_key: DistKey;
    total: number;
    share_basis: string; // "20/100 m²"
    share_amount: number;
  }>;
};

export function computeDistributions(
  units: NkaUnit[],
  items: NkaCostItem[],
): NkaDistributionResult[] {
  const totalQm = units.reduce((s, u) => s + (u.living_space ?? 0), 0);
  const totalPersons = units.reduce((s, u) => s + (u.persons_count ?? 1), 0);
  const totalUnits = units.length;

  // HeizkostenV: Total verbrauchsbasierter Anteil (von manual_shares) — Rest auf qm verteilen
  const totalManualHeating: Record<string, number> = {};
  for (const item of items) {
    if (item.distribution_key === "heizkostenv_50_50") {
      totalManualHeating[item.id] = Object.values(item.manual_shares ?? {}).reduce((s, v) => s + (v ?? 0), 0);
    }
  }

  return units.map((u) => {
    const breakdown: NkaDistributionResult["breakdown"] = [];
    let ist = 0;
    for (const item of items) {
      if (!item.umlagefaehig) continue;
      let share = 0;
      let basis = "";
      if (item.distribution_key === "qm") {
        const qm = u.living_space ?? 0;
        share = totalQm > 0 ? (item.amount * qm) / totalQm : 0;
        basis = `${qm.toFixed(1)} / ${totalQm.toFixed(1)} m²`;
      } else if (item.distribution_key === "personen") {
        const p = u.persons_count ?? 1;
        share = totalPersons > 0 ? (item.amount * p) / totalPersons : 0;
        basis = `${p} / ${totalPersons} Pers.`;
      } else if (item.distribution_key === "einheiten") {
        share = totalUnits > 0 ? item.amount / totalUnits : 0;
        basis = `1 / ${totalUnits} Einheiten`;
      } else if (item.distribution_key === "direkt_zuordnung" || item.distribution_key === "verbrauch_manual") {
        share = item.manual_shares?.[u.id] ?? 0;
        basis = item.distribution_key === "verbrauch_manual" ? "Verbrauch" : "direkt";
      } else if (item.distribution_key === "heizkostenv_50_50") {
        // 50% nach qm, 50% nach Verbrauch (manual_shares). Override via heating_share_pct.
        const fixedShare = item.amount * 0.5;
        const consumptionShare = item.amount * 0.5;
        const qm = u.living_space ?? 0;
        const fixedPart = totalQm > 0 ? (fixedShare * qm) / totalQm : 0;
        const totalConsumption = totalManualHeating[item.id] ?? 0;
        const consumptionVal = item.manual_shares?.[u.id] ?? 0;
        const consumptionPart = totalConsumption > 0 ? (consumptionShare * consumptionVal) / totalConsumption : 0;
        let combined = fixedPart + consumptionPart;
        // Manueller Override pro Einheit (z. B. WG-Pauschale)
        if (u.heating_share_pct != null) {
          combined = item.amount * (Number(u.heating_share_pct) / 100);
          basis = `${u.heating_share_pct}% (Override)`;
        } else {
          basis = `50% qm + 50% Verbrauch`;
        }
        share = combined;
      }
      ist += share;
      breakdown.push({
        category_code: item.category_code,
        label: item.label || item.category_code,
        distribution_key: item.distribution_key,
        total: item.amount,
        share_basis: basis,
        share_amount: share,
      });
    }
    const vorauszahlung = u.vorauszahlung_summe ?? 0;
    return {
      unit_id: u.id,
      tenant_id: u.tenant_id,
      tenant_name: u.tenant_name,
      unit_label: u.label,
      vorauszahlung,
      ist,
      saldo: ist - vorauszahlung,
      breakdown,
    };
  });
}

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

export function renderNkaPdf(opts: {
  ownerName: string;
  ownerAddress?: string;
  propertyName: string;
  propertyAddress: string;
  periodStart: string;
  periodEnd: string;
  result: NkaDistributionResult;
}): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(opts.ownerName, 20, y);
  if (opts.ownerAddress) doc.text(opts.ownerAddress, 20, y + 4);

  // Mieter
  doc.setTextColor(0);
  doc.setFontSize(11);
  y += 18;
  doc.text(opts.result.tenant_name || "Mieter/in", 20, y);
  doc.text(opts.propertyAddress, 20, y + 5);
  doc.text(`Wohnung: ${opts.result.unit_label}`, 20, y + 10);

  // Titel
  y += 22;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Nebenkostenabrechnung", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Abrechnungszeitraum: ${opts.periodStart} – ${opts.periodEnd}`,
    20,
    y + 6,
  );
  doc.text(`Objekt: ${opts.propertyName}`, 20, y + 11);

  y += 20;

  // Aufstellung
  autoTable(doc, {
    startY: y,
    head: [["Kostenart", "Gesamt", "Schlüssel", "Anteil", "Betrag"]],
    body: opts.result.breakdown.map((b) => [
      b.label,
      eur(b.total),
      b.distribution_key,
      b.share_basis,
      eur(b.share_amount),
    ]),
    foot: [["Summe Ihrer Kosten", "", "", "", eur(opts.result.ist)]],
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold", fontSize: 9 },
    margin: { left: 20, right: 20 },
  });

  // Saldo-Block
  // @ts-expect-error lastAutoTable
  let yAfter = doc.lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY: yAfter,
    body: [
      ["Summe Ihrer Kosten", eur(opts.result.ist)],
      ["Geleistete Vorauszahlungen", `- ${eur(opts.result.vorauszahlung)}`],
      [
        opts.result.saldo >= 0 ? "Nachzahlung" : "Guthaben",
        eur(Math.abs(opts.result.saldo)),
      ],
    ],
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: 20, right: 20 },
    theme: "grid",
  });

  // @ts-expect-error
  yAfter = doc.lastAutoTable.finalY + 10;

  // Hinweis & Rechtshinweis
  doc.setFontSize(9);
  doc.setTextColor(80);
  const hint =
    opts.result.saldo >= 0
      ? `Bitte überweisen Sie den Nachzahlungsbetrag von ${eur(opts.result.saldo)} innerhalb von 30 Tagen auf das bekannte Konto.`
      : `Der Erstattungsbetrag von ${eur(Math.abs(opts.result.saldo))} wird Ihnen innerhalb von 30 Tagen überwiesen oder mit der nächsten Miete verrechnet.`;
  doc.text(doc.splitTextToSize(hint, w - 40), 20, yAfter);

  yAfter += 16;
  doc.setFontSize(7);
  doc.setTextColor(140);
  const disc =
    "Diese Abrechnung wurde nach §§ 556 ff. BGB, BetrKV und HeizkostenV erstellt. Einwendungen sind innerhalb von 12 Monaten nach Zugang schriftlich mitzuteilen (§ 556 Abs. 3 S. 5 BGB). Erstellt mit ImmonIQ — rechtlich nicht geprüft, Muster.";
  doc.text(doc.splitTextToSize(disc, w - 40), 20, yAfter);

  return doc.output("blob");
}
