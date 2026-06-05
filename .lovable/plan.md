
## Ziel
Sieben zusammenhängende Verbesserungen — von der Bewertung über Belege bis zum Finanzierungs-Cockpit. Damit das nicht in einem Riesen-Schritt zerschellt, baue ich in **drei Wellen**, jede einzeln testbar.

---

### Welle 1 — Bewertung & Mietspiegel (sofort sichtbar)

**Bewertung mit Objektauswahl + Bandbreite (`/app/valuation`)**
- Dropdown „Eigene Immobilie wählen" → PLZ, Wohnfläche, Kaltmiete werden vorbefüllt aus `properties` + `units`.
- Bewertung gibt **Spanne** zurück (Pessimistisch / Realistisch / Optimistisch), ±12 % um Blended-Value, statt eines fixen Preises.
- Neuer Block „So rechnen Banken" (Sachwert vs. Ertragswert vs. Vergleichswert, kurz erklärt, mit Quelle ImmoWertV §§ 17/27/24).
- Disclaimer prominent: „Indikative Range — ersetzt keinen Gutachter nach § 194 BauGB".

**Mietspiegel-Karte (`MietspiegelCard.tsx`)**
- Bug-Fix: einige offizielle URLs sind tot/redirected → aktualisieren + `target="_blank" rel="noopener"` prüfen.
- Fallback „Google Suche site:.de" → präzisere Query mit `"Mietspiegel" + Stadt + aktuelles Jahr`.

---

### Welle 2 — Belege-Scan-Archiv & Mietvertrags-Vorlage

**Belege wie Buchhaltung (`/app/expenses`)**
- Bereits vorhandener `DocScanner` wird im Expense-Anlage-Dialog eingebunden → Multi-Page Scan → PDF in `receipts` Bucket.
- Neuer Tab/Filter „Archiv": chronologisch sortiert, Suche nach Lieferant/Betrag/Datum, Vorschau im Drawer, Download.
- Status-Badges (gebucht / offen / steuerlich relevant).

**Mietvertrag-Vorlage ARAG-Style (`/app/templates`)**
- Neuer Starter „Wohnraum-Mietvertrag (unbefristet)" — komplett ausformuliert nach BGB §§ 535 ff., mit Index-/Staffel-Option, Kaution, Schönheitsreparaturen-Klausel BGH-konform.
- Editierbar im bestehenden Markdown-Editor mit Placeholder-System.
- Footer-Disclaimer in jedem rechtlichen Template: „Muster ohne Rechtsberatung — vor Verwendung individuell prüfen lassen".

---

### Welle 3 — Finanzierungs-Cockpit (neue Seite `/app/financing`)

**Datenmodell** (neue Migration)
```
public.financings (
  id, user_id, property_id,
  bank_name, loan_amount, interest_rate, fixed_until,
  monthly_rate, start_date, term_months,
  current_balance,  -- Restschuld
  notes, created_at, updated_at
)
```
+ GRANTs + RLS (user_id = auth.uid()).

**UI Cockpit**
- Pro Objekt: Restschuld-Kurve (Tilgungsplan annäherungsweise berechnet), Zinsbindung-Countdown, „Anschluss in X Monaten".
- **Leitzins-Widget** ist bereits vorhanden (`LeitzinsWidget.tsx`) → integrieren oben auf der Seite.
- **Umfinanzierungs-Check**: aktueller Marktzins (aus Leitzins + Spread-Annahme 1.5 %) vs. eigener Zins → grünes „Lohnt sich" wenn Differenz > 0.5 % und Zinsbindung < 18 Monate.
- **Alert** (Banner auf Dashboard): wenn Marktzins ≥ 1 % unter eigenem Zins → „Umfinanzierung prüfen".
- Sektion „Bank wird Kunde": kurzer Pitch + Mail-Button mit vorausgefüllter Anfrage an Hausbank (mailto-Vorlage).

**Methodik-Text** auf der Seite: erklärt Sondertilgung, Forward-Darlehen, Volltilger — knapp, ohne Rechtsberatung.

---

## Technik-Notizen
- Keine externe Bank-API — Leitzins kommt aus dem existierenden Widget (EZB).
- Range-Bewertung: `value_blended * 0.88` / `* 1.0` / `* 1.12` als drei Werte.
- Belege-Scan nutzt vorhandene `DocScanner`-Komponente, kein neuer Code für Scanning.
- Mietvertrag-Template ist reiner Markdown-Text, nutzt bereits existierende Placeholder-Engine in `Templates.tsx`.

---

## Reihenfolge der Ausführung
1. Welle 1 (Valuation Range + Mietspiegel-Fix) — 1 Turn
2. Welle 2 (Expenses-Scan-Archiv + Mietvertrag-Vorlage) — 1 Turn
3. Welle 3 (Financing-Modul mit Migration + Cockpit + Alert) — 1–2 Turns

Soll ich so loslegen? Wenn du eine Welle anders priorisierst (z. B. zuerst Finanzierung), sag Bescheid — sonst starte ich mit Welle 1.
