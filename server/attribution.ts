/**
 * Server-side marketing attribution (Growth Phase A).
 *
 * The client writes a first-party `specta_attr` cookie on the visitor's first
 * landing (UTM tags, gclid, referrer, landing page). Because tRPC sends cookies
 * (credentials: "include"), we can read it here and stamp the attribution onto
 * any lead the visitor creates — no per-form wiring needed.
 */

export interface LeadAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  landingPage?: string;
  attributionReferrer?: string;
}

function trunc(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max) : s;
}

/** Read & parse the `specta_attr` cookie from a tRPC/Express context. */
export function parseAttribution(ctx: any): LeadAttribution {
  try {
    const cookieHeader: string = ctx?.req?.headers?.cookie || "";
    const m = cookieHeader.match(/(?:^|;\s*)specta_attr=([^;]+)/);
    if (!m) return {};
    const raw = decodeURIComponent(m[1]);
    const d = JSON.parse(raw);
    return {
      utmSource: trunc(d.utmSource, 120),
      utmMedium: trunc(d.utmMedium, 120),
      utmCampaign: trunc(d.utmCampaign, 160),
      utmTerm: trunc(d.utmTerm, 160),
      utmContent: trunc(d.utmContent, 160),
      gclid: trunc(d.gclid, 255),
      landingPage: trunc(d.landingPage, 512),
      attributionReferrer: trunc(d.referrer, 512),
    };
  } catch {
    return {};
  }
}
