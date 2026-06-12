// Public, brandable base URL for links shared externally (e.g. advisor invites).
// Uses immoniq.xyz in production so emails don't show lovable.app URLs.
const PROD = "https://immoniq.xyz";

export const PUBLIC_BASE_URL: string = (() => {
  if (typeof window === "undefined") return PROD;
  const host = window.location.hostname;
  // Use the live domain when we are actually on it, otherwise force PROD
  if (host === "immoniq.xyz" || host === "www.immoniq.xyz") return `${window.location.protocol}//${host}`;
  return PROD;
})();

export const publicUrl = (path: string) =>
  `${PUBLIC_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
