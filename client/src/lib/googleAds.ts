/**
 * Google Ads conversion tracking (Growth Phase D).
 *
 * The base gtag.js tag is installed in client/index.html with the SpecTa
 * Education Google Ads ID (AW-956384648), so pageviews are already flowing.
 * This module fires per-event conversions (lead / purchase) on top of that.
 *
 * The AW ID defaults to the SpecTa production ID so a fresh clone works out
 * of the box. Override via env var if this repo is ever forked for a different
 * business.
 *
 * The two LABEL env vars stay optional — they need to be created inside
 * Google Ads → Goals → Conversion actions and pasted into Railway env:
 *   VITE_GOOGLE_ADS_LEAD_LABEL     — student registration / consultation booking
 *   VITE_GOOGLE_ADS_PURCHASE_LABEL — mock test / tutor sub / IGCSE sub payment
 *
 * Without a label set, that specific event silently no-ops (safe to call).
 */
const AW_ID =
  (import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined) || "AW-956384648";
const LABELS: Record<"lead" | "purchase", string | undefined> = {
  lead: import.meta.env.VITE_GOOGLE_ADS_LEAD_LABEL as string | undefined,
  purchase: import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL as string | undefined,
};

let configured = false;

function ensureGtag(): boolean {
  if (!AW_ID) return false;
  const w = window as any;
  // gtag.js is already loaded by index.html, so w.gtag exists on every page.
  // The old dynamic-injection path stays as a fallback in case some future page
  // strips the head tag (e.g. a stripped-down landing page).
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
    // Base tag already ran gtag('config', AW_ID) in index.html — no need to
    // double-configure. Mark configured so we don't try again.
    configured = true;
  }
  return true;
}

/**
 * Fire a Google Ads conversion. No-op unless the AW id + matching label env
 * vars are set. Safe to call on any success screen.
 */
export function fireConversion(
  kind: "lead" | "purchase",
  opts?: { value?: number; currency?: string; transactionId?: string }
): void {
  try {
    if (!ensureGtag()) return;
    const label = LABELS[kind];
    if (!label) return;
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
