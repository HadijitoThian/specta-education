/**
 * Host → Brand resolution for multi-brand serving.
 *
 * The same Node/Express service serves BOTH spectaeducation.com (premium
 * counselor-driven consultancy) and testprep.id (self-serve AI test prep +
 * white-label + affiliate platform). Later, custom consultant domains
 * (studia-global.com, etc.) route in through this same middleware once
 * multi-tenancy ships.
 *
 * Every request goes through hostToBrand() which returns a stable brand
 * identifier used for:
 *   - HTML injection: window.__BRAND__ tells the React app which routing
 *     tree to mount (SpecTaApp vs TestPrepApp)
 *   - Backend logic: tRPC endpoints check brand context when behavior
 *     needs to differ (email templates, pricing, support channel)
 *   - Multi-tenancy: consultant subdomains resolve to a specific tenant
 *     via the tenants table (added later)
 *
 * Design principle: this function is PURE and cheap — one Map lookup,
 * no DB calls. Runs on every request. Keep it that way.
 */

export type Brand = "specta" | "testprep" | "consultant";

export interface BrandContext {
  brand: Brand;
  /** Canonical brand name shown in UI (e.g. "SpecTa Education", "TestPrep") */
  brandName: string;
  /** Root domain the brand runs on. Used for cookie scoping + canonical URLs. */
  rootDomain: string;
  /** Tenant id for multi-tenant queries. 1 = SpecTa, 2 = TestPrep platform,
   *  3+ = individual consultants (once multi-tenancy ships). */
  tenantId: number;
  /** Consultant subdomain slug if this is a white-label consultant site. */
  tenantSlug?: string;
}

// Known root domains for our first-party brands.
const SPECTA_DOMAINS = new Set([
  "spectaeducation.com",
  "www.spectaeducation.com",
  "specta-education-production.up.railway.app", // Railway default
]);

const TESTPREP_DOMAINS = new Set([
  "testprep.id",
  "www.testprep.id",
]);

/**
 * Resolve an HTTP Host header to a brand context.
 *
 * Priority order:
 *   1. Exact match on SPECTA_DOMAINS → brand=specta
 *   2. Exact match on TESTPREP_DOMAINS → brand=testprep
 *   3. Subdomain of testprep.id (e.g. sarah.testprep.id) → brand=consultant
 *   4. Anything else (localhost, custom consultant domain, unknown) → brand=specta (safe default)
 *
 * For custom consultant domains (studia-global.com etc.) we'll look up the
 * tenants table when multi-tenancy ships. For now, unknown hosts fall back
 * to SpecTa so nothing breaks during rollout.
 */
export function hostToBrand(hostHeader: string | undefined | null): BrandContext {
  const host = (hostHeader || "").toLowerCase().split(":")[0].trim();

  if (SPECTA_DOMAINS.has(host)) {
    return { brand: "specta", brandName: "SpecTa Education", rootDomain: "spectaeducation.com", tenantId: 1 };
  }

  if (TESTPREP_DOMAINS.has(host)) {
    return { brand: "testprep", brandName: "TestPrep", rootDomain: "testprep.id", tenantId: 2 };
  }

  // Consultant subdomain of testprep.id (e.g. sarah.testprep.id)
  if (host.endsWith(".testprep.id")) {
    const slug = host.replace(".testprep.id", "");
    return {
      brand: "consultant",
      brandName: slug, // temp — will be replaced by tenants.brandName once table exists
      rootDomain: `${slug}.testprep.id`,
      tenantId: 0, // temp — will be resolved by DB lookup once multi-tenancy ships
      tenantSlug: slug,
    };
  }

  // Localhost / dev / Railway URL / unknown — default to SpecTa so nothing breaks.
  return { brand: "specta", brandName: "SpecTa Education", rootDomain: "spectaeducation.com", tenantId: 1 };
}

/**
 * Serialize the brand context into a script tag safe to inject in <head>.
 * The React app reads window.__BRAND__ at boot to pick its routing tree.
 */
export function brandInjectionScript(ctx: BrandContext): string {
  // JSON.stringify safely escapes </script> and quotes.
  return `<script>window.__BRAND__=${JSON.stringify(ctx)};</script>`;
}
