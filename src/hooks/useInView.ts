import { useEffect, useRef, useState } from "react";

/**
 * useInView — pausiert schwere Szenen (R3F Canvas) wenn nicht sichtbar.
 * Rückgabe [ref, isInView].
 */
export function useInView<T extends Element = HTMLDivElement>(
  rootMargin = "200px",
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { rootMargin, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView];
}
