import { ENV } from "./_core/env";
import crypto from "crypto";

const XENDIT_API_BASE = "https://api.xendit.co";
const PRO_TEST_PRICE = 79000; // Rp 79.000
const PRO_TEST_DISCOUNT_PRICE = 59000; // Rp 59.000 (24-hour discount)

interface CreateInvoiceParams {
  externalId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description?: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  useDiscountPrice?: boolean;
}

interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  invoice_url: string;
  status: string;
  amount: number;
  expiry_date: string;
}

/**
 * Create a Xendit invoice for Tes Bakat AI Pro purchase
 */
export async function createProTestInvoice(params: CreateInvoiceParams): Promise<XenditInvoiceResponse> {
  const { externalId, customerName, customerEmail, customerPhone, description, successRedirectUrl, failureRedirectUrl } = params;

  const body: Record<string, unknown> = {
    external_id: externalId,
    amount: params.useDiscountPrice ? PRO_TEST_DISCOUNT_PRICE : PRO_TEST_PRICE,
    currency: "IDR",
    description: description || "Tes Bakat AI Pro - Comprehensive Aptitude Assessment",
    customer: {
      given_names: customerName,
      email: customerEmail,
      ...(customerPhone ? { mobile_number: customerPhone } : {}),
    },
    customer_notification_preference: {
      invoice_created: ["email", "whatsapp"],
      invoice_reminder: ["email"],
      invoice_paid: ["email"],
    },
    invoice_duration: 86400, // 24 hours
    ...(successRedirectUrl ? { success_redirect_url: successRedirectUrl } : {}),
    ...(failureRedirectUrl ? { failure_redirect_url: failureRedirectUrl } : {}),
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
    const error = await response.text();
    console.error("[Xendit] Invoice creation failed:", response.status, error);
    throw new Error(`Xendit invoice creation failed: ${response.status}`);
  }

  return response.json() as Promise<XenditInvoiceResponse>;
}

/**
 * Verify Xendit webhook callback token
 */
export function verifyWebhookToken(headerToken: string): boolean {
  if (!ENV.xenditWebhookToken) return false;
  return headerToken === ENV.xenditWebhookToken;
}

/**
 * Get the pro test price
 */
export function getProTestPrice(discounted?: boolean): number {
  return discounted ? PRO_TEST_DISCOUNT_PRICE : PRO_TEST_PRICE;
}

export function getProTestDiscountPrice(): number {
  return PRO_TEST_DISCOUNT_PRICE;
}

/**
 * Generate a unique external ID for an order
 */
export function generateExternalId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString("hex");
  return `TESBAKAT-PRO-${timestamp}-${random}`;
}

// ── AI IELTS Tutor subscriptions ─────────────────────────────────────────────
export const TUTOR_PLANS = {
  w2: { amount: 149000, days: 14, label: "AI IELTS Tutor — 2 Weeks (unlimited)" },
  m1: { amount: 249000, days: 30, label: "AI IELTS Tutor — 1 Month (unlimited)" },
} as const;

// ── IELTS BUNDLE: Mock Test + Tutor 30 days + 1 free Voice Clone ────────────
// Positioning: Rp 79k (Mock) + Rp 249k (Tutor 30d) + Rp 49k (1 Voice Clone) =
// Rp 377k standalone total. Bundle price = Rp 299k. Customer saves Rp 78k
// (~21% discount). Voice Clone flag is stored on the attempt; the actual
// clone session activates when Voice Clone product ships.
export const BUNDLE_PLANS = {
  mock_tutor_m1: {
    amount: 299000,
    tutorDays: 30,
    includesVoiceClone: true,
    label: "IELTS Bundle — Mock Test + AI Tutor 30 hari + 1 Voice Clone",
  },
} as const;
export type BundlePlan = keyof typeof BUNDLE_PLANS;

export function bundleExternalId(): string {
  return `BUNDLE-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}
export function isBundleExternalId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith("BUNDLE-");
}

// ── VOICE CLONE (Rp 49k, post-Mock-Test upsell) ──────────────────────────────
export const VOICE_CLONE_PRICE_IDR = 49000;
export function voiceCloneExternalId(): string {
  return `VOICECLONE-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}
export function isVoiceCloneExternalId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith("VOICECLONE-");
}
export async function createVoiceCloneInvoice(params: {
  externalId: string; customerName: string; customerEmail: string;
  customerPhone?: string; successRedirectUrl?: string; failureRedirectUrl?: string;
}): Promise<XenditInvoiceResponse> {
  const body: Record<string, unknown> = {
    external_id: params.externalId,
    amount: VOICE_CLONE_PRICE_IDR,
    currency: "IDR",
    description: "SpecTa Voice Clone — Hear yourself at Band 8",
    customer: {
      given_names: params.customerName || "Student",
      email: params.customerEmail,
      ...(params.customerPhone ? { mobile_number: params.customerPhone } : {}),
    },
    customer_notification_preference: { invoice_created: ["email"], invoice_paid: ["email"] },
    invoice_duration: 86400, // 24 hours
    ...(params.successRedirectUrl ? { success_redirect_url: params.successRedirectUrl } : {}),
    ...(params.failureRedirectUrl ? { failure_redirect_url: params.failureRedirectUrl } : {}),
  };
  const response = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(ENV.xenditSecretKey + ":").toString("base64")}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Xendit voice-clone invoice creation failed: ${response.status}`);
  return response.json() as Promise<XenditInvoiceResponse>;
}

/**
 * Create a Xendit invoice for the Mock + Tutor bundle (single payment for
 * both products). On the paid webhook, we look up BOTH the linked mock
 * attempt (by paymentRef) AND the tutor subscription (by xenditInvoiceId)
 * using the same external_id, and activate them both.
 */
export async function createBundleInvoice(params: {
  externalId: string; plan: BundlePlan; customerName: string; customerEmail: string;
  customerPhone?: string; successRedirectUrl?: string; failureRedirectUrl?: string;
}): Promise<XenditInvoiceResponse> {
  const plan = BUNDLE_PLANS[params.plan];
  const body: Record<string, unknown> = {
    external_id: params.externalId,
    amount: plan.amount,
    currency: "IDR",
    description: plan.label,
    customer: {
      given_names: params.customerName || "Student",
      email: params.customerEmail,
      ...(params.customerPhone ? { mobile_number: params.customerPhone } : {}),
    },
    customer_notification_preference: { invoice_created: ["email"], invoice_reminder: ["email"], invoice_paid: ["email"] },
    invoice_duration: 259200, // 3 days
    ...(params.successRedirectUrl ? { success_redirect_url: params.successRedirectUrl } : {}),
    ...(params.failureRedirectUrl ? { failure_redirect_url: params.failureRedirectUrl } : {}),
  };
  const response = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(ENV.xenditSecretKey + ":").toString("base64")}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.text();
    console.error("[Xendit] Bundle invoice creation failed:", response.status, error);
    throw new Error(`Xendit bundle invoice creation failed: ${response.status}`);
  }
  return response.json() as Promise<XenditInvoiceResponse>;
}
export type TutorPlan = keyof typeof TUTOR_PLANS;

export function tutorExternalId(): string {
  return `TUTOR-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}
export function isTutorExternalId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith("TUTOR-");
}

export async function createTutorInvoice(params: {
  externalId: string; plan: TutorPlan; customerName: string; customerEmail: string;
  customerPhone?: string; successRedirectUrl?: string; failureRedirectUrl?: string;
}): Promise<XenditInvoiceResponse> {
  const plan = TUTOR_PLANS[params.plan];
  const body: Record<string, unknown> = {
    external_id: params.externalId,
    amount: plan.amount,
    currency: "IDR",
    description: plan.label,
    customer: {
      given_names: params.customerName || "Student",
      email: params.customerEmail,
      ...(params.customerPhone ? { mobile_number: params.customerPhone } : {}),
    },
    customer_notification_preference: { invoice_created: ["email"], invoice_reminder: ["email"], invoice_paid: ["email"] },
    invoice_duration: 259200, // 3 days — gives Xendit's reminder time to fire
    ...(params.successRedirectUrl ? { success_redirect_url: params.successRedirectUrl } : {}),
    ...(params.failureRedirectUrl ? { failure_redirect_url: params.failureRedirectUrl } : {}),
  };
  const response = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(ENV.xenditSecretKey + ":").toString("base64")}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.text();
    console.error("[Xendit] Tutor invoice creation failed:", response.status, error);
    throw new Error(`Xendit invoice creation failed: ${response.status}`);
  }
  return response.json() as Promise<XenditInvoiceResponse>;
}

// ── IGCSE AI Teacher subscription ─────────────────────────────────────────────
//
// Tier ladder (mirrors how Indonesian tuition is sold — 1 hr ≈ 1 session):
//   m1 = 1 subject  · 6 hrs   · Rp 399,000 / month
//   m2 = 2 subjects · 12 hrs  · Rp 699,000 / month
//   m3 = 3 subjects · 18 hrs  · Rp 849,000 / month
// Annual variants get "2 bulan gratis" (pay 10 × monthly):
//   a1 / a2 / a3
// All tiers include best-available voice (ElevenLabs → OpenAI fallback) AND
// the weekly parent progress email. Hours are POOLED across the selected subjects.
export const IGCSE_PLANS = {
  m1: { amount:   399_000, days:  30, hoursLimit:  6, subjectsLimit: 1, label: "SpecTa Tutor IGCSE — 1 Subject · 6 hours / month" },
  m2: { amount:   699_000, days:  30, hoursLimit: 12, subjectsLimit: 2, label: "SpecTa Tutor IGCSE — 2 Subjects · 12 hours / month" },
  m3: { amount:   849_000, days:  30, hoursLimit: 18, subjectsLimit: 3, label: "SpecTa Tutor IGCSE — 3 Subjects · 18 hours / month" },
  a1: { amount: 3_990_000, days: 365, hoursLimit:  6, subjectsLimit: 1, label: "SpecTa Tutor IGCSE — 1 Subject · Annual (12 months for the price of 10)" },
  a2: { amount: 6_990_000, days: 365, hoursLimit: 12, subjectsLimit: 2, label: "SpecTa Tutor IGCSE — 2 Subjects · Annual (12 months for the price of 10)" },
  a3: { amount: 8_490_000, days: 365, hoursLimit: 18, subjectsLimit: 3, label: "SpecTa Tutor IGCSE — 3 Subjects · Annual (12 months for the price of 10)" },
} as const;
export type IgcsePlan = keyof typeof IGCSE_PLANS;

// Per-hour top-up. Charged on top of any active subscription.
export const IGCSE_TOPUP_PRICE = 40_000; // Rp / hour

export function igcseExternalId(): string {
  return `IGCSE-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}
export function isIgcseExternalId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith("IGCSE-");
}

export async function createIgcseInvoice(params: {
  externalId: string; plan: IgcsePlan; customerName: string; customerEmail: string;
  customerPhone?: string; successRedirectUrl?: string; failureRedirectUrl?: string;
}): Promise<XenditInvoiceResponse> {
  const plan = IGCSE_PLANS[params.plan];
  const body: Record<string, unknown> = {
    external_id: params.externalId,
    amount: plan.amount,
    currency: "IDR",
    description: plan.label,
    customer: {
      given_names: params.customerName || "Student",
      email: params.customerEmail,
      ...(params.customerPhone ? { mobile_number: params.customerPhone } : {}),
    },
    customer_notification_preference: {
      invoice_created: ["email"],
      invoice_reminder: ["email"],
      invoice_paid: ["email"],
    },
    invoice_duration: 259200, // 3 days — gives Xendit's reminder time to fire
    ...(params.successRedirectUrl ? { success_redirect_url: params.successRedirectUrl } : {}),
    ...(params.failureRedirectUrl ? { failure_redirect_url: params.failureRedirectUrl } : {}),
  };
  const response = await fetch(`${XENDIT_API_BASE}/v2/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(ENV.xenditSecretKey + ":").toString("base64")}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.text();
    console.error("[Xendit] IGCSE invoice creation failed:", response.status, error);
    throw new Error(`Xendit invoice creation failed: ${response.status}`);
  }
  return response.json() as Promise<XenditInvoiceResponse>;
}
