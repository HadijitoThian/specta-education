/**
 * Formats a phone number for use in WhatsApp wa.me links.
 * Handles Indonesian numbers (0xxx → 62xxx) and international formats.
 * Returns empty string if no valid number.
 */
export function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  // Remove all non-numeric characters
  let digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return "";
  // Convert Indonesian local format: 0xxx → 62xxx
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  }
  // If already starts with 62, keep as-is
  // If starts with other country code (e.g. 1, 44), keep as-is
  return digits;
}

/**
 * Builds a full WhatsApp wa.me URL with optional pre-filled message.
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message?: string): string {
  const number = formatWhatsAppNumber(phone);
  if (!number) return "https://web.whatsapp.com";
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
