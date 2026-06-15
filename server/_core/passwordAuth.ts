/**
 * Email + password authentication routes.
 *
 * Endpoints (all under /api/auth):
 *   POST /signup           { email, password, name? }       -> sets session cookie
 *   POST /login            { email, password }              -> sets session cookie
 *   POST /logout                                            -> clears session cookie
 *   POST /forgot-password  { email }                        -> sends reset email
 *   POST /reset-password   { token, password }              -> updates password
 *
 * All responses are JSON. Success: 200 with body. Failure: 4xx with { error }.
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import {
  passwordResetTokens,
  users,
  type InsertUser,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

async function findUserByEmail(emailLower: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.emailLower, emailLower))
    .limit(1);
  return rows[0] ?? null;
}

async function setSessionCookie(
  req: Request,
  res: Response,
  payload: { openId: string; name: string; email: string | null }
) {
  const sessionToken = await sdk.createSessionToken(payload.openId, {
    name: payload.name,
    email: payload.email,
    expiresInMs: ONE_YEAR_MS,
  });
  res.cookie(COOKIE_NAME, sessionToken, {
    ...getSessionCookieOptions(req),
    maxAge: ONE_YEAR_MS,
  });
}

async function sendResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  if (!ENV.resendApiKey) {
    console.warn("[Auth] RESEND_API_KEY not set; cannot send password reset");
    return;
  }
  const subject = "Reset your SpecTa Education password";
  const text = `We received a request to reset your password.\n\nClick the link below to choose a new password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
    <h2 style="margin:0 0 12px 0;">Reset your password</h2>
    <p>We received a request to reset your SpecTa Education password.</p>
    <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#1a1a19;color:#fff;text-decoration:none;border-radius:8px;">Choose a new password</a></p>
    <p style="color:#666;font-size:13px;">This link is valid for 1 hour. If you didn't request this, you can ignore this email.</p>
    <p style="color:#666;font-size:12px;word-break:break-all;">${resetUrl}</p>
  </div>`;

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
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(
        `[Auth] Resend password reset failed (${res.status}): ${detail}`
      );
    }
  } catch (err) {
    console.warn("[Auth] Resend password reset error:", err);
  }
}

export function registerPasswordAuthRoutes(app: Express) {
  /**
   * POST /api/auth/signup — DISABLED.
   *
   * SpecTa dashboards (CRM, Social Studio, Admin) are internal-only. There is no
   * public self-registration; accounts are created by an administrator from
   * /crm → Team. This endpoint is kept as a hard 403 so nothing can self-enrol.
   */
  app.post("/api/auth/signup", (_req: Request, res: Response) => {
    return res.status(403).json({
      error: "Sign-ups are disabled. Accounts are created by an administrator.",
    });
  });

  /**
   * POST /api/auth/login
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email : "";
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";

      if (!EMAIL_RE.test(email) || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const emailLower = normalizeEmail(email);
      const user = await findUserByEmail(emailLower);
      if (!user || !user.passwordHash) {
        // Generic message — don't leak whether the email exists.
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const db = await getDb();
      if (db) {
        await db
          .update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, user.id));
      }

      await setSessionCookie(req, res, {
        openId: user.openId,
        name: user.name || "",
        email: user.email,
      });

      return res.status(200).json({
        user: {
          openId: user.openId,
          email: user.email,
          name: user.name,
          role: user.role,
          crmRole: user.crmRole,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * POST /api/auth/logout
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, getSessionCookieOptions(req));
    return res.status(200).json({ ok: true });
  });

  /**
   * POST /api/auth/forgot-password
   * Always responds 200 — never reveal whether the email exists.
   */
  app.post(
    "/api/auth/forgot-password",
    async (req: Request, res: Response) => {
      try {
        const email = typeof req.body?.email === "string" ? req.body.email : "";
        if (!EMAIL_RE.test(email)) {
          // Still 200 to avoid leaking which inputs are valid emails.
          return res.status(200).json({ ok: true });
        }

        const emailLower = normalizeEmail(email);
        const user = await findUserByEmail(emailLower);
        const db = await getDb();

        if (user && db) {
          const plainToken = crypto.randomBytes(32).toString("base64url");
          const tokenHash = hashToken(plainToken);
          const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

          await db.insert(passwordResetTokens).values({
            userId: user.id,
            tokenHash,
            expiresAt,
          });

          const base = ENV.appUrl.replace(/\/+$/, "");
          const resetUrl = `${base}/reset-password?token=${encodeURIComponent(plainToken)}`;
          await sendResetEmail(user.email ?? emailLower, resetUrl);
        }

        return res.status(200).json({ ok: true });
      } catch (error) {
        console.error("[Auth] Forgot-password failed:", error);
        // Still 200 to avoid information disclosure.
        return res.status(200).json({ ok: true });
      }
    }
  );

  /**
   * POST /api/auth/reset-password
   */
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const token = typeof req.body?.token === "string" ? req.body.token : "";
      const password =
        typeof req.body?.password === "string" ? req.body.password : "";

      if (!token || password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({
          error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        });
      }

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database unavailable" });
      }

      const tokenHash = hashToken(token);
      const now = new Date();
      const rows = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, now)
          )
        )
        .limit(1);

      const record = rows[0];
      if (!record) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, record.userId));
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, record.id));

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[Auth] Reset-password failed:", error);
      return res.status(500).json({ error: "Reset failed" });
    }
  });
}
