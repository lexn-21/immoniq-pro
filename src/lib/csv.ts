// Mini-CSV-Helper — keine Dependency, escaped korrekt nach RFC 4180,
// BOM für Excel-Kompatibilität (Umlaute), Semikolon als Trennzeichen (DE-Excel).

type Row = Record<string, unknown>;

const esc = (v: unknown): string => {
  if (v == null) return "";
  const s = typeof v === "string" ? v : v instanceof Date ? v.toISOString() : String(v);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function toCsv(rows: Row[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Array.from(rows.reduce<Set<string>>((s, r) => {
    Object.keys(r).forEach((k) => s.add(k));
    return s;
  }, new Set()));
  const head = cols.join(";");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(";")).join("\r\n");
  return `\uFEFF${head}\r\n${body}\r\n`;
}

export function downloadCsv(filename: string, rows: Row[], columns?: string[]) {
  const csv = toCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
