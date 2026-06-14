import { eq, desc, and, gte, lte, lt, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  conversations, InsertConversation, Conversation,
  messages, InsertMessage, Message,
  leads, InsertLead, Lead,
  marketingSpend, InsertMarketingSpend, MarketingSpend,
  adCampaigns, InsertAdCampaign, AdCampaign,
  documents, InsertDocument, Document,
  applications, InsertApplication, Application,
  applicationNotes, InsertApplicationNote, ApplicationNote,
  applicationDocuments, InsertApplicationDocument, ApplicationDocument,
  trackingTokens, InsertTrackingToken, TrackingToken,
  appointments, InsertAppointment, Appointment,
  ieltsPracticeResults, InsertIeltsPracticeResult, IeltsPracticeResult,
  counselors, InsertCounselor, Counselor,
  quizResults, InsertQuizResult, QuizResult,
  personaResults, InsertPersonaResult, PersonaResult,
  scholarshipLeads, InsertScholarshipLead, ScholarshipLead,
  staffAccounts, InsertStaffAccount, StaffAccount,
  aptitudeResults, InsertAptitudeResult, AptitudeResult,
  aptitudeAccessTokens, InsertAptitudeAccessToken, AptitudeAccessToken,
  matchUniversities, InsertMatchUniversity, MatchUniversity,
  matchPrograms, InsertMatchProgram, MatchProgram,
  costOfLivingData, InsertCostOfLivingData, CostOfLivingData,
  checklistItems, InsertChecklistItem, ChecklistItem,
  userChecklistProgress, InsertUserChecklistProgress, UserChecklistProgress,
  aptitudeProOrders, InsertAptitudeProOrder, AptitudeProOrder,
  whatsappMessages,
  blogCategories, InsertBlogCategory, BlogCategory,
  blogPosts, InsertBlogPost, BlogPost,
  blogTags, InsertBlogTag, BlogTag,
  blogPostTags, InsertBlogPostTag, BlogPostTag,
  blogComments, InsertBlogComment, BlogComment,
  simulatorSessions, InsertSimulatorSession, SimulatorSession,
  simulatorChoices, InsertSimulatorChoice, SimulatorChoice,
  simulatorResults, InsertSimulatorResult, SimulatorResult,
  agentConfigs, InsertAgentConfig, AgentConfig,
  agentRunLogs, InsertAgentRunLog, AgentRunLog,
  leadAssignments, InsertLeadAssignment, LeadAssignment,
  followUpActions, InsertFollowUpAction, FollowUpAction,
  seoContentCalendar, InsertSeoContentCalendar, SeoContentCalendar,
  dailyReports, InsertDailyReport, DailyReport,
} from "../drizzle/schema";
import { ENV } from './_core/env';

import mysql from "mysql2/promise";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;
let _consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

/**
 * Determine if an error is a transient DB connection error worth retrying.
 */
function isTransientError(err: unknown): boolean {
  const msg = String((err as any)?.message || err);
  const cause = String((err as any)?.cause?.message || "");
  const combined = msg + " " + cause;
  return (
    combined.includes("ECONNRESET") ||
    combined.includes("ECONNREFUSED") ||
    combined.includes("ETIMEDOUT") ||
    combined.includes("ENOTFOUND") ||
    combined.includes("PROTOCOL_CONNECTION_LOST") ||
    combined.includes("ER_CON_COUNT_ERROR") ||
    combined.includes("read ECONNRESET")
  );
}

/**
 * Execute a DB operation with automatic retry on transient connection errors.
 * Retries up to 3 times with exponential backoff (1s, 2s, 4s).
 */
export async function withDbRetry<T>(fn: () => Promise<T>, label = "DB operation"): Promise<T> {
  const maxRetries = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      _consecutiveErrors = 0; // Reset on success
      return result;
    } catch (err) {
      lastError = err;
      if (isTransientError(err)) {
        _consecutiveErrors++;
        console.warn(`[Database] Transient error on attempt ${attempt}/${maxRetries} for "${label}": ${(err as any)?.message}`);
        // Reset pool so next attempt gets a fresh connection
        await resetDbConnection().catch(() => {});
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Get or create a database connection using a connection pool.
 * A pool automatically handles reconnections after ECONNRESET errors.
 */
export async function getDb() {
  if (!_pool && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        // utf8mb4 so 4-byte characters (emojis 🎯) save correctly — social
        // captions are full of them. Without this the connection defaults to
        // 3-byte utf8 and rejects emoji inserts.
        charset: "utf8mb4",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 30000,
      });
      _db = drizzle(_pool as any);
      console.log("[Database] Connection pool created");
    } catch (error) {
      console.warn("[Database] Failed to create pool:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}

/**
 * Reset the database connection pool (call after ECONNRESET errors)
 */
export async function resetDbConnection() {
  if (_pool) {
    try { await _pool.end(); } catch {}
  }
  _pool = null;
  _db = null;
  console.log("[Database] Connection pool reset — will reconnect on next query");
  return getDb();
}

// User functions
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (
      ENV.ownerEmail &&
      user.email &&
      user.email.toLowerCase() === ENV.ownerEmail.toLowerCase()
    ) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Conversation functions
export async function createConversation(data: InsertConversation): Promise<Conversation | null> {
  const db = await getDb();
  if (!db) return null;

  await db.insert(conversations).values(data);
  const result = await db.select().from(conversations).where(eq(conversations.sessionId, data.sessionId)).limit(1);
  return result[0] || null;
}

export async function getConversationBySessionId(sessionId: string): Promise<Conversation | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(conversations).where(eq(conversations.sessionId, sessionId)).limit(1);
  return result[0] || null;
}

export async function updateConversation(sessionId: string, data: Partial<InsertConversation>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(conversations).set(data).where(eq(conversations.sessionId, sessionId));
}

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(conversations).orderBy(desc(conversations.createdAt));
}

// Message functions
export async function createMessage(data: InsertMessage): Promise<Message | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(messages).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(messages).where(eq(messages.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getMessagesByConversationId(conversationId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

// Lead functions
// ── Marketing / Growth (Phase A) ─────────────────────────────────────────────
/**
 * Idempotent, additive schema guard run at startup. Ensures the attribution
 * columns + marketing_spend table exist BEFORE any lead insert references them,
 * so a code deploy can never outrun the migration and break lead capture.
 */
export async function ensureMarketingSchema(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const cols = await db.execute(sql`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads'
    `);
    const rows: any[] = Array.isArray((cols as any)[0]) ? (cols as any)[0] : (cols as any);
    const have = new Set((rows || []).map((r: any) => r.COLUMN_NAME));
    const needed: Array<[string, string]> = [
      ["utmSource", "VARCHAR(120) NULL"],
      ["utmMedium", "VARCHAR(120) NULL"],
      ["utmCampaign", "VARCHAR(160) NULL"],
      ["utmTerm", "VARCHAR(160) NULL"],
      ["utmContent", "VARCHAR(160) NULL"],
      ["gclid", "VARCHAR(255) NULL"],
      ["landingPage", "VARCHAR(512) NULL"],
      ["attributionReferrer", "VARCHAR(512) NULL"],
    ];
    for (const [name, type] of needed) {
      if (!have.has(name)) {
        await db.execute(sql.raw(`ALTER TABLE leads ADD COLUMN \`${name}\` ${type}`));
        console.log(`[Growth] added leads.${name}`);
      }
    }
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS marketing_spend (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source VARCHAR(120) NOT NULL,
        campaign VARCHAR(160) NULL,
        medium VARCHAR(120) NULL,
        periodMonth VARCHAR(7) NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
        clicks INT NULL,
        impressions INT NULL,
        notes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS ad_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        product VARCHAR(120) NULL,
        goal VARCHAR(255) NULL,
        landingPath VARCHAR(255) NULL,
        dailyBudget DECIMAL(12,2) NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
        payload JSON NOT NULL,
        status ENUM('draft','exported','live','archived') NOT NULL DEFAULT 'draft',
        createdBy INT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
  } catch (e) {
    console.error("[Growth] ensureMarketingSchema failed:", (e as Error).message);
  }
}

// ── Ad campaigns (Phase B) ───────────────────────────────────────────────────
export async function listAdCampaigns(): Promise<AdCampaign[]> {
  const db = await getDb();
  if (!db) return [];
  return (await db.select().from(adCampaigns).orderBy(desc(adCampaigns.createdAt))) as AdCampaign[];
}

export async function getAdCampaign(id: number): Promise<AdCampaign | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(adCampaigns).where(eq(adCampaigns.id, id)).limit(1);
  return row || null;
}

export async function createAdCampaign(data: InsertAdCampaign): Promise<AdCampaign | null> {
  const db = await getDb();
  if (!db) return null;
  const r = await db.insert(adCampaigns).values(data);
  const id = (r as any)[0].insertId;
  return getAdCampaign(id);
}

export async function updateAdCampaign(id: number, data: Partial<InsertAdCampaign>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(adCampaigns).set(data).where(eq(adCampaigns.id, id));
}

export async function deleteAdCampaign(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(adCampaigns).where(eq(adCampaigns.id, id));
}


/** Lead rows trimmed to the fields the attribution report needs. */
export async function getLeadsForAttribution(opts: { month?: string } = {}): Promise<Array<{
  id: number; createdAt: Date; source: string | null; status: string; pipelineStage: string;
  utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; gclid: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  let q = db.select({
    id: leads.id, createdAt: leads.createdAt, source: leads.source, status: leads.status,
    pipelineStage: leads.pipelineStage, utmSource: leads.utmSource, utmMedium: leads.utmMedium,
    utmCampaign: leads.utmCampaign, gclid: leads.gclid,
  }).from(leads);
  if (opts.month) {
    // month = "YYYY-MM": filter createdAt within that calendar month.
    const start = new Date(`${opts.month}-01T00:00:00Z`);
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
    q = q.where(and(gte(leads.createdAt, start), lt(leads.createdAt, end))) as typeof q;
  }
  return q as any;
}

export async function listMarketingSpend(month?: string): Promise<MarketingSpend[]> {
  const db = await getDb();
  if (!db) return [];
  let q = db.select().from(marketingSpend);
  if (month) q = q.where(eq(marketingSpend.periodMonth, month)) as typeof q;
  return (await q.orderBy(desc(marketingSpend.periodMonth))) as MarketingSpend[];
}

export async function createMarketingSpend(data: InsertMarketingSpend): Promise<MarketingSpend | null> {
  const db = await getDb();
  if (!db) return null;
  const r = await db.insert(marketingSpend).values(data);
  const id = (r as any)[0].insertId;
  const [row] = await db.select().from(marketingSpend).where(eq(marketingSpend.id, id)).limit(1);
  return row || null;
}

export async function updateMarketingSpend(id: number, data: Partial<InsertMarketingSpend>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(marketingSpend).set(data).where(eq(marketingSpend.id, id));
}

export async function deleteMarketingSpend(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(marketingSpend).where(eq(marketingSpend.id, id));
}

export async function createLead(data: InsertLead): Promise<Lead | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(leads).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(leads).where(eq(leads.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getAllLeads(): Promise<Lead[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(leads).orderBy(desc(leads.createdAt));
}

/**
 * Returns only leads that have NOT yet been assigned to a counselor.
 * Used by the CRM agent to prevent re-processing already-assigned leads.
 */
export async function getUnassignedLeads(): Promise<Lead[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(leads)
    .where(eq(leads.isAssigned, 0))
    .orderBy(desc(leads.createdAt));
}

/**
 * Mark a lead as assigned so the CRM agent never re-processes it.
 */
export async function markLeadAsAssigned(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(leads).set({ isAssigned: 1 }).where(eq(leads.id, id));
}

export async function getLeadById(id: number): Promise<Lead | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0] || null;
}

export async function updateLead(id: number, data: Partial<InsertLead>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(leads).set(data).where(eq(leads.id, id));
}

// Document functions
export async function createDocument(data: InsertDocument): Promise<Document | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(documents).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(documents).where(eq(documents.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getDocumentsByConversationId(conversationId: number): Promise<Document[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(documents).where(eq(documents.conversationId, conversationId)).orderBy(desc(documents.createdAt));
}

export async function getDocumentsByLeadId(leadId: number): Promise<Document[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(documents).where(eq(documents.leadId, leadId)).orderBy(desc(documents.createdAt));
}

export async function getAllDocuments(): Promise<Document[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(documents).orderBy(desc(documents.createdAt));
}

// Application functions
export async function createApplication(data: InsertApplication): Promise<Application | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(applications).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(applications).where(eq(applications.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getAllApplications(): Promise<Application[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(applications).orderBy(desc(applications.createdAt));
}

export async function getApplicationById(id: number): Promise<Application | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return result[0] || null;
}

export async function getApplicationByReference(referenceNumber: string): Promise<Application | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(applications).where(eq(applications.referenceNumber, referenceNumber)).limit(1);
  return result[0] || null;
}

export async function getApplicationsByEmail(email: string): Promise<Application[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(applications).where(eq(applications.email, email)).orderBy(desc(applications.createdAt));
}

export async function updateApplication(id: number, data: Partial<InsertApplication>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(applications).set(data).where(eq(applications.id, id));
}

// Application Notes functions
export async function createApplicationNote(data: InsertApplicationNote): Promise<ApplicationNote | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(applicationNotes).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(applicationNotes).where(eq(applicationNotes.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getNotesByApplicationId(applicationId: number, publicOnly = false): Promise<ApplicationNote[]> {
  const db = await getDb();
  if (!db) return [];

  if (publicOnly) {
    return await db.select().from(applicationNotes)
      .where(and(eq(applicationNotes.applicationId, applicationId), eq(applicationNotes.isPublic, true)))
      .orderBy(desc(applicationNotes.createdAt));
  }
  return await db.select().from(applicationNotes)
    .where(eq(applicationNotes.applicationId, applicationId))
    .orderBy(desc(applicationNotes.createdAt));
}

// Application Documents functions
export async function createApplicationDocument(data: InsertApplicationDocument): Promise<ApplicationDocument | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(applicationDocuments).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(applicationDocuments).where(eq(applicationDocuments.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getDocumentsByApplicationId(applicationId: number): Promise<ApplicationDocument[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(applicationDocuments)
    .where(eq(applicationDocuments.applicationId, applicationId))
    .orderBy(desc(applicationDocuments.createdAt));
}

// Tracking Token functions
export async function createTrackingToken(data: InsertTrackingToken): Promise<TrackingToken | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(trackingTokens).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(trackingTokens).where(eq(trackingTokens.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getTrackingTokenByToken(token: string): Promise<TrackingToken | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(trackingTokens).where(eq(trackingTokens.token, token)).limit(1);
  return result[0] || null;
}

export async function deleteExpiredTokens(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(trackingTokens).where(lte(trackingTokens.expiresAt, new Date()));
}

// Appointment functions
export async function createAppointment(data: InsertAppointment): Promise<Appointment | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(appointments).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(appointments).where(eq(appointments.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getAllAppointments(): Promise<Appointment[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
}

export async function getAppointmentById(id: number): Promise<Appointment | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result[0] || null;
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(appointments)
    .where(and(eq(appointments.date, date), eq(appointments.status, "confirmed")))
    .orderBy(appointments.timeSlot);
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(appointments).set(data).where(eq(appointments.id, id));
}

// IELTS Practice Results functions
export async function createIeltsPracticeResult(data: InsertIeltsPracticeResult): Promise<IeltsPracticeResult | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(ieltsPracticeResults).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(ieltsPracticeResults).where(eq(ieltsPracticeResults.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getAllIeltsPracticeResults(): Promise<IeltsPracticeResult[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(ieltsPracticeResults).orderBy(desc(ieltsPracticeResults.createdAt));
}

export async function getIeltsPracticeResultById(id: number): Promise<IeltsPracticeResult | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(ieltsPracticeResults).where(eq(ieltsPracticeResults.id, id)).limit(1);
  return result[0] || null;
}

export async function getIeltsPracticeResultsByEmail(email: string): Promise<IeltsPracticeResult[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(ieltsPracticeResults)
    .where(eq(ieltsPracticeResults.studentEmail, email))
    .orderBy(desc(ieltsPracticeResults.createdAt));
}

// Counselor functions
export async function createCounselor(data: InsertCounselor): Promise<Counselor | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(counselors).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(counselors).where(eq(counselors.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getAllCounselors(activeOnly = false): Promise<Counselor[]> {
  const db = await getDb();
  if (!db) return [];

  if (activeOnly) {
    return await db.select().from(counselors)
      .where(eq(counselors.isActive, true))
      .orderBy(counselors.name);
  }
  return await db.select().from(counselors).orderBy(counselors.name);
}

export async function getCounselorById(id: number): Promise<Counselor | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(counselors).where(eq(counselors.id, id)).limit(1);
  return result[0] || null;
}

export async function updateCounselor(id: number, data: Partial<InsertCounselor>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(counselors).set(data).where(eq(counselors.id, id));
}

export async function deleteCounselor(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(counselors).where(eq(counselors.id, id));
}

export async function updateCounselorWorkload(counselorName: string, increment: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const result = await db.select().from(counselors).where(eq(counselors.name, counselorName)).limit(1);
  if (result.length > 0) {
    const current = result[0].activeApplications || 0;
    await db.update(counselors).set({ activeApplications: Math.max(0, current + increment) }).where(eq(counselors.id, result[0].id));
  }
}

// Quiz Results helpers
export async function createQuizResult(data: InsertQuizResult): Promise<QuizResult | null> {
  const db = await getDb();
  if (!db) return null;

  await db.insert(quizResults).values(data);
  const result = await db.select().from(quizResults).orderBy(desc(quizResults.id)).limit(1);
  return result[0] || null;
}

export async function getAllQuizResults(): Promise<QuizResult[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(quizResults).orderBy(desc(quizResults.createdAt));
}

// Persona Results helpers
export async function createPersonaResult(data: InsertPersonaResult): Promise<PersonaResult | null> {
  const db = await getDb();
  if (!db) return null;

  await db.insert(personaResults).values(data);
  const result = await db.select().from(personaResults).orderBy(desc(personaResults.id)).limit(1);
  return result[0] || null;
}

export async function getAllPersonaResults(): Promise<PersonaResult[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(personaResults).orderBy(desc(personaResults.createdAt));
}

// Generate reference number for applications
export async function generateReferenceNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return `SPECTA-${new Date().getFullYear()}-00001`;

  const year = new Date().getFullYear();
  const allApps = await db.select().from(applications).orderBy(desc(applications.id)).limit(1);
  const nextId = allApps.length > 0 ? allApps[0].id + 1 : 1;
  return `SPECTA-${year}-${String(nextId).padStart(5, '0')}`;
}

// Scholarship Lead functions
export async function createScholarshipLead(data: InsertScholarshipLead): Promise<ScholarshipLead | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(scholarshipLeads).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(scholarshipLeads).where(eq(scholarshipLeads.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getAllScholarshipLeads(): Promise<ScholarshipLead[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scholarshipLeads).orderBy(desc(scholarshipLeads.createdAt));
}

/**
 * Returns only scholarship leads that have NOT yet been assigned to a counselor.
 * Used by the CRM agent to prevent re-processing already-assigned leads.
 */
export async function getUnassignedScholarshipLeads(): Promise<ScholarshipLead[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scholarshipLeads)
    .where(eq(scholarshipLeads.isAssigned, 0))
    .orderBy(desc(scholarshipLeads.createdAt));
}

/**
 * Mark a scholarship lead as assigned so the CRM agent never re-processes it.
 */
export async function markScholarshipAsAssigned(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(scholarshipLeads).set({ isAssigned: 1 }).where(eq(scholarshipLeads.id, id));
}

export async function updateScholarshipLead(id: number, data: Partial<InsertScholarshipLead>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(scholarshipLeads).set(data).where(eq(scholarshipLeads.id, id));
}


// ==========================================
// UNIFIED DOCUMENT VIEW HELPERS
// ==========================================

/**
 * Get all application documents with student info from the applications table.
 * This provides a unified view of documents from all sources.
 */
export async function getAllApplicationDocuments() {
  const db = await getDb();
  if (!db) return [];

  const docs = await db
    .select({
      id: applicationDocuments.id,
      applicationId: applicationDocuments.applicationId,
      documentType: applicationDocuments.documentType,
      fileName: applicationDocuments.fileName,
      fileUrl: applicationDocuments.fileUrl,
      uploadedBy: applicationDocuments.uploadedBy,
      createdAt: applicationDocuments.createdAt,
      appStudentName: applications.fullName,
      appStudentEmail: applications.email,
      appReferenceNumber: applications.referenceNumber,
    })
    .from(applicationDocuments)
    .leftJoin(applications, eq(applicationDocuments.applicationId, applications.id))
    .orderBy(desc(applicationDocuments.createdAt));

  return docs.map(d => ({
    ...d,
    studentName: d.appStudentName ?? undefined,
    studentEmail: d.appStudentEmail ?? undefined,
    referenceNumber: d.appReferenceNumber ?? undefined,
  }));
}


// ==========================================
// STAFF ACCOUNTS
// ==========================================

export async function createStaffAccount(data: InsertStaffAccount): Promise<StaffAccount | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(staffAccounts).values(data);
  const [row] = await db.select().from(staffAccounts).where(eq(staffAccounts.email, data.email));
  return row || null;
}

export async function getAllStaffAccounts(): Promise<StaffAccount[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staffAccounts).orderBy(desc(staffAccounts.createdAt));
}

export async function getStaffAccountByEmail(email: string): Promise<StaffAccount | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(staffAccounts).where(eq(staffAccounts.email, email));
  return row || null;
}

export async function getStaffAccountByName(name: string): Promise<StaffAccount | null> {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(staffAccounts).where(sql`LOWER(${staffAccounts.name}) = LOWER(${name})`);
  return results[0] || null;
}

export async function getStaffAccountById(id: number): Promise<StaffAccount | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(staffAccounts).where(eq(staffAccounts.id, id));
  return row || null;
}

export async function updateStaffAccount(id: number, data: Partial<InsertStaffAccount>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(staffAccounts).set(data).where(eq(staffAccounts.id, id));
}

export async function deleteStaffAccount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(staffAccounts).where(eq(staffAccounts.id, id));
}

// ==========================================
// DELETE FUNCTIONS FOR ADMIN
// ==========================================

export async function deleteApplication(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete related records first
  await db.delete(applicationDocuments).where(eq(applicationDocuments.applicationId, id));
  await db.delete(applicationNotes).where(eq(applicationNotes.applicationId, id));
  await db.delete(applications).where(eq(applications.id, id));
}

export async function deleteDocument(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(documents).where(eq(documents.id, id));
}

export async function deleteApplicationDocument(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(applicationDocuments).where(eq(applicationDocuments.id, id));
}

export async function deleteLead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(leads).where(eq(leads.id, id));
}

export async function deleteAppointment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(appointments).where(eq(appointments.id, id));
}

export async function deleteScholarshipLead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(scholarshipLeads).where(eq(scholarshipLeads.id, id));
}

export async function getApplicationsByCounselorName(counselorName: string): Promise<Application[]> {
  const db = await getDb();
  if (!db) return [];
  // Case-insensitive match since admin assigns by counselor name string
  return await db.select().from(applications)
    .where(sql`LOWER(${applications.assignedCounselor}) = LOWER(${counselorName})`)
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationDocumentsByApplicationId(applicationId: number): Promise<ApplicationDocument[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(applicationDocuments)
    .where(eq(applicationDocuments.applicationId, applicationId))
    .orderBy(desc(applicationDocuments.createdAt));
}

export async function getApplicationNotesByApplicationId(applicationId: number): Promise<ApplicationNote[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(applicationNotes)
    .where(eq(applicationNotes.applicationId, applicationId))
    .orderBy(desc(applicationNotes.createdAt));
}

export async function deleteConversation(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete related messages and documents first
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(documents).where(eq(documents.conversationId, id));
  await db.delete(leads).where(eq(leads.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
}

/**
 * Cleanup conversations inactive for more than the specified number of days.
 * Deletes the conversation and all related messages, documents, and leads.
 * Returns the number of conversations deleted.
 */
export async function cleanupExpiredConversations(expiryDays: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoff = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000);

  // Find expired conversations
  const expired = await db.select({ id: conversations.id })
    .from(conversations)
    .where(lt(conversations.updatedAt, cutoff));

  if (expired.length === 0) return 0;

  const expiredIds = expired.map(c => c.id);

  // Delete related records first, then conversations
  await db.delete(messages).where(inArray(messages.conversationId, expiredIds));
  await db.delete(documents).where(inArray(documents.conversationId, expiredIds));
  await db.delete(leads).where(inArray(leads.conversationId, expiredIds));
  await db.delete(conversations).where(inArray(conversations.id, expiredIds));

  return expired.length;
}

// ==========================================
// APTITUDE TEST RESULTS
// ==========================================

export async function createAptitudeResult(data: InsertAptitudeResult): Promise<AptitudeResult | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aptitudeResults).values(data);
  const insertId = result[0].insertId;
  const [row] = await db.select().from(aptitudeResults).where(eq(aptitudeResults.id, insertId));
  return row || null;
}

export async function getAptitudeResultById(id: number): Promise<AptitudeResult | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(aptitudeResults).where(eq(aptitudeResults.id, id));
  return row || null;
}

export async function getAptitudeResultsByEmail(email: string): Promise<AptitudeResult[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aptitudeResults)
    .where(eq(aptitudeResults.studentEmail, email))
    .orderBy(desc(aptitudeResults.createdAt));
}

export async function getAllAptitudeResults(): Promise<AptitudeResult[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aptitudeResults).orderBy(desc(aptitudeResults.createdAt));
}

/**
 * Returns only aptitude results that have NOT yet been assigned to a counselor.
 * Used by the CRM agent to prevent re-processing already-assigned results.
 */
export async function getUnassignedAptitudeResults(): Promise<AptitudeResult[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aptitudeResults)
    .where(eq(aptitudeResults.isAssigned, 0))
    .orderBy(desc(aptitudeResults.createdAt));
}

/**
 * Mark an aptitude result as assigned so the CRM agent never re-processes it.
 */
export async function markAptitudeAsAssigned(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(aptitudeResults).set({ isAssigned: 1 }).where(eq(aptitudeResults.id, id));
}

// ==========================================
// APTITUDE ACCESS TOKENS
// ==========================================

export async function createAccessTokens(tokens: InsertAptitudeAccessToken[]): Promise<AptitudeAccessToken[]> {
  const db = await getDb();
  if (!db) return [];
  await db.insert(aptitudeAccessTokens).values(tokens);
  // Fetch all just-created tokens
  const tokenValues = tokens.map(t => t.token);
  return await db.select().from(aptitudeAccessTokens)
    .where(inArray(aptitudeAccessTokens.token, tokenValues))
    .orderBy(desc(aptitudeAccessTokens.createdAt));
}

export async function getAccessTokenByToken(token: string): Promise<AptitudeAccessToken | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(aptitudeAccessTokens)
    .where(eq(aptitudeAccessTokens.token, token));
  return row || null;
}

export async function markTokenInProgress(token: string, name: string, email: string, phone: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(aptitudeAccessTokens)
    .set({
      status: "in_progress",
      usedByName: name,
      usedByEmail: email,
      usedByPhone: phone,
      usedAt: new Date(),
    })
    .where(and(
      eq(aptitudeAccessTokens.token, token),
      eq(aptitudeAccessTokens.status, "unused")
    ));
  return (result[0] as any).affectedRows > 0;
}

export async function markTokenCompleted(token: string, resultId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(aptitudeAccessTokens)
    .set({
      status: "completed",
      completedAt: new Date(),
      resultId,
    })
    .where(and(
      eq(aptitudeAccessTokens.token, token),
      eq(aptitudeAccessTokens.status, "in_progress")
    ));
  return (result[0] as any).affectedRows > 0;
}

export async function listAccessTokens(): Promise<AptitudeAccessToken[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aptitudeAccessTokens)
    .orderBy(desc(aptitudeAccessTokens.createdAt));
}

export async function deleteAccessToken(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(aptitudeAccessTokens)
    .where(and(
      eq(aptitudeAccessTokens.id, id),
      eq(aptitudeAccessTokens.status, "unused")
    ));
  return (result[0] as any).affectedRows > 0;
}

// ==========================================
// UNIVERSITY MATCHING ENGINE
// ==========================================

// --- Match Universities ---
export async function createMatchUniversity(data: InsertMatchUniversity): Promise<MatchUniversity | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(matchUniversities).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(matchUniversities).where(eq(matchUniversities.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getAllMatchUniversities(activeOnly = false): Promise<MatchUniversity[]> {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return await db.select().from(matchUniversities)
      .where(eq(matchUniversities.isActive, true))
      .orderBy(matchUniversities.name);
  }
  return await db.select().from(matchUniversities).orderBy(matchUniversities.name);
}

export async function getMatchUniversityById(id: number): Promise<MatchUniversity | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(matchUniversities).where(eq(matchUniversities.id, id)).limit(1);
  return result[0] || null;
}

export async function updateMatchUniversity(id: number, data: Partial<InsertMatchUniversity>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(matchUniversities).set(data).where(eq(matchUniversities.id, id));
}

export async function deleteMatchUniversity(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Also delete associated programs
  await db.delete(matchPrograms).where(eq(matchPrograms.universityId, id));
  await db.delete(matchUniversities).where(eq(matchUniversities.id, id));
}

// --- Match Programs ---
export async function createMatchProgram(data: InsertMatchProgram): Promise<MatchProgram | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(matchPrograms).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(matchPrograms).where(eq(matchPrograms.id, insertId)).limit(1);
  return created[0] || null;
}

export async function getMatchProgramsByUniversityId(universityId: number): Promise<MatchProgram[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(matchPrograms)
    .where(eq(matchPrograms.universityId, universityId))
    .orderBy(matchPrograms.programName);
}

export async function getAllMatchPrograms(activeOnly = false): Promise<MatchProgram[]> {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return await db.select().from(matchPrograms)
      .where(eq(matchPrograms.isActive, true))
      .orderBy(matchPrograms.programName);
  }
  return await db.select().from(matchPrograms).orderBy(matchPrograms.programName);
}

export async function getMatchProgramById(id: number): Promise<MatchProgram | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(matchPrograms).where(eq(matchPrograms.id, id)).limit(1);
  return result[0] || null;
}

export async function updateMatchProgram(id: number, data: Partial<InsertMatchProgram>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(matchPrograms).set(data).where(eq(matchPrograms.id, id));
}

export async function deleteMatchProgram(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(matchPrograms).where(eq(matchPrograms.id, id));
}

// --- Matching Algorithm Helpers ---
export async function getActiveUniversitiesWithPrograms(): Promise<(MatchUniversity & { programs: MatchProgram[] })[]> {
  const db = await getDb();
  if (!db) return [];
  const universities = await db.select().from(matchUniversities)
    .where(eq(matchUniversities.isActive, true))
    .orderBy(matchUniversities.name);
  const programs = await db.select().from(matchPrograms)
    .where(eq(matchPrograms.isActive, true));
  return universities.map(uni => ({
    ...uni,
    programs: programs.filter(p => p.universityId === uni.id),
  }));
}


// =============================================
// Cost of Living Calculator Helpers
// =============================================

export async function getCostOfLivingByCountry(countrySlug: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(costOfLivingData).where(and(eq(costOfLivingData.countrySlug, countrySlug), eq(costOfLivingData.isActive, true))).orderBy(costOfLivingData.city, costOfLivingData.category);
}

export async function getCostOfLivingCities(countrySlug: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.selectDistinct({ city: costOfLivingData.city }).from(costOfLivingData).where(and(eq(costOfLivingData.countrySlug, countrySlug), eq(costOfLivingData.isActive, true))).orderBy(costOfLivingData.city);
  return rows.map(r => r.city);
}

export async function getAllCostOfLivingData() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(costOfLivingData).where(eq(costOfLivingData.isActive, true)).orderBy(costOfLivingData.country, costOfLivingData.city, costOfLivingData.category);
}

export async function createCostOfLivingEntry(data: InsertCostOfLivingData) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(costOfLivingData).values(data);
  return result[0].insertId;
}

export async function updateCostOfLivingEntry(id: number, data: Partial<InsertCostOfLivingData>) {
  const db = await getDb();
  if (!db) return;
  await db.update(costOfLivingData).set(data).where(eq(costOfLivingData.id, id));
}

export async function deleteCostOfLivingEntry(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(costOfLivingData).set({ isActive: false }).where(eq(costOfLivingData.id, id));
}

// =============================================
// Study Abroad Checklist Helpers
// =============================================

export async function getAllChecklistItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklistItems).where(eq(checklistItems.isActive, true)).orderBy(checklistItems.phase, checklistItems.sortOrder);
}

export async function createChecklistItem(data: InsertChecklistItem) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db.insert(checklistItems).values(data);
  return result[0].insertId;
}

export async function updateChecklistItem(id: number, data: Partial<InsertChecklistItem>) {
  const db = await getDb();
  if (!db) return;
  await db.update(checklistItems).set(data).where(eq(checklistItems.id, id));
}

export async function deleteChecklistItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(checklistItems).set({ isActive: false }).where(eq(checklistItems.id, id));
}

export async function getUserChecklistProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userChecklistProgress).where(eq(userChecklistProgress.userId, userId));
}

export async function toggleChecklistProgress(userId: number, checklistItemId: number, isCompleted: boolean, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Check if progress record exists
  const existing = await db.select().from(userChecklistProgress).where(and(eq(userChecklistProgress.userId, userId), eq(userChecklistProgress.checklistItemId, checklistItemId)));
  
  if (existing.length > 0) {
    await db.update(userChecklistProgress).set({ 
      isCompleted, 
      completedAt: isCompleted ? new Date() : null,
      notes: notes ?? existing[0].notes 
    }).where(eq(userChecklistProgress.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(userChecklistProgress).values({
      userId,
      checklistItemId,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      notes: notes ?? null,
    });
    return result[0].insertId;
  }
}

export async function updateChecklistNotes(userId: number, checklistItemId: number, notes: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(userChecklistProgress).where(and(eq(userChecklistProgress.userId, userId), eq(userChecklistProgress.checklistItemId, checklistItemId)));
  
  if (existing.length > 0) {
    await db.update(userChecklistProgress).set({ notes }).where(eq(userChecklistProgress.id, existing[0].id));
  } else {
    await db.insert(userChecklistProgress).values({
      userId,
      checklistItemId,
      isCompleted: false,
      notes,
    });
  }
}


// =============================================
// Aptitude Pro Orders (Xendit Payment)
// =============================================

export async function createAptitudeProOrder(data: InsertAptitudeProOrder): Promise<AptitudeProOrder | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(aptitudeProOrders).values(data);
  const insertId = result[0].insertId;
  const [row] = await db.select().from(aptitudeProOrders).where(eq(aptitudeProOrders.id, insertId));
  return row || null;
}

export async function getAptitudeProOrderByExternalId(externalId: string): Promise<AptitudeProOrder | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(aptitudeProOrders).where(eq(aptitudeProOrders.externalId, externalId));
  return row || null;
}

export async function updateAptitudeProOrderStatus(externalId: string, status: "pending" | "paid" | "expired" | "failed", extra?: { xenditInvoiceId?: string; paidAt?: Date; accessTokenId?: number }): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const updateData: Record<string, unknown> = { status };
  if (extra?.xenditInvoiceId) updateData.xenditInvoiceId = extra.xenditInvoiceId;
  if (extra?.paidAt) updateData.paidAt = extra.paidAt;
  if (extra?.accessTokenId) updateData.accessTokenId = extra.accessTokenId;
  const result = await db.update(aptitudeProOrders).set(updateData).where(eq(aptitudeProOrders.externalId, externalId));
  return (result[0] as any).affectedRows > 0;
}

export async function listAptitudeProOrders(): Promise<AptitudeProOrder[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aptitudeProOrders).orderBy(desc(aptitudeProOrders.createdAt));
}


// ==================== ANALYTICS HELPERS ====================

export interface AnalyticsTimeRange {
  startDate: Date;
  endDate: Date;
}

export interface AnalyticsKPIs {
  totalLeads: number;
  totalLeadsPrev: number;
  totalApplications: number;
  totalApplicationsPrev: number;
  totalAppointments: number;
  totalAppointmentsPrev: number;
  totalProRevenue: number;
  totalProRevenuePrev: number;
  totalIeltsTests: number;
  totalIeltsTestsPrev: number;
  totalAptitudeTests: number;
  totalAptitudeTestsPrev: number;
  conversionRate: number;
  enrolledCount: number;
}

function getPreviousPeriod(start: Date, end: Date): { prevStart: Date; prevEnd: Date } {
  const diff = end.getTime() - start.getTime();
  return {
    prevStart: new Date(start.getTime() - diff),
    prevEnd: new Date(start.getTime()),
  };
}

export async function getAnalyticsKPIs(range: AnalyticsTimeRange): Promise<AnalyticsKPIs> {
  const db = await getDb();
  if (!db) return { totalLeads: 0, totalLeadsPrev: 0, totalApplications: 0, totalApplicationsPrev: 0, totalAppointments: 0, totalAppointmentsPrev: 0, totalProRevenue: 0, totalProRevenuePrev: 0, totalIeltsTests: 0, totalIeltsTestsPrev: 0, totalAptitudeTests: 0, totalAptitudeTestsPrev: 0, conversionRate: 0, enrolledCount: 0 };
  const { startDate, endDate } = range;
  const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate);

  const [leadsCount] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(gte(leads.createdAt, startDate), lte(leads.createdAt, endDate)));
  const [leadsCountPrev] = await db.select({ count: sql<number>`count(*)` }).from(leads).where(and(gte(leads.createdAt, prevStart), lte(leads.createdAt, prevEnd)));

  const [appsCount] = await db.select({ count: sql<number>`count(*)` }).from(applications).where(and(gte(applications.createdAt, startDate), lte(applications.createdAt, endDate)));
  const [appsCountPrev] = await db.select({ count: sql<number>`count(*)` }).from(applications).where(and(gte(applications.createdAt, prevStart), lte(applications.createdAt, prevEnd)));

  const [appointmentsCount] = await db.select({ count: sql<number>`count(*)` }).from(appointments).where(and(gte(appointments.createdAt, startDate), lte(appointments.createdAt, endDate)));
  const [appointmentsCountPrev] = await db.select({ count: sql<number>`count(*)` }).from(appointments).where(and(gte(appointments.createdAt, prevStart), lte(appointments.createdAt, prevEnd)));

  const [proRevenue] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(aptitudeProOrders).where(and(gte(aptitudeProOrders.createdAt, startDate), lte(aptitudeProOrders.createdAt, endDate), sql`${aptitudeProOrders.status} = 'paid'`));
  const [proRevenuePrev] = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(aptitudeProOrders).where(and(gte(aptitudeProOrders.createdAt, prevStart), lte(aptitudeProOrders.createdAt, prevEnd), sql`${aptitudeProOrders.status} = 'paid'`));

  const [ieltsCount] = await db.select({ count: sql<number>`count(*)` }).from(ieltsPracticeResults).where(and(gte(ieltsPracticeResults.createdAt, startDate), lte(ieltsPracticeResults.createdAt, endDate)));
  const [ieltsCountPrev] = await db.select({ count: sql<number>`count(*)` }).from(ieltsPracticeResults).where(and(gte(ieltsPracticeResults.createdAt, prevStart), lte(ieltsPracticeResults.createdAt, prevEnd)));

  const [aptitudeCount] = await db.select({ count: sql<number>`count(*)` }).from(aptitudeResults).where(and(gte(aptitudeResults.createdAt, startDate), lte(aptitudeResults.createdAt, endDate)));
  const [aptitudeCountPrev] = await db.select({ count: sql<number>`count(*)` }).from(aptitudeResults).where(and(gte(aptitudeResults.createdAt, prevStart), lte(aptitudeResults.createdAt, prevEnd)));

  const [enrolledCount] = await db.select({ count: sql<number>`count(*)` }).from(applications).where(sql`${applications.status} = 'enrolled'`);
  const [totalAppsAll] = await db.select({ count: sql<number>`count(*)` }).from(applications);
  const conversionRate = totalAppsAll.count > 0 ? (enrolledCount.count / totalAppsAll.count) * 100 : 0;

  return {
    totalLeads: leadsCount.count,
    totalLeadsPrev: leadsCountPrev.count,
    totalApplications: appsCount.count,
    totalApplicationsPrev: appsCountPrev.count,
    totalAppointments: appointmentsCount.count,
    totalAppointmentsPrev: appointmentsCountPrev.count,
    totalProRevenue: Number(proRevenue.total) || 0,
    totalProRevenuePrev: Number(proRevenuePrev.total) || 0,
    totalIeltsTests: ieltsCount.count,
    totalIeltsTestsPrev: ieltsCountPrev.count,
    totalAptitudeTests: aptitudeCount.count,
    totalAptitudeTestsPrev: aptitudeCountPrev.count,
    conversionRate: Math.round(conversionRate * 10) / 10,
    enrolledCount: enrolledCount.count,
  };
}

export async function getLeadsOverTime(range: AnalyticsTimeRange) {
  const db = await getDb();
  if (!db) return [];
  const { startDate, endDate } = range;
  const result = await db.execute(sql`
    SELECT DATE(createdAt) as date, COUNT(*) as count
    FROM leads
    WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
    GROUP BY DATE(createdAt)
    ORDER BY DATE(createdAt)
  `);
  return (result[0] as unknown as any[]).map((r: any) => ({ date: String(r.date), count: Number(r.count) }));
}

export async function getApplicationPipeline() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    status: applications.status,
    count: sql<number>`count(*)`,
  }).from(applications)
    .groupBy(applications.status);
  return rows;
}

export async function getRevenueOverTime(range: AnalyticsTimeRange) {
  const db = await getDb();
  if (!db) return [];
  const { startDate, endDate } = range;
  const result = await db.execute(sql`
    SELECT DATE(createdAt) as date, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM aptitudeProOrders
    WHERE createdAt >= ${startDate} AND createdAt <= ${endDate} AND status = 'paid'
    GROUP BY DATE(createdAt)
    ORDER BY DATE(createdAt)
  `);
  return (result[0] as unknown as any[]).map((r: any) => ({ date: String(r.date), total: Number(r.total) || 0, count: Number(r.count) }));
}

export async function getLeadsBySource(range: AnalyticsTimeRange) {
  const db = await getDb();
  if (!db) return [];
  const { startDate, endDate } = range;
  const chatbotLeads = await db.select({ count: sql<number>`count(*)` }).from(leads)
    .where(and(gte(leads.createdAt, startDate), lte(leads.createdAt, endDate)));
  const scholarshipLeadsCount = await db.select({ count: sql<number>`count(*)` }).from(scholarshipLeads)
    .where(and(gte(scholarshipLeads.createdAt, startDate), lte(scholarshipLeads.createdAt, endDate)));
  const whatsappCount = await db.select({ count: sql<number>`count(*)` }).from(whatsappMessages)
    .where(and(gte(whatsappMessages.createdAt, startDate), lte(whatsappMessages.createdAt, endDate)));
  const aptitudeLeads = await db.select({ count: sql<number>`count(*)` }).from(aptitudeResults)
    .where(and(gte(aptitudeResults.createdAt, startDate), lte(aptitudeResults.createdAt, endDate)));

  return [
    { source: "Chatbot", count: chatbotLeads[0]?.count || 0 },
    { source: "Scholarship Page", count: scholarshipLeadsCount[0]?.count || 0 },
    { source: "WhatsApp Form", count: whatsappCount[0]?.count || 0 },
    { source: "Aptitude Test", count: aptitudeLeads[0]?.count || 0 },
  ];
}

export async function getTopCountries(range: AnalyticsTimeRange) {
  const db = await getDb();
  if (!db) return [];
  const { startDate, endDate } = range;
  const rows = await db.select({
    country: leads.preferredCountry,
    count: sql<number>`count(*)`,
  }).from(leads)
    .where(and(
      gte(leads.createdAt, startDate),
      lte(leads.createdAt, endDate),
      sql`${leads.preferredCountry} IS NOT NULL AND ${leads.preferredCountry} != ''`
    ))
    .groupBy(leads.preferredCountry)
    .orderBy(sql`count(*) DESC`)
    .limit(10);
  return rows;
}

export async function getCounselorPerformance() {
  const db = await getDb();
  if (!db) return [];
  const allCounselors = await db.select().from(counselors).where(sql`${counselors.isActive} = true`);
  if (allCounselors.length === 0) return [];

  // Batch queries instead of N+1
  const appsByAssigned = await db.select({
    counselor: applications.assignedCounselor,
    count: sql<number>`count(*)`,
  }).from(applications).groupBy(applications.assignedCounselor);

  const enrolledByAssigned = await db.select({
    counselor: applications.assignedCounselor,
    count: sql<number>`count(*)`,
  }).from(applications).where(sql`${applications.status} = 'enrolled'`).groupBy(applications.assignedCounselor);

  const leadsByAssigned = await db.select({
    counselor: leads.assignedTo,
    count: sql<number>`count(*)`,
  }).from(leads).where(sql`${leads.assignedTo} IS NOT NULL`).groupBy(leads.assignedTo);

  const appsMap = new Map(appsByAssigned.map(r => [r.counselor, r.count]));
  const enrolledMap = new Map(enrolledByAssigned.map(r => [r.counselor, r.count]));
  const leadsMap = new Map(leadsByAssigned.map(r => [r.counselor, r.count]));

  return allCounselors.map(c => {
    const apps = appsMap.get(c.name) || 0;
    const enrolled = enrolledMap.get(c.name) || 0;
    const leadsAssigned = leadsMap.get(c.name) || 0;
    return {
      name: c.name,
      specialization: c.specialization || "General",
      leadsAssigned,
      applicationsManaged: apps,
      enrolled,
      enrollmentRate: apps > 0 ? Math.round((enrolled / apps) * 100) : 0,
    };
  });
}

export async function getScholarshipLeadsOverTime(range: AnalyticsTimeRange) {
  const db = await getDb();
  if (!db) return [];
  const { startDate, endDate } = range;
  const result = await db.execute(sql`
    SELECT DATE(createdAt) as date, COUNT(*) as count
    FROM scholarshipLeads
    WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
    GROUP BY DATE(createdAt)
    ORDER BY DATE(createdAt)
  `);
  return (result[0] as unknown as any[]).map((r: any) => ({ date: String(r.date), count: Number(r.count) }));
}


// ==========================================
// DRIP CAMPAIGN FUNCTIONS
// ==========================================
import {
  dripCampaigns, InsertDripCampaign, DripCampaign,
  dripEmailSteps, InsertDripEmailStep, DripEmailStep,
  dripEnrollments, InsertDripEnrollment, DripEnrollment,
  dripEmailLogs, InsertDripEmailLog, DripEmailLog,
} from "../drizzle/schema";

// --- Campaigns ---
export async function createDripCampaign(data: InsertDripCampaign): Promise<DripCampaign | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(dripCampaigns).values(data);
  const insertId = (result as any)[0]?.insertId;
  if (!insertId) return null;
  return getDripCampaignById(insertId);
}

export async function getAllDripCampaigns(): Promise<DripCampaign[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dripCampaigns).orderBy(sql`${dripCampaigns.createdAt} DESC`);
}

export async function getDripCampaignById(id: number): Promise<DripCampaign | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(dripCampaigns).where(eq(dripCampaigns.id, id)).limit(1);
  return rows[0] || null;
}

export async function updateDripCampaign(id: number, data: Partial<InsertDripCampaign>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(dripCampaigns).set(data).where(eq(dripCampaigns.id, id));
}

export async function deleteDripCampaign(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete all related data
  await db.delete(dripEmailLogs).where(
    sql`${dripEmailLogs.enrollmentId} IN (SELECT id FROM dripEnrollments WHERE campaignId = ${id})`
  );
  await db.delete(dripEnrollments).where(eq(dripEnrollments.campaignId, id));
  await db.delete(dripEmailSteps).where(eq(dripEmailSteps.campaignId, id));
  await db.delete(dripCampaigns).where(eq(dripCampaigns.id, id));
}

// --- Email Steps ---
export async function createDripEmailStep(data: InsertDripEmailStep): Promise<DripEmailStep | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(dripEmailSteps).values(data);
  const insertId = (result as any)[0]?.insertId;
  if (!insertId) return null;
  return getDripEmailStepById(insertId);
}

export async function getDripEmailStepsByCampaignId(campaignId: number): Promise<DripEmailStep[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dripEmailSteps).where(eq(dripEmailSteps.campaignId, campaignId)).orderBy(dripEmailSteps.stepOrder);
}

export async function getDripEmailStepById(id: number): Promise<DripEmailStep | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(dripEmailSteps).where(eq(dripEmailSteps.id, id)).limit(1);
  return rows[0] || null;
}

export async function updateDripEmailStep(id: number, data: Partial<InsertDripEmailStep>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(dripEmailSteps).set(data).where(eq(dripEmailSteps.id, id));
}

export async function deleteDripEmailStep(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(dripEmailSteps).where(eq(dripEmailSteps.id, id));
}

// --- Enrollments ---
export async function createDripEnrollment(data: InsertDripEnrollment): Promise<DripEnrollment | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(dripEnrollments).values(data);
  const insertId = (result as any)[0]?.insertId;
  if (!insertId) return null;
  return getDripEnrollmentById(insertId);
}

export async function getDripEnrollmentById(id: number): Promise<DripEnrollment | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(dripEnrollments).where(eq(dripEnrollments.id, id)).limit(1);
  return rows[0] || null;
}

export async function getDripEnrollmentsByCampaignId(campaignId: number): Promise<DripEnrollment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dripEnrollments).where(eq(dripEnrollments.campaignId, campaignId)).orderBy(sql`${dripEnrollments.enrolledAt} DESC`);
}

export async function getDripEnrollmentByEmailAndCampaign(email: string, campaignId: number): Promise<DripEnrollment | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(dripEnrollments)
    .where(sql`${dripEnrollments.contactEmail} = ${email} AND ${dripEnrollments.campaignId} = ${campaignId}`)
    .limit(1);
  return rows[0] || null;
}

export async function updateDripEnrollment(id: number, data: Partial<InsertDripEnrollment>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(dripEnrollments).set(data).where(eq(dripEnrollments.id, id));
}

export async function getDripEnrollmentByUnsubscribeToken(token: string): Promise<DripEnrollment | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(dripEnrollments)
    .where(eq(dripEnrollments.unsubscribeToken, token))
    .limit(1);
  return rows[0] || null;
}

/**
 * Get all enrollments that are due for their next email.
 * Finds active enrollments where nextSendAt <= now.
 */
export async function getDueEnrollments(): Promise<DripEnrollment[]> {
  return withDbRetry(async () => {
    const db = await getDb();
    if (!db) return [];
    // Use database NOW() instead of JS new Date() to avoid timezone mismatch
    return db.select().from(dripEnrollments)
      .where(sql`${dripEnrollments.status} = 'active' AND ${dripEnrollments.nextSendAt} IS NOT NULL AND ${dripEnrollments.nextSendAt} <= NOW()`)
      .orderBy(dripEnrollments.nextSendAt);
  }, "getDueEnrollments").catch(() => []);
}

// --- Email Logs ---
export async function createDripEmailLog(data: InsertDripEmailLog): Promise<DripEmailLog | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(dripEmailLogs).values(data);
  const insertId = (result as any)[0]?.insertId;
  if (!insertId) return null;
  const rows = await db.select().from(dripEmailLogs).where(eq(dripEmailLogs.id, insertId)).limit(1);
  return rows[0] || null;
}

export async function getDripEmailLogsByEnrollmentId(enrollmentId: number): Promise<DripEmailLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dripEmailLogs).where(eq(dripEmailLogs.enrollmentId, enrollmentId)).orderBy(dripEmailLogs.sentAt);
}

export async function getDripEmailLogById(id: number): Promise<DripEmailLog | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(dripEmailLogs).where(eq(dripEmailLogs.id, id)).limit(1);
  return rows[0] || null;
}

export async function updateDripEmailLog(id: number, data: Partial<InsertDripEmailLog>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(dripEmailLogs).set(data).where(eq(dripEmailLogs.id, id));
}

/**
 * Get campaign analytics: total sent, opened, clicked, unsubscribed
 */
export async function getDripCampaignAnalytics(campaignId: number) {
  const db = await getDb();
  if (!db) return { totalEnrolled: 0, active: 0, completed: 0, unsubscribed: 0, totalSent: 0, totalOpened: 0, totalClicked: 0 };

  const enrollmentStats = await db.select({
    total: sql<number>`COUNT(*)`,
    active: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
    completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
    unsubscribed: sql<number>`SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END)`,
  }).from(dripEnrollments).where(eq(dripEnrollments.campaignId, campaignId));

  const emailStats = await db.select({
    totalSent: sql<number>`COUNT(*)`,
    totalOpened: sql<number>`SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END)`,
    totalClicked: sql<number>`SUM(CASE WHEN clickedAt IS NOT NULL THEN 1 ELSE 0 END)`,
  }).from(dripEmailLogs)
    .where(sql`${dripEmailLogs.enrollmentId} IN (SELECT id FROM dripEnrollments WHERE campaignId = ${campaignId})`);

  const es = enrollmentStats[0] || { total: 0, active: 0, completed: 0, unsubscribed: 0 };
  const em = emailStats[0] || { totalSent: 0, totalOpened: 0, totalClicked: 0 };

  return {
    totalEnrolled: Number(es.total),
    active: Number(es.active),
    completed: Number(es.completed),
    unsubscribed: Number(es.unsubscribed),
    totalSent: Number(em.totalSent),
    totalOpened: Number(em.totalOpened),
    totalClicked: Number(em.totalClicked),
  };
}

/**
 * Get all campaigns with their step count and enrollment count for admin list view
 */
export async function getDripCampaignsWithStats() {
  const db = await getDb();
  if (!db) return [];
  
  const campaigns = await db.select().from(dripCampaigns).orderBy(sql`${dripCampaigns.createdAt} DESC`);
  
  const result = [];
  for (const campaign of campaigns) {
    const steps = await db.select({ count: sql<number>`COUNT(*)` })
      .from(dripEmailSteps)
      .where(eq(dripEmailSteps.campaignId, campaign.id));
    
    const enrollments = await db.select({
      total: sql<number>`COUNT(*)`,
      active: sql<number>`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`,
    }).from(dripEnrollments).where(eq(dripEnrollments.campaignId, campaign.id));

    const emails = await db.select({
      sent: sql<number>`COUNT(*)`,
      opened: sql<number>`SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END)`,
    }).from(dripEmailLogs)
      .where(sql`${dripEmailLogs.enrollmentId} IN (SELECT id FROM dripEnrollments WHERE campaignId = ${campaign.id})`);

    result.push({
      ...campaign,
      stepCount: Number(steps[0]?.count || 0),
      totalEnrolled: Number(enrollments[0]?.total || 0),
      activeEnrolled: Number(enrollments[0]?.active || 0),
      totalSent: Number(emails[0]?.sent || 0),
      openRate: Number(emails[0]?.sent || 0) > 0 
        ? Math.round((Number(emails[0]?.opened || 0) / Number(emails[0]?.sent || 0)) * 100) 
        : 0,
    });
  }
  return result;
}


// ── Lead Scoring & Hot Leads ──────────────────────────────────────────────────

/**
 * Get hot leads across all campaigns, scored by email engagement.
 * Scoring: +5 per open, +10 per click, -20 per unsubscribe
 */
export async function getHotLeads(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  const results = await db.execute(sql`
    SELECT 
      e.id as enrollmentId,
      e.contactEmail,
      e.contactName,
      e.contactPhone,
      e.campaignId,
      c.name as campaignName,
      e.status,
      e.enrolledAt,
      e.source,
      COALESCE(SUM(CASE WHEN el.openedAt IS NOT NULL THEN 5 ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN el.clickedAt IS NOT NULL THEN 10 ELSE 0 END), 0) +
      CASE WHEN e.status = 'unsubscribed' THEN -20 ELSE 0 END as engagementScore,
      COUNT(DISTINCT CASE WHEN el.openedAt IS NOT NULL THEN el.id END) as totalOpens,
      COUNT(DISTINCT CASE WHEN el.clickedAt IS NOT NULL THEN el.id END) as totalClicks,
      COUNT(DISTINCT el.id) as totalEmailsSent
    FROM dripEnrollments e
    JOIN dripCampaigns c ON c.id = e.campaignId
    LEFT JOIN dripEmailLogs el ON el.enrollmentId = e.id
    GROUP BY e.id, e.contactEmail, e.contactName, e.contactPhone, e.campaignId, c.name, e.status, e.enrolledAt, e.source
    HAVING engagementScore > 0
    ORDER BY engagementScore DESC
    LIMIT ${limit}
  `);
  
  const rows = (results as any)[0] || [];
  return Array.from(rows).map((row: any) => ({
    enrollmentId: row.enrollmentId,
    contactEmail: row.contactEmail,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    status: row.status,
    enrolledAt: row.enrolledAt,
    source: row.source,
    engagementScore: Number(row.engagementScore),
    totalOpens: Number(row.totalOpens),
    totalClicks: Number(row.totalClicks),
    totalEmailsSent: Number(row.totalEmailsSent),
  }));
}

/**
 * Get campaign performance metrics for alert evaluation
 */
export async function getCampaignPerformanceMetrics() {
  const db = await getDb();
  if (!db) return [];
  const results = await db.execute(sql`
    SELECT 
      c.id as campaignId,
      c.name as campaignName,
      c.isActive,
      COUNT(DISTINCT e.id) as totalEnrolled,
      COUNT(DISTINCT CASE WHEN e.status = 'unsubscribed' THEN e.id END) as totalUnsubscribed,
      COUNT(DISTINCT el.id) as totalSent,
      COUNT(DISTINCT CASE WHEN el.openedAt IS NOT NULL THEN el.id END) as totalOpened,
      COUNT(DISTINCT CASE WHEN el.clickedAt IS NOT NULL THEN el.id END) as totalClicked
    FROM dripCampaigns c
    LEFT JOIN dripEnrollments e ON e.campaignId = c.id
    LEFT JOIN dripEmailLogs el ON el.enrollmentId = e.id
    WHERE c.isActive = true
    GROUP BY c.id, c.name, c.isActive
    HAVING totalSent >= 10
  `);
  
  const rows = (results as any)[0] || [];
  return Array.from(rows).map((row: any) => ({
    campaignId: Number(row.campaignId),
    campaignName: row.campaignName,
    totalEnrolled: Number(row.totalEnrolled),
    totalUnsubscribed: Number(row.totalUnsubscribed),
    totalSent: Number(row.totalSent),
    totalOpened: Number(row.totalOpened),
    totalClicked: Number(row.totalClicked),
    openRate: Number(row.totalSent) > 0 ? Math.round((Number(row.totalOpened) / Number(row.totalSent)) * 100) : 0,
    clickRate: Number(row.totalSent) > 0 ? Math.round((Number(row.totalClicked) / Number(row.totalSent)) * 100) : 0,
    unsubscribeRate: Number(row.totalEnrolled) > 0 ? Math.round((Number(row.totalUnsubscribed) / Number(row.totalEnrolled)) * 100) : 0,
  }));
}


// ==========================================
// Blog System Functions
// ==========================================

// --- Blog Categories ---
export async function createBlogCategory(data: InsertBlogCategory): Promise<BlogCategory | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(blogCategories).values(data);
  const [cat] = await db.select().from(blogCategories).where(eq(blogCategories.slug, data.slug));
  return cat || null;
}

export async function listBlogCategories(): Promise<BlogCategory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogCategories).orderBy(blogCategories.name);
}

export async function updateBlogCategory(id: number, data: Partial<InsertBlogCategory>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(blogCategories).set(data).where(eq(blogCategories.id, id));
}

export async function deleteBlogCategory(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(blogCategories).where(eq(blogCategories.id, id));
}

// --- Blog Tags ---
export async function createBlogTag(data: InsertBlogTag): Promise<BlogTag | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(blogTags).values(data);
  const [tag] = await db.select().from(blogTags).where(eq(blogTags.slug, data.slug));
  return tag || null;
}

export async function listBlogTags(): Promise<BlogTag[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogTags).orderBy(blogTags.name);
}

export async function deleteBlogTag(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(blogPostTags).where(eq(blogPostTags.tagId, id));
  await db.delete(blogTags).where(eq(blogTags.id, id));
}

// --- Blog Posts ---
export async function createBlogPost(data: InsertBlogPost): Promise<BlogPost | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(blogPosts).values(data);
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, data.slug));
  return post || null;
}

export async function updateBlogPost(id: number, data: Partial<InsertBlogPost>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(blogPosts).set(data).where(eq(blogPosts.id, id));
}

export async function deleteBlogPost(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(blogPostTags).where(eq(blogPostTags.postId, id));
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const db = await getDb();
  if (!db) return null;
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
  return post || null;
}

export async function getBlogPostById(id: number): Promise<BlogPost | null> {
  const db = await getDb();
  if (!db) return null;
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
  return post || null;
}

export async function listBlogPosts(options: {
  status?: "draft" | "published" | "archived";
  categoryId?: number;
  limit?: number;
  offset?: number;
}): Promise<{ posts: BlogPost[]; total: number }> {
  const db = await getDb();
  if (!db) return { posts: [], total: 0 };

  let query = db.select().from(blogPosts);
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(blogPosts);

  if (options.status) {
    query = query.where(eq(blogPosts.status, options.status)) as typeof query;
    countQuery = countQuery.where(eq(blogPosts.status, options.status)) as typeof countQuery;
  }
  if (options.categoryId) {
    query = query.where(eq(blogPosts.categoryId, options.categoryId)) as typeof query;
    countQuery = countQuery.where(eq(blogPosts.categoryId, options.categoryId)) as typeof countQuery;
  }

  const [countResult] = await countQuery;
  const total = Number(countResult?.count || 0);

  const posts = await query
    .orderBy(desc(blogPosts.createdAt))
    .limit(options.limit || 20)
    .offset(options.offset || 0);

  return { posts, total };
}

export async function listPublishedBlogPosts(options: {
  categorySlug?: string;
  tagSlug?: string;
  limit?: number;
  offset?: number;
}): Promise<{ posts: (BlogPost & { categoryName?: string; tags: string[] })[]; total: number }> {
  const db = await getDb();
  if (!db) return { posts: [], total: 0 };

  let categoryId: number | undefined;
  if (options.categorySlug) {
    const [cat] = await db.select().from(blogCategories).where(eq(blogCategories.slug, options.categorySlug));
    categoryId = cat?.id;
    if (!categoryId) return { posts: [], total: 0 };
  }

  let postIds: number[] | undefined;
  if (options.tagSlug) {
    const [tag] = await db.select().from(blogTags).where(eq(blogTags.slug, options.tagSlug));
    if (!tag) return { posts: [], total: 0 };
    const pts = await db.select({ postId: blogPostTags.postId }).from(blogPostTags).where(eq(blogPostTags.tagId, tag.id));
    postIds = pts.map(p => p.postId);
    if (postIds.length === 0) return { posts: [], total: 0 };
  }

  let baseConditions = [eq(blogPosts.status, "published" as const)];
  if (categoryId) baseConditions.push(eq(blogPosts.categoryId, categoryId));
  if (postIds) baseConditions.push(inArray(blogPosts.id, postIds));

  const whereClause = baseConditions.length === 1 ? baseConditions[0] : and(...baseConditions);

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(blogPosts).where(whereClause);
  const total = Number(countResult?.count || 0);

  const posts = await db.select().from(blogPosts)
    .where(whereClause)
    .orderBy(desc(blogPosts.publishedAt))
    .limit(options.limit || 12)
    .offset(options.offset || 0);

  // Enrich with category names and tags
  const enriched = await Promise.all(posts.map(async (post) => {
    let categoryName: string | undefined;
    if (post.categoryId) {
      const [cat] = await db.select().from(blogCategories).where(eq(blogCategories.id, post.categoryId));
      categoryName = cat?.name;
    }
    const postTagRows = await db.select({ tagId: blogPostTags.tagId }).from(blogPostTags).where(eq(blogPostTags.postId, post.id));
    const tags: string[] = [];
    for (const pt of postTagRows) {
      const [tag] = await db.select().from(blogTags).where(eq(blogTags.id, pt.tagId));
      if (tag) tags.push(tag.name);
    }
    return { ...post, categoryName, tags };
  }));

  return { posts: enriched, total };
}

// --- Blog Post Tags ---
export async function setPostTags(postId: number, tagIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(blogPostTags).where(eq(blogPostTags.postId, postId));
  if (tagIds.length > 0) {
    await db.insert(blogPostTags).values(tagIds.map(tagId => ({ postId, tagId })));
  }
}

export async function getPostTags(postId: number): Promise<BlogTag[]> {
  const db = await getDb();
  if (!db) return [];
  const pts = await db.select({ tagId: blogPostTags.tagId }).from(blogPostTags).where(eq(blogPostTags.postId, postId));
  if (pts.length === 0) return [];
  const tagIds = pts.map(p => p.tagId);
  return db.select().from(blogTags).where(inArray(blogTags.id, tagIds));
}


// Blog Comments functions
export async function createBlogComment(data: InsertBlogComment): Promise<BlogComment | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(blogComments).values(data);
  const insertId = result[0].insertId;
  const [created] = await db.select().from(blogComments).where(eq(blogComments.id, insertId)).limit(1);
  return created || null;
}

export async function getCommentsByPostId(postId: number, status?: string): Promise<BlogComment[]> {
  const db = await getDb();
  if (!db) return [];

  if (status) {
    return await db.select().from(blogComments)
      .where(and(eq(blogComments.postId, postId), eq(blogComments.status, status as "pending" | "approved" | "rejected")))
      .orderBy(desc(blogComments.createdAt));
  }
  return await db.select().from(blogComments)
    .where(eq(blogComments.postId, postId))
    .orderBy(desc(blogComments.createdAt));
}

export async function getAllBlogComments(limit = 50, offset = 0): Promise<BlogComment[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(blogComments)
    .orderBy(desc(blogComments.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateBlogCommentStatus(id: number, status: "pending" | "approved" | "rejected"): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(blogComments).set({ status }).where(eq(blogComments.id, id));
}

export async function deleteBlogComment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(blogComments).where(eq(blogComments.id, id));
}

export async function getPostRatingSummary(postId: number): Promise<{ averageRating: number; totalRatings: number }> {
  const db = await getDb();
  if (!db) return { averageRating: 0, totalRatings: 0 };

  const [result] = await db.select({
    avgRating: sql<number>`COALESCE(AVG(${blogComments.rating}), 0)`,
    totalRatings: sql<number>`COUNT(${blogComments.rating})`,
  }).from(blogComments)
    .where(and(
      eq(blogComments.postId, postId),
      eq(blogComments.status, "approved"),
      sql`${blogComments.rating} IS NOT NULL`
    ));

  return {
    averageRating: Number(result?.avgRating || 0),
    totalRatings: Number(result?.totalRatings || 0),
  };
}

export async function getMultiplePostRatings(postIds: number[]): Promise<Record<number, { averageRating: number; totalRatings: number }>> {
  const db = await getDb();
  if (!db || postIds.length === 0) return {};

  const results = await db.select({
    postId: blogComments.postId,
    avgRating: sql<number>`COALESCE(AVG(${blogComments.rating}), 0)`,
    totalRatings: sql<number>`COUNT(${blogComments.rating})`,
  }).from(blogComments)
    .where(and(
      inArray(blogComments.postId, postIds),
      eq(blogComments.status, "approved"),
      sql`${blogComments.rating} IS NOT NULL`
    ))
    .groupBy(blogComments.postId);

  const map: Record<number, { averageRating: number; totalRatings: number }> = {};
  for (const r of results) {
    map[r.postId] = { averageRating: Number(r.avgRating), totalRatings: Number(r.totalRatings) };
  }
  return map;
}

export async function countCommentsByPostId(postId: number, status?: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [eq(blogComments.postId, postId)];
  if (status) conditions.push(eq(blogComments.status, status as "pending" | "approved" | "rejected"));

  const [result] = await db.select({ count: sql<number>`count(*)` }).from(blogComments).where(and(...conditions));
  return Number(result?.count || 0);
}

// ==================== SIMULATOR HELPERS ====================

export async function createSimulatorSession(data: InsertSimulatorSession): Promise<SimulatorSession | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(simulatorSessions).values(data);
  const insertId = result[0].insertId;
  const [created] = await db.select().from(simulatorSessions).where(eq(simulatorSessions.id, insertId)).limit(1);
  return created || null;
}

export async function getSimulatorSessionBySessionId(sessionId: string): Promise<SimulatorSession | null> {
  const db = await getDb();
  if (!db) return null;

  const [session] = await db.select().from(simulatorSessions).where(eq(simulatorSessions.sessionId, sessionId)).limit(1);
  return session || null;
}

export async function updateSimulatorSession(sessionId: string, data: Partial<SimulatorSession>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(simulatorSessions).set(data).where(eq(simulatorSessions.sessionId, sessionId));
}

export async function getAllSimulatorSessions(limit = 50, offset = 0): Promise<SimulatorSession[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(simulatorSessions)
    .orderBy(desc(simulatorSessions.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createSimulatorChoice(data: InsertSimulatorChoice): Promise<SimulatorChoice | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(simulatorChoices).values(data);
  const insertId = result[0].insertId;
  const [created] = await db.select().from(simulatorChoices).where(eq(simulatorChoices.id, insertId)).limit(1);
  return created || null;
}

export async function getChoicesBySessionId(sessionId: string): Promise<SimulatorChoice[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(simulatorChoices)
    .where(eq(simulatorChoices.sessionId, sessionId))
    .orderBy(simulatorChoices.day, simulatorChoices.createdAt);
}

export async function createSimulatorResult(data: InsertSimulatorResult): Promise<SimulatorResult | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(simulatorResults).values(data);
  const insertId = result[0].insertId;
  const [created] = await db.select().from(simulatorResults).where(eq(simulatorResults.id, insertId)).limit(1);
  return created || null;
}

export async function getSimulatorResultBySessionId(sessionId: string): Promise<SimulatorResult | null> {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select().from(simulatorResults).where(eq(simulatorResults.sessionId, sessionId)).limit(1);
  return result || null;
}

export async function updateSimulatorResult(sessionId: string, data: Partial<SimulatorResult>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(simulatorResults).set(data).where(eq(simulatorResults.sessionId, sessionId));
}

export async function getAllSimulatorResults(limit = 50, offset = 0): Promise<SimulatorResult[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(simulatorResults)
    .orderBy(desc(simulatorResults.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getSimulatorCompletionStats(): Promise<{ total: number; completed: number; inProgress: number; abandoned: number }> {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0, inProgress: 0, abandoned: 0 };

  const [stats] = await db.select({
    total: sql<number>`COUNT(*)`,
    completed: sql<number>`SUM(CASE WHEN ${simulatorSessions.status} = 'completed' THEN 1 ELSE 0 END)`,
    inProgress: sql<number>`SUM(CASE WHEN ${simulatorSessions.status} = 'in_progress' THEN 1 ELSE 0 END)`,
    abandoned: sql<number>`SUM(CASE WHEN ${simulatorSessions.status} = 'abandoned' THEN 1 ELSE 0 END)`,
  }).from(simulatorSessions);

  return {
    total: Number(stats?.total || 0),
    completed: Number(stats?.completed || 0),
    inProgress: Number(stats?.inProgress || 0),
    abandoned: Number(stats?.abandoned || 0),
  };
}


// ==========================================
// AI Agent Command Center DB Helpers
// ==========================================



// --- Agent Configs ---
export async function getAgentConfig(agentName: string): Promise<AgentConfig | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(agentConfigs).where(eq(agentConfigs.agentName, agentName)).limit(1);
  return rows[0] ?? null;
}

export async function getAllAgentConfigs(): Promise<AgentConfig[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentConfigs).orderBy(agentConfigs.agentName);
}

export async function upsertAgentConfig(data: InsertAgentConfig): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getAgentConfig(data.agentName);
  if (existing) {
    await db.update(agentConfigs).set(data).where(eq(agentConfigs.agentName, data.agentName));
  } else {
    await db.insert(agentConfigs).values(data);
  }
}

export async function updateAgentConfig(agentName: string, data: Partial<InsertAgentConfig>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(agentConfigs).set(data).where(eq(agentConfigs.agentName, agentName));
}

// --- Agent Run Logs ---
export async function createAgentRunLog(data: InsertAgentRunLog): Promise<AgentRunLog | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(agentRunLogs).values(data);
  const id = result[0].insertId;
  const rows = await db.select().from(agentRunLogs).where(eq(agentRunLogs.id, id));
  return rows[0] ?? null;
}

export async function updateAgentRunLog(id: number, data: Partial<InsertAgentRunLog>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(agentRunLogs).set(data).where(eq(agentRunLogs.id, id));
}

export async function getAgentRunLogs(agentName: string, limit = 20): Promise<AgentRunLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentRunLogs)
    .where(eq(agentRunLogs.agentName, agentName))
    .orderBy(desc(agentRunLogs.startedAt))
    .limit(limit);
}

export async function getAllRecentAgentRuns(limit = 50): Promise<AgentRunLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentRunLogs)
    .orderBy(desc(agentRunLogs.startedAt))
    .limit(limit);
}

// --- Lead Assignments ---
export async function createLeadAssignment(data: InsertLeadAssignment): Promise<LeadAssignment | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(leadAssignments).values(data);
  const id = result[0].insertId;
  const rows = await db.select().from(leadAssignments).where(eq(leadAssignments.id, id));
  return rows[0] ?? null;
}

export async function getLeadAssignmentByLeadId(leadId: number, leadSource: string): Promise<LeadAssignment | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(leadAssignments)
    .where(and(eq(leadAssignments.leadId, leadId), eq(leadAssignments.leadSource, leadSource)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLeadAssignmentById(id: number): Promise<LeadAssignment | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(leadAssignments)
    .where(eq(leadAssignments.id, id))
    .limit(1);
  return rows[0] ?? null;
}
export async function getAllLeadAssignments(statusFilter?: string): Promise<LeadAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter) {
    return db.select().from(leadAssignments)
      .where(eq(leadAssignments.status, statusFilter as any))
      .orderBy(desc(leadAssignments.createdAt));
  }
  return db.select().from(leadAssignments).orderBy(desc(leadAssignments.createdAt));
}

export async function getLeadAssignmentsByCounselor(counselorEmail: string): Promise<LeadAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadAssignments)
    .where(eq(leadAssignments.counselorEmail, counselorEmail))
    .orderBy(desc(leadAssignments.createdAt));
}

export async function updateLeadAssignment(id: number, data: Partial<InsertLeadAssignment>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(leadAssignments).set(data).where(eq(leadAssignments.id, id));
}

export async function getUnassignedLeadsCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const allLeads = await getAllLeads();
  let unassigned = 0;
  for (const lead of allLeads) {
    const assignment = await getLeadAssignmentByLeadId(lead.id, lead.source || "chatbot");
    if (!assignment) unassigned++;
  }
  return unassigned;
}

export async function getStaleAssignments(hoursThreshold = 48): Promise<LeadAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
  return db.select().from(leadAssignments)
    .where(
      and(
        eq(leadAssignments.status, "assigned"),
        lte(leadAssignments.assignedAt, cutoff)
      )
    )
    .orderBy(leadAssignments.assignedAt);
}

// --- Follow-Up Actions ---
export async function createFollowUpAction(data: InsertFollowUpAction): Promise<FollowUpAction | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(followUpActions).values(data);
  const id = result[0].insertId;
  const rows = await db.select().from(followUpActions).where(eq(followUpActions.id, id));
  return rows[0] ?? null;
}

export async function getDueFollowUpActions(): Promise<FollowUpAction[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(followUpActions)
    .where(
      and(
        eq(followUpActions.status, "pending"),
        lte(followUpActions.scheduledAt, now)
      )
    )
    .orderBy(followUpActions.scheduledAt);
}

export async function updateFollowUpAction(id: number, data: Partial<InsertFollowUpAction>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(followUpActions).set(data).where(eq(followUpActions.id, id));
}

export async function getFollowUpActionsByAssignment(assignmentId: number): Promise<FollowUpAction[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(followUpActions)
    .where(eq(followUpActions.assignmentId, assignmentId))
    .orderBy(followUpActions.dayOffset);
}

// --- SEO Content Calendar ---
export async function createSeoContentEntry(data: InsertSeoContentCalendar): Promise<SeoContentCalendar | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(seoContentCalendar).values(data);
  const id = result[0].insertId;
  const rows = await db.select().from(seoContentCalendar).where(eq(seoContentCalendar.id, id));
  return rows[0] ?? null;
}

export async function getAllSeoContentEntries(statusFilter?: string): Promise<SeoContentCalendar[]> {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter) {
    return db.select().from(seoContentCalendar)
      .where(eq(seoContentCalendar.status, statusFilter as any))
      .orderBy(desc(seoContentCalendar.createdAt));
  }
  return db.select().from(seoContentCalendar).orderBy(desc(seoContentCalendar.createdAt));
}

export async function updateSeoContentEntry(id: number, data: Partial<InsertSeoContentCalendar>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(seoContentCalendar).set(data).where(eq(seoContentCalendar.id, id));
}

export async function getSeoContentByStatus(status: string): Promise<SeoContentCalendar[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(seoContentCalendar)
    .where(eq(seoContentCalendar.status, status as any))
    .orderBy(seoContentCalendar.scheduledDate);
}

// --- Daily Reports ---
export async function createDailyReport(data: InsertDailyReport): Promise<DailyReport | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(dailyReports).values(data);
  const id = result[0].insertId;
  const rows = await db.select().from(dailyReports).where(eq(dailyReports.id, id));
  return rows[0] ?? null;
}

export async function getDailyReportByDate(reportDate: string): Promise<DailyReport | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(dailyReports)
    .where(eq(dailyReports.reportDate, reportDate))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllDailyReports(limit = 30): Promise<DailyReport[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyReports)
    .orderBy(desc(dailyReports.reportDate))
    .limit(limit);
}

export async function updateDailyReport(id: number, data: Partial<InsertDailyReport>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(dailyReports).set(data).where(eq(dailyReports.id, id));
}

// --- Agent Dashboard Aggregates ---
export async function getAgentDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const configs = await getAllAgentConfigs();
  const recentRuns = await getAllRecentAgentRuns(100);
  const assignments = await getAllLeadAssignments();
  const seoEntries = await getAllSeoContentEntries();
  const reports = await getAllDailyReports(7);

  // Calculate stats
  const totalLeadsAssigned = assignments.length;
  const activeLeads = assignments.filter(a => !["converted", "closed"].includes(a.status)).length;
  const convertedLeads = assignments.filter(a => a.status === "converted").length;
  const escalatedLeads = assignments.filter(a => a.status === "escalated").length;
  
  const articlesPublished = seoEntries.filter(e => e.status === "published").length;
  const articlesPlanned = seoEntries.filter(e => e.status === "planned").length;
  const articlesGenerating = seoEntries.filter(e => ["generating", "generated", "review"].includes(e.status)).length;

  // Counselor workload
  const counselorStats: Record<string, { assigned: number; contacted: number; converted: number }> = {};
  for (const a of assignments) {
    if (!counselorStats[a.counselorName]) {
      counselorStats[a.counselorName] = { assigned: 0, contacted: 0, converted: 0 };
    }
    counselorStats[a.counselorName].assigned++;
    if (a.status !== "assigned") counselorStats[a.counselorName].contacted++;
    if (a.status === "converted") counselorStats[a.counselorName].converted++;
  }

  return {
    agents: configs,
    recentRuns,
    leads: { total: totalLeadsAssigned, active: activeLeads, converted: convertedLeads, escalated: escalatedLeads },
    seo: { published: articlesPublished, planned: articlesPlanned, inProgress: articlesGenerating },
    counselorStats,
    recentReports: reports,
  };
}

// ── CRM Chat History ─────────────────────────────────────────────────────────
export async function getCrmChatHistory(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  const { crmChatHistory } = await import("../drizzle/schema");
  const { asc } = await import("drizzle-orm");
  return db.select().from(crmChatHistory).where(eq(crmChatHistory.leadId, leadId)).orderBy(asc(crmChatHistory.createdAt));
}

export async function saveCrmChatMessage(leadId: number, role: "user" | "assistant", content: string, staffEmail?: string) {
  const db = await getDb();
  if (!db) return null;
  const { crmChatHistory } = await import("../drizzle/schema");
  const result = await db.insert(crmChatHistory).values({ leadId, role, content, staffEmail: staffEmail ?? null });
  return result;
}

export async function clearCrmChatHistory(leadId: number) {
  const db = await getDb();
  if (!db) return;
  const { crmChatHistory } = await import("../drizzle/schema");
  await db.delete(crmChatHistory).where(eq(crmChatHistory.leadId, leadId));
}

// ─── Sprint 4-6: CRM Student Documents ───────────────────────────────────────
import { crmStudentDocuments, crmAppointments, crmActivityTimeline, crmNotifications } from "../drizzle/schema";
export async function getCrmDocsByLead(leadId: number) {
  const db = await getDb();
  return db!.select().from(crmStudentDocuments).where(eq(crmStudentDocuments.leadId, leadId)).orderBy(crmStudentDocuments.createdAt);
}
export async function upsertCrmDoc(data: { leadId: number; docType: string; docLabel: string; status?: "pending"|"submitted"|"verified"|"rejected"; notes?: string; staffEmail?: string; fileUrl?: string }) {
  const db = await getDb();
  const existing = await db!.select().from(crmStudentDocuments)
    .where(and(eq(crmStudentDocuments.leadId, data.leadId), eq(crmStudentDocuments.docType, data.docType)))
    .limit(1);
  if (existing.length > 0) {
    await db!.update(crmStudentDocuments).set({ status: data.status || "pending", notes: data.notes, staffEmail: data.staffEmail, fileUrl: data.fileUrl, updatedAt: new Date() }).where(eq(crmStudentDocuments.id, existing[0].id));
    return existing[0].id;
  } else {
    const [result] = await db!.insert(crmStudentDocuments).values({ leadId: data.leadId, docType: data.docType, docLabel: data.docLabel, status: data.status || "pending", notes: data.notes, staffEmail: data.staffEmail, fileUrl: data.fileUrl });
    return (result as any).insertId;
  }
}
export async function initDefaultDocChecklist(leadId: number, staffEmail: string) {
  const defaults = [
    { docType: "passport", docLabel: "Passport (Valid 18+ months)" },
    { docType: "transcript", docLabel: "Academic Transcript / Rapor" },
    { docType: "ielts", docLabel: "IELTS / English Proficiency Certificate" },
    { docType: "personal_statement", docLabel: "Personal Statement / Essay" },
    { docType: "recommendation", docLabel: "Recommendation Letter" },
    { docType: "birth_certificate", docLabel: "Birth Certificate" },
    { docType: "photo", docLabel: "Passport-size Photo (4x6)" },
    { docType: "financial_proof", docLabel: "Financial Proof / Bank Statement" },
  ];
  for (const doc of defaults) {
    await upsertCrmDoc({ ...doc, leadId, staffEmail });
  }
}
// ─── Sprint 5: CRM Appointments ──────────────────────────────────────────────
export async function getCrmAppointmentsByLead(leadId: number) {
  const db = await getDb();
  return db!.select().from(crmAppointments).where(eq(crmAppointments.leadId, leadId)).orderBy(crmAppointments.scheduledAt);
}
export async function getCrmAppointmentsByStaff(staffEmail: string) {
  const db = await getDb();
  return db!.select().from(crmAppointments).where(eq(crmAppointments.staffEmail, staffEmail)).orderBy(crmAppointments.scheduledAt);
}
export async function getAllCrmAppointments() {
  const db = await getDb();
  return db!.select().from(crmAppointments).orderBy(crmAppointments.scheduledAt);
}
export async function createCrmAppointment(data: typeof crmAppointments.$inferInsert) {
  const db = await getDb();
  const [result] = await db!.insert(crmAppointments).values(data);
  return (result as any).insertId as number;
}
export async function updateCrmDocFile(id: number, data: { fileUrl: string; fileKey: string; fileName: string; fileMimeType: string; staffEmail?: string }) {
  const db = await getDb();
  await db!.update(crmStudentDocuments).set({
    fileUrl: data.fileUrl,
    fileKey: data.fileKey,
    fileName: data.fileName,
    fileMimeType: data.fileMimeType,
    status: "submitted",
    submittedAt: new Date(),
    staffEmail: data.staffEmail,
    updatedAt: new Date(),
  }).where(eq(crmStudentDocuments.id, id));
}
export async function updateCrmDocStatus(id: number, status: "pending"|"submitted"|"verified"|"rejected", staffEmail?: string) {
  const db = await getDb();
  const updates: Record<string, any> = { status, updatedAt: new Date(), staffEmail };
  if (status === "submitted") updates.submittedAt = new Date();
  if (status === "verified") updates.verifiedAt = new Date();
  await db!.update(crmStudentDocuments).set(updates).where(eq(crmStudentDocuments.id, id));
}
export async function deleteCrmDoc(id: number) {
  const db = await getDb();
  await db!.delete(crmStudentDocuments).where(eq(crmStudentDocuments.id, id));
}
export async function updateCrmAppointment(id: number, data: Partial<typeof crmAppointments.$inferInsert>) {
  const db = await getDb();
  await db!.update(crmAppointments).set({ ...data, updatedAt: new Date() }).where(eq(crmAppointments.id, id));
}
// ─── Sprint 6: Activity Timeline ─────────────────────────────────────────────
export async function getActivityTimeline(leadId: number) {
  const db = await getDb();
  return db!.select().from(crmActivityTimeline).where(eq(crmActivityTimeline.leadId, leadId)).orderBy(crmActivityTimeline.createdAt);
}
export async function logActivity(data: { leadId: number; activityType: string; title: string; description?: string; staffEmail?: string; metadata?: string }) {
  const db = await getDb();
  await db!.insert(crmActivityTimeline).values(data);
}
// ─── Sprint 6: Notifications ─────────────────────────────────────────────────
// ─── Sprint 6: Notifications ─────────────────────────────────────────────────
export async function getNotificationsForStaff(staffEmail: string, limit = 50) {
  const db = await getDb();
  return db!.select().from(crmNotifications).where(eq(crmNotifications.staffEmail, staffEmail)).orderBy(crmNotifications.createdAt).limit(limit);
}
export async function getUnreadNotificationCount(staffEmail: string) {
  const db = await getDb();
  const rows = await db!.select().from(crmNotifications).where(and(eq(crmNotifications.staffEmail, staffEmail), eq(crmNotifications.isRead, 0)));
  return rows.length;
}
export async function markNotificationRead(id: number) {
  const db = await getDb();
  await db!.update(crmNotifications).set({ isRead: 1 }).where(eq(crmNotifications.id, id));
}
export async function markAllNotificationsRead(staffEmail: string) {
  const db = await getDb();
  await db!.update(crmNotifications).set({ isRead: 1 }).where(eq(crmNotifications.staffEmail, staffEmail));
}
export async function createNotification(data: { staffEmail: string; type: string; title: string; message?: string; leadId?: number; actionUrl?: string }) {
  const db = await getDb();
  await db!.insert(crmNotifications).values({ ...data, isRead: 0 });
}

// ─── Sprint 8: Student Applications ──────────────────────────────────────────
export async function getApplicationsByLead(leadId: number) {
  const db = await getDb();
  const { studentApplications } = await import("../drizzle/schema");
  return db!.select().from(studentApplications).where(eq(studentApplications.leadId, leadId));
}

export async function createStudentApplication(data: {
  leadId: number; universityName: string; programName: string; country?: string;
  intakePeriod?: string; applicationStatus?: string; tuitionFee?: string;
  scholarshipInfo?: string; notes?: string; staffEmail: string;
}) {
  const db = await getDb();
  const { studentApplications } = await import("../drizzle/schema");
  const [result] = await db!.insert(studentApplications).values({
    leadId: data.leadId, universityName: data.universityName, programName: data.programName,
    country: data.country, intakePeriod: data.intakePeriod,
    applicationStatus: data.applicationStatus || "preparing",
    tuitionFee: data.tuitionFee, scholarshipInfo: data.scholarshipInfo,
    notes: data.notes, staffEmail: data.staffEmail,
  });
  return result;
}

export async function updateStudentApplication(id: number, data: Partial<{
  universityName: string; programName: string; country: string; intakePeriod: string;
  applicationStatus: string; tuitionFee: string; scholarshipInfo: string; notes: string;
  submittedAt: Date; offerReceivedAt: Date; offerDeadline: Date;
}>) {
  const db = await getDb();
  const { studentApplications } = await import("../drizzle/schema");
  return db!.update(studentApplications).set(data).where(eq(studentApplications.id, id));
}

export async function deleteStudentApplication(id: number) {
  const db = await getDb();
  const { studentApplications } = await import("../drizzle/schema");
  return db!.delete(studentApplications).where(eq(studentApplications.id, id));
}

export async function getAllStudentApplicationsStats() {
  const db = await getDb();
  const { studentApplications } = await import("../drizzle/schema");
  return db!.select().from(studentApplications);
}

// ─── Sprint 8: Team Chat ──────────────────────────────────────────────────────
export async function getTeamChatMessages(channel: string = "general", limit: number = 50) {
  const db = await getDb();
  const { staffTeamChat } = await import("../drizzle/schema");
  return db!.select().from(staffTeamChat)
    .where(eq(staffTeamChat.channel, channel))
    .orderBy(staffTeamChat.createdAt)
    .limit(limit);
}

export async function sendTeamChatMessage(data: {
  senderEmail: string; senderName: string; message: string; channel?: string; replyToId?: number;
}) {
  const db = await getDb();
  const { staffTeamChat } = await import("../drizzle/schema");
  const [result] = await db!.insert(staffTeamChat).values({
    senderEmail: data.senderEmail, senderName: data.senderName,
    message: data.message, channel: data.channel || "general",
    replyToId: data.replyToId,
  });
  // Fetch the newly inserted row so we can broadcast it
  const { eq } = await import("drizzle-orm");
  const insertId = (result as any).insertId ?? (result as any).lastInsertRowid;
  if (insertId) {
    const [row] = await db!.select().from(staffTeamChat).where(eq(staffTeamChat.id, Number(insertId)));
    return row;
  }
  return result;
}

export async function deleteTeamChatMessage(id: number) {
  const db = await getDb();
  const { staffTeamChat } = await import("../drizzle/schema");
  return db!.delete(staffTeamChat).where(eq(staffTeamChat.id, id));
}

// ─── Sprint 8: Lead Source Analytics ─────────────────────────────────────────
export async function getLeadSourceAnalytics() {
  const db = await getDb();
  const { leads, leadPipelineStages } = await import("../drizzle/schema");
  const allLeads = await db!.select({
    source: leads.source,
    status: leadPipelineStages.stage,
    country: leads.preferredCountry,
    createdAt: leads.createdAt,
  }).from(leads).leftJoin(leadPipelineStages, eq(leads.id, leadPipelineStages.leadId));
  return allLeads;
}

// ─── Sprint 9: University Database ───────────────────────────────────────────
export async function getUniversities(country?: string, search?: string, limit = 100) {
  const db = await getDb();
  const { universities } = await import("../drizzle/schema");
  const { like, and } = await import("drizzle-orm");
  let conditions: any[] = [eq(universities.isActive, 1)];
  if (country) conditions.push(eq(universities.country, country));
  if (search) conditions.push(like(universities.name, `%${search}%`));
  const rows = await db!.select().from(universities)
    .where(and(...conditions))
    .orderBy(universities.ranking)
    .limit(limit);
  return rows;
}

export async function seedUniversitiesIfEmpty() {
  const db = await getDb();
  const { universities } = await import("../drizzle/schema");
  const existing = await db!.select({ id: universities.id }).from(universities).limit(1);
  if (existing.length > 0) return { seeded: false, count: 0 };
  const { UNIVERSITY_SEEDS } = await import("./universitySeeds");
  await db!.insert(universities).values(UNIVERSITY_SEEDS as any);
  return { seeded: true, count: UNIVERSITY_SEEDS.length };
}

// ─── Sprint 9: Visa Tracking ──────────────────────────────────────────────────
export async function getVisaTracking(leadId: number) {
  const db = await getDb();
  const { studentVisaTracking } = await import("../drizzle/schema");
  const [row] = await db!.select().from(studentVisaTracking).where(eq(studentVisaTracking.leadId, leadId));
  return row || null;
}

export async function upsertVisaTracking(leadId: number, data: {
  visaType?: string; visaStatus?: string; embassy?: string;
  applicationDate?: Date | null; biometricsDate?: Date | null;
  decisionDate?: Date | null; visaExpiryDate?: Date | null;
  requiredDocs?: string; completedDocs?: string; notes?: string;
  staffEmail: string;
}) {
  const db = await getDb();
  const { studentVisaTracking } = await import("../drizzle/schema");
  const existing = await getVisaTracking(leadId);
  if (existing) {
    await db!.update(studentVisaTracking)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(studentVisaTracking.leadId, leadId));
    return { ...existing, ...data };
  } else {
    const [result] = await db!.insert(studentVisaTracking).values({ leadId, ...data });
    const insertId = (result as any).insertId ?? (result as any).lastInsertRowid;
    if (insertId) {
      const [row] = await db!.select().from(studentVisaTracking).where(eq(studentVisaTracking.id, Number(insertId)));
      return row;
    }
    return result;
  }
}
