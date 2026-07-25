/**
 * Client-side brand context.
 *
 * The server injects window.__BRAND__ into every HTML response (see
 * server/hostRouter.ts). At React boot we read it once and expose helpers
 * for the app shell to decide:
 *   - Which routing tree to mount (SpecTaApp vs TestPrepApp)
 *   - Which brand config (colors, name, footer copy) to apply
 *   - Which conditional UI to render (e.g. hide human-counselor CTA on
 *     TestPrep because that brand is self-serve only)
 *
 * We snapshot at module load so React doesn't re-read on every render.
 * Brand doesn't change during a session — a user on testprep.id in tab 1
 * and spectaeducation.com in tab 2 has separate window objects.
 */

export type Brand = "specta" | "testprep" | "consultant";

export interface BrandContext {
  brand: Brand;
  brandName: string;
  rootDomain: string;
  tenantId: number;
  tenantSlug?: string;
}

// Read once at boot. Fallback to specta if server injection didn't happen
// (defensive — should never occur in practice).
const raw = (typeof window !== "undefined" ? (window as any).__BRAND__ : null) as BrandContext | null;

export const brandContext: BrandContext = raw || {
  brand: "specta",
  brandName: "SpecTa Education",
  rootDomain: "spectaeducation.com",
  tenantId: 1,
};

/** Handy predicates for conditional rendering inside shared components. */
export const isSpecta = brandContext.brand === "specta";
export const isTestPrep = brandContext.brand === "testprep";
export const isConsultant = brandContext.brand === "consultant";

/** React hook wrapper — future-proof if we ever move to dynamic switching. */
export function useBrand(): BrandContext {
  return brandContext;
}
