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

/** SpecTa logo (self-hosted on R2; absolute URL for email clients). */
function logoUrl(): string {
  return `${appBaseUrl()}/files/migrated/QxrYSewOYzAuPIEN.jpeg`;
}

/** A bulletproof, email-client-safe CTA button. */
function ctaButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;"><tr><td style="border-radius:10px;background:linear-gradient(135deg,#2563eb,#4338ca);"><a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:10px;">${label}</a></td></tr></table>`;
}

/** Branded email shell: white logo header → gradient title band → body → footer. */
function brandedEmail(opts: { badge: string; title: string; bodyHtml: string }): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;">
<div style="max-width:600px;margin:0 auto;padding:24px 12px;">
  <div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
    <div style="text-align:center;padding:22px 24px 6px 24px;">
      <img src="${logoUrl()}" alt="SpecTa Education" height="46" style="height:46px;object-fit:contain;" />
    </div>
    <div style="background:linear-gradient(135deg,#1d4ed8,#4338ca,#7c3aed);padding:22px 24px;color:#ffffff;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">${opts.badge}</div>
      <div style="font-size:22px;font-weight:800;margin-top:4px;line-height:1.25;">${opts.title}</div>
    </div>
    <div style="padding:24px;color:#0f172a;">${opts.bodyHtml}</div>
    <div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:11px;line-height:1.5;border-top:1px solid #eef2f7;">
      SpecTa Education · Jakarta · A practice mock test — not an official IELTS score, and not affiliated with British Council, IDP, or Cambridge Assessment English.
    </div>
  </div>
</div>
</body></html>`;
}

async function sendBrandedEmail(toEmail: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!ENV.resendApiKey || !toEmail) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${ENV.resendApiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: ENV.smtpFrom, to: toEmail, subject, html, text }),
    });
    if (!res.ok) {
      console.warn(`[IELTS Mock] email failed (${res.status}): ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[IELTS Mock] email error:", err);
    return false;
  }
}

/**
 * Email the buyer a branded payment link at checkout (also our follow-up /
 * abandoned-cart touchpoint). Sent to the email entered on the form.
 */
async function sendPaymentEmail(
  toEmail: string,
  toName: string,
  invoiceUrl: string,
  testTypeLabel: string
): Promise<void> {
  const body = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(toName || "there")},</p>
    <p style="margin:0 0 16px 0;color:#475569;line-height:1.6;">You're one step away from your <strong>IELTS Mock Test (${escapeHtml(testTypeLabel)})</strong> — a full 4-skill test, AI-graded against the official IELTS band scale, with a personalised report sent straight to you.</p>
    <p style="margin:0 0 2px 0;color:#0f172a;font-weight:800;font-size:20px;">Rp 79.000 <span style="font-weight:400;font-size:13px;color:#64748b;">· one-off, no subscription</span></p>
    ${ctaButton(invoiceUrl, "Complete my payment →")}
    <ul style="margin:0 0 14px 0;padding-left:18px;color:#475569;font-size:14px;line-height:1.8;">
      <li>All 4 skills — Listening, Reading, Writing &amp; Speaking (~2h 45m)</li>
      <li>AI-graded to the official IELTS band scale</li>
      <li>Branded band-score report emailed the moment you finish</li>
    </ul>
    <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">This payment link is valid for 24 hours. If the button doesn't work, copy this link:<br/><a href="${invoiceUrl}" style="color:#4338ca;">${invoiceUrl}</a></p>`;
  const text = `Hi ${toName || "there"},

You're one step away from your IELTS Mock Test (${testTypeLabel}) — Rp 79.000, one-off.
All 4 skills, AI-graded to the IELTS band scale, with a personalised report.

Complete your payment here (valid 24 hours):
${invoiceUrl}

— SpecTa Education`;
  await sendBrandedEmail(
    toEmail,
    "Complete your IELTS Mock Test purchase — SpecTa Education",
    brandedEmail({ badge: "IELTS Mock Test", title: "Complete your purchase", bodyHtml: body }),
    text
  );
}

/**
 * Email the buyer a direct link to start their test. Sent when payment is
 * confirmed, so the link reaches them even if the post-payment browser
 * redirect fails. Best-effort.
 */
async function sendTestReadyEmail(
  toEmail: string,
  toName: string,
  attemptToken: string
): Promise<void> {
  const takeUrl = `${appBaseUrl()}/ielts/mock-test/take/${attemptToken}`;
  const body = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(toName || "there")},</p>
    <p style="margin:0 0 18px 0;color:#475569;line-height:1.6;">Your payment is confirmed and your IELTS Mock Test is <strong>unlocked</strong>! Click below to begin — set aside about <strong>2 hours 45 minutes</strong>, find a quiet space, and have your microphone ready.</p>
    ${ctaButton(takeUrl, "Start my test →")}
    <p style="margin:0 0 8px 0;color:#475569;line-height:1.6;font-size:13px;">If the button doesn't work, open this link:<br/><a href="${takeUrl}" style="color:#4338ca;">${takeUrl}</a></p>
    <p style="margin:16px 0 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">Each section is timed once it begins. Your band-score report is emailed the moment you finish.</p>`;
  const text = `Hi ${toName || "there"},

Your payment is confirmed and your IELTS Mock Test is unlocked.

Start your test here:
${takeUrl}

Set aside ~2h45m, find a quiet space, and have your microphone ready. Your band-score report is emailed the moment you finish.

— SpecTa Education`;
  await sendBrandedEmail(
    toEmail,
    "Your SpecTa IELTS Mock Test is ready — start here",
    brandedEmail({ badge: "IELTS Mock Test", title: "Your test is ready 🎉", bodyHtml: body }),
    text
  );
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
  /**
   * Owning account. Optional — this is a GUEST checkout: buyers don't need an
   * account. When omitted we look up (or create) a lightweight user keyed by
   * the form email so the attempt always has an owner row, while the buyer
   * never sees a login wall. The secret attemptToken (emailed to them) is what
   * authorizes taking the test.
   */
  userId?: number;
  testType: "academic" | "general";
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  appUrl?: string; // override APP_URL if needed
  /**
   * Marketing attribution captured from the specta_attr cookie at checkout.
   * Written onto the attempt row so the Xendit webhook can upload an offline
   * conversion to Google Ads on payment (avoiding the browser-only pixel gap).
   */
  attribution?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    gclid?: string;
  };
};

/**
 * Guest checkout: find an existing account by the form email, or create a
 * password-less placeholder user to own the attempt. Returns the user id.
 */
async function resolveGuestUserId(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  email: string,
  name: string
): Promise<number> {
  const emailLower = email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
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
  });
  const newId = (insertResult as any)[0]?.insertId as number;
  if (!newId) throw new Error("Failed to create guest user for checkout");
  return newId;
}

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

  // Guest checkout: ensure the attempt has an owning user row even when the
  // buyer isn't logged in (resolve by email / create a placeholder).
  const ownerUserId =
    params.userId ??
    (await resolveGuestUserId(db, params.customerEmail, params.customerName));

  // Reserve the attempt row before hitting Xendit so we can recover even if
  // we crash between Xendit and DB.
  const insertResult = await db.insert(ieltsMockAttempts).values({
    userId: ownerUserId,
    testId: test.id,
    attemptToken,
    paymentRef: externalId,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    status: "awaiting_payment",
    // Attribution — see CreateIeltsMockInvoiceParams docs. Truncated to column
    // widths at write time to survive extra-long UTM tags from partner links.
    gclid: (params.attribution?.gclid || null)?.slice(0, 512) ?? null,
    utmSource: (params.attribution?.utmSource || null)?.slice(0, 120) ?? null,
    utmMedium: (params.attribution?.utmMedium || null)?.slice(0, 120) ?? null,
    utmCampaign: (params.attribution?.utmCampaign || null)?.slice(0, 160) ?? null,
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
    // Disable Xendit's own customer emails (their "complete your order" /
    // receipt templates were rendering as raw HTML in some mail clients). We
    // send our own branded emails instead (the "Start my test" link on
    // payment, and the band-score report when finished). Empty arrays = no
    // Xendit notification for any event.
    customer_notification_preference: {
      invoice_created: [],
      invoice_reminder: [],
      invoice_paid: [],
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

  // Send our own branded "Complete your payment" email to the form email
  // (Xendit's own emails are disabled). Best-effort — never blocks checkout.
  sendPaymentEmail(
    params.customerEmail,
    params.customerName,
    invoice.invoice_url,
    test.testType === "academic" ? "Academic" : "General Training"
  ).catch(err => console.warn("[IELTS Mock] payment email error:", err));

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
 * Admin-side: issue a COMPLIMENTARY ready-to-take Mock Test attempt to a
 * student email and send the login-free "Start my test" link — e.g. for a
 * paying customer whose old attempt can no longer be used. No payment, no
 * login wall; the emailed attemptToken is the credential.
 */
export async function sendComplimentaryMockTest(params: {
  email: string;
  name?: string;
  testType?: "academic" | "general";
}): Promise<{ attemptToken: string; testCode: string; testTitle: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const testType = params.testType ?? "academic";
  const test = await pickRandomPublishedTest(testType);
  if (!test) throw new Error(`No published ${testType} test is available yet.`);

  const name = (params.name || "").trim() || "there";
  const attemptToken = nanoid(24);
  const ownerUserId = await resolveGuestUserId(db, params.email, name);

  await db.insert(ieltsMockAttempts).values({
    userId: ownerUserId,
    testId: test.id,
    attemptToken,
    paymentRef: `COMP-${nanoid(8)}`,
    customerName: name,
    customerEmail: params.email,
    paidAt: new Date(),
    status: "ready",
  });

  await sendTestReadyEmail(params.email, name, attemptToken);
  return { attemptToken, testCode: test.code, testTitle: test.title };
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
  // webhook re-send also re-delivers the link). Best-effort. Prefer the email
  // they entered on the purchase form; fall back to their account email.
  try {
    const [u] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, attempt.userId))
      .limit(1);
    const toEmail = attempt.customerEmail || u?.email;
    const toName = attempt.customerName || u?.name || "there";
    if (toEmail) {
      await sendTestReadyEmail(toEmail, toName, attempt.attemptToken);
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
