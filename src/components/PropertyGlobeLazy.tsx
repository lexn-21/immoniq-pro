import { lazy, Suspense, useEffect, useRef, useState } from "react";
import PropertyGlobeFallback from "./PropertyGlobeFallback";

// Nur lazy — Three.js/Drei landen in einem eigenen Chunk.
const PropertyGlobe = lazy(() => import("./PropertyGlobe"));

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Lädt den 3D-Globus:
 *  - erst wenn er im Viewport ist (IntersectionObserver)
 *  - nur bei vorhandenem WebGL
 *  - nicht bei prefers-reduced-motion
 * In allen anderen Fällen wird der pure-CSS-Fallback gerendert.
 */
export default function PropertyGlobeLazy() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"waiting" | "no-webgl" | "reduced-motion" | "ready">("waiting");

  useEffect(() => {
    if (prefersReducedMotion()) {
      setState("reduced-motion");
      return;
    }
    if (!detectWebGL()) {
      setState("no-webgl");
      return;
    }

    const el = wrapRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      setState("ready");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState("ready");
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} data-pgf>
      {state === "ready" ? (
        <Suspense fallback={<PropertyGlobeFallback reason="loading" />}>
          <PropertyGlobe />
        </Suspense>
      ) : state === "waiting" ? (
        <PropertyGlobeFallback reason="loading" />
      ) : (
        <PropertyGlobeFallback reason={state} />
      )}
    </div>
  );
}
