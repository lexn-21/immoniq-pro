/**
 * WhatsApp Click-to-Chat Helper
 * Erzeugt wa.me Deep-Links — kein API-Key nötig, funktioniert sofort auf Web + Mobile.
 */

/** Normalisiert eine deutsche/internationale Telefonnummer zu E.164 ohne führendes "+". */
export function normalizePhoneForWhatsapp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let p = phone.replace(/[\s\-()\/]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("0")) p = "+49" + p.slice(1); // DE-Default
  if (!p.startsWith("+")) p = "+" + p;
  const digits = p.replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : null;
}

/** Baut einen wa.me-Link mit optional vorgefüllter Nachricht. */
export function whatsappLink(phone: string | null | undefined, message?: string): string | null {
  const num = normalizePhoneForWhatsapp(phone);
  if (!num) return null;
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${num}${q}`;
}

/** Vorgefertigte deutsche Mieter-Nachrichten. */
export const waTemplates = {
  rentReminder: (name: string, amount: string, month: string) =>
    `Hallo ${name}, kurze freundliche Erinnerung — die Miete für ${month} (${amount}) ist noch offen. Bitte um Überweisung diese Woche. Bei Fragen einfach melden 🙂`,

  dunning1: (name: string, amount: string, month: string) =>
    `Hallo ${name}, die Miete für ${month} in Höhe von ${amount} ist überfällig. Bitte umgehend überweisen, andernfalls muss ich eine schriftliche Mahnung versenden. Danke!`,

  meterReading: (name: string) =>
    `Hallo ${name}, könntest du mir bitte deine aktuellen Zählerstände (Strom, Wasser, Gas/Heizung) als Foto schicken? Danke!`,

  appointment: (name: string, date: string, topic: string) =>
    `Hallo ${name}, ich würde gerne einen Termin für "${topic}" am ${date} mit dir vereinbaren. Passt das? LG`,

  nkaSent: (name: string, year: string) =>
    `Hallo ${name}, ich habe dir gerade die Nebenkostenabrechnung ${year} per E-Mail / im Mieter-Portal bereitgestellt. Bei Fragen melde dich gerne!`,

  custom: () => "",
};
