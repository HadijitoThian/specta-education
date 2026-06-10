/**
 * IELTS Mock Test purchase + payment-completion plumbing.
 *
 * Flow:
 *   1. Student fills purchase form on /ielts/mock-test.
 *   2. server/ieltsRouter.ts calls `createIeltsMockInvoice()` →
 *      - reserves an attempt row (status: awaiting_payment)
 *      - generates a unique externalId prefixed IELTS-MOCK-
 *      - hits Xendit /v2/invoices
 *      - returns the hosted Xendit invoice URL
 *   3. Student pays at Xendit.
 *   4. Xendit POSTs to /api/xendit/webhook (handled in xenditWebhook.ts).
 *      The webhook detects the IELTS-MOCK- prefix and calls
 *      `markIeltsAttemptPaid()` which:
 *      - updates the attempt row to status: ready, sets paidAt
 *      - sends a "your test is ready" email via Resend
 *      - notifies the owner
 */

import crypto from "crypto";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { ieltsMockAttempts, ieltsMockTests } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

const XENDIT_API_BASE = "https://api.xendit.co";
export const IELTS_MOCK_PRICE = 79000; // IDR
const IELTS_EXTERNAL_PREFIX = "IELTS-MOCK-";

export function isIeltsMockExternalId(externalId: string | null | undefined): boolean {
  return typeof externalId === "string" && externalId.startsWith(IELTS_EXTERNAL_PREFIX);
}

function generateExternalId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString("hex");
  return `${IELTS_EXTERNAL_PREFIX}${timestamp}-${random}`;
}

/**
 * Pick a random published test of the requested type. Done at attempt-
 * creation time so students can't easily share which specific test they
 * got. Returns null if no test of that type is available.
 */
async function pickRandomPublishedTest(
  testType: "academic" | "general"
): Promise<{ id: number; code: string; title: string; testType: "academic" | "general" } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: ieltsMockTests.id,
      code: ieltsMockTests.code,
      title: ieltsMockTests.title,
      testType: ieltsMockTests.testType,
    })
    .from(ieltsMockTests)
    .where(
      and(eq(ieltsMockTests.isPublished, true), eq(ieltsMockTests.testType, testType))
    );
  if (rows.length === 0) return null;
  return rows[Math.floor(Math.random() * rows.length)];
}

export type CreateIeltsMockInvoiceParams = {
  userId: number;
  testType: "academic" | "general";
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  appUrl?: string; // override APP_URL if needed
};

export type CreateIeltsMockInvoiceResult = {
  invoiceUrl: string;
  invoiceId: string;
  externalId: string;
  attemptToken: string;
  attemptId: number;
  testId: number;
  testCode: string;
  testTitle: string;
};

export async function createIeltsMockInvoice(
  params: CreateIeltsMockInvoiceParams
): Promise<CreateIeltsMockInvoiceResult> {
  if (!ENV.xenditSecretKey) {
    throw new Error("XENDIT_SECRET_KEY is not configured");
  }
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const test = await pickRandomPublishedTest(params.testType);
  if (!test) {
    throw new Error(
      `No published ${params.testType} tests available yet. Please try again later.`
    );
  }

  const attemptToken = nanoid(24);
  const externalId = generateExternalId();

  // Reserve the attempt row before hitting Xendit so we can recover even if
  // we crash between Xendit and DB.
  const insertResult = await db.insert(ieltsMockAttempts).values({
    userId: params.userId,
    testId: test.id,
    attemptToken,
    paymentRef: externalId,
    status: "awaiting_payment",
  });
  const attemptId = (insertResult as any)[0]?.insertId as number;
  if (!attemptId) {
    throw new Error("Failed to reserve attempt row");
  }

  const baseUrl =
    params.appUrl?.replace(/\/+$/, "") ||
    ENV.appUrl?.replace(/\/+$/, "") ||
    "https://specta-education-production.up.railway.app";

  const successUrl = `${baseUrl}/ielts/mock-test/success?attempt=${attemptToken}`;
  const failureUrl = `${baseUrl}/ielts/mock-test?failed=1`;

  const body: Record<string, unknown> = {
    external_id: externalId,
    amount: IELTS_MOCK_PRICE,
    currency: "IDR",
    description: `SpecTa IELTS Mock Test (${test.testType === "academic" ? "Academic" : "General Training"}) — Practice mock test, instant AI-graded result.`,
    customer: {
      given_names: params.customerName,
      email: params.customerEmail,
      ...(params.customerPhone ? { mobile_number: params.customerPhone } : {}),
    },
    customer_notification_preference: {
      invoice_created: ["email"],
      invoice_reminder: ["email"],
      invoice_paid: ["email"],
    },
    invoice_duration: 86400,
    success_redirect_url: successUrl,
    failure_redirect_url: failureUrl,
  };

  const response = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(ENV.xenditSecretKey + ":").toString("base64")}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error(
      "[IELTS Mock] Xendit invoice failed",
      response.status,
      errText
    );
    // Mark the attempt as abandoned so we don't leak rows on retries.
    await db
      .update(ieltsMockAttempts)
      .set({ status: "abandoned" })
      .where(eq(ieltsMockAttempts.id, attemptId));
    throw new Error(`Xendit invoice creation failed (${response.status})`);
  }

  const invoice = (await response.json()) as {
    id: string;
    invoice_url: string;
    external_id: string;
  };

  return {
    invoiceUrl: invoice.invoice_url,
    invoiceId: invoice.id,
    externalId,
    attemptToken,
    attemptId,
    testId: test.id,
    testCode: test.code,
    testTitle: test.title,
  };
}

/**
 * Webhook-side: marks the attempt as paid and ready to take. Called from
 * server/xenditWebhook.ts when an IELTS-MOCK- external_id pays.
 */
export async function markIeltsAttemptPaid(
  externalId: string,
  xenditInvoiceId: string
): Promise<{ alreadyProcessed: boolean; attemptToken?: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const [attempt] = await db
    .select()
    .from(ieltsMockAttempts)
    .where(eq(ieltsMockAttempts.paymentRef, externalId))
    .limit(1);
  if (!attempt) {
    console.error(`[IELTS Mock] No attempt found for ${externalId}`);
    return null;
  }
  if (attempt.paidAt) {
    return { alreadyProcessed: true, attemptToken: attempt.attemptToken };
  }

  await db
    .update(ieltsMockAttempts)
    .set({
      paidAt: new Date(),
      status: "ready",
    })
    .where(eq(ieltsMockAttempts.id, attempt.id));

  // Best-effort notify owner. Don't block the webhook on this.
  notifyOwner({
    title: `🎓 New IELTS Mock Test purchase`,
    content: `Attempt ${attempt.attemptToken} just unlocked. Xendit invoice: ${xenditInvoiceId}. External ID: ${externalId}.`,
  }).catch(err => console.warn("[IELTS Mock] notifyOwner failed:", err));

  return { alreadyProcessed: false, attemptToken: attempt.attemptToken };
}

/** Mark expired/failed payment so the attempt row doesn't dangle forever. */
export async function markIeltsAttemptFailed(externalId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(ieltsMockAttempts)
    .set({ status: "abandoned" })
    .where(
      and(
        eq(ieltsMockAttempts.paymentRef, externalId),
        sql`paidAt IS NULL`
      )
    );
}
