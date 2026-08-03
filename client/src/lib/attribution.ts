/**
 * Marketing attribution capture (Growth Phase A).
 *
 * On the visitor's FIRST landing we record where they came from (UTM tags,
 * Google `gclid`, referrer, landing page) into a first-party cookie. That
 * cookie travels with every same-origin request (tRPC uses credentials:
 * "include"), so the server can stamp it onto any lead the visitor later
 * creates — tying a paying student back to the ad/keyword that won them.
 *
 * We keep BOTH first-touch (the cookie below, written once) so credit goes to
 * the original source, even if the user comes back later via a direct visit.
 */

const COOKIE = "specta_attr";
const MAX_AGE_DAYS = 90;

type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  landingPage?: string;
  referrer?: string;
  ts?: number;
};

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  // SameSite=Lax so it survives ad-click → landing navigations; not Secure-only
  // so it also works in local/dev over http.
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function paramsFromUrl(): Attribution {
  const p = new URLSearchParams(window.location.search);
  const get = (k: string) => p.get(k) || undefined;
  const attr: Attribution = {
    utmSource: get("utm_source"),
    utmMedium: get("utm_medium"),
    utmCampaign: get("utm_campaign"),
    utmTerm: get("utm_term"),
    utmContent: get("utm_content"),
    gclid: get("gclid"),
  };
  // Infer source/medium from a Google Ads click even without UTM tags.
  if (attr.gclid && !attr.utmSource) {
    attr.utmSource = "google";
    attr.utmMedium = attr.utmMedium || "cpc";
  }
  return attr;
}

function hasSignal(a: Attribution): boolean {
  return !!(a.utmSource || a.utmMedium || a.utmCampaign || a.gclid);
}

/**
 * Call once on app load. Attribution priority:
 *   1. If this visit has a GCLID → ALWAYS update cookie (Google Ads uses
 *      LAST-CLICK attribution, so the newest paid-click GCLID wins).
 *   2. If this visit has UTM tags (but no GCLID) and existing cookie has no
 *      real signal → update.
 *   3. If nothing meaningful in this visit → keep existing cookie, or set
 *      an organic first-touch cookie if nothing exists.
 *
 * PREVIOUS BUG (fixed by this rewrite): the old code did
 *   if (readCookie(COOKIE)) return;
 * as the very first line, which meant any visitor who had EVER visited the
 * site organically had their empty cookie block all future GCLID captures.
 * Every subsequent ad-click failed to record its GCLID → server had no
 * GCLID → offline conversion upload was silently no-op'd → Google Ads
 * dashboard showed 0.00 conversions despite real sales happening. This
 * was the reason CTR looked healthy but conversions never registered
 * (most Indonesian users find SpecTa organically first, THEN click ads —
 * they always had a "poisoned" empty-attribution cookie by ad-click time).
 */
export function captureAttribution(): void {
  try {
    const current = paramsFromUrl();
    const existing = getAttribution();

    const buildData = (): Attribution => ({
      ...current,
      landingPage: window.location.pathname + window.location.search,
      referrer: document.referrer || undefined,
      ts: Date.now(),
    });

    // Priority 1: new GCLID always wins (last-click attribution, matches
    // how Google Ads itself attributes conversions).
    if (current.gclid) {
      writeCookie(COOKIE, JSON.stringify(buildData()), MAX_AGE_DAYS);
      return;
    }

    // Priority 2: new UTM signal wins if existing cookie has no signal.
    if (hasSignal(current) && !(existing && hasSignal(existing))) {
      writeCookie(COOKIE, JSON.stringify(buildData()), MAX_AGE_DAYS);
      return;
    }

    // Priority 3: preserve existing meaningful cookie.
    if (existing && hasSignal(existing)) return;

    // Priority 4: no existing cookie at all — set organic first-touch.
    if (!existing) {
      writeCookie(COOKIE, JSON.stringify(buildData()), MAX_AGE_DAYS);
    }
    // Else: existing cookie is signal-less, current visit is signal-less —
    // keep the existing cookie (older ts, same value).
  } catch {
    // Attribution must never break the app.
  }
}

/** Read the captured attribution (for debugging / client use). */
export function getAttribution(): Attribution | null {
  try {
    const raw = readCookie(COOKIE);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}
