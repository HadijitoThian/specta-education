import { ENV } from "./_core/env";
import crypto from "crypto";

const XENDIT_API_BASE = "https://api.xendit.co";
const PRO_TEST_PRICE = 79000; // Rp 79.000

interface CreateInvoiceParams {
  externalId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description?: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
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
    amount: PRO_TEST_PRICE,
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
export function getProTestPrice(): number {
  return PRO_TEST_PRICE;
}

/**
 * Generate a unique external ID for an order
 */
export function generateExternalId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString("hex");
  return `TESBAKAT-PRO-${timestamp}-${random}`;
}
