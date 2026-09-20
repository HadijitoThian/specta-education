/**
 * SpecTa SAT Self-Prep — dedicated student accounts.
 *
 * Email + password accounts created by admin (no self-signup). A separate
 * cookie (`sat_token`) so an SAT student can reach only the SAT dashboard,
 * never the student portal, CRM or admin. Mirrors the student-portal cookie
 * security logic (secure/sameSite behind the Railway proxy).
 */

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { satStudents, type SatStudent } from "../drizzle/schema";

export const SAT_COOKIE = "sat_token";
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");

export async function hashPassword(pw: string): Promise<string> { return bcrypt.hash(pw, 12); }
export async function verifyPassword(pw: string, hash: string): Promise<boolean> { return bcrypt.compare(pw, hash); }

/** Readable temporary password, e.g. "SAT-7kq2-m9xa". */
export function tempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `SAT-${seg()}-${seg()}`;
}

function isSecure(req: any): boolean {
  const fp = req?.headers?.["x-forwarded-proto"];
  return req?.protocol === "https" ||
    (Array.isArray(fp) ? fp : String(fp || "").split(",")).some((p: string) => p.trim().toLowerCase() === "https");
}

export async function issueSatCookie(ctx: any, studentId: number): Promise<void> {
  const token = await new SignJWT({ sub: String(studentId), role: "sat_student" })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret());
  const sec = isSecure(ctx.req);
  ctx.res.cookie(SAT_COOKIE, token, { httpOnly: true, secure: sec, sameSite: sec ? "none" : "lax", maxAge: 30 * 24 * 3600 * 1000, path: "/" });
}

export function clearSatCookie(ctx: any): void {
  ctx.res.clearCookie(SAT_COOKIE, { path: "/" });
}

/** The logged-in, ACTIVE SAT student for this request, or null. */
export async function resolveSatStudent(ctx: any): Promise<SatStudent | null> {
  try {
    const token = parseCookies(ctx?.req?.headers?.cookie || "")[SAT_COOKIE];
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    if ((payload as any).role !== "sat_student") return null;
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) return null;
    const db = await getDb();
    if (!db) return null;
    const [s] = await db.select().from(satStudents).where(eq(satStudents.id, id)).limit(1);
    return s && s.active ? s : null;
  } catch { return null; }
}
