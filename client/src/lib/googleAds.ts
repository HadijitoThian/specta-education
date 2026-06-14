/**
 * Google Ads conversion tracking (Growth Phase D).
 *
 * DORMANT until you set these env vars (Vite, build-time):
 *   VITE_GOOGLE_ADS_ID            e.g. "AW-123456789"
 *   VITE_GOOGLE_ADS_LEAD_LABEL    conversion label for a lead/booking
 *   VITE_GOOGLE_ADS_PURCHASE_LABEL conversion label for a paid purchase
 *
 * Without the ID/label these functions are silent no-ops, so it's safe to call
 * them anywhere. Once you create a conversion action in Google Ads and paste the
 * AW- ID + label into the env, conversions fire automatically — letting Google's
 * smart bidding optimise toward real leads/purchases.
 */
const AW_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;
const LABELS: Record<"lead" | "purchase", string | undefined> = {
  lead: import.meta.env.VITE_GOOGLE_ADS_LEAD_LABEL as string | undefined,
  purchase: import.meta.env.VITE_GOOGLE_ADS_PURCHASE_LABEL as string | undefined,
};

let configured = false;

function ensureGtag(): boolean {
  if (!AW_ID) return false;
  const w = window as any;
  if (typeof w.gtag !== "function") {
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer.push(arguments); };
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${AW_ID}`;
    document.head.appendChild(s);
    w.gtag("js", new Date());
  }
  if (!configured) { w.gtag("config", AW_ID); configured = true; }
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
