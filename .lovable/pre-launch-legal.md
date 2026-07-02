# Pre-Launch Legal-Checkliste — ImmonIQ

Stand: 02.07.2026 · vor Umstellung von Sandbox → Live

## 1. Rechtliche Basisdokumente (Code — erledigt ✅)
- [x] Impressum (§5 TMG) — vollständig mit Tel, E-Mail, Kleinunternehmer §19, MStV, EU-ODR
- [x] Datenschutzerklärung — Auftragsverarbeiter, PSD2/Bank, KI, Bonität, Speicherdauer
- [x] AGB
- [x] Widerrufsbelehrung
- [x] Cookie-Banner
- [x] KI-Disclaimer in AskCopilot, LawCorner, Dunning, ListingApplications

## 2. Musst DU offline machen (nicht im Code)
- [ ] **Gewerbeanmeldung** beim Gewerbeamt Ennigerloh (vor 1. €-Umsatz Pflicht!)
      → Formular „GewA 1", ca. 20–40 €. Ohne das ist jede Rechnung angreifbar.
- [ ] **Steuerliche Erfassung** beim Finanzamt (Elster, „Fragebogen zur steuerlichen Erfassung")
      → Kleinunternehmer §19 UStG wählen.
- [ ] **Berufshaftpflicht / Vermögensschaden-Haftpflicht** angebot einholen
      (Hiscox, Exali — für IT/SaaS ~200–600 €/Jahr). Wegen KI-Empfehlungen sinnvoll.
- [ ] **AVV-PDFs archivieren** in einem Ordner:
      - Supabase (Lovable Cloud): über Lovable Dashboard → Legal → DPA herunterladen
      - Stripe: dashboard.stripe.com → Settings → Legal → DPA
      - Mailgun: über deren Legal-Center
      - Google (Places API): über GCP Console → Legal
      - Enable Banking: bei Vertragsabschluss zugeschickt
- [ ] **Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO)** anlegen
      → Simple Tabelle: Zweck / Datenarten / Empfänger / Löschfrist. Muster: bfdi.bund.de.
- [ ] **TOMs dokumentieren** (2-Seiten-PDF reicht):
      TLS 1.3, RLS pro Vermieter, Backup täglich (Supabase), 2FA-fähig, verschlüsselter Vault.

## 3. Vor dem ersten echten Zahlungsvorgang
- [ ] Stripe-Statement-Descriptor prüfen (Payments Tab): sollte „ImmonIQ" o.ä. sein — nicht „LOVABLE".
- [ ] Testkauf mit eigener Karte im Live-Modus (kleines Abo), danach sofort Refund.
- [ ] `stripe_webhook_events` in DB prüfen: kommt der Event an? Wird `subscriptions` befüllt?
- [ ] E-Mail-Empfang testen: Rechnung, Willkommensmail, Bestätigungsmail.

## 4. Beta mit ersten Vermietern
- [ ] Beta-NDA / Feedback-Vereinbarung optional (formlos reicht meistens).
- [ ] Klarstellen: „Beta — keine Garantie für Verfügbarkeit oder Vollständigkeit der Steuer-Features."
- [ ] Backup-Export-Route zeigen: User muss Daten jederzeit exportieren können (Anlage V, Zahlungsverlauf).

## 5. Nach Go-Live in den ersten 30 Tagen
- [ ] Monitoring: Sentry o.ä. optional, mindestens Lovable-Logs täglich sichten.
- [ ] DSGVO-Auskunftsprozess durchspielen (Löschung testen).
- [ ] Data-Breach-Notfallplan schreiben (72h-Meldefrist LDI NRW).

## 6. Bewusste Grenzen (nicht rechtsverbindlich)
Diese Checkliste ersetzt keine anwaltliche Beratung. Für belastbare Freigabe
vor Live einmal 1–2 h Anwalt (Fachanwalt IT-Recht) — kostet ~250–500 €,
ist billiger als eine Abmahnung.
