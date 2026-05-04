
# Roadmap: NKA-Modul (voll) + WG/Studenten-Modul

Beide Module bauen auf der bestehenden `units` / `tenants` / `expenses` / `payments` / `listings` Struktur auf. Gemeinsamer Daten-Kern, parallele Frontends. Reihenfolge: erst NKA-Fundament (höhere Monetarisierung, klarer Pain), dann WG-Erweiterung des Marketplace, dann verzahnte Cross-Features.

---

## Teil A — Nebenkostenabrechnung (voll: Belege → NKA → Versand → Forderung)

### Phase A1: Datenmodell & Verteilerschlüssel
**Neue Tabellen:**
- `nka_periods` — Abrechnungszeitraum pro Property (year, period_start, period_end, status: draft/sent/closed)
- `nka_cost_items` — Einzelne Kostenposition (period_id, category, amount, distribution_key, umlagefähig bool, source_expense_id nullable)
- `nka_distributions` — Pro Mieter berechnete Anteile (period_id, tenant_id, unit_id, vorauszahlung_summe, ist_summe, saldo, pdf_path)
- `units` erweitern: `persons_count`, `heating_share_pct` (manuell für Heizkostenüberschreibung)

**Verteilerschlüssel-Enum:** `qm`, `personen`, `einheiten`, `verbrauch_manual`, `direkt_zuordnung`

**Erweiterung `expenses`:**
- `nka_eligible` boolean default false
- `nka_distribution_key` text nullable
- `nka_period_id` uuid nullable

### Phase A2: Belege-Kategorisierung (KI-Hook in bestehende expenses)
- Erweitere `ai-copilot` oder neue Edge Function `ai-classify-expense`: input Beleg-Text/OCR → output `{nka_eligible, suggested_category, suggested_distribution_key}`
- Trigger: beim Anlegen/Editieren von `expenses` mit Kategorie "betriebskosten"/"heizung" → KI-Vorschlag, User bestätigt
- BetrKV-Katalog (17 Kostenarten) als seed-Tabelle `nka_cost_categories`

### Phase A3: NKA-Generator (Berechnung)
- Edge Function `nka-generate`: input `period_id` → liest cost_items, units, tenants, vorauszahlungen aus payments, berechnet Verteilung pro Mieter
- Saldo = Soll - Ist (Nachzahlung positiv / Erstattung negativ)
- Speichert in `nka_distributions`

### Phase A4: PDF-Generierung
- Edge Function `nka-render-pdf`: nutzt Vorlage (Deno + pdf-lib oder html→pdf via puppeteer-Service / oder simple HTML→PDF mit jsPDF im Frontend)
- Pro Mieter: Deckblatt, Kostenaufstellung BetrKV-konform, Heizkosten separat (HeizkostenV), Saldo-Auszug, Widerspruchsfrist
- PDF in Storage `documents/nka/{period_id}/{tenant_id}.pdf`

### Phase A5: Versand & Forderung
- Edge Function `nka-send` nutzt vorhandene `send-transactional-email` mit PDF-Attachment
- Bei Saldo > 0: automatisch `payments`-Eintrag (kind=`nka_nachzahlung`, status=`open`, due_date = +30 Tage)
- Bei Saldo < 0: Eintrag als Erstattungsverpflichtung
- Hook ins bestehende **Mahnwesen** (`ai-dunning-letter`): wenn `nka_nachzahlung` overdue → Mahnstufe wie bei Miete

### Phase A6: UI-Pages
- Neu: `src/pages/app/Nebenkosten.tsx` — Property wählen, Periode wählen/anlegen, Kosten zuordnen, Vorschau, Generate, Versand
- Neu: `src/pages/app/NebenkostenDetail.tsx` — Detailansicht einer Periode mit Mieter-Tabelle, PDFs, Versand-Status
- Sidebar-Eintrag "Nebenkosten" zwischen "Mieter" und "Mahnwesen"
- Dashboard-Card: offene NKA-Perioden / fällige NKAs

### Phase A7: Tenant-Portal-Erweiterung
- Im Mieter-Portal: NKA-PDF zum Download, Saldo-Anzeige, Widerspruchs-Funktion
- RPC `tenant_portal_get_nka(_token)` → liefert Distributionen für eingeloggten Mieter

---

## Teil B — WG/Studenten-Modul

### Phase B1: Listing-Erweiterung
**`listings` erweitern:**
- `kind` Enum erweitern um `wg_room` (zusätzlich zu `rent`/`sale`)
- `wg_total_rooms` int (Gesamtzimmer der WG)
- `wg_current_flatmates` int
- `wg_room_size_sqm` numeric (das spezifische Zimmer)
- `wg_furnished` boolean
- `wg_shared_facilities` jsonb (`{bathroom: true, kitchen: true, balcony: false}`)
- `wg_flatmate_age_min/max`, `wg_flatmate_gender_pref` (`any`/`female`/`male`/`divers`)
- `min_term_months` schon vorhanden ✓

### Phase B2: Marketplace/Listings-UI
- Neuer Filter "WG-Zimmer" in Listings-Liste
- Eigene Karten-Variante (Badge "WG", Zimmergröße statt Wohnungsgröße, Mitbewohner-Info)
- ListingEditor: Sektion "WG-Details" wenn kind=wg_room
- Suche nach Studentenstädten / Uni-Nähe (später optional via Google Places "university")

### Phase B3: Studenten-Bonität (seeker_profiles)
**Erweiterung `seeker_profiles`:**
- `is_student` boolean
- `university` text
- `study_program` text
- `study_semester` int
- `bafoeg_amount` numeric nullable
- `guarantor_name`, `guarantor_relation`, `guarantor_income` (Bürgschaft Eltern)
- `guarantor_document_path` (Bürgschaftserklärung Upload)
- `study_certificate_path` (Immatrikulationsbescheinigung)

**ai-score-application erweitern:** wenn Bewerber Student → alternative Scoring-Logik (Bürgschaft Eltern statt eigenes Einkommen, BAföG-Sicherheit, Studienfortschritt)

### Phase B4: WG-Casting (Multi-User-Bewerbung)
**Neue Tabellen:**
- `wg_member_links` — verknüpft bestehende WG-Mitbewohner mit einem Listing (listing_id, member_email, member_name, token, role: `decision_maker`/`viewer`)
- `application_votes` — pro WG-Mitglied eine Stimme pro Bewerbung (application_id, member_link_id, vote: `yes`/`no`/`maybe`, comment)

**Flow:**
1. Vermieter/WG-Hauptmieter erstellt WG-Listing, lädt Mitbewohner per E-Mail-Link ein
2. Mitbewohner sehen via Token alle Bewerbungen, können voten + kommentieren
3. Eigene Page `/wg-casting/:token` (read-only Bewerbungsliste + Vote-Buttons)
4. Application-Detail zeigt Vote-Aggregat (3/4 ja, 1 maybe)

### Phase B5: UI-Polish
- Marketplace-Filterleiste: "WG-Zimmer" Toggle, "Nur für Studenten OK" Toggle
- SeekerProfile-Wizard: Schritt "Bist du Student?" mit Bürgschafts-Upload-Flow
- Dashboard-Card für WG-Hauptmieter: "X neue Bewerbungen, Y warten auf deine Stimme"

---

## Teil C — Verzahnung

1. **Geteiltes Datenmodell:** `units` ist die Basis für beide. Ein WG-Zimmer = eine `unit` mit `is_wg_room=true`. NKA verteilt dann pro WG-Zimmer-unit korrekt nach Personen.
2. **NKA für WGs:** Verteilerschlüssel "per Zimmer" automatisch wenn alle units der Property `is_wg_room`. Heizkosten nach qm des Zimmers + Anteil Gemeinschaftsfläche.
3. **Studenten-Listings → Bonitäts-Check:** wenn Bewerber `is_student=true`, Bonitätscheck-Edge-Function nutzt Bürgschafts-Daten.
4. **Mahnwesen:** Funktioniert für NKA-Nachzahlungen genauso wie für Miete; bei WG-Zimmern wird der jeweilige Mieter (nicht die ganze WG) gemahnt.

---

## Reihenfolge der PRs

```text
PR1: NKA-Datenmodell (Migrations) + units.persons_count
PR2: NKA-UI (Periode anlegen, Kosten zuordnen, Verteilung-Preview)
PR3: NKA-PDF-Generator + Versand + Forderung in payments
PR4: NKA-Tenant-Portal-Integration
PR5: WG-Listing-Felder (Migration) + ListingEditor-Erweiterung + Marketplace-Filter
PR6: Studenten-Felder in seeker_profiles + ai-score-application Anpassung
PR7: WG-Casting (member_links, votes, /wg-casting/:token Page)
PR8: Verzahnung — NKA-Per-Zimmer-Schlüssel, Cross-Dashboard-Cards
```

---

## Technische Details (knapp)

**Edge Functions neu:**
- `nka-generate` (Berechnung)
- `nka-render-pdf` (PDF-Erzeugung, nutzt pdf-lib via esm.sh)
- `nka-send` (Versand via send-transactional-email + PDF-Attachment)
- `ai-classify-expense` (KI-Kategorisierung Belege, nutzt LOVABLE_API_KEY / google/gemini-2.5-flash)

**Storage:**
- Bestehender `documents`-Bucket für NKA-PDFs, Pfad `nka/{period_id}/{tenant_id}.pdf`
- RLS: Vermieter sieht alle, Mieter via Tenant-Portal-Token

**Quotas:** NKA-Generierung in `check_user_quota` aufnehmen (Free: 1/Jahr, Pro: unbegrenzt) — Verkaufsargument für Pro.

**Recht:** PDF-Vorlagen halten BetrKV (§ 2) und HeizkostenV (mind. 50/50 Verbrauch/Fläche) ein. Disclaimer "rechtlich nicht geprüft, Muster" im Footer der PDFs (siehe Anwaltsfrage aus deiner Notiz).

---

## Aufwand-Schätzung

- Teil A (NKA voll): ~3–4 Wochen Lovable-Iterationen
- Teil B (WG voll): ~2–3 Wochen
- Teil C (Verzahnung): ~3–5 Tage

Soll ich mit **PR1 (NKA-Datenmodell)** starten sobald du den Plan freigibst?
