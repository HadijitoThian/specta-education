import { useEffect } from "react";
import { fireConversion } from "@/lib/googleAds";

/**
 * Global click delegation for conversion events that live on many pages.
 *
 * Right now this only handles WhatsApp — there are 30+ WhatsApp links
 * scattered across 17 files (nav bar, footer, hero CTAs, sticky mobile
 * button, country pages, IELTS pages, etc.). Adding a tracking handler to
 * each one individually is exactly the "per-page opt-in" pattern that
 * silently broke the chatbot on 6 pages and the sitemap on 4 URLs. Delegate
 * once at the app root; every present and future WhatsApp link gets tracked
 * automatically.
 *
 * The listener sits on `document` in the capture phase so it fires before
 * the browser follows the `wa.me` URL and navigates away. Debounced by
 * timestamp so a single click doesn't fire twice.
 *
 * Mounted in App.tsx alongside GlobalChatBot.
 */
export default function GlobalConversionTracking() {
  useEffect(() => {
    // Dedupe by URL+timestamp — click bubbling can fire twice on nested
    // elements (icon + span inside <a>), and iOS Safari occasionally
    // fires both `click` and `touchend`.
    let lastFireAt = 0;
    let lastHref = "";

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const anchor = el.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!/wa\.me\/|api\.whatsapp\.com\/send|chat\.whatsapp\.com\//i.test(href)) return;

      const now = Date.now();
      if (href === lastHref && now - lastFireAt < 1500) return;
      lastHref = href;
      lastFireAt = now;

      fireConversion("whatsapp", { value: 25000, currency: "IDR" });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
