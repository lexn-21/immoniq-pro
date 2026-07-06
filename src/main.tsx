import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/sora/300.css";
import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/manrope/300.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";


createRoot(document.getElementById("root")!).render(<App />);

// Service Worker — NUR in Production auf echter Domain registrieren.
// Im Lovable-Preview/Iframe würde der SW Stale-Cache und Routing-Bugs verursachen.
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const host = window.location.hostname;
const isPreview =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host.includes("lovable.app") && host.includes("--");
const isLocalhost = host === "localhost" || host === "127.0.0.1";

if ("serviceWorker" in navigator) {
  if (isInIframe || isPreview || isLocalhost || import.meta.env.DEV) {
    // Sicherheits-Cleanup: Falls ein alter SW noch lebt, abmelden.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[SW] Registrierung fehlgeschlagen:", err));
    });
  }
}
