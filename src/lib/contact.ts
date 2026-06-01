/** Cleans phone for wa.me (digits only, leading + dropped). */
export function waHref(phone?: string | null, text?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (digits.length < 6) return null;
  const t = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${t}`;
}

export function mailHref(email?: string | null, subject?: string, body?: string): string | null {
  if (!email) return null;
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${params.length ? `?${params.join("&")}` : ""}`;
}
