import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Scale, ShieldAlert, Home, Wrench, Calculator, FileSignature, Thermometer, Wallet } from "lucide-react";

type Right = {
  icon: any;
  title: string;
  summary: string;
  ref: string;
  url: string;
  points: string[];
};

const RIGHTS: Right[] = [
  {
    icon: Calculator, title: "Mietminderung bei Mängeln",
    summary: "Bei erheblichen Mängeln darfst du die Miete entsprechend mindern — automatisch, sobald der Vermieter informiert ist.",
    ref: "§ 536 BGB", url: "https://www.gesetze-im-internet.de/bgb/__536.html",
    points: [
      "Mangel sofort melden (im Chat reicht — ist dokumentiert)",
      "Höhe richtet sich nach der Beeinträchtigung (Tabellen z. B. bei Mieterbund)",
      "Bei schwerem Mangel: gesamte Warmmiete kann gemindert werden",
    ],
  },
  {
    icon: Wrench, title: "Instandhaltung & Reparaturen",
    summary: "Der Vermieter muss die Wohnung in gebrauchsfähigem Zustand halten. Reparaturen gehen in der Regel zu seinen Lasten.",
    ref: "§ 535 BGB", url: "https://www.gesetze-im-internet.de/bgb/__535.html",
    points: [
      "Kleinreparaturen-Klausel: nur gültig wenn pro Fall ≤ ~100 € und Jahresobergrenze",
      "Notfälle (z. B. Wasserrohrbruch) selbst beauftragen, wenn Vermieter nicht erreichbar",
      "Belege aufheben — Erstattung verlangen",
    ],
  },
  {
    icon: FileSignature, title: "Kündigung & Fristen",
    summary: "Du kannst mit 3 Monaten Frist zum Monatsende kündigen — unabhängig wie lange du schon dort wohnst.",
    ref: "§ 573c BGB", url: "https://www.gesetze-im-internet.de/bgb/__573c.html",
    points: [
      "Kündigung muss schriftlich (kein Fax/Mail) und unterschrieben sein",
      "Stichtag: spätestens am 3. Werktag des Monats",
      "Sonderkündigungsrecht z. B. bei Mieterhöhung",
    ],
  },
  {
    icon: ShieldAlert, title: "Eigenbedarfskündigung abwehren",
    summary: "Der Vermieter braucht einen konkreten, nachvollziehbaren Eigenbedarf. Pauschale Gründe reichen nicht.",
    ref: "§ 573 Abs. 2 Nr. 2 BGB", url: "https://www.gesetze-im-internet.de/bgb/__573.html",
    points: [
      "Härtefall-Widerspruch möglich (Alter, Krankheit, Schwangerschaft, Schule)",
      "Begründung muss namentlich und konkret sein",
      "Bei Vortäuschung: Schadensersatz",
    ],
  },
  {
    icon: Wallet, title: "Nebenkostenabrechnung prüfen",
    summary: "Du hast 12 Monate Zeit, Einspruch einzulegen. ~50 % aller Abrechnungen sind fehlerhaft.",
    ref: "§ 556 BGB", url: "https://www.gesetze-im-internet.de/bgb/__556.html",
    points: [
      "Vermieter muss bis 31.12. des Folgejahres abrechnen",
      "Du darfst alle Belege einsehen",
      "Verteilerschlüssel, Leerstand und Verwaltungskosten prüfen",
    ],
  },
  {
    icon: Thermometer, title: "Mindesttemperatur & Heizung",
    summary: "Tagsüber min. 20–22 °C, nachts 18 °C. Heizperiode i. d. R. 01.10.–30.04.",
    ref: "BGH-Rechtsprechung", url: "https://www.mieterbund.de",
    points: [
      "Heizung fällt komplett aus → Mietminderung möglich (oft 20–100 %)",
      "Vermieter sofort schriftlich informieren",
      "Bei Notfall (Winter, Kinder): Notdienst auf Vermieter-Kosten",
    ],
  },
  {
    icon: Home, title: "Mieterhöhung — was erlaubt ist",
    summary: "Erhöhung erst nach 12 Monaten unverändert, max. 20 % in 3 Jahren (Kappungsgrenze), bis Vergleichsmiete.",
    ref: "§ 558 BGB", url: "https://www.gesetze-im-internet.de/bgb/__558.html",
    points: [
      "Schriftliche Begründung Pflicht (Mietspiegel, Vergleichswohnungen)",
      "2 Monate Überlegungsfrist",
      "Bei Indexmiete: nur an Preisindex gekoppelt, keine Modernisierungs-Umlage",
    ],
  },
  {
    icon: Scale, title: "Kaution zurück nach Auszug",
    summary: "Max. 3 Kaltmieten. Rückzahlung in der Regel innerhalb von 3–6 Monaten nach Auszug.",
    ref: "§ 551 BGB", url: "https://www.gesetze-im-internet.de/bgb/__551.html",
    points: [
      "Vermieter darf für offene NK-Abrechnung einen Teil einbehalten",
      "Kaution muss verzinst angelegt sein — Zinsen stehen dir zu",
      "Bei Verzug: schriftliche Aufforderung mit Frist, dann Anwalt",
    ],
  },
];

export default function TenantRights() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" /> Meine Rechte als Mieter
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verständlich erklärt, mit Gesetzes-Quelle. Keine Anwalts-Beratung — bei wichtigen Fällen Mieterbund oder Anwalt einschalten.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {RIGHTS.map((r, i) => (
          <Card key={i} className="p-5 hover:shadow-md transition">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <r.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{r.title}</p>
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 mt-1">{r.ref}</Badge>
              </div>
            </div>
            <p className="text-sm text-foreground/80 mb-3">{r.summary}</p>
            <ul className="text-xs text-muted-foreground space-y-1 mb-3 list-disc pl-4">
              {r.points.map((p, j) => <li key={j}>{p}</li>)}
            </ul>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              Gesetz nachlesen <ExternalLink className="h-3 w-3" />
            </a>
          </Card>
        ))}
      </div>

      <Card className="p-5 bg-muted/30">
        <p className="text-sm font-semibold mb-1">Brauchst du Beratung?</p>
        <p className="text-xs text-muted-foreground mb-3">
          Mieterbund / Mieterverein: ~ 70–100 € Jahresbeitrag, dafür kostenlose Rechtsberatung.
        </p>
        <a href="https://www.mieterbund.de/mieterverein-finden.html" target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          Mieterverein in deiner Nähe finden <ExternalLink className="h-3 w-3" />
        </a>
      </Card>
    </div>
  );
}
