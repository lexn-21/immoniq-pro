Großer Bau — deshalb erst Plan, dann durchziehen ohne Rückfragen. Ich baue in dieser Reihenfolge und stoppe nicht zwischendrin.

## Reihenfolge & Umfang

### 1. Navigation & Onboarding sofort aufräumen (Sofort-Fix)
- Sidebar/Command Palette komplett überarbeiten: **Grundstücke**, **Handwerker (Google Maps)**, **Kurzzeit/Bookings**, **Buchhaltung/Banking**, **Steuer-Modelle** sichtbar und logisch gruppiert.
- Neue Gruppierung: *Portfolio · Mieter · Finanzen · Vermarktung · Recht & Steuer · Werkzeuge*.
- Onboarding: nach Persona (Vermieter / Verwalter / Mieter / Suchender) nur den passenden Ast zeigen, Rest ausblenden. „Was willst du heute tun?" statt Formular-Wüste.
- Neue Route `/app/handwerker` mit Google-Maps-Suche (nutzt bestehenden `google_maps` Connector, Places New API): Handwerker in Umgebung der Immobilie, direkt als Kontakt speichern + Ticket zuordnen.

### 2. Öffentliches Mieter-Profil + Vermieter-Bewertungen (Netzwerk-Effekt)
- Bestehenden `tenant_pass` erweitern: öffentliche Slug-URL `/pass/:code` existiert schon → um **Vermieter-Bewertungen** (Sterne + Kommentar) ergänzen, neue Tabelle `landlord_ratings_public`.
- Vermieter kann nach Mietende Bewertung abgeben → wird am Pass verifiziert angezeigt.
- Mieter nimmt seinen Pass zum nächsten Vermieter mit → LinkedIn-Effekt.

### 3. PLZ-SEO-Seiten mit Live-Daten (Traffic-Motor)
- `MietspiegelPlz` existiert bereits → deutlich ausbauen: pro PLZ Mietpreis, Kaufpreis, Rendite, Nachfrage-Trend, Top-Handwerker, ähnliche PLZ. Sitemap für alle 8.187 PLZ generieren.
- JSON-LD `Place` + `RealEstateListing` Schema.
- Interne Verlinkung zwischen Nachbar-PLZ für SEO-Juice.

### 4. Steuer-Modelle & Optimierungs-Rechner (Kunden-Wert)
- Neue Route `/app/steuer-modelle`: interaktive Rechner für
  - **AfA-Optimierung** (linear vs. Sonder-AfA §7b, Denkmal §7i/h)
  - **Erhaltung vs. Herstellung** (15%-Grenze §6 Abs. 1 Nr. 1a EStG)
  - **Vermögensübertragung / vorweggenommene Erbfolge** (Freibeträge, Nießbrauch)
  - **GmbH vs. Privat** (Vermögensverwaltende GmbH ab X Objekten)
- Ergebnisse als PDF (bestehende `beispielrechnungPdf` Struktur wiederverwenden).
- Für WEG (Wohnungseigentümergemeinschaft): Sonderumlage-Rechner, Instandhaltungsrücklage-Optimierung.

### 5. Kautions-Konto (erstes Finanzprodukt)
- Neue Tabelle `deposit_accounts` mit Status (offen, verwahrt, ausgezahlt), Zinssatz, Mieter- und Vermieter-Zustimmung.
- UI: Kaution aus Mieter-Detail heraus in ImmonIQ-Verwahrung überführen (später BaFin-Partner-Anbindung — vorerst manuelle Bestätigung + Vertrag-PDF).
- Rechtlich sauber: separates Treuhand-Konto §551 BGB, Verzinsung ausgewiesen.

### 6. Native App vorbereiten + Offene API (danach, ohne Rückfrage weiter)
- **PWA schärfen**: Push, Offline-Cache, Install-Prompt — Basis ist da, feinjustieren.
- **Offene API**: Edge Function `api/v1/*` mit API-Keys pro Nutzer (neue Tabelle `api_keys`), read-only für Properties/Tenants/Payments.
- Docs-Seite `/api` mit Beispielen.

## Technische Details
- Alle neuen Tabellen mit RLS + GRANT-Block (public/authenticated/service_role je nach Bedarf).
- Steuer-Rechner rein Client-seitig, keine Steuerberatung → Disclaimer-Sektion pro Modell.
- Handwerker-Suche über bestehenden Google-Maps-Connector (Places API New via Gateway).
- Kautions-Konto vorerst ohne echte Bank-Anbindung → als „Verwahrungs-Vertrag" mit PDF-Signatur, Upgrade-Pfad zu BaFin-Partner dokumentiert.

## Nicht-Ziel dieser Runde
- Echte Banklizenz / BaFin-Registrierung
- iOS/Android Native Build (PWA reicht vorerst)
- Institutional Deals & Presse

Nach Freigabe ziehe ich 1→6 in einem Rutsch durch.