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

// ─── Student Portal Profile ─────────────────────────────────────────────────

import { studentPortalProfiles, studentPortalAppointments, studentUniversityWishlist, studentAiChatHistory } from "../drizzle/schema";

export async function getStudentProfile(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentPortalProfiles)
      .where(eq(studentPortalProfiles.leadId, leadId)).limit(1);
    return rows[0] ?? null;
  }, "getStudentProfile");
}

export async function upsertStudentProfile(leadId: number, data: {
  avatarUrl?: string;
  avatarKey?: string;
  bio?: string;
  intakeMonth?: string;
  intakeYear?: string;
  dreamCountry?: string;
  dreamProgram?: string;
  motivationNote?: string;
}) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await db.select().from(studentPortalProfiles)
      .where(eq(studentPortalProfiles.leadId, leadId)).limit(1);
    if (existing[0]) {
      await db.update(studentPortalProfiles).set(data)
        .where(eq(studentPortalProfiles.leadId, leadId));
    } else {
      await db.insert(studentPortalProfiles).values({ leadId, ...data });
    }
    const rows = await db.select().from(studentPortalProfiles)
      .where(eq(studentPortalProfiles.leadId, leadId)).limit(1);
    return rows[0];
  }, "upsertStudentProfile");
}

// ─── Student Portal Appointments ────────────────────────────────────────────

export async function createStudentAppointment(data: {
  leadId: number;
  studentName: string;
  studentEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  sessionType: "initial_consultation" | "application_review" | "visa_guidance" | "scholarship_advice" | "general_inquiry";
  notes?: string;
}) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [result] = await db.insert(studentPortalAppointments).values({
      ...data,
      status: "pending",
    });
    return { id: (result as any).insertId };
  }, "createStudentAppointment");
}

export async function getStudentAppointments(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(studentPortalAppointments)
      .where(eq(studentPortalAppointments.leadId, leadId))
      .orderBy(desc(studentPortalAppointments.createdAt));
  }, "getStudentAppointments");
}

export async function getAllStudentPortalAppointments() {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(studentPortalAppointments)
      .orderBy(desc(studentPortalAppointments.createdAt));
  }, "getAllStudentPortalAppointments");
}

export async function updateStudentAppointmentStatus(id: number, status: "pending" | "confirmed" | "completed" | "cancelled", counselorNotes?: string, meetingLink?: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(studentPortalAppointments)
      .set({ status, ...(counselorNotes ? { counselorNotes } : {}), ...(meetingLink ? { meetingLink } : {}) })
      .where(eq(studentPortalAppointments.id, id));
  }, "updateStudentAppointmentStatus");
}

// ─── Student University Wishlist ─────────────────────────────────────────────

export async function getStudentWishlist(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(studentUniversityWishlist)
      .where(eq(studentUniversityWishlist.leadId, leadId))
      .orderBy(desc(studentUniversityWishlist.createdAt));
  }, "getStudentWishlist");
}

export async function addToStudentWishlist(leadId: number, data: {
  universityName: string;
  country: string;
  program?: string;
  notes?: string;
  ranking?: string;
  tuitionFee?: string;
}) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [result] = await db.insert(studentUniversityWishlist).values({ leadId, ...data });
    return { id: (result as any).insertId };
  }, "addToStudentWishlist");
}

export async function removeFromStudentWishlist(id: number, leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(studentUniversityWishlist)
      .where(and(eq(studentUniversityWishlist.id, id), eq(studentUniversityWishlist.leadId, leadId)));
  }, "removeFromStudentWishlist");
}

// ─── Student AI Chat History ─────────────────────────────────────────────────

export async function getStudentAiChatHistory(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(studentAiChatHistory)
      .where(eq(studentAiChatHistory.leadId, leadId))
      .orderBy(desc(studentAiChatHistory.createdAt))
      .limit(50);
  }, "getStudentAiChatHistory");
}

export async function addStudentAiMessage(leadId: number, role: "user" | "assistant", content: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(studentAiChatHistory).values({ leadId, role, content });
  }, "addStudentAiMessage");
}

export async function clearStudentAiChatHistory(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(studentAiChatHistory)
      .where(eq(studentAiChatHistory.leadId, leadId));
  }, "clearStudentAiChatHistory");
}

// ─── Student Referral System ─────────────────────────────────────────────────

import { studentReferralCodes, studentReferrals, studentRewards } from "../drizzle/schema";

function generateReferralCode(leadId: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SP${code}`;
}

export async function getOrCreateReferralCode(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const existing = await db.select().from(studentReferralCodes)
      .where(eq(studentReferralCodes.leadId, leadId)).limit(1);
    if (existing[0]) return existing[0];
    const code = generateReferralCode(leadId);
    await db.insert(studentReferralCodes).values({ leadId, code, totalReferrals: 0, completedReferrals: 0 });
    const rows = await db.select().from(studentReferralCodes)
      .where(eq(studentReferralCodes.leadId, leadId)).limit(1);
    return rows[0];
  }, "getOrCreateReferralCode");
}

export async function getReferralCodeByCode(code: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentReferralCodes)
      .where(eq(studentReferralCodes.code, code.toUpperCase())).limit(1);
    return rows[0] ?? null;
  }, "getReferralCodeByCode");
}

export async function getMyReferrals(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(studentReferrals)
      .where(eq(studentReferrals.referrerLeadId, leadId))
      .orderBy(desc(studentReferrals.createdAt));
  }, "getMyReferrals");
}

export async function getMyRewards(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(studentRewards)
      .where(eq(studentRewards.leadId, leadId))
      .orderBy(desc(studentRewards.createdAt));
  }, "getMyRewards");
}

export async function createReferral(referrerLeadId: number, referralCode: string, friendEmail: string, friendName?: string, friendPhone?: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    // Check if this friend email was already referred by this person
    const existing = await db.select().from(studentReferrals)
      .where(and(
        eq(studentReferrals.referrerLeadId, referrerLeadId),
        eq(studentReferrals.friendEmail, friendEmail.toLowerCase().trim())
      )).limit(1);
    if (existing[0]) return { id: existing[0].id, alreadyExists: true };
    const [result] = await db.insert(studentReferrals).values({
      referrerLeadId,
      referralCode,
      friendEmail: friendEmail.toLowerCase().trim(),
      friendName,
      friendPhone,
      status: "pending",
    });
    // Increment total referrals count
    await db.update(studentReferralCodes)
      .set({ totalReferrals: sql`totalReferrals + 1` })
      .where(eq(studentReferralCodes.code, referralCode));
    return { id: (result as any).insertId, alreadyExists: false };
  }, "createReferral");
}

export async function markReferralSignedUp(friendEmail: string) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentReferrals)
      .where(and(
        eq(studentReferrals.friendEmail, friendEmail.toLowerCase().trim()),
        eq(studentReferrals.status, "pending")
      )).limit(1);
    if (!rows[0]) return null;
    await db.update(studentReferrals)
      .set({ status: "signed_up", signedUpAt: new Date() })
      .where(eq(studentReferrals.id, rows[0].id));
    return rows[0];
  }, "markReferralSignedUp");
}

export async function completeReferralAndGrantReward(referralId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentReferrals)
      .where(eq(studentReferrals.id, referralId)).limit(1);
    if (!rows[0]) return null;
    const referral = rows[0];
    // Mark referral as completed
    await db.update(studentReferrals)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(studentReferrals.id, referralId));
    // Increment completed referrals count
    await db.update(studentReferralCodes)
      .set({ completedReferrals: sql`completedReferrals + 1` })
      .where(eq(studentReferralCodes.leadId, referral.referrerLeadId));
    // Determine reward based on how many completed referrals they have
    const codeRows = await db.select().from(studentReferralCodes)
      .where(eq(studentReferralCodes.leadId, referral.referrerLeadId)).limit(1);
    const completedCount = (codeRows[0]?.completedReferrals ?? 0);
    let rewardType: "ielts_mock_test" | "priority_session" | "scholarship_guide" | "application_fee_waiver";
    let rewardLabel: string;
    if (completedCount === 1) {
      rewardType = "ielts_mock_test"; rewardLabel = "Free IELTS Mock Test";
    } else if (completedCount === 2) {
      rewardType = "priority_session"; rewardLabel = "Priority Counselling Session";
    } else if (completedCount === 3) {
      rewardType = "scholarship_guide"; rewardLabel = "Exclusive Scholarship Guide";
    } else {
      rewardType = "application_fee_waiver"; rewardLabel = "Application Fee Waiver";
    }
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90); // 90 days
    await db.insert(studentRewards).values({
      leadId: referral.referrerLeadId,
      referralId,
      rewardType,
      rewardLabel,
      status: "pending",
      expiresAt,
    });
    return { rewardType, rewardLabel };
  }, "completeReferralAndGrantReward");
}

export async function claimReward(rewardId: number, leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(studentRewards)
      .set({ status: "claimed", claimedAt: new Date() })
      .where(and(eq(studentRewards.id, rewardId), eq(studentRewards.leadId, leadId)));
    return { success: true };
  }, "claimReward");
}

export async function getReferralStats(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const codeRows = await db.select().from(studentReferralCodes)
      .where(eq(studentReferralCodes.leadId, leadId)).limit(1);
    const referrals = await db.select().from(studentReferrals)
      .where(eq(studentReferrals.referrerLeadId, leadId));
    const rewards = await db.select().from(studentRewards)
      .where(eq(studentRewards.leadId, leadId));
    return {
      code: codeRows[0] ?? null,
      referrals,
      rewards,
      totalReferrals: codeRows[0]?.totalReferrals ?? 0,
      completedReferrals: codeRows[0]?.completedReferrals ?? 0,
    };
  }, "getReferralStats");
}

// ─── Student Notifications ─────────────────────────────────────────────────

import { studentNotifications } from "../drizzle/schema";

export async function createStudentNotification(data: {
  leadId: number;
  type: string;
  title: string;
  message?: string;
  actionTab?: string;
}) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.insert(studentNotifications).values({ ...data, isRead: 0 });
  }, "createStudentNotification");
}

export async function getStudentNotifications(leadId: number, limit = 30) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(studentNotifications)
      .where(eq(studentNotifications.leadId, leadId))
      .orderBy(desc(studentNotifications.createdAt))
      .limit(limit);
  }, "getStudentNotifications");
}

export async function getStudentUnreadCount(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const rows = await db.select().from(studentNotifications)
      .where(and(eq(studentNotifications.leadId, leadId), eq(studentNotifications.isRead, 0)));
    return rows.length;
  }, "getStudentUnreadCount");
}

export async function markStudentNotificationRead(id: number, leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(studentNotifications)
      .set({ isRead: 1 })
      .where(and(eq(studentNotifications.id, id), eq(studentNotifications.leadId, leadId)));
  }, "markStudentNotificationRead");
}

export async function markAllStudentNotificationsRead(leadId: number) {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.update(studentNotifications)
      .set({ isRead: 1 })
      .where(eq(studentNotifications.leadId, leadId));
  }, "markAllStudentNotificationsRead");
}
