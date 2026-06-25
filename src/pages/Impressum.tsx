import { Link } from "react-router-dom";
import { usePageSeo } from "@/hooks/usePageSeo";

export default function Impressum() {
  usePageSeo({
    title: "Impressum · ImmonIQ",
    description: "Impressum und Anbieterkennzeichnung gemäß § 5 TMG für ImmonIQ — die App für Privatvermieter.",
    canonicalPath: "/impressum",
    jsonLdId: "localbusiness",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "ENTERVENTUS — ImmonIQ",
      founder: { "@type": "Person", name: "Leon Boomgaarden" },
      email: "leonboomgaarden@gmail.com",
      telephone: "+49 152 28943502",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Kastanienallee 13",
        postalCode: "59320",
        addressLocality: "Ennigerloh",
        addressCountry: "DE",
      },
      url: "https://immoniq.xyz/impressum",
    },
  });

  return (
    <div className="min-h-screen bg-background py-16 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Zurück</Link>
        <h1 className="text-3xl font-bold">Impressum</h1>
        <p className="text-sm text-muted-foreground">Angaben gemäß § 5 TMG</p>

        <div className="space-y-2 text-sm">
          <p className="font-semibold">Leon Boomgaarden</p>
          <p>Geschäftsbezeichnung: ENTERVENTUS</p>
          <p>Kastanienallee 13</p>
          <p>59320 Ennigerloh</p>
          <p>Deutschland</p>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong>Kontakt</strong></p>
          <p>Telefon: +49 152 28943502</p>
          <p>E-Mail: <a href="mailto:leonboomgaarden@gmail.com" className="text-primary">leonboomgaarden@gmail.com</a></p>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong>Umsatzsteuer</strong></p>
          <p>
            Kleinunternehmer gem. § 19 UStG — es wird keine Umsatzsteuer ausgewiesen.
            Eine USt-ID wird gem. § 19 UStG nicht geführt.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong>EU-Streitschlichtung</strong></p>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Unsere E-Mail finden Sie oben. Wir sind nicht bereit oder verpflichtet, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen
            (§ 36 VSBG).
          </p>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          Verantwortlich für journalistisch-redaktionelle Inhalte gem. § 18 Abs. 2 MStV:
          Leon Boomgaarden, Anschrift wie oben.
        </p>
      </div>
    </div>
  );
}
