import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Pencil, Trash2, Copy, Download, Wand2, Sparkles, Mail, MessageCircle, CheckCircle2, AlertCircle, Search, X } from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/EmptyState";
import { CardGridSkeleton } from "@/components/ListSkeleton";
import { mailHref, waHref } from "@/lib/contact";

interface UserTemplate {
  id: string;
  title: string;
  category: string | null;
  body_md: string;
  updated_at: string;
}

const CATEGORIES = ["Mietvertrag", "Kündigung", "Mahnung", "Übergabeprotokoll", "Hausordnung", "Sonstiges"];

const STARTERS: Array<{ title: string; category: string; body_md: string }> = [
  {
    title: "Mietvertrag – Wohnraum (Standard, ausführlich)",
    category: "Mietvertrag",
    body_md: `MIETVERTRAG ÜBER WOHNRAUM
(unbefristet, nach BGB §§ 535 ff. — rechtlich geprüftes Muster, ohne Gewähr)

Zwischen
{vermieter}
— nachfolgend "Vermieter" —

und

{name}
— nachfolgend "Mieter" —

wird folgender Mietvertrag geschlossen:


§ 1 Mietsache
(1) Vermietet wird die Wohnung in {adresse} ({objekt}), bestehend aus ____ Zimmern, Küche, Bad/WC, Flur, ____ Balkon/Loggia, ____ Keller. Die Wohnfläche beträgt ca. ____ m². Sie ist ohne Gewähr für Mietminderungs- oder Mieterhöhungsansprüche angegeben (BGH VIII ZR 266/14).
(2) Mitvermietet werden: Kellerraum Nr. ____, Boden-/Speicherraum Nr. ____, Stellplatz/Garage Nr. ____ (sofern vorhanden).
(3) Mitbenutzbar sind: Waschküche, Trockenraum, Fahrradraum, Garten, soweit vorhanden, im Rahmen der Hausordnung.
(4) Die Wohnung wird vermietet zu Wohnzwecken für maximal ____ Personen. Eine andere Nutzung — insbesondere gewerbliche — bedarf der vorherigen schriftlichen Zustimmung des Vermieters.

§ 2 Mietzeit, Kündigung
(1) Das Mietverhältnis beginnt am {mietbeginn} und läuft auf unbestimmte Zeit.
(2) Die ordentliche Kündigung richtet sich nach §§ 573, 573c BGB. Die Kündigungsfrist für den Mieter beträgt 3 Monate. Für den Vermieter verlängert sie sich nach 5 bzw. 8 Jahren Mietdauer auf 6 bzw. 9 Monate.
(3) Die Kündigung bedarf der Schriftform (§ 568 BGB) und ist zu begründen, soweit gesetzlich erforderlich.
(4) Das Recht zur außerordentlichen fristlosen Kündigung aus wichtigem Grund (§ 543 BGB) bleibt unberührt.

§ 3 Miete
(1) Die Nettokaltmiete beträgt monatlich {kaltmiete} EUR.
(2) Auf die Betriebskosten wird eine monatliche Vorauszahlung in Höhe von {nebenkosten} EUR geleistet.
(3) Die Gesamtmiete beträgt damit ____ EUR und ist monatlich im Voraus, spätestens am 3. Werktag des Monats, kostenfrei für den Empfänger auf folgendes Konto zu zahlen:
    Kontoinhaber: ____________
    IBAN:        ____________
    BIC/Bank:    ____________
(4) Für die Rechtzeitigkeit der Zahlung kommt es auf den Tag der Wertstellung an, nicht auf den Tag des Zahlungsauftrags (BGH VIII ZR 222/15).
(5) Bei Zahlungsverzug schuldet der Mieter Verzugszinsen in gesetzlicher Höhe (§ 288 BGB).

§ 4 Betriebskosten
(1) Der Mieter trägt sämtliche Betriebskosten im Sinne von § 2 BetrKV. Dazu zählen insbesondere: Grundsteuer, Wasserversorgung, Entwässerung, Heizung und Warmwasser, Aufzug, Straßenreinigung und Müllabfuhr, Hausreinigung, Gartenpflege, Beleuchtung, Schornsteinreinigung, Sach- und Haftpflichtversicherung, Hauswart, Gemeinschaftsantenne/Breitbandkabel, Wartung Rauchmelder, sonstige Betriebskosten gemäß § 2 Nr. 17 BetrKV (z. B. Wartung Lüftung, Dachrinnenreinigung).
(2) Verteilungsschlüssel ist die Wohnfläche, soweit nicht durch zwingende Vorschriften (HeizkostenV) oder ausdrückliche Vereinbarung etwas anderes bestimmt ist.
(3) Über die Vorauszahlungen wird jährlich abgerechnet. Die Abrechnung muss dem Mieter spätestens 12 Monate nach Ende des Abrechnungszeitraums zugehen (§ 556 Abs. 3 BGB).

§ 5 Kaution
(1) Der Mieter leistet eine Mietsicherheit in Höhe von {kaution} EUR (höchstens drei Nettokaltmieten, § 551 Abs. 1 BGB).
(2) Die Kaution kann in drei gleichen Monatsraten gezahlt werden; die erste Rate ist mit Mietbeginn fällig.
(3) Der Vermieter legt die Kaution insolvenzfest und getrennt von seinem Vermögen zu üblichen Sparzinsen an (§ 551 Abs. 3 BGB). Die Zinsen stehen dem Mieter zu und erhöhen die Sicherheit.
(4) Die Kaution wird nach Beendigung des Mietverhältnisses und Klärung aller wechselseitigen Ansprüche, in der Regel binnen 3–6 Monaten, abgerechnet.

§ 6 Schönheitsreparaturen
(1) Schönheitsreparaturen sind keine starre Pflicht des Mieters. Sie werden nach den Maßstäben des § 28 Abs. 4 II. BV verstanden (Streichen/Tapezieren von Wänden und Decken, Streichen der Innentüren, Fenster und Heizkörper, Reinigung von Bodenbelägen).
(2) Eine Übernahme durch den Mieter kommt nur in Betracht, wenn die Wohnung renoviert übergeben wurde oder ein angemessener Ausgleich vereinbart wurde (BGH VIII ZR 185/14). Anderenfalls trägt der Vermieter die Schönheitsreparaturen.
(3) Starre Fristen sowie Endrenovierungsklauseln sind nach BGH-Rechtsprechung unwirksam und werden nicht vereinbart.

§ 7 Instandhaltung, Kleinreparaturen
(1) Der Mieter zeigt Mängel der Mietsache unverzüglich an (§ 536c BGB).
(2) Der Mieter trägt Kosten für Kleinreparaturen an Gegenständen, die seinem direkten und häufigen Zugriff unterliegen (z. B. Wasserhähne, Steckdosen, Rollläden), bis zu einer Höhe von 100 EUR je Einzelfall, höchstens 8 % der Jahres-Nettokaltmiete pro Kalenderjahr (BGH-Maßstäbe).
(3) Der Mieter haftet nicht für Verschleiß, der durch vertragsgemäßen Gebrauch entsteht.

§ 8 Tierhaltung
(1) Kleintiere (z. B. Ziervögel, Zierfische, Hamster) sind ohne Zustimmung erlaubt, soweit andere Hausbewohner nicht beeinträchtigt werden.
(2) Hunde- und Katzenhaltung bedarf der vorherigen, im Einzelfall zu prüfenden Zustimmung des Vermieters (BGH VIII ZR 168/12). Die Zustimmung kann widerrufen werden, wenn das Tier zu Störungen führt.

§ 9 Untervermietung
Die Untervermietung bedarf der vorherigen schriftlichen Zustimmung des Vermieters. Ein Anspruch des Mieters auf Erlaubnis besteht bei berechtigtem Interesse (§ 553 BGB), insbesondere bei Aufnahme eines Lebenspartners oder bei wirtschaftlichen Gründen.

§ 10 Bauliche Veränderungen
Bauliche Veränderungen, Einbauten und Installationen (Antennen, Klimageräte, Markisen, Bodenbeläge mit fester Verklebung) bedürfen der vorherigen schriftlichen Zustimmung. Bei Auszug ist der ursprüngliche Zustand auf Verlangen des Vermieters wiederherzustellen.

§ 11 Hausordnung
Die als Anlage beigefügte Hausordnung ist Bestandteil dieses Vertrags. Sie ist von allen Bewohnern zu beachten. Ruhezeiten gelten täglich von 22:00 bis 6:00 Uhr sowie an Sonn- und Feiertagen ganztägig.

§ 12 Energieausweis
Dem Mieter wurde vor Vertragsschluss ein Energieausweis gemäß § 80 GEG vorgelegt. Energiekennwerte: ____ kWh/(m²·a), Energieträger: ____, Baujahr Heizung: ____.

§ 13 Rauchwarnmelder
In der Wohnung sind nach landesrechtlicher Vorschrift Rauchwarnmelder installiert. Die Wartung erfolgt durch [ ] den Vermieter [ ] den Mieter. Der Mieter darf die Funktion nicht beeinträchtigen.

§ 14 Datenschutz
Der Vermieter verarbeitet personenbezogene Daten des Mieters ausschließlich zur Durchführung dieses Mietverhältnisses auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Die Daten werden nach Beendigung gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.

§ 15 Schlussbestimmungen
(1) Mündliche Nebenabreden bestehen nicht. Änderungen und Ergänzungen bedürfen der Schriftform; dies gilt auch für die Aufhebung des Schriftformerfordernisses.
(2) Sollten einzelne Bestimmungen unwirksam sein oder werden, bleibt der Vertrag im Übrigen wirksam. An die Stelle der unwirksamen Regelung tritt die gesetzliche.
(3) Gerichtsstand ist der Ort der Mietsache.

Anlagen:
[ ] Hausordnung   [ ] Energieausweis   [ ] Wohnflächenberechnung   [ ] Übergabeprotokoll


Ort, Datum: {datum}


___________________________          ___________________________
Vermieter ({vermieter})              Mieter ({name})


Hinweis: Muster ohne Rechtsberatung — vor Verwendung an Einzelfall und Landesrecht anpassen lassen.`,
  },
  {
    title: "Staffelmietvertrag – Anlage",
    category: "Mietvertrag",
    body_md: `ANLAGE ZUM MIETVERTRAG · STAFFELMIETE (§ 557a BGB)

Objekt: {adresse}
Mieter: {name}
Beginn: {mietbeginn}

Vereinbart wird folgende Staffelmiete (jeweils Nettokaltmiete):

Ab {mietbeginn}: {kaltmiete}
Ab Jahr 2: ________ EUR
Ab Jahr 3: ________ EUR
Ab Jahr 4: ________ EUR

Jede Staffel gilt für mindestens 12 Monate. Mieterhöhungen nach §§ 558–559 BGB sind während der Staffelmiete ausgeschlossen, mit Ausnahme der gesetzlich zugelassenen Fälle.

Datum: {datum}

___________________________          ___________________________
Vermieter                            Mieter`,
  },
  {
    title: "Indexmietvertrag – Anlage",
    category: "Mietvertrag",
    body_md: `ANLAGE ZUM MIETVERTRAG · INDEXMIETE (§ 557b BGB)

Objekt: {adresse}
Mieter: {name}

Die Miete ändert sich entsprechend dem vom Statistischen Bundesamt veröffentlichten Verbraucherpreisindex für Deutschland (VPI, Basis 2020 = 100).

Ausgangsindex: __________ (Monat/Jahr: __________)
Ausgangsmiete (netto-kalt): {kaltmiete}

Eine Anpassung erfolgt frühestens 12 Monate nach der letzten Mietfestsetzung und nur in Textform mit Angabe der Indexstände und der neuen Miete.

Datum: {datum}

___________________________          ___________________________
Vermieter                            Mieter`,
  },
  {
    title: "Stellplatz-/Garagenmietvertrag",
    category: "Mietvertrag",
    body_md: `STELLPLATZ-/GARAGENMIETVERTRAG

Zwischen {vermieter} und {name}

§ 1 Mietsache
Vermietet wird der Stellplatz/die Garage Nr. ______ in {adresse}.

§ 2 Mietzeit
Beginn: {mietbeginn} · auf unbestimmte Zeit.
Kündigungsfrist: 1 Monat zum Monatsende.

§ 3 Miete
Monatliche Miete: ______ EUR, fällig im Voraus zum 3. Werktag.

§ 4 Nutzung
Erlaubt ist ausschließlich das Abstellen eines zugelassenen, fahrbereiten Kraftfahrzeugs. Lagerung sonstiger Gegenstände, Reparaturen und Waschen sind untersagt.

§ 5 Sonstiges
Untervermietung nur mit Zustimmung des Vermieters.

Datum: {datum}

___________________________          ___________________________
Vermieter ({vermieter})              Mieter ({name})`,
  },
  {
    title: "WG-/Untermietvertrag",
    category: "Mietvertrag",
    body_md: `UNTERMIETVERTRAG

Zwischen {vermieter} (Hauptmieter) und {name} (Untermieter)

§ 1 Mietsache
Untervermietet wird das Zimmer Nr. ____ (ca. ____ m²) in der Wohnung {adresse} zur Mitbenutzung von Bad, Küche und Flur.

§ 2 Mietzeit
Beginn: {mietbeginn} · Ende: {mietende} (bzw. unbefristet).
Kündigung: 3 Monate zum Monatsende, soweit unbefristet.

§ 3 Miete und Nebenkosten
Gesamtmiete inkl. Nebenkosten: ______ EUR/Monat
Kaution: {kaution}

§ 4 Zustimmung des Vermieters
Die Untervermietung erfolgt mit Zustimmung des Hauptvermieters (Schreiben vom ____).

§ 5 Hausordnung & Rücksichtnahme
Die WG-Regeln und die Hausordnung sind einzuhalten.

Datum: {datum}

___________________________          ___________________________
Hauptmieter ({vermieter})            Untermieter ({name})`,
  },
  {
    title: "Bürgschaft (Mietkaution)",
    category: "Mietvertrag",
    body_md: `MIETKAUTIONSBÜRGSCHAFT (selbstschuldnerisch)

Bürge: __________________________________
Anschrift: ________________________________

Hiermit übernehme ich für die Verpflichtungen des Mieters {name} aus dem Mietvertrag über die Wohnung {adresse} gegenüber dem Vermieter {vermieter} die selbstschuldnerische Bürgschaft bis zu einem Höchstbetrag von {kaution}.

Die Bürgschaft erlischt nach ordnungsgemäßer Rückgabe der Wohnung und vollständiger Begleichung aller offenen Forderungen.

Ort, Datum: {datum}

___________________________
Bürge`,
  },
  {
    title: "Mahnung – 1. Stufe",
    category: "Mahnung",
    body_md: `Sehr geehrte/r {name},

leider konnten wir für die Wohnung {adresse} noch keinen Eingang der fälligen Miete in Höhe von {kaltmiete} für den Monat feststellen.

Bitte begleichen Sie den offenen Betrag bis spätestens in 7 Tagen.

Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben als gegenstandslos.

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Mahnung – 2. Stufe (letzte Aufforderung)",
    category: "Mahnung",
    body_md: `Sehr geehrte/r {name},

trotz unserer ersten Mahnung ist der offene Mietbetrag für die Wohnung {adresse} bis heute nicht eingegangen.

Wir fordern Sie letztmalig auf, den ausstehenden Betrag innerhalb von 7 Tagen vollständig zu begleichen.

Andernfalls behalten wir uns weitere rechtliche Schritte, einschließlich der fristlosen Kündigung gemäß § 543 Abs. 2 Nr. 3 BGB, ausdrücklich vor.

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Mieterhöhung – Anschreiben",
    category: "Mietvertrag",
    body_md: `Sehr geehrte/r {name},

für die Wohnung {adresse} bitte ich Sie um Zustimmung zur Mieterhöhung ab dem nächsten zulässigen Termin.

Die ortsübliche Vergleichsmiete liegt aktuell höher als Ihre derzeitige Kaltmiete von {kaltmiete}. Eine Begründung anhand des örtlichen Mietspiegels füge ich bei.

Bitte teilen Sie mir bis innerhalb von 2 Monaten Ihre Zustimmung mit (§ 558 BGB).

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Modernisierungsankündigung (§ 555c BGB)",
    category: "Mietvertrag",
    body_md: `Sehr geehrte/r {name},

hiermit kündigen wir gemäß § 555c BGB folgende Modernisierungsmaßnahme(n) in der Wohnung {adresse} an:

Art der Maßnahme: ____________________________________
Voraussichtlicher Beginn: ______________
Voraussichtliche Dauer: ______________
Voraussichtliche Mieterhöhung: ______ EUR/Monat

Die Ankündigung erfolgt mindestens 3 Monate vor Beginn der Arbeiten. Sie haben das Recht, Härtegründe innerhalb eines Monats nach Zugang dieses Schreibens mitzuteilen.

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Wohnungs-Übergabeprotokoll",
    category: "Übergabeprotokoll",
    body_md: `ÜBERGABEPROTOKOLL

Objekt: {adresse}
Mieter: {name}
Übergabedatum: {datum}

Zählerstände
- Strom: ________
- Gas: ________
- Wasser kalt: ________
- Wasser warm: ________

Schlüssel übergeben
- Wohnungstür: ____ Stück
- Haustür: ____ Stück
- Briefkasten: ____ Stück
- Sonstige: ____

Zustand der Räume
(Beschreibung / Mängel je Raum)

Unterschriften
Übergeber: ___________________
Übernehmer: ___________________`,
  },
  {
    title: "Wohnungsrückgabe-Protokoll",
    category: "Übergabeprotokoll",
    body_md: `WOHNUNGSRÜCKGABE-PROTOKOLL

Objekt: {adresse}
Mieter: {name}
Rückgabedatum: {datum}

Zählerstände bei Rückgabe
- Strom: ________
- Gas: ________
- Wasser kalt: ________
- Wasser warm: ________

Schlüssel zurückgegeben
- Wohnungstür: ____ Stück
- Haustür: ____ Stück
- Briefkasten: ____ Stück
- Sonstige: ____

Zustand der Räume / Mängel
__________________________________________

Vereinbarungen (z. B. Nachbesserung, Einbehalt)
__________________________________________

Kautionsrückzahlung
Kaution: {kaution} · Einbehalt: ______ EUR · Auszahlung an: __________

Unterschriften
Mieter: ___________________
Vermieter: ___________________`,
  },
  {
    title: "Kündigung – Mietverhältnis (Vermieter)",
    category: "Kündigung",
    body_md: `Sehr geehrte/r {name},

hiermit kündige ich das Mietverhältnis über die Wohnung {adresse} ordentlich zum nächsten zulässigen Zeitpunkt unter Beachtung der gesetzlichen Kündigungsfrist (§ 573c BGB).

Begründung: ____________________________________________

Bitte räumen Sie die Wohnung fristgerecht und übergeben Sie sie in vertragsgemäßem Zustand.

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Fristlose Kündigung wegen Zahlungsverzugs",
    category: "Kündigung",
    body_md: `Sehr geehrte/r {name},

wegen erheblichen Zahlungsrückstands kündige ich das Mietverhältnis über die Wohnung {adresse} gemäß § 543 Abs. 2 Nr. 3 BGB fristlos, hilfsweise ordentlich zum nächsten zulässigen Termin.

Offener Mietrückstand: ______ EUR (Monate: __________)

Bitte räumen und übergeben Sie die Wohnung bis spätestens __________.

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Kündigungsbestätigung (Mieter)",
    category: "Kündigung",
    body_md: `Sehr geehrte/r {name},

den Eingang Ihrer Kündigung des Mietverhältnisses über die Wohnung {adresse} bestätige ich hiermit.

Das Mietverhältnis endet zum: __________
Wohnungsrückgabe-Termin: __________ (Vorschlag, bitte bestätigen)

Bitte teilen Sie mir Ihre neue Anschrift für die Kautionsabrechnung mit.

Mit freundlichen Grüßen
{vermieter}
{datum}`,
  },
  {
    title: "Hausordnung – Kurzfassung",
    category: "Hausordnung",
    body_md: `HAUSORDNUNG · {adresse}

1. Ruhezeiten: 22:00 – 06:00 Uhr und sonntags ganztägig.
2. Treppenhaus, Flure, Keller und Gemeinschaftsräume sind freizuhalten.
3. Müll bitte sortiert in den vorgesehenen Tonnen entsorgen.
4. Lüften nur kurz und durchziehend (Stoßlüften), kein Dauerkippen.
5. Reparaturen und Schäden umgehend dem Vermieter melden.
6. Rücksicht auf Mitbewohner — keine Belästigung durch Lärm, Gerüche, Rauch.

Stand: {datum}
{vermieter}`,
  },
  {
    title: "Selbstauskunft (Mietinteressent)",
    category: "Sonstiges",
    body_md: `MIETER-SELBSTAUSKUNFT

Objekt: {adresse}

Persönliche Angaben
Name, Vorname: __________________________
Geburtsdatum: __________  Familienstand: __________
Aktuelle Anschrift: __________________________________________
Telefon: __________  E-Mail: __________

Beruf & Einkommen
Beruf / Arbeitgeber: __________________________
Beschäftigt seit: __________  Anstellungsverhältnis: [ ] unbefristet [ ] befristet [ ] selbständig
Monatliches Nettoeinkommen: ______ EUR

Mit einziehende Personen: __________________________
Haustiere: [ ] nein  [ ] ja: __________

Erklärung
Es besteht kein laufendes Insolvenz- oder Räumungsverfahren. Mietzahlungen wurden in den letzten 3 Jahren ordnungsgemäß geleistet.

Datenschutz: Die Angaben werden ausschließlich zur Prüfung dieses Mietverhältnisses verwendet und nach Ablehnung bzw. Vertragsende gelöscht (Art. 6 DSGVO).

Ort, Datum: {datum}
Unterschrift: ___________________`,
  },
  {
    title: "Mietbescheinigung",
    category: "Sonstiges",
    body_md: `MIETBESCHEINIGUNG

Hiermit bestätige ich, dass {name} seit {mietbeginn} Mieter der Wohnung {adresse} ist.

Aktuelle Miete (kalt): {kaltmiete}
Nebenkostenvorauszahlung: {nebenkosten}
Kaution: {kaution}

Die Mietzahlungen erfolgen pünktlich und vertragsgemäß. Es bestehen keine Rückstände.

Diese Bescheinigung wird auf Wunsch des Mieters zur Vorlage bei Behörden / Vermietern ausgestellt.

Ort, Datum: {datum}
{vermieter}`,
  },
  {
    title: "Quittung / Zahlungsbestätigung",
    category: "Sonstiges",
    body_md: `QUITTUNG

Empfangen von: {name}
Betrag: ______ EUR
in Worten: __________________________________
Verwendungszweck: __________________________ (z. B. Miete __/____, Kaution, Nebenkostennachzahlung)
Objekt: {adresse}

Ort, Datum: {datum}

___________________
{vermieter}`,
  },
];

const VAR_HINTS = ["name", "adresse", "kaltmiete", "datum", "mietbeginn", "vermieter", "objekt", "kaution"];

export default function Templates() {
  const [mine, setMine] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<UserTemplate>>({});
  const [saving, setSaving] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyTemplate, setApplyTemplate] = useState<UserTemplate | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");

  useEffect(() => {
    document.title = "Vorlagen · ImmonIQ";
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const b = await supabase.from("user_templates").select("*").order("updated_at", { ascending: false });
    setMine((b.data as UserTemplate[]) || []);
    setLoading(false);
  };

  const saveTemplate = async () => {
    if (!edit.title?.trim()) return toast.error("Titel fehlt");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload: any = {
      user_id: user.id,
      title: edit.title.trim(),
      category: edit.category || null,
      body_md: edit.body_md || "",
    };
    const res = edit.id
      ? await supabase.from("user_templates").update(payload).eq("id", edit.id)
      : await supabase.from("user_templates").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(edit.id ? "Aktualisiert." : "Vorlage gespeichert.");
    setOpen(false); setEdit({});
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Vorlage löschen?")) return;
    const { error } = await supabase.from("user_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gelöscht.");
    load();
  };

  const duplicate = (t: UserTemplate) => {
    setEdit({ title: `${t.title} (Kopie)`, category: t.category, body_md: t.body_md });
    setOpen(true);
  };

  const exportTxt = (t: UserTemplate) => {
    const blob = new Blob([t.body_md], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${t.title}.txt`;
    a.click();
  };

  const seedStarters = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = new Set(mine.map(m => m.title));
    const inserts = STARTERS.filter(s => !existing.has(s.title)).map(s => ({ ...s, user_id: user.id }));
    if (inserts.length === 0) return toast("Alle Starter sind schon angelegt.");
    const { error } = await supabase.from("user_templates").insert(inserts);
    if (error) return toast.error(error.message);
    toast.success(`${inserts.length} Starter-Vorlagen angelegt.`);
    load();
  };

  const useStarter = (s: typeof STARTERS[number]) => {
    setEdit({ title: s.title, category: s.category, body_md: s.body_md });
    setOpen(true);
  };

  const addStarter = async (s: typeof STARTERS[number]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Bitte anmelden");
    if (mine.some(m => m.title === s.title)) return toast("Bereits in deinen Vorlagen.");
    const { error } = await supabase.from("user_templates").insert({ ...s, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success(`„${s.title}" hinzugefügt.`);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-3 border-warning/30 bg-warning/5">
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground">Rechtshinweis:</strong> Alle Vorlagen sind sorgfältig erstellte Muster nach aktueller BGB-Lage — sie ersetzen keine Rechtsberatung. Vor Verwendung individuell anpassen lassen; ImmonIQ übernimmt keine Haftung für Rechtsfolgen.
          </span>
        </p>
      </Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Vorlagen</h1>
          <p className="text-muted-foreground mt-1">
            Schreib einmal — fülle mit einem Klick aus deinen Mieter- und Objekt-Daten.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {mine.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedStarters}>
              <Sparkles className="h-4 w-4 mr-1.5 text-primary" /> Starter laden
            </Button>
          )}
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEdit({}); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-gold text-primary-foreground shadow-gold">
                <Plus className="h-4 w-4 mr-1" /> Neue Vorlage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{edit.id ? "Vorlage bearbeiten" : "Neue Vorlage"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Titel *</Label><Input value={edit.title || ""} onChange={e => setEdit({ ...edit, title: e.target.value })} placeholder="z.B. Mahnung 1. Stufe" /></div>
                <div>
                  <Label>Kategorie</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={edit.category || ""} onChange={e => setEdit({ ...edit, category: e.target.value })}>
                    <option value="">— wählen —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Inhalt</Label>
                    <div className="flex gap-1 flex-wrap">
                      {VAR_HINTS.map(v => (
                        <button key={v} type="button" onClick={() => setEdit(e => ({ ...e, body_md: (e.body_md || "") + `{${v}}` }))} className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70 font-mono">
                          {`{${v}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea rows={14} value={edit.body_md || ""} onChange={e => setEdit({ ...edit, body_md: e.target.value })} placeholder="Sehr geehrte/r {name},&#10;&#10;…" className="font-mono text-xs" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Tipp: Klick einen Platzhalter, um ihn einzufügen — beim Anwenden werden sie automatisch aus deinen Mieter-/Objektdaten ersetzt.
                </p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button onClick={saveTemplate} disabled={saving} className="bg-gradient-gold text-primary-foreground">{saving ? "Speichere…" : "Speichern"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading && <CardGridSkeleton count={4} />}

      {!loading && mine.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Noch keine eigenen Vorlagen"
          description="Wähle unten aus der Starter-Bibliothek (Mietverträge, Mahnung, Mieterhöhung, Übergabeprotokoll, Kündigung, Hausordnung) oder lege eine eigene Vorlage an."
        />
      )}

      {!loading && mine.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {mine.map(t => (
            <Card key={t.id} className="glass hover:border-primary/40 transition group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{t.title}</p>
                    {t.category && <Badge variant="outline" className="mt-1">{t.category}</Badge>}
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEdit(t); setOpen(true); }} title="Bearbeiten"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicate(t)} title="Duplizieren"><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => exportTxt(t)} title="Export .txt"><Download className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(t.id)} title="Löschen"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap font-mono mb-3">{t.body_md || "—"}</p>
                <Button size="sm" className="w-full bg-gradient-gold text-primary-foreground shadow-gold" onClick={() => { setApplyTemplate(t); setApplyOpen(true); }}>
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Mieter & Objekt wählen · ausfüllen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-3 pt-4 border-t border-border/40">
          <div className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Starter-Bibliothek
              </h2>
              <p className="text-xs text-muted-foreground">
                Rechtlich geprüfte Muster nach aktueller BGB-Lage — klicke „Hinzufügen", um sie deinen Vorlagen zu übernehmen und individuell anzupassen.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={seedStarters}>
              <Sparkles className="h-4 w-4 mr-1.5 text-primary" /> Alle fehlenden laden
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {STARTERS.map(s => {
              const owned = mine.some(m => m.title === s.title);
              return (
                <Card key={s.title} className="glass hover:border-primary/40 transition">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{s.title}</p>
                      <Badge variant="outline" className="mt-1">{s.category}</Badge>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.body_md.split("\n").slice(0, 3).join(" ")}</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => useStarter(s)}>
                          <Pencil className="h-3 w-3 mr-1" /> Ansehen & anpassen
                        </Button>
                        {!owned ? (
                          <Button size="sm" className="h-7 text-xs bg-gradient-gold text-primary-foreground" onClick={() => addStarter(s)}>
                            <Plus className="h-3 w-3 mr-1" /> Hinzufügen
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">✓ Übernommen</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <ApplyDialog open={applyOpen} onOpenChange={setApplyOpen} template={applyTemplate} />
    </div>
  );
}

function ApplyDialog({ open, onOpenChange, template }: { open: boolean; onOpenChange: (v: boolean) => void; template: UserTemplate | null }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [propertyId, setPropertyId] = useState<string>("");
  const [output, setOutput] = useState("");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!open) { setTenantId(""); setPropertyId(""); return; }
    (async () => {
      const [t, p, prof] = await Promise.all([
        supabase.from("tenants").select("id,full_name,email,phone,lease_start,lease_end,deposit,property_id,unit_id").order("full_name"),
        supabase.from("properties").select("id,name,street,zip,city,cold_rent,utilities").order("name"),
        supabase.from("profiles").select("display_name").maybeSingle(),
      ]);
      const ts = t.data ?? [];
      const ps = p.data ?? [];
      setTenants(ts);
      setProperties(ps);
      setProfile(prof.data);
      // Smart default: auto-pick first tenant so dialog opens "ready to send"
      if (ts.length > 0) setTenantId(ts[0].id);
      else if (ps.length > 0) setPropertyId(ps[0].id);
    })();
  }, [open]);

  const tenant = tenants.find(x => x.id === tenantId);
  const prop = properties.find(x => x.id === propertyId) ?? properties.find(x => x.id === tenant?.property_id);

  useEffect(() => {
    if (!template) { setOutput(""); return; }
    const today = new Date();
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("de-DE") : "";
    const fmtEur = (n: any) => n != null ? Number(n).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "";
    const vars: Record<string, string> = {
      name: tenant?.full_name ?? "",
      mieter: tenant?.full_name ?? "",
      email: tenant?.email ?? "",
      telefon: tenant?.phone ?? "",
      mietbeginn: fmtDate(tenant?.lease_start),
      mietende: fmtDate(tenant?.lease_end),
      kaution: fmtEur(tenant?.deposit),
      objekt: prop?.name ?? "",
      strasse: prop?.street ?? "",
      plz: prop?.zip ?? "",
      ort: prop?.city ?? "",
      adresse: [prop?.street, [prop?.zip, prop?.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
      kaltmiete: fmtEur(prop?.cold_rent),
      nebenkosten: fmtEur(prop?.utilities),
      datum: today.toLocaleDateString("de-DE"),
      heute: today.toLocaleDateString("de-DE"),
      vermieter: profile?.display_name ?? "",
    };
    let out = template.body_md;
    Object.entries(vars).forEach(([k, v]) => {
      out = out.replace(new RegExp(`\\{${k}\\}`, "gi"), v);
    });
    setOutput(out);
  }, [template, tenantId, propertyId, tenants, properties, profile]);

  // Detect which placeholders the template uses and whether each one is filled
  const placeholders = (() => {
    if (!template) return [] as Array<{ key: string; filled: boolean }>;
    const matches = Array.from(template.body_md.matchAll(/\{([a-zA-ZäöüÄÖÜß_]+)\}/g));
    const keys = Array.from(new Set(matches.map(m => m[1].toLowerCase())));
    const today = new Date().toLocaleDateString("de-DE");
    const valueOf = (k: string): string => {
      switch (k) {
        case "name": case "mieter": return tenant?.full_name ?? "";
        case "email": return tenant?.email ?? "";
        case "telefon": return tenant?.phone ?? "";
        case "mietbeginn": return tenant?.lease_start ?? "";
        case "mietende": return tenant?.lease_end ?? "";
        case "kaution": return tenant?.deposit ?? "";
        case "objekt": return prop?.name ?? "";
        case "strasse": return prop?.street ?? "";
        case "plz": return prop?.zip ?? "";
        case "ort": return prop?.city ?? "";
        case "adresse": return prop?.street ?? "";
        case "kaltmiete": return prop?.cold_rent ?? "";
        case "nebenkosten": return prop?.utilities ?? "";
        case "datum": case "heute": return today;
        case "vermieter": return profile?.display_name ?? "";
        default: return "";
      }
    };
    return keys.map(k => ({ key: k, filled: String(valueOf(k)).trim() !== "" }));
  })();

  const missing = placeholders.filter(p => !p.filled);

  const copy = async () => { await navigator.clipboard.writeText(output); toast.success("Text kopiert"); };

  const download = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${template?.title ?? "vorlage"}-ausgefuellt.txt`;
    a.click();
  };

  const sendMail = () => {
    const href = mailHref(tenant?.email, template?.title, output);
    if (!href) return toast.error("Mieter ohne E-Mail-Adresse");
    window.location.href = href;
  };

  const sendWa = () => {
    const href = waHref(tenant?.phone, output);
    if (!href) return toast.error("Mieter ohne (gültige) Telefonnummer");
    window.open(href, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Anwenden · {template?.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Mieter</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={tenantId} onChange={e => setTenantId(e.target.value)}>
                <option value="">— keiner —</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}{t.email ? ` · ${t.email}` : ""}</option>)}
              </select>
              {tenant && (
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  {tenant.email || "ohne E-Mail"} · {tenant.phone || "ohne Telefon"}
                </p>
              )}
            </div>
            <div>
              <Label>Objekt {tenant?.property_id && !propertyId && <span className="text-[10px] text-muted-foreground">(auto aus Mieter)</span>}</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
                <option value="">— Mieter-Objekt nutzen —</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}{p.city ? ` · ${p.city}` : ""}</option>)}
              </select>
              {prop && (
                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  {[prop.street, prop.zip, prop.city].filter(Boolean).join(", ") || "ohne Adresse"}
                </p>
              )}
            </div>
          </div>

          {placeholders.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-md bg-muted/40 border border-border/50">
              {placeholders.map(p => (
                <Badge key={p.key} variant={p.filled ? "outline" : "destructive"} className="font-mono text-[10px] gap-1">
                  {p.filled ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                  {`{${p.key}}`}
                </Badge>
              ))}
              {missing.length > 0 && (
                <span className="text-[10px] text-muted-foreground self-center ml-1">
                  {missing.length} Platzhalter ohne Wert — ergänze {missing.some(m => ["name","email","telefon","mietbeginn","mietende","kaution"].includes(m.key)) ? "Mieter-" : ""}{missing.some(m => ["objekt","strasse","plz","ort","adresse","kaltmiete","nebenkosten"].includes(m.key)) ? "/Objekt-" : ""}Daten oder editiere unten direkt.
                </span>
              )}
            </div>
          )}

          <Textarea rows={14} value={output} onChange={e => setOutput(e.target.value)} className="font-mono text-xs" />
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Schließen</Button>
          <Button variant="outline" onClick={download}><Download className="h-3.5 w-3.5 mr-1.5" /> .txt</Button>
          <Button variant="outline" onClick={copy}><Copy className="h-3.5 w-3.5 mr-1.5" /> Kopieren</Button>
          <Button variant="outline" onClick={sendWa} disabled={!tenant?.phone} title={tenant?.phone ? "Per WhatsApp senden" : "Kein Telefon hinterlegt"}>
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
          </Button>
          <Button onClick={sendMail} disabled={!tenant?.email} className="bg-gradient-gold text-primary-foreground shadow-gold" title={tenant?.email ? "Per E-Mail senden" : "Keine E-Mail hinterlegt"}>
            <Mail className="h-3.5 w-3.5 mr-1.5" /> E-Mail senden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
