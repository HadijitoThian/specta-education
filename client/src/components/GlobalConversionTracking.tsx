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

      // If the link is tagged with data-wa="<code>", reroute through our
      // attribution endpoint so a wa_session row gets created with the
      // current GCLID + UTMs BEFORE the WhatsApp app opens. Without this
      // reroute the GCLID is lost the moment the browser hands off.
      const waCode = anchor.getAttribute("data-wa");
      if (waCode) {
        e.preventDefault();
        // Full URL so the server can respond with a 302 redirect. Same-tab
        // navigation matches user expectation for tapping a WhatsApp button.
        window.location.href = `/wa/${encodeURIComponent(waCode)}`;
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
