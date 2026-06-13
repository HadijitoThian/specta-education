/**
 * WhatsApp gateway — the CRM's outbound arm. Calls the SpecTa WhatsApp bot's
 * /send endpoint (Meta Cloud API under the hood). The bot is the single place
 * that holds the Meta token; we just hand it a recipient + message.
 *
 * Config (Railway → CRM service → Variables):
 *   WHATSAPP_BOT_URL          e.g. https://specta-whatsapp-api-xxxx.up.railway.app
 *   WHATSAPP_BOT_API_KEY      = the bot's BROADCAST_API_KEY
 *   WHATSAPP_REPORT_TEMPLATE      approved Meta template name for the weekly report
 *   WHATSAPP_REPORT_TEMPLATE_LANG (optional, default "en")
 *
 * If WHATSAPP_BOT_URL / key aren't set, sends are skipped cleanly (no errors) —
 * so the CRM works fine before WhatsApp is wired, and email keeps flowing.
 */

const botUrl = () => process.env.WHATSAPP_BOT_URL?.replace(/\/+$/, "") || "";
const botKey = () => process.env.WHATSAPP_BOT_API_KEY || "";

export function whatsappConfigured(): boolean {
  return !!botUrl() && !!botKey();
}
export function reportTemplateName(): string {
  return process.env.WHATSAPP_REPORT_TEMPLATE || "";
}
export function reportTemplateLang(): string {
  return process.env.WHATSAPP_REPORT_TEMPLATE_LANG || "en";
}

/**
 * Normalize an Indonesian phone number to Meta's wa_id format (digits, country
 * code, no "+"). 0812… → 62812…, +62 812 → 62812, 812… → 62812.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("62")) { /* ok */ }
  else if (d.startsWith("8")) d = "62" + d;
  // else: assume already has a country code
  if (d.length < 8 || d.length > 15) return null;
  return d;
}

type SendResult = { ok: boolean; skipped?: boolean; error?: string };

async function callBot(body: Record<string, unknown>): Promise<SendResult> {
  if (!whatsappConfigured()) return { ok: false, skipped: true, error: "WhatsApp not configured" };
  try {
    const res = await fetch(`${botUrl()}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": botKey() },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      return { ok: false, error: json?.error || `bot /send ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "WhatsApp send error" };
  }
}

/** Free-form text — only delivered if the recipient messaged us in the last 24h. */
export async function sendWhatsAppText(to: string, text: string): Promise<SendResult> {
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, error: "Invalid phone number" };
  return callBot({ to: phone, text });
}

/** Approved-template send — works any time (required outside the 24h window). */
export async function sendWhatsAppTemplate(
  to: string,
  template: string,
  bodyParams: string[],
  language = reportTemplateLang()
): Promise<SendResult> {
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, error: "Invalid phone number" };
  if (!template) return { ok: false, skipped: true, error: "No template configured" };
  const components = bodyParams.length
    ? [{ type: "body", parameters: bodyParams.map(t => ({ type: "text", text: t })) }]
    : undefined;
  return callBot({ to: phone, template, language, components });
}
