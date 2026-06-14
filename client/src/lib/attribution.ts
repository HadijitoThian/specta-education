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
 * Call once on app load. Writes the first-touch cookie if we don't already
 * have one and this visit carries a campaign signal (or is the first landing).
 */
export function captureAttribution(): void {
  try {
    if (readCookie(COOKIE)) return; // first-touch already locked in
    const current = paramsFromUrl();
    // Only set the cookie when there's something meaningful to attribute, OR
    // record the very first landing (referrer/landing page) for organic.
    const data: Attribution = {
      ...current,
      landingPage: window.location.pathname + window.location.search,
      referrer: document.referrer || undefined,
      ts: Date.now(),
    };
    if (hasSignal(current) || !readCookie(COOKIE)) {
      writeCookie(COOKIE, JSON.stringify(data), MAX_AGE_DAYS);
    }
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
