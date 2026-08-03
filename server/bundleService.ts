/**
 * IELTS Bundle: Mock Test + AI Tutor 30 days + 1 free Voice Clone
 *
 * Single Xendit invoice (Rp 299k) that creates TWO downstream records:
 *   1. ieltsMockAttempts row (status = "awaiting_payment")
 *   2. tutor_subscriptions row (status = "pending")
 *
 * Both records share the SAME external_id (BUNDLE-xxx) — the Xendit webhook
 * queries both tables by that ID and activates both on payment.
 *
 * Value math:
 *   Mock (Rp 79k) + Tutor 30d (Rp 249k) + Voice Clone (Rp 49k) = Rp 377k standalone
 *   Bundle = Rp 299k = save Rp 78k (~21%)
 *
 * NOTE: Voice Clone product is not yet built — the bundle flags
 * `includesFreeVoiceClone = true` on the mock attempt for later
 * consumption when Voice Clone ships.
 */

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { ieltsMockAttempts, ieltsMockTests, leads, tutorSubscriptions, users } from "../drizzle/schema";
import { getDb, createLead, createTutorSubscription } from "./db";
import { ENV } from "./_core/env";
import {
  BUNDLE_PLANS, type BundlePlan,
  bundleExternalId, createBundleInvoice,
} from "./xenditService";

export type CreateBundleParams = {
  userId?: number;
  testType: "academic" | "general";
  plan: BundlePlan;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  attribution?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    gclid?: string;
  };
};

export type CreateBundleResult = {
  invoiceUrl: string;
  externalId: string;
  attemptToken: string;
  attemptId: number;
  tutorSubscriptionId: number;
  leadId: number;
};

/**
 * Pick a random published IELTS test of the given type. Copied from
 * ieltsMockService.ts to avoid circular imports (bundleService is imported
 * from ieltsRouter which also imports ieltsMockService).
 */
async function pickRandomPublishedTest(testType: "academic" | "general"): Promise<{ id: number } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ id: ieltsMockTests.id })
    .from(ieltsMockTests)
    .where(eq(ieltsMockTests.testType, testType))
    .limit(50);
  const published = rows.filter(r => r); // filter can be extended when we add status field
  if (!published.length) return null;
  return published[Math.floor(Math.random() * published.length)];
}

/**
 * Upsert a lead by email so we can attach the Tutor subscription. If a
 * lead already exists for this email, return its ID; otherwise create one.
 * Uses the customer name from the checkout form + captured attribution.
 */
async function upsertLeadForBundle(
  email: string,
  name: string,
  phone: string | undefined,
  attribution: CreateBundleParams["attribution"],
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const emailLower = email.trim().toLowerCase();

  const [existing] = await db.select({ id: leads.id })
    .from(leads)
    .where(eq(leads.studentEmail, emailLower))
    .limit(1);
  if (existing) return existing.id;

  const created = await createLead({
    studentName: name.trim() || emailLower.split("@")[0], // schema requires notNull
    studentEmail: emailLower,
    studentPhone: phone?.trim() || null,
    gclid: attribution?.gclid?.slice(0, 512) ?? null,
    utmSource: attribution?.utmSource?.slice(0, 120) ?? null,
    utmMedium: attribution?.utmMedium?.slice(0, 120) ?? null,
    utmCampaign: attribution?.utmCampaign?.slice(0, 160) ?? null,
  } as any);
  if (!created?.id) throw new Error("Failed to create lead for bundle");
  return created.id;
}

/**
 * Guest user upsert — mirrors ieltsMockService.resolveGuestUserId so the
 * mock attempt has an owning user row even for guest checkouts.
 */
async function upsertGuestUser(email: string, name: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const emailLower = email.trim().toLowerCase();
  const [existing] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.emailLower, emailLower))
    .limit(1);
  if (existing) return existing.id;
  const insertResult = await db.insert(users).values({
    openId: `guest:${nanoid(24)}`,
    name: name.trim() || null,
    email: email.trim(),
    emailLower,
    loginMethod: "guest",
    role: "user",
  } as any);
  const newId = (insertResult as any)[0]?.insertId as number;
  if (!newId) throw new Error("Failed to create guest user for bundle");
  return newId;
}

/**
 * Create everything a bundle purchase needs: Mock attempt, Tutor subscription,
 * lead + user records, and a single Xendit invoice tying them together.
 */
export async function createIeltsBundleCheckout(
  params: CreateBundleParams,
): Promise<CreateBundleResult> {
  if (!ENV.xenditSecretKey) throw new Error("XENDIT_SECRET_KEY is not configured");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const plan = BUNDLE_PLANS[params.plan];
  if (!plan) throw new Error(`Unknown bundle plan: ${params.plan}`);

  const test = await pickRandomPublishedTest(params.testType);
  if (!test) throw new Error(`No published ${params.testType} tests available. Please try again later.`);

  // 1. Ensure user + lead records exist (Mock needs user, Tutor needs lead)
  const userId = params.userId ?? (await upsertGuestUser(params.customerEmail, params.customerName));
  const leadId = await upsertLeadForBundle(
    params.customerEmail,
    params.customerName,
    params.customerPhone,
    params.attribution,
  );

  // 2. Single external ID used for BOTH downstream records + Xendit invoice.
  const externalId = bundleExternalId();
  const attemptToken = nanoid(24);

  // 3. Create the Mock attempt (awaiting payment)
  const attemptInsert = await db.insert(ieltsMockAttempts).values({
    userId,
    testId: test.id,
    attemptToken,
    paymentRef: externalId, // <-- shared with Tutor sub via xenditInvoiceId
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    status: "awaiting_payment",
    // Attribution — same fields as the standalone Mock checkout
    gclid: (params.attribution?.gclid || null)?.slice(0, 512) ?? null,
    utmSource: (params.attribution?.utmSource || null)?.slice(0, 120) ?? null,
    utmMedium: (params.attribution?.utmMedium || null)?.slice(0, 120) ?? null,
    utmCampaign: (params.attribution?.utmCampaign || null)?.slice(0, 160) ?? null,
    // Bundle flag so post-completion flow knows the buyer is entitled to a
    // free Voice Clone session (redeemable when the Voice Clone product ships).
    bundleIncludesVoiceClone: plan.includesVoiceClone,
  } as any);
  const attemptId = (attemptInsert as any)[0]?.insertId as number;
  if (!attemptId) throw new Error("Failed to reserve mock attempt row");

  // 4. Create the Tutor subscription (pending)
  const tutorSub = await createTutorSubscription({
    leadId,
    plan: "m1", // Bundle always includes 30-day Tutor plan
    status: "pending",
    amount: String(249000) as any,
    currency: "IDR",
    xenditInvoiceId: externalId, // <-- same external ID as Mock attempt
    gclid: params.attribution?.gclid?.slice(0, 512) ?? null,
    utmSource: params.attribution?.utmSource?.slice(0, 120) ?? null,
    utmMedium: params.attribution?.utmMedium?.slice(0, 120) ?? null,
    utmCampaign: params.attribution?.utmCampaign?.slice(0, 160) ?? null,
  } as any);
  if (!tutorSub?.id) throw new Error("Failed to create pending tutor subscription");

  // 5. Create the single Xendit invoice for the bundle price
  const baseUrl = (ENV.appUrl || "https://www.spectaeducation.com").replace(/\/+$/, "");
  const successUrl = `${baseUrl}/ielts/mock-test/success?attempt=${attemptToken}&bundle=1`;
  const failureUrl = `${baseUrl}/ielts/mock-test?failed=1&bundle=1`;

  const invoice = await createBundleInvoice({
    externalId,
    plan: params.plan,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    successRedirectUrl: successUrl,
    failureRedirectUrl: failureUrl,
  });

  return {
    invoiceUrl: invoice.invoice_url,
    externalId,
    attemptToken,
    attemptId,
    tutorSubscriptionId: tutorSub.id,
    leadId,
  };
}
