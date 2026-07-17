
# ImmonIQ All-in-One: Hausverwaltung + Kurzzeitvermietung

Du hast bei allen drei Fragen "was am besten ist" gesagt – hier ist die aus meiner Sicht ehrlichste Antwort. Das Ganze ist ein **6–8 Wochen Programm**, kein Wochenend-Feature. Ich schneide es so, dass nach jeder Stufe etwas Fertiges live ist und du keinen Big-Bang riskierst.

## Was "am besten" bedeutet – meine Empfehlung

**Verwalter-Rolle → Beide Modi** (externer Verwalter *und* Selbstverwaltung).
Grund: Bestehende Hausverwaltungen sind eher Kunden/Partner als Feinde. Wir haben schon die Advisor-Mandat-Logik (Steuerberater) – die erweitern wir zur `verwalter`-Rolle. Selbstverwalter (WEG, kleine Eigentümer) bekommen dieselben Tools ohne Mandat.

**Airbnb/Booking → iCal-Sync jetzt, Channel-Manager-API später.**
Grund: Airbnb Partner API + Booking Connectivity XML erfordern offizielle Zulassung (3–6 Monate Zertifizierung, Umsatzgrenzen, laufende Audits). iCal-Sync (rein/raus) läuft **heute** und deckt 90 % des Nutzens: keine Doppelbuchungen, ein zentraler Kalender. Parallel bauen wir die **eigene Direktbuchungs-Engine** – da verdienst du 15 % Airbnb-Provision selbst.

**Reihenfolge → Verschachtelt, nicht parallel.** Das gemeinsame Fundament (Rollen, Objekt-/Einheit-Struktur, Kalender) wird einmal gebaut und von beiden Modulen genutzt.

## Stufenplan

### Stufe 1 – Fundament (Woche 1)
- Rolle `verwalter` + `verwalter_mandate` (analog Advisor)
- Objekt-Typen erweitern: `wohnung | haus | gewerbe | grundstück | ferienobjekt`
- Einheiten-Modell um `nutzungsart: langzeit | kurzzeit | gewerbe | eigennutz | leer` erweitern
- Zentrale Kalender-Tabelle `unit_calendar` (Blocker aus allen Quellen)

### Stufe 2 – Hausverwaltung Kern (Woche 2–3)
- **WEG-Modul**: Eigentümerliste, MEA-Anteile, Beschlusssammlung mit Volltextsuche
- **Beiratsportal**: geteilter Zugriff analog Advisor-Links
- **Hausgeld**: Wirtschaftsplan, Ist/Soll, Rücklagen-Konten
- **Übergabeprotokolle**: Ein-/Auszug mit Foto-Anhang, PDF-Export, Unterschrift
- **Handwerker-Vergabe**: Angebotsanfragen aus `tenant_issues` → Provider-Modul, Vergleich, Auftragserteilung, Freigabe-Workflow
- **Verwalter-Dashboard**: Portfolio-Übersicht über alle Mandate, ToDos, Fristen

### Stufe 3 – Kurzzeit Kern (Woche 3–4)
- **Direktbuchungs-Engine**: Objekt als "Ferienobjekt" listen (Erweiterung von `listings`), Verfügbarkeitskalender, Nacht-/Wochen-/Wochenendpreise, Mindestaufenthalt, Rüstzeiten
- **Booking-Flow für Gäste**: Objektseite → Datum → Preisberechnung → Anfrage oder Sofortbuchung → Stripe Zahlung + Kaution
- **Gäste-Chat**: nutzt bestehendes Messenger-System
- **Check-in-Automation**: E-Mail 3 Tage vorher mit Anfahrt, Türcode/Schlüssel-Übergabe, Hausordnung-PDF
- **Reinigungs-Workflow**: Nach Auschecken Task an Reinigungskraft (Provider-Modul)

### Stufe 4 – Portal-Sync (Woche 5)
- **iCal-Import**: Airbnb/Booking/VRBO/FeWo-direkt Feeds pro Objekt eintragen → Cron-Job alle 15 Min → externe Buchungen als Blocker
- **iCal-Export**: eigener Feed pro Objekt für Airbnb/Booking → verhindert Doppelbuchungen
- **Unified Inbox**: Buchungen aller Kanäle in einer Liste, farbig markiert nach Quelle

### Stufe 5 – Feinschliff (Woche 6)
- Preisautomatik (Wochenend-Aufschlag, Saison-Faktoren, Auslastungs-basierte Dynamik)
- Gästebewertungen + Rating (öffentliches Objekt-Profil)
- Umsatz-Auswertung Kurzzeit (Auslastung, ADR, RevPAR)
- Steuer: Kurzzeitumsätze automatisch in Anlage V + Meldung Beherbergungssteuer/Kurtaxe pro Stadt
- Kanalprovision-Tracking

### Stufe 6 – Später (nach Traction)
- Channel-Manager-API (Airbnb Partner + Booking XML) – erst wenn du 50+ Ferienobjekte hast, sonst nicht wirtschaftlich
- Smart-Lock-Integration (Nuki, TTLock) – automatische Codes pro Buchung
- Dynamic Pricing via KI (analog PriceLabs/Beyond)

## Technische Umsetzung

**Neue Tabellen:** `verwalter_mandates`, `weg_owners`, `weg_resolutions`, `weg_financial_plans`, `handover_protocols`, `contractor_bids`, `unit_calendar`, `bookings` (bereits vorhanden – erweitern), `booking_pricing_rules`, `ical_feeds`, `ical_events`, `guest_reviews`, `cleaning_tasks`, `beherbergungssteuer_rates`.

**Neue Edge-Functions:** `ical-sync` (Cron 15 Min), `ical-export` (public), `booking-quote`, `booking-confirm` (Stripe PaymentIntent), `checkin-email`, `cleaning-dispatch`, `pricing-suggest`.

**Wiederverwendet:** Advisor-Mandat-Logik → Verwalter. Messenger → Gäste-Chat. `tenant_issues` → Handwerker-Bids. `listings` → Kurzzeit-Objekte. `payments` → Bookings/Kautionen. Bestehende PDF-Generierung → Übergabeprotokolle & Reservierungsbestätigungen.

**Provider-Anbindungen:** Stripe (bereits da – für Buchungen + Kaution-Hold), iCalendar-Standard (RFC 5545, keine externen APIs), Nuki-API (später), OpenStreetMap Nominatim (Anfahrt-Karte).

## Was ich von dir brauche, bevor ich starte

1. **OK zum Stufenplan** – oder Verschiebung/Streichung einzelner Stufen.
2. **Stripe live/sandbox** ist konfiguriert? (für Kurzzeit-Zahlungen essenziell)
3. **Reihenfolge-Bestätigung**: Fange ich mit Stufe 1+2 (Hausverwaltung) an, oder willst du Stufe 3 (Kurzzeit) parallel/zuerst weil das umsatzrelevanter ist?

Sag mir "los, Stufe 1+2" und ich fange sofort mit dem Rollen-Fundament und dem WEG-Modul an.
