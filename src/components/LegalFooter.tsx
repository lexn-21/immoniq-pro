import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

/**
 * Rechts-Footer für alle Seiten (öffentlich & App).
 * Enthält Pflicht-Links: Impressum, Datenschutz, AGB, Widerruf.
 * § 5 DDG / § 18 MStV — muss von jeder Seite aus in max. 2 Klicks erreichbar sein.
 */
export function LegalFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t border-border/40 ${compact ? "" : "mt-16"}`}>
      <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <Logo />
          <span>© {new Date().getFullYear()} ENTERVENTUS · ImmonIQ</span>
        </div>
        <nav aria-label="Rechtliche Hinweise" className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          <Link to="/impressum" className="hover:text-foreground transition">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-foreground transition">Datenschutz</Link>
          <Link to="/agb" className="hover:text-foreground transition">AGB</Link>
          <Link to="/widerruf" className="hover:text-foreground transition">Widerruf</Link>
        </nav>
      </div>
    </footer>
  );
}

export default LegalFooter;
