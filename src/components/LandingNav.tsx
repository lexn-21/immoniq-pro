import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * LandingNav — fixed, glassy top-nav for the marketing landing page.
 * Left: brand. Middle: section anchors. Right: Anmelden + Starten.
 * Becomes more opaque on scroll for readability without breaking the hero.
 */
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.19, 1, 0.22, 1], delay: 0.1 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-[#c9a84c]/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 md:px-10 h-16 md:h-20">
        {/* Brand */}
        <Link
          to="/"
          className="font-display text-[20px] md:text-[22px] tracking-[-0.01em] text-[#f5f2ea] hover:text-[#c9a84c] transition-colors"
        >
          Immon<span className="text-[#c9a84c]">IQ</span>
        </Link>

        {/* Middle links */}
        <nav className="hidden md:flex items-center gap-10 text-[11px] tracking-[0.22em] uppercase text-[#c8c2b3]">
          <a href="#produkt" className="hover:text-[#f5f2ea] transition-colors">Produkt</a>
          <Link to="/pricing" className="hover:text-[#f5f2ea] transition-colors">Preise</Link>
          <Link to="/markt" className="hover:text-[#f5f2ea] transition-colors">Markt</Link>
        </nav>

        {/* Right auth */}
        <div className="flex items-center gap-3 md:gap-5">
          <Link
            to="/auth"
            className="text-[11px] tracking-[0.22em] uppercase text-[#c8c2b3] hover:text-[#f5f2ea] transition-colors"
          >
            Anmelden
          </Link>
          <Link
            to="/auth?mode=signup"
            className="inline-flex items-center rounded-full border border-[#c9a84c]/60 px-5 md:px-6 py-2 md:py-2.5 text-[11px] tracking-[0.22em] uppercase text-[#f5f2ea] hover:bg-[#c9a84c] hover:text-[#0d0d0d] hover:border-[#c9a84c] transition-all"
          >
            Starten
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
