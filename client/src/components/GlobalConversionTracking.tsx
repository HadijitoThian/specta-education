import { useEffect } from "react";
import { fireConversion } from "@/lib/googleAds";

/**
 * Global click delegation for conversion events + WhatsApp attribution.
 * Mounted once at the app root (App.tsx) so every present and future
 * page inherits both behaviours for free.
 *
 * TWO things this component does:
 *
 * 1) Fires the Google Ads "WhatsApp clicked" conversion whenever ANY link
 *    to WhatsApp is clicked anywhere on the site. Debounced by URL to
 *    prevent double-fires from bubbling / touchend duplicates.
 *
 * 2) INTERCEPTS clicks on wa.me links that carry a `data-wa` attribute
 *    (or a href-embedded code) and reroutes them through /wa/<code> on
 *    our server first. That server route logs the click with GCLID +
 *    UTMs from the specta_attr cookie, generates a session ID, and
 *    redirects to wa.me with a pre-filled message containing
 *    "[REF:WA-xxx]" so Emma the bot can recognise the source. Fixes the
 *    "GCLID lost when browser hands off to WhatsApp" problem — see
 *    server/waAttribution.ts for the full flow.
 *
 * Bare `wa.me` links (no data-wa) still work as before but produce
 * untracked WhatsApp sessions — Emma has no idea which ad they came
 * from. Marketing should migrate ALL ad-linked WhatsApp buttons to
 * carry `data-wa="<code>"` (or use the /wa/<code> URL directly in ad
 * creatives) to get full attribution.
 */
/**
 * URL-path → campaign-code mapping used for AUTO-ROUTING bare wa.me links.
 *
 * When a user clicks a bare `wa.me/62818218388?text=...` link anywhere on the
 * site (of which there are ~30 across ~17 files), we look up the current page
 * path here and reroute through /wa/:code so the click gets attributed with
 * GCLID + UTMs. Every code below is auto-seeded on server startup
 * (see server/waAttribution.ts → seedDefaultWaCampaigns) so we're never
 * routing to a missing campaign.
 *
 * Falls through to "general" if the current page doesn't match — better to
 * have GENERIC attribution than none at all.
 */
function autoWaCodeForPath(pathname: string): string {
  const p = pathname.toLowerCase().replace(/\/+$/, "") || "/";

  // Country pages — /destinations/:country
  const country = p.match(/^\/destinations\/([a-z-]+)$/)?.[1];
  if (country) {
    const map: Record<string, string> = {
      "australia": "country-au", "uk": "country-uk", "usa": "country-us",
      "canada": "country-ca", "singapore": "country-sg", "malaysia": "country-my",
      "new-zealand": "country-nz", "ireland": "country-ie",
      "netherlands": "country-nl", "china": "country-cn",
    };
    if (map[country]) return map[country];
  }
  if (p === "/malaysia") return "country-my"; // legacy standalone Malaysia page

  // Product pages
  if (p === "/ielts")               return "ielts-consult";
  if (p === "/ielts/practice")      return "ielts-consult";
  if (p === "/ielts/tutor")         return "ielts-tutor";
  if (p === "/ielts/mock-test")     return "ielts-mock";
  if (p === "/igcse")               return "igcse";
  if (p === "/igcse/practice")      return "igcse";
  if (p === "/scholarships")        return "scholarships";
  if (p === "/destinations")        return "study-abroad";
  if (p === "/book")                return "book-consult";
  if (p === "/book-consultation")   return "book-consult";
  if (p === "/contact")             return "general";
  if (p === "/apply")               return "book-consult";
  if (p.startsWith("/play/aptitude") || p.startsWith("/test/pro")) return "aptitude";

  // Home + everything else → generic
  return "general";
}

export default function GlobalConversionTracking() {
  useEffect(() => {
    let lastFireAt = 0;
    let lastHref = "";

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const anchor = el.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const isWaLink = /wa\.me\/|api\.whatsapp\.com\/send|chat\.whatsapp\.com\//i.test(href);
      if (!isWaLink) return;

      // Dedupe the Google Ads conversion fire.
      const now = Date.now();
      if (!(href === lastHref && now - lastFireAt < 1500)) {
        lastHref = href;
        lastFireAt = now;
        fireConversion("whatsapp", { value: 25000, currency: "IDR" });
      }

      // Choose a campaign code:
      //   - explicit `data-wa="..."` wins (marketing team can override)
      //   - else derive from current URL (auto-attribution for bare wa.me
      //     links that haven't been migrated yet — no per-page code changes)
      const explicit = anchor.getAttribute("data-wa");
      const waCode = explicit || autoWaCodeForPath(window.location.pathname);

      // Reroute through our attribution endpoint so a wa_session row gets
      // created with the current GCLID + UTMs BEFORE the WhatsApp app opens.
      // Without this the GCLID is lost the moment the browser hands off.
      // Skip if we're already ON /wa/:code (prevent redirect loops).
      if (!window.location.pathname.startsWith("/wa/")) {
        e.preventDefault();
        window.location.href = `/wa/${encodeURIComponent(waCode)}`;
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
