import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Stagger, Item } from "@/components/motion/Primitives";
import { Scale, ExternalLink, Search, BookOpen } from "lucide-react";

type Law = {
  ref: string;
  title: string;
  summary: string;
  url: string;
  topic: "bgb" | "estg" | "ao" | "bauordnung" | "wohngfg" | "grstg";
};

const LAWS: Law[] = [
  { ref: "§ 535 BGB", title: "Inhalt und Hauptpflichten des Mietvertrags", summary: "Vermieter stellt Mietsache zur Verfügung, Mieter zahlt Miete.", url: "https://www.gesetze-im-internet.de/bgb/__535.html", topic: "bgb" },
  { ref: "§ 556 BGB", title: "Vereinbarungen über Betriebskosten", summary: "Abrechnungsfrist: 12 Monate nach Abrechnungszeitraum.", url: "https://www.gesetze-im-internet.de/bgb/__556.html", topic: "bgb" },
  { ref: "§ 558 BGB", title: "Mieterhöhung bis zur ortsüblichen Vergleichsmiete", summary: "Kappungsgrenze: 20% in 3 Jahren (15% in angespanntem Markt).", url: "https://www.gesetze-im-internet.de/bgb/__558.html", topic: "bgb" },
  { ref: "§ 559 BGB", title: "Modernisierungsmieterhöhung", summary: "Umlage: 8% der Modernisierungskosten jährlich.", url: "https://www.gesetze-im-internet.de/bgb/__559.html", topic: "bgb" },
  { ref: "§ 568 BGB", title: "Form der Kündigung", summary: "Kündigung muss schriftlich erfolgen, Hinweis auf Mieterwiderspruch.", url: "https://www.gesetze-im-internet.de/bgb/__568.html", topic: "bgb" },
  { ref: "§ 573 BGB", title: "Ordentliche Kündigung", summary: "Kündigungsfristen: 3/6/9 Monate je nach Mietdauer.", url: "https://www.gesetze-im-internet.de/bgb/__573.html", topic: "bgb" },
  { ref: "§ 543 BGB", title: "Außerordentliche fristlose Kündigung", summary: "Zahlungsverzug ≥ 2 Monatsmieten: fristlose Kündigung möglich.", url: "https://www.gesetze-im-internet.de/bgb/__543.html", topic: "bgb" },
  { ref: "§ 288 BGB", title: "Verzugszinsen", summary: "Basiszins + 5% bei Verbrauchern, + 9% bei Geschäftspartnern.", url: "https://www.gesetze-im-internet.de/bgb/__288.html", topic: "bgb" },
  { ref: "§ 7 EStG", title: "Absetzung für Abnutzung (AfA)", summary: "Lineare AfA: 2% p.a. für Wohngebäude ab Baujahr 1925.", url: "https://www.gesetze-im-internet.de/estg/__7.html", topic: "estg" },
  { ref: "§ 21 EStG", title: "Vermietung und Verpachtung", summary: "Einkünfte = Einnahmen minus Werbungskosten. Anlage V.", url: "https://www.gesetze-im-internet.de/estg/__21.html", topic: "estg" },
  { ref: "§ 9 EStG", title: "Werbungskosten", summary: "Aufwendungen zur Erwerbung, Sicherung und Erhaltung der Einnahmen.", url: "https://www.gesetze-im-internet.de/estg/__9.html", topic: "estg" },
  { ref: "§ 147 AO", title: "Aufbewahrungsfristen", summary: "Bücher, Rechnungen, Belege: 10 Jahre. Handelsbriefe: 6 Jahre.", url: "https://www.gesetze-im-internet.de/ao_1977/__147.html", topic: "ao" },
  { ref: "§ 149 AO", title: "Abgabe der Steuererklärungen", summary: "Frist: 31.7. des Folgejahres, mit StB verlängert.", url: "https://www.gesetze-im-internet.de/ao_1977/__149.html", topic: "ao" },
  { ref: "§ 47 BauO NRW", title: "Rauchwarnmelder-Pflicht NRW", summary: "Installation + jährliche Wartung durch Eigentümer oder Mieter (§ 47 Abs. 3 BauO NRW 2018).", url: "https://recht.nrw.de/lmi/owa/br_vbl_detail_text?anw_nr=6&vd_id=17665", topic: "bauordnung" },
  { ref: "§ 5 WoGG", title: "Mietspiegel", summary: "Einfacher oder qualifizierter Mietspiegel als Referenz für Vergleichsmiete.", url: "https://www.gesetze-im-internet.de/wogg/__5.html", topic: "wohngfg" },
  { ref: "§ 7 GrStG", title: "Steuerpflichtiger", summary: "Eigentümer zum 1.1. des Kalenderjahres ist steuerpflichtig.", url: "https://www.gesetze-im-internet.de/grstg_1973/__7.html", topic: "grstg" },
];

const TOPICS = [
  { value: "all", label: "Alle" },
  { value: "bgb", label: "BGB (Mietrecht)" },
  { value: "estg", label: "EStG (Steuer)" },
  { value: "ao", label: "AO (Abgabenordnung)" },
  { value: "bauordnung", label: "Bauordnung" },
  { value: "wohngfg", label: "Wohnraum" },
  { value: "grstg", label: "Grundsteuer" },
];

const LawCorner = () => {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string>("all");

  useEffect(() => { document.title = "Rechts-Ecke · ImmonIQ"; }, []);

  const filtered = LAWS.filter((l) => {
    if (topic !== "all" && l.topic !== topic) return false;
    if (query && !`${l.ref} ${l.title} ${l.summary}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <Stagger className="space-y-6 max-w-4xl">
      <Item>
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">Wissensbasis</p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Rechts-<span className="text-gradient-gold">Ecke</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Die Paragraphen, die dich als Vermieter in Deutschland betreffen. Jeder Eintrag
            verlinkt die Original-Quelle (gesetze-im-internet.de).
          </p>
        </div>
      </Item>

      <Item>
        <Card className="p-4 glass space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="§-Nummer oder Stichwort …"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {TOPICS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTopic(t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  topic === t.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card>
      </Item>

      <div className="space-y-2">
        {filtered.map((l) => (
          <Item key={l.ref}>
            <Card className="p-4 glass interactive-card">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Scale className="h-[18px] w-[18px] text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-primary">{l.ref}</span>
                    <span className="text-sm font-semibold">{l.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{l.summary}</p>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    <BookOpen className="h-3 w-3" /> Original-Text lesen <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </Card>
          </Item>
        ))}
      </div>

      <Item>
        <Card className="p-5 glass">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Haftungsausschluss:</strong> ImmonIQ ersetzt keine Rechtsberatung. Die hier
            aufgeführten Gesetzestexte dienen der Orientierung. Für verbindliche Auskünfte wende
            dich an einen Rechtsanwalt oder Steuerberater. Quellen: gesetze-im-internet.de (Bundesministerium der Justiz).
          </p>
        </Card>
      </Item>
    </Stagger>
  );
};

export default LawCorner;
