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
import { ieltsMockAttempts, ieltsMockTests, users } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

function appBaseUrl(): string {
  const u = ENV.appUrl?.replace(/\/+$/, "") || "https://specta-education-production.up.railway.app";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

/**
 * Email the buyer a direct link to start their test. Sent when payment is
 * confirmed, so the link reaches them even if the post-payment browser
 * redirect fails. Best-effort (never throws).
 */
async function sendTestReadyEmail(
  toEmail: string,
  toName: string,
  attemptToken: string
): Promise<void> {
  if (!ENV.resendApiKey || !toEmail) return;
  const takeUrl = `${appBaseUrl()}/ielts/mock-test/take/${attemptToken}`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:linear-gradient(135deg,#1d4ed8,#4338ca,#7c3aed);padding:28px 24px;color:#fff;">
    <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.85;">SpecTa IELTS Mock Test</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;">Your test is ready 🎉</div>
  </div>
  <div style="padding:24px;color:#0f172a;">
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(toName)},</p>
    <p style="margin:0 0 18px 0;color:#475569;line-height:1.6;">Your payment is confirmed and your IELTS Mock Test is unlocked. Click below to begin — set aside about 2 hours 45 minutes and find a quiet space with your microphone ready.</p>
    <div style="margin:4px 0 18px 0;"><a href="${takeUrl}" style="display:inline-block;background:#4338ca;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:8px;">Start my test</a></div>
    <p style="margin:0 0 8px 0;color:#475569;line-height:1.6;font-size:13px;">Or open this link:<br/><a href="${takeUrl}" style="color:#4338ca;">${takeUrl}</a></p>
    <p style="margin:16px 0 0 0;font-size:13px;color:#94a3b8;">Tip: you can pause between sections, but each section is timed once it begins. Your band-score report is emailed the moment you finish.</p>
  </div>
  <div style="padding:14px 24px;background:#f1f5f9;color:#64748b;font-size:11px;line-height:1.5;">
    This is a SpecTa Education practice mock test. It is not an official IELTS score and is not affiliated with British Council, IDP, or Cambridge Assessment English.
  </div>
</div>
</body></html>`;
  const text = `Hi ${toName},

Your payment is confirmed and your IELTS Mock Test is unlocked.

Start your test here:
${takeUrl}

Set aside ~2h45m, find a quiet space, and have your microphone ready. Your band-score report is emailed the moment you finish.

— SpecTa Education`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.smtpFrom,
        to: toEmail,
        subject: "Your SpecTa IELTS Mock Test is ready — start here",
        html,
        text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[IELTS Mock] test-ready email failed (${res.status}): ${detail}`);
    }
  } catch (err) {
    console.warn("[IELTS Mock] test-ready email error:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  let baseUrl =
    params.appUrl?.replace(/\/+$/, "") ||
    ENV.appUrl?.replace(/\/+$/, "") ||
    "https://specta-education-production.up.railway.app";
  // Xendit requires an ABSOLUTE URL (with scheme). If APP_URL was set without
  // "https://", Xendit treats our domain as a path on checkout.xendit.co and
  // the post-payment redirect 404s — so force a scheme here.
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;

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
  const wasAlreadyPaid = !!attempt.paidAt;

  if (!wasAlreadyPaid) {
    await db
      .update(ieltsMockAttempts)
      .set({ paidAt: new Date(), status: "ready" })
      .where(eq(ieltsMockAttempts.id, attempt.id));

    // Best-effort notify owner. Don't block the webhook on this.
    notifyOwner({
      title: `🎓 New IELTS Mock Test purchase`,
      content: `Attempt ${attempt.attemptToken} just unlocked. Xendit invoice: ${xenditInvoiceId}. External ID: ${externalId}.`,
    }).catch(err => console.warn("[IELTS Mock] notifyOwner failed:", err));
  }

  // Email the buyer their start link (every paid confirmation, so a Xendit
  // webhook re-send also re-delivers the link). Best-effort.
  try {
    const [u] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, attempt.userId))
      .limit(1);
    if (u?.email) {
      await sendTestReadyEmail(u.email, u.name ?? "there", attempt.attemptToken);
    }
  } catch (err) {
    console.warn("[IELTS Mock] could not send test-ready email:", err);
  }

  return { alreadyProcessed: wasAlreadyPaid, attemptToken: attempt.attemptToken };
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
