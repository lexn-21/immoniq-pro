# Zahlungen-Modul: Stripe SEPA + Bank-Sync

Ziel: Vermieter sieht **alle Geldflüsse pro Objekt live**, ohne Belege zu tippen. Das schlägt klassische Buchhaltung, weil Ein- und Ausgänge automatisch zugeordnet werden.

## Was gebaut wird

### A) Mieter zahlen direkt (Stripe Connect + SEPA Lastschrift)
1. **Vermieter-Onboarding** als Stripe Connect Express Account (5 Min, einmalig pro Vermieter).
2. Pro Mietverhältnis → Button **„Mietzahlung aktivieren"** → erzeugt SEPA-Mandat-Link → Mieter unterschreibt 1×.
3. Stripe zieht ab dann monatlich automatisch ein (Miete + NK-Vorauszahlung), zahlt auf Vermieter-Konto aus.
4. ImmonIQ behält **0,5 % Application Fee** = Umsatzquelle.
5. Bei Zahlungsausfall: automatisches Mahnwesen + Inbox-Eintrag „Miete Februar offen – Mieter X".

### B) Bank read-only verknüpfen (GoCardless Bank Account Data)
1. Einstellungen → **„Bankkonto verbinden"** → GoCardless-Flow (PSD2-SCA) → Vermieter wählt seine Bank, loggt sich ein, bestätigt 90 Tage Lesezugriff.
2. Edge Function `bank-sync` ruft täglich Umsätze ab, schreibt in `bank_transactions`.
3. **Auto-Matcher**: matcht Umsatz auf Mieter (Verwendungszweck + Betrag ± 5 €) → erzeugt `income`-Eintrag. Nicht-zugeordnete Umsätze → Inbox als „Bitte zuordnen".
4. Ausgaben (Handwerker, Versicherung) → werden mit `expenses` gematcht oder als neuer Ausgaben-Vorschlag in Inbox.
5. Re-Auth-Reminder 7 Tage vor Ablauf der 90-Tage-Berechtigung.

### C) Neue Cockpit-Ansicht „Cashflow pro Objekt"
- Live-Saldo, MTD/YTD, offene Forderungen, DATEV-Export-Button (CSV nach Steuerberater-Schema).
- Banner „Schlägt jede Buchhaltung – kein Tippen mehr".

## Technisch

### Neue Tabellen
- `bank_connections` (user_id, gocardless_requisition_id, institution_id, valid_until, status)
- `bank_accounts` (connection_id, iban, owner_name, currency, balance)
- `bank_transactions` (account_id, booking_date, amount, currency, counterparty_name, counterparty_iban, purpose, matched_expense_id, matched_property_id, matched_tenant_id, status: unmatched/matched/ignored)
- `tenant_payment_mandates` (tenant_id, stripe_mandate_id, stripe_subscription_id, amount_cents, status, next_charge_date)
- `connected_accounts` (user_id, stripe_account_id, charges_enabled, payouts_enabled)

Alle mit RLS `auth.uid() = user_id` + GRANTs.

### Edge Functions
- `gocardless-init-link` — startet Bank-Auth-Flow, gibt Redirect-URL zurück
- `gocardless-callback` — speichert requisition, listet accounts
- `gocardless-sync` — täglicher Cron (pg_cron), holt Umsätze, ruft Auto-Matcher
- `stripe-connect-onboard` — erzeugt Express Account + Onboarding-Link
- `stripe-create-tenant-mandate` — SEPA-Setup-Intent + Subscription für Mieter
- `stripe-connect-webhook` — Erweiterung der bestehenden Webhook für `invoice.paid`, `invoice.payment_failed` (Mieterzahlungen)

### Secrets benötigt
- `GOCARDLESS_BAD_SECRET_ID` + `GOCARDLESS_BAD_SECRET_KEY` (kostenlos auf bankaccountdata.gocardless.com)
- Stripe Connect läuft über bestehende Stripe-Integration

### UI
- Neue Sidebar-Section **„Finanzen"** mit Tabs: Cashflow · Mieten · Bank · Belege · Export
- Setup-Wizard 2-Schritt: „Bank verbinden" + „Stripe einrichten" (beides optional, beide unabhängig nutzbar)

## Rechtlich / Haftung
- Hinweis: „Lesezugriff aufs Konto, ImmonIQ kann keine Überweisungen auslösen"
- DSGVO-Verarbeitungsverzeichnis-Eintrag für GoCardless + Stripe
- Footer-Disclaimer: „Ersetzt keine Buchhaltung – für Steuererklärung Steuerberater konsultieren"

## Roadmap (3 Phasen, damit nicht alles auf einmal)

**Phase 1 (jetzt, ~Tag 1):** GoCardless Bank-Sync read-only + Cashflow-Cockpit + Auto-Matcher. Sofort wertvoll, kein Mieter-Onboarding nötig.

**Phase 2 (~Tag 2):** Stripe Connect Express + Mieter-SEPA-Mandate + Mahnwesen.

**Phase 3 (~Tag 3):** DATEV/Lexware-CSV-Export + monatlicher PDF-Report an Steuerberater per E-Mail.

## Was ich von dir brauche, bevor ich starte
1. **GoCardless BAD Account** anlegen auf https://bankaccountdata.gocardless.com → Secret ID + Secret Key (kostenlos, 2 Min) → dann reiche ich `add_secret` ein.
2. OK für **0,5 % Application Fee** auf Mietzahlungen als ImmonIQ-Umsatzquelle? (Alternativ: Flat 2 €/Mietverhältnis/Monat)
3. Start mit **Phase 1** (Bank-Sync) oder direkt **alle 3 Phasen** durchziehen?
