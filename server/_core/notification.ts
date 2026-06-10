/**
 * Owner notifications — sends to OWNER_EMAIL via Resend (preferred) or SMTP.
 * Returns false instead of throwing on delivery failure so callers can continue.
 */
import { TRPCError } from "@trpc/server";
import nodemailer from "nodemailer";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }
  const title = input.title.trim();
  const content = input.content.trim();
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }
  return { title, content };
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  if (!ENV.resendApiKey) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: ENV.smtpFrom, to, subject, html, text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[Notification] Resend failed (${res.status} ${res.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Resend error:", error);
    return false;
  }
}

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass) return false;
  try {
    const transporter = nodemailer.createTransport({
      host: ENV.smtpHost,
      port: ENV.smtpPort,
      secure: ENV.smtpPort === 465,
      auth: { user: ENV.smtpUser, pass: ENV.smtpPass },
    });
    await transporter.sendMail({ from: ENV.smtpFrom, to, subject, html, text });
    return true;
  } catch (error) {
    console.warn("[Notification] SMTP error:", error);
    return false;
  }
}

export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.ownerEmail) {
    console.warn("[Notification] OWNER_EMAIL not configured; skipping notify");
    return false;
  }

  const subject = title;
  const text = `${title}\n\n${content}`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;">
    <h2 style="margin:0 0 12px 0;color:#111;">${escapeHtml(title)}</h2>
    <div style="white-space:pre-wrap;color:#374151;line-height:1.6;">${escapeHtml(content)}</div>
  </div>`;

  if (await sendViaResend(ENV.ownerEmail, subject, html, text)) return true;
  if (await sendViaSmtp(ENV.ownerEmail, subject, html, text)) return true;

  console.warn("[Notification] All delivery channels failed for owner notify");
  return false;
}
