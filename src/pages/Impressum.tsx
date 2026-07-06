import { Link } from "react-router-dom";
import { usePageSeo } from "@/hooks/usePageSeo";
import { LegalFooter } from "@/components/LegalFooter";

export default function Impressum() {
  usePageSeo({
    title: "Impressum · ImmonIQ",
    description: "Impressum und Anbieterkennzeichnung gemäß § 5 TMG für ImmonIQ — die App für Privatvermieter.",
    canonicalPath: "/impressum",
    ogDescription: "Impressum gemäß § 5 TMG: ENTERVENTUS / ImmonIQ, Kastanienallee 13, 59320 Ennigerloh.",
    jsonLdId: "localbusiness",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "ENTERVENTUS — ImmonIQ",
      founder: { "@type": "Person", name: "Leon Boomgaarden" },
      vatID: "DE365353142",
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
          <p><strong>Umsatzsteuer-Identifikationsnummer</strong></p>
          <p>gemäß § 27 a Umsatzsteuergesetz:</p>
          <p className="font-mono">DE365353142</p>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong>Redaktionell verantwortlich</strong> (§ 18 Abs. 2 MStV)</p>
          <p>Leon Boomgaarden, Anschrift wie oben.</p>
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
            . Unsere E-Mail-Adresse findest du oben im Impressum.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong>Verbraucherstreitbeilegung / Universalschlichtungsstelle</strong></p>
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong>Haftung für Inhalte</strong></p>
          <p>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
            nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
            Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
            Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
            Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
            Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine
            diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
            Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden
            wir diese Inhalte umgehend entfernen.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong>Haftung für Links</strong></p>
          <p>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
            Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr
            übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder
            Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
            Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum
            Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der
            verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht
            zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend
            entfernen.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p><strong>Urheberrecht</strong></p>
          <p>
            Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
            unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung
            und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
            schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien
            dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit
            die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die
            Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche
            gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam
            werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von
            Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
          </p>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
        </p>
      </div>
      <LegalFooter />
      </div>
  );
}
