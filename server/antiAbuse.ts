/**
 * Anti-abuse helpers for public checkout endpoints.
 *
 * These endpoints (IELTS Mock Test, Aptitude Pro) accept guest checkouts —
 * the buyer just fills a form, we create a Xendit invoice + send a payment
 * link email. Great UX for real students, terrible if left undefended:
 *
 *   - Bots trivially POST garbage names/emails to burn our Resend quota
 *   - Attackers probe for SQL injection / XSS in the name field
 *   - Card fraud reconnaissance triggers Xendit invoices with fake data
 *   - Sending marketing emails to random business addresses damages our
 *     Resend sender reputation
 *
 * Real signal that triggered building this: a Resend inbox showed emails
 * going to `e-shop@mc2saintbarth.com` (an Italian luxury swimwear brand's
 * business inbox) with recipient name "cEdepXtBIMScnHmgdQRI" — obvious
 * bot recon.
 *
 * These checks are intentionally conservative — false positives block
 * real customers, so err on the side of letting borderline cases through
 * and rely on the IP rate limit as a second net.
 */

// ── Role-based email addresses that no real buyer would ever use ────────
// If we see these prefixes, it's ~always a business inbox being scraped
// by a bot to test our endpoint. Real students use personal Gmail /
// Yahoo / school addresses.
const ROLE_BASED_LOCAL_PARTS = new Set([
  "admin", "administrator", "info", "contact", "sales", "support",
  "noreply", "no-reply", "hello", "hi", "team", "office", "help",
  "webmaster", "postmaster", "abuse", "root", "mail", "email",
  "marketing", "billing", "accounts", "accounting", "finance",
  "hr", "jobs", "careers", "press", "media", "pr", "legal",
  "e-shop", "eshop", "shop", "store", "orders", "order",
  "customer-service", "customerservice", "cs", "service",
  "newsletter", "notifications", "notify", "system",
]);

/**
 * Returns true if the email's local-part is a business/role-based inbox.
 * These get rejected because no genuine student uses `admin@` as their
 * personal email.
 */
export function isRoleBasedEmail(email: string): boolean {
  const at = email.indexOf("@");
  if (at <= 0) return false;
  const local = email.slice(0, at).toLowerCase().trim();
  if (ROLE_BASED_LOCAL_PARTS.has(local)) return true;
  // Hyphenated variants: e-shop, e-commerce, no-reply, do-not-reply, etc.
  const bare = local.replace(/[-_.]/g, "");
  return ROLE_BASED_LOCAL_PARTS.has(bare);
}

/**
 * Detect names that look like machine-generated garbage. Real names have
 * clear vowel/consonant alternation and are typically 2-40 chars. Bot
 * names look like `cEdepXtBIMScnHmgdQRI` — random casing, low vowel
 * ratio, unusual length.
 *
 * Threshold tuned to avoid rejecting legit Indonesian names like
 * "Ni Made" or "Muhamad Rizky" (which have healthy vowel ratios).
 */
export function looksLikeGibberishName(name: string): boolean {
  const s = name.trim();
  if (s.length < 2) return false; // covered by min length elsewhere
  if (s.length > 40) return true; // real names rarely exceed 40 chars

  // Ignore whitespace + apostrophes for the entropy check
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return false; // too short to judge, let other checks catch it

  // Vowel ratio — real names in Indonesian / English hover around 35-45%
  const vowels = (letters.match(/[aeiouAEIOU]/g) || []).length;
  const vowelRatio = vowels / letters.length;
  if (vowelRatio < 0.15) return true; // "cEdepXtBIMScnHmgdQRI" has ~15% vowels
  if (vowelRatio > 0.75) return true; // "aeioueeeiaa" — also fake

  // Case-flip density — real names capitalize the first letter of each
  // word only. Bots often produce mixed case throughout: aBcDeF.
  // Count lowercase→uppercase transitions inside the same word.
  let flips = 0;
  for (let i = 1; i < letters.length; i++) {
    const prev = letters[i - 1];
    const cur = letters[i];
    if (/[a-z]/.test(prev) && /[A-Z]/.test(cur)) flips++;
  }
  // "cEdepXtBIMScnHmgdQRI" has 6+ mid-word case flips → clearly fake.
  // "NiMade" would have 1 (which is still borderline). Threshold: 3+.
  if (flips >= 3) return true;

  return false;
}

// ── IP-based rate limiting (in-memory, LRU) ───────────────────────────
// Public checkout endpoints get max 5 requests per IP per hour. Simple
// sliding window in memory — good enough for Railway single-instance;
// upgrade to Redis when we scale horizontally.
type WindowEntry = { count: number; firstAt: number };
const rateWindows = new Map<string, WindowEntry>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT = 5;                   // 5 checkouts per IP per hour
const LRU_MAX = 5000;                   // cap memory

export interface RateCheckResult {
  allowed: boolean;
  retryAfterSec?: number;
  count: number;
}

/**
 * Sliding-window rate limit per IP. Real students rarely retry a
 * checkout more than 2-3 times. Bots hit 100s per hour → hard cap
 * at 5/hr blocks them without impacting genuine buyers.
 */
export function checkIpRateLimit(ip: string | null | undefined): RateCheckResult {
  if (!ip) return { allowed: true, count: 0 }; // no IP known, don't block
  const now = Date.now();
  const entry = rateWindows.get(ip);
  if (!entry || now - entry.firstAt > RATE_WINDOW_MS) {
    // Fresh window
    rateWindows.set(ip, { count: 1, firstAt: now });
    // LRU eviction — keep the map bounded
    if (rateWindows.size > LRU_MAX) {
      const first = rateWindows.keys().next().value;
      if (first) rateWindows.delete(first);
    }
    return { allowed: true, count: 1 };
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT) {
    const retryAfterSec = Math.ceil((entry.firstAt + RATE_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec, count: entry.count };
  }
  return { allowed: true, count: entry.count };
}

/**
 * Extract the client IP from a request. Trusts x-forwarded-for since
 * we're behind Railway's proxy; also trusts x-real-ip and cf-connecting-ip
 * for Cloudflare (which we'll be behind once SpecTa OS ships).
 */
export function extractClientIp(headers: Record<string, string | string[] | undefined>): string | null {
  const pick = (v: string | string[] | undefined): string | null => {
    if (!v) return null;
    const raw = Array.isArray(v) ? v[0] : v;
    // x-forwarded-for is a comma-separated chain; the leftmost is the client.
    return String(raw).split(",")[0]?.trim() || null;
  };
  return (
    pick(headers["cf-connecting-ip"]) ||
    pick(headers["x-real-ip"]) ||
    pick(headers["x-forwarded-for"]) ||
    null
  );
}

/**
 * Full validation for a public guest-checkout request. Returns null if
 * OK, or a { code, message } shape that maps to a tRPC error. Kept as
 * a single call so every endpoint stays consistent.
 */
export function validateGuestCheckout(input: {
  customerName: string;
  customerEmail: string;
  ip?: string | null;
}): { code: "TOO_MANY_REQUESTS" | "BAD_REQUEST"; message: string } | null {
  // 1. Role-based email
  if (isRoleBasedEmail(input.customerEmail)) {
    console.warn(`[antiAbuse] rejected role-based email: ${input.customerEmail} from ip=${input.ip}`);
    return { code: "BAD_REQUEST", message: "Please use your personal email address." };
  }
  // 2. Gibberish name
  if (looksLikeGibberishName(input.customerName)) {
    console.warn(`[antiAbuse] rejected gibberish name: "${input.customerName}" from ip=${input.ip}`);
    return { code: "BAD_REQUEST", message: "Please enter your full name." };
  }
  // 3. IP rate limit
  const rl = checkIpRateLimit(input.ip);
  if (!rl.allowed) {
    console.warn(`[antiAbuse] rate-limited ip=${input.ip} count=${rl.count}`);
    return {
      code: "TOO_MANY_REQUESTS",
      message: `Too many attempts. Please try again in ${Math.ceil((rl.retryAfterSec || 60) / 60)} minutes.`,
    };
  }
  return null;
}
