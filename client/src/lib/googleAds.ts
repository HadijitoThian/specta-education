/**
 * Google Ads conversion tracking (Growth Phase D).
 *
 * The base gtag.js tag is installed in client/index.html with the SpecTa
 * Education Google Ads ID (AW-956384648) plus the GA4 property. This module
 * fires per-event conversions (5 distinct types) on top of that.
 *
 * Conversion labels come from Google Ads → Goals → Conversion actions.
 * Owner created them on 2026-07-04. Labels are hardcoded here so a fresh
 * clone works out of the box; each can still be overridden via a Vite env
 * var if this repo is ever forked for another business, or if a label
 * needs to be swapped without a redeploy.
 *
 * Each event type maps to a distinct conversion action in Google Ads with
 * its own IDR value, so Smart Bidding can weigh a Rp 299k IGCSE
 * subscription differently from a Rp 25k WhatsApp click.
 */
const AW_ID =
  (import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined) ||
  "AW-956384648";

/** All 6 conversion types the site can fire. Keep in sync with Google Ads. */
export type ConversionKind =
  | "lead"          // Student registered (Sign-up)   — funnel entry
  | "mockTest"      // Mock Test purchased  Rp  79k   — Purchase
  | "tutor"         // AI Tutor subscribed  Rp 199k   — Purchase
  | "igcse"         // IGCSE subscribed     Rp 299k   — Purchase
  | "aptitudePro"   // Tes Bakat AI Pro Rp 79k        — Purchase
  | "whatsapp";     // WhatsApp clicked                — Contact

/**
 * Conversion labels. Env vars win when set — otherwise the hardcoded
 * production labels are used.
 *
 * `lead` (Student registered) is not wired up yet — Google Ads UI wouldn't
 * let us surface the snippet in the setup session on 2026-07-04. Left as
 * an empty string; drop the label in whenever we can get it and lead
 * events will start flowing without any other code change.
 */
const LABELS: Record<ConversionKind, string> = {
  lead:
    (import.meta.env.VITE_GOOGLE_ADS_LEAD_LABEL as string | undefined) || "",
  mockTest:
    (import.meta.env.VITE_GOOGLE_ADS_MOCK_LABEL as string | undefined) ||
    "6BE9CJav_tMcEIiLhcgD",
  tutor:
    (import.meta.env.VITE_GOOGLE_ADS_TUTOR_LABEL as string | undefined) ||
    "rM1JCOjU_tMcEIiLhcgD",
  igcse:
    (import.meta.env.VITE_GOOGLE_ADS_IGCSE_LABEL as string | undefined) ||
    "yINBCJq6-9McEIiLhcgD",
  // aptitudePro (Tes Bakat AI Pro purchased) — needs a Google Ads Conversion
  // Action created. Until VITE_GOOGLE_ADS_APTITUDE_PRO_LABEL is set, browser
  // firing is a no-op — but the SERVER-SIDE offline upload (see
  // xenditWebhook.ts) still records the sale to Google Ads via a
  // conversion action named "Tes Bakat AI Pro purchased" (set that name
  // in Google Ads > Conversions), so bidding still learns from the sale.
  aptitudePro:
    (import.meta.env.VITE_GOOGLE_ADS_APTITUDE_PRO_LABEL as string | undefined) || "",
  whatsapp:
    (import.meta.env.VITE_GOOGLE_ADS_WHATSAPP_LABEL as string | undefined) ||
    "UGXtCIKG-tMcEIiLhcgD",
};

let configured = false;

function ensureGtag(): boolean {
  if (!AW_ID) return false;
  const w = window as any;
  // gtag.js is already loaded by index.html, so w.gtag exists on every page.
  // The old dynamic-injection path stays as a fallback in case some future
  // page strips the head tag (e.g. a stripped-down landing page).
  if (typeof w.gtag !== "function") {
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer.push(arguments); };
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${AW_ID}`;
    document.head.appendChild(s);
    w.gtag("js", new Date());
    w.gtag("config", AW_ID);
    configured = true;
  } else if (!configured) {
    configured = true;
  }
  return true;
}

/**
 * Fire a Google Ads conversion. Silently no-ops if:
 *  - the AW id is missing (impossible unless env overrides it to empty)
 *  - the label for this kind isn't wired up yet (e.g. lead pre-2026-07)
 *  - gtag failed to load (e.g. adblocker)
 *
 * Safe to call anywhere; failures never break the page.
 *
 * @param kind  Which of the 5 conversion actions to fire.
 * @param opts.value    IDR value if different from what's set in Google Ads.
 *                      For Purchases we always pass the exact price so
 *                      Google's ROAS bidding sees real numbers.
 * @param opts.currency ISO currency code. Defaults to IDR.
 * @param opts.transactionId  Optional idempotency key. Google uses this to
 *                            de-duplicate double-fires (page reloads, back
 *                            button, etc). Recommended for Purchases.
 */
export function fireConversion(
  kind: ConversionKind,
  opts?: { value?: number; currency?: string; transactionId?: string }
): void {
  try {
    if (!ensureGtag()) return;
    const label = LABELS[kind];
    if (!label) return; // label not wired up yet — silent no-op
    const w = window as any;
    w.gtag("event", "conversion", {
      send_to: `${AW_ID}/${label}`,
      currency: opts?.currency || "IDR",
      ...(opts?.value != null ? { value: opts.value } : {}),
      ...(opts?.transactionId ? { transaction_id: opts.transactionId } : {}),
    });
  } catch {
    // tracking must never break the page
  }
}

/**
 * Backwards-compat aliases. The old codebase called fireConversion("lead")
 * and fireConversion("purchase") before we split Purchase into three
 * distinct actions (mockTest / tutor / igcse). Keep the "purchase" alias
 * routing to Tutor since that was the original caller's intent — new
 * callers should use the specific kinds directly.
 */
export function fireConversionLegacy(
  kind: "lead" | "purchase",
  opts?: { value?: number; currency?: string; transactionId?: string }
): void {
  if (kind === "lead") return fireConversion("lead", opts);
  return fireConversion("tutor", opts);
}
