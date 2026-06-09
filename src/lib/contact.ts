/** Normalize phone for wa.me.
 *  - Strip everything except digits and leading "+"
 *  - German format: "0170 ..." → "49170..." (drop leading 0, add 49)
 *  - International "+xx ..." → "xx..."
 *  - "00xx ..." → "xx..."
 */
function normalizePhone(phone: string): string | null {
  let p = phone.trim().replace(/[^\d+]/g, "");
  if (!p) return null;
  if (p.startsWith("+")) p = p.slice(1);
  else if (p.startsWith("00")) p = p.slice(2);
  else if (p.startsWith("0")) p = "49" + p.slice(1); // German default
  if (p.length < 8 || p.length > 15) return null;
  return p;
}

export function waHref(phone?: string | null, text?: string): string | null {
  if (!phone) return null;
  const n = normalizePhone(phone);
  if (!n) return null;
  // Desktop-Browser: web.whatsapp.com (wa.me leitet sonst auf api.whatsapp.com,
  // das wird von vielen Browsern/Erweiterungen mit ERR_BLOCKED_BY_RESPONSE geblockt).
  // Mobile: wa.me öffnet zuverlässig die App.
  const isMobile = typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const q = text ? `&text=${encodeURIComponent(text)}` : "";
  const t = text ? `?text=${encodeURIComponent(text)}` : "";
  return isMobile
    ? `https://wa.me/${n}${t}`
    : `https://web.whatsapp.com/send?phone=${n}${q}`;
}

export function mailHref(email?: string | null, subject?: string, body?: string): string | null {
  if (!email) return null;
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${params.length ? `?${params.join("&")}` : ""}`;
}
