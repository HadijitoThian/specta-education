import { getDb, withDbRetry } from "./db";
import { studentPortalAccounts, leads, crmStudentDocuments, aiFollowupSuggestions } from "../drizzle/schema";
import { eq, and, gt, lt, isNull, or, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ─── Student Portal Auth ────────────────────────────────────────────────────

export async function createStudentPortalAccount(leadId: number, email: string, password: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const [result] = await db.insert(studentPortalAccounts).values({
      leadId,
      email: email.toLowerCase().trim(),
      passwordHash,
      verifyToken,
      isVerified: 0,
    });
    return { id: (result as any).insertId, verifyToken };
  }, "createStudentPortalAccount");
}

export async function getStudentPortalByEmail(email: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentPortalAccounts)
      .where(eq(studentPortalAccounts.email, email.toLowerCase().trim()))
      .limit(1);
    return rows[0] ?? null;
  }, "getStudentPortalByEmail");
}

export async function getStudentPortalByLeadId(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentPortalAccounts)
      .where(eq(studentPortalAccounts.leadId, leadId))
      .limit(1);
    return rows[0] ?? null;
  }, "getStudentPortalByLeadId");
}

export async function verifyStudentPortalToken(token: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentPortalAccounts)
      .where(eq(studentPortalAccounts.verifyToken, token))
      .limit(1);
    if (!rows[0]) return null;
    await db.update(studentPortalAccounts)
      .set({ isVerified: 1, verifyToken: null })
      .where(eq(studentPortalAccounts.id, rows[0].id));
    return rows[0];
  }, "verifyStudentPortalToken");
}

export async function validateStudentPortalLogin(email: string, password: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentPortalAccounts)
      .where(eq(studentPortalAccounts.email, email.toLowerCase().trim()))
      .limit(1);
    const account = rows[0] ?? null;
    if (!account) return null;
    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) return null;
    await db.update(studentPortalAccounts)
      .set({ lastLoginAt: new Date() })
      .where(eq(studentPortalAccounts.id, account.id));
    return account;
  }, "validateStudentPortalLogin");
}

export async function getStudentPortalDashboard(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const leadRows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    const lead = leadRows[0] ?? null;
    if (!lead) return null;
    const docs = await db.select().from(crmStudentDocuments)
      .where(eq(crmStudentDocuments.leadId, leadId))
      .orderBy(desc(crmStudentDocuments.updatedAt));
    return { lead, documents: docs };
  }, "getStudentPortalDashboard");
}

export async function setStudentPortalResetToken(email: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60);
    await db.update(studentPortalAccounts)
      .set({ resetToken: token, resetTokenExpiry: expiry })
      .where(eq(studentPortalAccounts.email, email.toLowerCase().trim()));
    return token;
  }, "setStudentPortalResetToken");
}

export async function resetStudentPortalPassword(token: string, newPassword: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentPortalAccounts)
      .where(and(
        eq(studentPortalAccounts.resetToken, token),
        gt(studentPortalAccounts.resetTokenExpiry, new Date())
      ))
      .limit(1);
    if (!rows[0]) return false;
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(studentPortalAccounts)
      .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
      .where(eq(studentPortalAccounts.id, rows[0].id));
    return true;
  }, "resetStudentPortalPassword");
}

// ─── AI Follow-up Suggestions ───────────────────────────────────────────────

export async function getAiSuggestionsForCounselor(counselorEmail: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const now = new Date();
    const rows = await db.select().from(aiFollowupSuggestions)
      .where(and(
        eq(aiFollowupSuggestions.counselorEmail, counselorEmail),
        eq(aiFollowupSuggestions.isActioned, 0),
        or(
          isNull(aiFollowupSuggestions.expiresAt),
          gt(aiFollowupSuggestions.expiresAt, now)
        )
      ))
      .orderBy(
        sql`FIELD(${aiFollowupSuggestions.priority}, 'urgent', 'high', 'medium', 'low')`,
        desc(aiFollowupSuggestions.createdAt)
      );
    return rows;
  }, "getAiSuggestionsForCounselor");
}

export async function markSuggestionActioned(id: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(aiFollowupSuggestions)
      .set({ isActioned: 1, actionedAt: new Date() })
      .where(eq(aiFollowupSuggestions.id, id));
  }, "markSuggestionActioned");
}

export async function clearOldSuggestions(counselorEmail: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 48);
    await db.delete(aiFollowupSuggestions)
      .where(and(
        eq(aiFollowupSuggestions.counselorEmail, counselorEmail),
        lt(aiFollowupSuggestions.createdAt, cutoff)
      ));
  }, "clearOldSuggestions");
}

export async function insertAiSuggestion(data: {
  counselorEmail: string;
  leadId: number;
  suggestionType: "overdue_followup" | "deadline_alert" | "missing_docs" | "rapport_checkin" | "application_update" | "visa_reminder";
  priority: "urgent" | "high" | "medium" | "low";
  title: string;
  aiMessage?: string;
  aiAdvice?: string;
  expiresAt?: Date;
}) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(aiFollowupSuggestions).values({
      ...data,
      isActioned: 0,
    });
  }, "insertAiSuggestion");
}

export async function deleteExistingSuggestions(counselorEmail: string, leadId: number, type: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(aiFollowupSuggestions)
      .where(and(
        eq(aiFollowupSuggestions.counselorEmail, counselorEmail),
        eq(aiFollowupSuggestions.leadId, leadId),
        eq(aiFollowupSuggestions.suggestionType, type as any),
        eq(aiFollowupSuggestions.isActioned, 0)
      ));
  }, "deleteExistingSuggestions");
}
