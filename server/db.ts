import { eq, desc, and, gte, lte, lt, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  conversations, InsertConversation, Conversation,
  messages, InsertMessage, Message,
  leads, InsertLead, Lead,
  marketingSpend, InsertMarketingSpend, MarketingSpend,
  adCampaigns, InsertAdCampaign, AdCampaign,
  growthDigests, InsertGrowthDigest, GrowthDigest,
  geoSnapshots, InsertGeoSnapshot, GeoSnapshot,
  tutorSubscriptions, InsertTutorSubscription, TutorSubscription,
  tutorSessions, InsertTutorSession, TutorSession,
  igcseSubscriptions, InsertIgcseSubscription, IgcseSubscription,
  igcseSessions,
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

// ─── Isolated pool for high-volume, non-critical writes (visitor tracking) ───
// The shared pool above (connectionLimit: 8) is used by EVERYTHING: login,
// checkout, admin panel, schedulers. On 2026-08-07, visitor-tracking traffic
// (one write per pageview, across many concurrent unique visitors — the
// per-session throttle added on 2026-08-05 only dedupes repeat pageviews from
// the SAME visitor, not concurrent volume from DIFFERENT visitors) saturated
// that shared pool and caused ER_CON_COUNT_ERROR on login/forgot-password —
// a founder + staff member locked out because unrelated analytics traffic ate
// every available connection. Visitor tracking is pure analytics: losing a
// pageview under load is fine, losing the ability to log in is not. Giving it
// its own tiny 2-connection pool means it can saturate ITSELF without ever
// starving the shared pool that auth/checkout/admin depend on.
let _trackingPool: mysql.Pool | null = null;
let _trackingDb: ReturnType<typeof drizzle> | null = null;

export async function getTrackingDb() {
  if (!_trackingPool && process.env.DATABASE_URL) {
    try {
      _trackingPool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        charset: "utf8mb4",
        waitForConnections: true,
        connectionLimit: 2,
        maxIdle: 1,
        idleTimeout: 30000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 10000,
      });
      _trackingDb = drizzle(_trackingPool as any);
      console.log("[Database] Tracking pool created (isolated, connectionLimit: 2)");
    } catch (error) {
      console.warn("[Database] Failed to create tracking pool:", error);
      _trackingPool = null;
      _trackingDb = null;
    }
  }
  return _trackingDb;
}

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
        // Down from 10 to 8 — Railway shared MySQL max_connections is limited
        // and we saw ER_CON_COUNT_ERROR "Too many connections" flooding logs
        // (2026-08-04). Leaves headroom for admin + schedulers to still work
        // when web traffic peaks.
        connectionLimit: 8,
        // Idle-connection release — before this, connections stayed open
        // forever after use, so a spike drained the pool and never recovered.
        maxIdle: 3,
        idleTimeout: 60000,
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
/**
 * Idempotent guard that ensures the `office` enum on leads + users includes all
 * current branches (adds Singkawang). Appending an enum value in MySQL is a
 * fast metadata-only change, safe to run on every boot, so a deploy can never
 * outrun the migration and reject a 'singkawang' insert/select.
 */
export async function ensureOfficeEnum(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const enumDef = "ENUM('kelapa_gading','pik','gading_serpong','singkawang')";
  try {
    await db.execute(sql.raw(`ALTER TABLE leads MODIFY COLUMN office ${enumDef} NULL`));
    await db.execute(sql.raw(`ALTER TABLE users MODIFY COLUMN office ${enumDef} NULL`));
  } catch (e) {
    console.error("[CRM] ensureOfficeEnum failed:", (e as Error).message);
  }
}

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
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS growth_digests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        periodLabel VARCHAR(40) NOT NULL,
        summary TEXT NOT NULL,
        recommendations JSON NULL,
        metrics JSON NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS scheduler_state (
        jobKey VARCHAR(64) PRIMARY KEY,
        value VARCHAR(64) NOT NULL,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS tutor_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leadId INT NOT NULL,
        plan ENUM('w2','m1') NOT NULL,
        status ENUM('pending','active','expired','cancelled') NOT NULL DEFAULT 'pending',
        amount DECIMAL(12,2) NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
        xenditInvoiceId VARCHAR(120) NULL,
        startsAt TIMESTAMP NULL,
        expiresAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lead (leadId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    // Migrate the plan enum on any pre-existing table (no rows yet pre-launch).
    await db.execute(sql.raw(`ALTER TABLE tutor_subscriptions MODIFY COLUMN plan ENUM('w2','m1') NOT NULL`));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS tutor_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leadId INT NOT NULL,
        skill ENUM('speaking','writing') NOT NULL,
        taskType VARCHAR(40) NULL,
        prompt TEXT NULL,
        response TEXT NULL,
        audioUrl VARCHAR(512) NULL,
        durationSec INT NULL,
        overallBand DECIMAL(3,1) NULL,
        scores JSON NULL,
        feedback JSON NULL,
        isFree TINYINT(1) NOT NULL DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_lead_skill (leadId, skill)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS tutor_reminders (
        leadId INT NOT NULL PRIMARY KEY,
        remindersSent INT NOT NULL DEFAULT 0,
        lastSentAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS practice_followups (
        email VARCHAR(320) NOT NULL PRIMARY KEY,
        sentAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    // Mock-test buyers → AI IELTS Tutor upsell dedupe table. One row per
    // email once they've received the upsell (so we never spam them twice).
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS mock_test_upsells (
        email VARCHAR(320) NOT NULL PRIMARY KEY,
        attemptId INT NULL,
        overallBand DECIMAL(2,1) NULL,
        sentAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mock_upsell_sent (sentAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    // ── IGCSE AI Teacher tables ─────────────────────────────────────────────
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS igcse_topics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject ENUM('math','physics','economics','business','chemistry','biology') NOT NULL DEFAULT 'math',
        syllabus VARCHAR(32) NOT NULL DEFAULT 'CIE_0580',
        tier ENUM('core','extended','both') NOT NULL DEFAULT 'extended',
        areaCode VARCHAR(8) NOT NULL,
        areaName VARCHAR(120) NOT NULL,
        code VARCHAR(16) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        learningOutcomes TEXT NULL,
        sortOrder INT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_area (areaCode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS igcse_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leadId INT NOT NULL,
        topicId INT NULL,
        language ENUM('en','id') NOT NULL DEFAULT 'en',
        transcript JSON NULL,
        boardSnapshot JSON NULL,
        durationSec INT NOT NULL DEFAULT 0,
        costCents INT NOT NULL DEFAULT 0,
        status ENUM('active','ended') NOT NULL DEFAULT 'active',
        startedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        endedAt TIMESTAMP NULL,
        INDEX idx_lead (leadId),
        INDEX idx_topic (topicId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS igcse_examples (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topicCode VARCHAR(16) NOT NULL,
        syllabus VARCHAR(32) NOT NULL DEFAULT 'CIE_0580',
        tier ENUM('core','extended','both') NOT NULL DEFAULT 'extended',
        marks INT NOT NULL,
        question TEXT NOT NULL,
        markScheme TEXT NOT NULL,
        source VARCHAR(160) NOT NULL,
        sortOrder INT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_topic (topicCode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS igcse_progress (
        leadId INT NOT NULL,
        topicId INT NOT NULL,
        masteryLevel TINYINT NOT NULL DEFAULT 0,
        sessionsCount INT NOT NULL DEFAULT 0,
        lastSeenAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (leadId, topicId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS igcse_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leadId INT NOT NULL,
        plan ENUM('m1','m2','m3','a1','a2','a3') NOT NULL,
        status ENUM('pending','active','expired','cancelled') NOT NULL DEFAULT 'pending',
        amount DECIMAL(12,2) NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
        subjectsLimit INT NOT NULL DEFAULT 1,
        subjectsSelected JSON NULL,
        hoursLimit INT NOT NULL DEFAULT 6,
        topUpHours INT NOT NULL DEFAULT 0,
        parentEmail VARCHAR(255) NULL,
        parentName VARCHAR(120) NULL,
        xenditInvoiceId VARCHAR(120) NULL,
        startsAt TIMESTAMP NULL,
        expiresAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_lead (leadId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    // (subs-schema ALTERs moved to ensureIgcseSubscriptionsSchema below —
    //  they need to run unconditionally, NOT gated on the outer try block.)

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS igcse_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leadId INT NOT NULL,
        exampleId INT NOT NULL,
        topicCode VARCHAR(16) NOT NULL,
        marks INT NOT NULL,
        status ENUM('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
        marksEarned INT NULL,
        hintsUsed INT NOT NULL DEFAULT 0,
        revealed INT NOT NULL DEFAULT 0,
        startedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completedAt TIMESTAMP NULL,
        INDEX idx_lead (leadId),
        INDEX idx_example (exampleId),
        INDEX idx_topic (topicCode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS igcse_attempt_steps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attemptId INT NOT NULL,
        role ENUM('student','tutor','system') NOT NULL,
        text TEXT NOT NULL,
        verdict ENUM('correct','partial','wrong','hint','reveal','none') NOT NULL DEFAULT 'none',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_attempt (attemptId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));

    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS geo_snapshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        query VARCHAR(255) NOT NULL,
        mentioned TINYINT(1) NOT NULL DEFAULT 0,
        rankPosition INT NULL,
        competitors JSON NULL,
        model VARCHAR(80) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `));

    // ── Attribution columns on the 3 payment entities ──────────────────────
    // Capture GCLID + UTMs at checkout so the Xendit webhook can upload
    // offline conversions to Google Ads. Without this, browser-side gtag is
    // the only tracking, which misses ~30-50% of real payments (adblockers,
    // students who don't return to /success, mobile-banking-app payment flows).
    // Idempotent — safe to re-run every deploy.
    for (const stmt of [
      "ALTER TABLE ieltsMockAttempts ADD COLUMN gclid VARCHAR(512) NULL",
      "ALTER TABLE ieltsMockAttempts ADD COLUMN utmSource VARCHAR(120) NULL",
      "ALTER TABLE ieltsMockAttempts ADD COLUMN utmMedium VARCHAR(120) NULL",
      "ALTER TABLE ieltsMockAttempts ADD COLUMN utmCampaign VARCHAR(160) NULL",
      "ALTER TABLE ieltsMockAttempts ADD COLUMN conversionUploadedAt TIMESTAMP NULL",
      // Bundle flag — TRUE means the buyer paid for the Rp 299k Bundle and
      // is entitled to a free Voice Clone session (redeemable when that
      // product ships).
      "ALTER TABLE ieltsMockAttempts ADD COLUMN bundleIncludesVoiceClone BOOLEAN NULL DEFAULT FALSE",
      "ALTER TABLE ieltsMockAttempts ADD COLUMN bundleVoiceCloneRedeemedAt TIMESTAMP NULL",
      // Voice Clone session records — one row per paid Rp 49k session
      // (or bundle-free redemption). Stores the ElevenLabs voice_id
      // so a background job can DELETE it after 90 days for privacy.
      `CREATE TABLE IF NOT EXISTS voice_clone_sessions (
         id INT AUTO_INCREMENT PRIMARY KEY,
         attemptId INT NULL,
         customerEmail VARCHAR(320) NOT NULL,
         customerName VARCHAR(255) NULL,
         xenditExternalId VARCHAR(128) UNIQUE,
         xenditInvoiceId VARCHAR(128),
         xenditInvoiceUrl VARCHAR(1024),
         amountIdr INT NOT NULL DEFAULT 49000,
         isBundleFree BOOLEAN NOT NULL DEFAULT FALSE,
         status ENUM('pending','processing','ready','failed') NOT NULL DEFAULT 'pending',
         paidAt TIMESTAMP NULL,
         processedAt TIMESTAMP NULL,
         elevenLabsVoiceId VARCHAR(128),
         voiceDeletedAt TIMESTAMP NULL,
         targetedPartNumber TINYINT,
         originalTranscript TEXT,
         originalAudioKey VARCHAR(512),
         band8Transcript TEXT,
         band8AudioKey VARCHAR(512),
         changesSummary TEXT,
         errorMessage TEXT,
         createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_vc_attempt (attemptId),
         INDEX idx_vc_email (customerEmail),
         INDEX idx_vc_status (status)
       )`,
      // Standalone mode = user records 3 IELTS Speaking questions directly
      // (no Mock Test needed). Bundle-free redemption also uses standalone
      // path when the buyer never took the Mock Test.
      "ALTER TABLE voice_clone_sessions ADD COLUMN mode ENUM('from_mock','standalone') NOT NULL DEFAULT 'from_mock'",
      "ALTER TABLE voice_clone_sessions ADD COLUMN sessionToken VARCHAR(64) NULL UNIQUE",
      "ALTER TABLE voice_clone_sessions MODIFY attemptId INT NULL",
      // JSON blob storing per-part results — {partNumber, originalTranscript, originalAudioKey, band8Text, band8AudioKey, changesSummary}
      // for each of the 3 recorded parts. Legacy sessions with only the single-part
      // top-level fields (targetedPartNumber, band8Transcript, etc.) still work.
      "ALTER TABLE voice_clone_sessions ADD COLUMN partsJson LONGTEXT NULL",
      // Customer phone — captured by standalone checkout + admin free-link form.
      // Nullable so existing rows and from-Mock sessions (which don't collect phone) still validate.
      "ALTER TABLE voice_clone_sessions ADD COLUMN customerPhone VARCHAR(50) NULL",
      // Per-criterion IELTS Speaking assessment JSON (fluency/lexical/grammar/pronunciation + overallBand + actionPlan).
      "ALTER TABLE voice_clone_sessions ADD COLUMN assessmentJson LONGTEXT NULL",
      // R2 key of the generated study PDF (see server/voiceCloneReportPdf.ts).
      "ALTER TABLE voice_clone_sessions ADD COLUMN pdfKey VARCHAR(512) NULL",
      // Live processing step for the result page's progress display.
      "ALTER TABLE voice_clone_sessions ADD COLUMN progressStep VARCHAR(64) NULL",
      // Per-question recordings for the standalone flow (3 questions per session)
      `CREATE TABLE IF NOT EXISTS voice_clone_recordings (
         id INT AUTO_INCREMENT PRIMARY KEY,
         sessionId INT NOT NULL,
         questionIndex TINYINT NOT NULL,
         partNumber TINYINT NOT NULL,
         questionText TEXT NOT NULL,
         audioKey VARCHAR(512),
         transcript TEXT,
         durationSec INT,
         uploadedAt TIMESTAMP NULL,
         createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         UNIQUE KEY uk_vcr_session_q (sessionId, questionIndex),
         INDEX idx_vcr_session (sessionId)
       )`,
      // Upsell campaign dedupe — one row per email that got the drip
      `CREATE TABLE IF NOT EXISTS voice_clone_upsell_sent (
         email VARCHAR(320) NOT NULL PRIMARY KEY,
         segment VARCHAR(60),
         sentAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         resendId VARCHAR(128),
         INDEX idx_vcus_sent (sentAt)
       )`,
      "ALTER TABLE tutor_subscriptions ADD COLUMN gclid VARCHAR(512) NULL",
      "ALTER TABLE tutor_subscriptions ADD COLUMN utmSource VARCHAR(120) NULL",
      "ALTER TABLE tutor_subscriptions ADD COLUMN utmMedium VARCHAR(120) NULL",
      "ALTER TABLE tutor_subscriptions ADD COLUMN utmCampaign VARCHAR(160) NULL",
      "ALTER TABLE tutor_subscriptions ADD COLUMN conversionUploadedAt TIMESTAMP NULL",
      "ALTER TABLE igcse_subscriptions ADD COLUMN gclid VARCHAR(512) NULL",
      "ALTER TABLE igcse_subscriptions ADD COLUMN utmSource VARCHAR(120) NULL",
      "ALTER TABLE igcse_subscriptions ADD COLUMN utmMedium VARCHAR(120) NULL",
      "ALTER TABLE igcse_subscriptions ADD COLUMN utmCampaign VARCHAR(160) NULL",
      "ALTER TABLE igcse_subscriptions ADD COLUMN conversionUploadedAt TIMESTAMP NULL",
      // Tes Bakat AI Pro — same attribution columns so the aptitude PRO
      // purchase can drive Google Ads offline conversion upload.
      "ALTER TABLE aptitudeProOrders ADD COLUMN gclid VARCHAR(512) NULL",
      "ALTER TABLE aptitudeProOrders ADD COLUMN utmSource VARCHAR(120) NULL",
      "ALTER TABLE aptitudeProOrders ADD COLUMN utmMedium VARCHAR(120) NULL",
      "ALTER TABLE aptitudeProOrders ADD COLUMN utmCampaign VARCHAR(160) NULL",
      "ALTER TABLE aptitudeProOrders ADD COLUMN conversionUploadedAt TIMESTAMP NULL",

      // ── SpecTa IQ Discovery — Rp 59k cognitive-abilities assessment ──────
      // Question bank. Populated by iqQuestionGenerator (AI-driven).
      `CREATE TABLE IF NOT EXISTS iq_questions (
         id INT AUTO_INCREMENT PRIMARY KEY,
         domain ENUM('fluid','quantitative','verbal','spatial','memory') NOT NULL,
         type VARCHAR(40) NOT NULL,
         difficulty TINYINT NOT NULL,
         prompt LONGTEXT NOT NULL,
         options LONGTEXT NOT NULL,
         correctIndex TINYINT NOT NULL,
         timeLimitSec INT NOT NULL DEFAULT 60,
         explanation TEXT NULL,
         timesShown INT NOT NULL DEFAULT 0,
         timesCorrect INT NOT NULL DEFAULT 0,
         approved TINYINT NOT NULL DEFAULT 0,
         generatedBy VARCHAR(60) NULL,
         createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_iq_q_domain (domain),
         INDEX idx_iq_q_approved (approved),
         INDEX idx_iq_q_domain_diff (domain, difficulty, approved)
       )`,
      // Per-attempt sessions. Server picks question IDs at start so client
      // can never see what's coming next → prevents skip/cache attacks.
      `CREATE TABLE IF NOT EXISTS iq_sessions (
         id INT AUTO_INCREMENT PRIMARY KEY,
         leadId INT NULL,
         mode ENUM('preview','full') NOT NULL,
         accessTokenId INT NULL,
         studentName VARCHAR(255) NULL,
         studentEmail VARCHAR(320) NULL,
         studentPhone VARCHAR(50) NULL,
         questionIds LONGTEXT NOT NULL,
         answers LONGTEXT NOT NULL,
         scores LONGTEXT NULL,
         status ENUM('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
         startedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         completedAt TIMESTAMP NULL,
         INDEX idx_iq_s_lead (leadId),
         INDEX idx_iq_s_status (status),
         INDEX idx_iq_s_token (accessTokenId)
       )`,
      // Single-use access tokens (mirrors aptitudeAccessTokens exactly).
      `CREATE TABLE IF NOT EXISTS iq_access_tokens (
         id INT AUTO_INCREMENT PRIMARY KEY,
         token VARCHAR(64) NOT NULL UNIQUE,
         status ENUM('unused','in_progress','completed','expired') NOT NULL DEFAULT 'unused',
         expiresAt TIMESTAMP NOT NULL,
         usedByName VARCHAR(255) NULL,
         usedByEmail VARCHAR(320) NULL,
         usedByPhone VARCHAR(50) NULL,
         usedAt TIMESTAMP NULL,
         completedAt TIMESTAMP NULL,
         sessionId INT NULL,
         createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_iq_at_status (status),
         INDEX idx_iq_at_email (usedByEmail)
       )`,
      // Xendit orders (mirrors aptitudeProOrders shape → shared webhook code).
      `CREATE TABLE IF NOT EXISTS iq_orders (
         id INT AUTO_INCREMENT PRIMARY KEY,
         externalId VARCHAR(128) NOT NULL UNIQUE,
         xenditInvoiceId VARCHAR(128) NULL,
         xenditInvoiceUrl VARCHAR(512) NULL,
         customerName VARCHAR(255) NOT NULL,
         customerEmail VARCHAR(320) NOT NULL,
         customerPhone VARCHAR(50) NULL,
         amount INT NOT NULL,
         status ENUM('pending','paid','expired','failed') NOT NULL DEFAULT 'pending',
         accessTokenId INT NULL,
         paidAt TIMESTAMP NULL,
         source VARCHAR(50) NOT NULL DEFAULT 'landing',
         gclid VARCHAR(512) NULL,
         utmSource VARCHAR(120) NULL,
         utmMedium VARCHAR(120) NULL,
         utmCampaign VARCHAR(160) NULL,
         conversionUploadedAt TIMESTAMP NULL,
         createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_iq_o_email (customerEmail),
         INDEX idx_iq_o_status (status),
         INDEX idx_iq_o_paid (paidAt)
       )`,
    ]) {
      try { await db.execute(sql.raw(stmt)); }
      catch (e: any) {
        // MySQL 8 returns ER_DUP_FIELDNAME on second run; anything else worth logging.
        if (!/Duplicate column|already exists/i.test(e?.message || "")) {
          console.error("[Growth] attribution column ALTER failed:", stmt, "-", e?.message);
        }
      }
    }

  } catch (e) {
    console.error("[Growth] ensureMarketingSchema failed:", (e as Error).message);
  }
}

/**
 * Widen igcse_topics.subject enum to include a specific new subject. Idempotent —
 * inspects SHOW COLUMNS first and skips the ALTER if the target value is already
 * accepted. Logs the before-state + outcome so we can diagnose from Railway logs.
 *
 * Called by each subject's topic seeder before insert.
 */
async function ensureIgcseSubject(target: "math" | "physics" | "economics" | "business" | "chemistry" | "biology"): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    const colRows: any = await db.execute(sql.raw(`SHOW COLUMNS FROM igcse_topics LIKE 'subject'`));
    const list: any[] = Array.isArray(colRows[0]) ? colRows[0] : (colRows as any);
    const typeStr = String(list?.[0]?.Type || list?.[0]?.type || "");
    if (typeStr.includes(`'${target}'`)) {
      return true; // already widened
    }
    console.log(`[IGCSE] Widening igcse_topics.subject from "${typeStr}" to include '${target}'…`);
    // We always widen to the full known set so adding a new subject doesn't
    // accidentally narrow the enum and drop earlier values.
    await db.execute(sql.raw(`
      ALTER TABLE igcse_topics MODIFY COLUMN subject ENUM('math','physics','economics','business','chemistry','biology') NOT NULL DEFAULT 'math'
    `));
    console.log(`[IGCSE] subject enum widened OK.`);
    return true;
  } catch (e) {
    console.error(`[IGCSE] ensureIgcseSubject('${target}') failed:`, (e as Error).message);
    return false;
  }
}

/**
 * Standalone, always-runs migration for igcse_subscriptions.
 *
 * Critical: this MUST execute on every boot regardless of whether
 * ensureMarketingSchema completed, because the bundle pricing introduced
 * new columns (subjectsLimit, subjectsSelected, topUpHours, parentEmail,
 * parentName) that the IGCSE status endpoint reads. If they don't exist,
 * Drizzle's SELECT * crashes and the page bounces the student back to login.
 *
 * Each ALTER is independently wrapped — duplicate-column errors are harmless.
 */
export async function ensureIgcseSubscriptionsSchema(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const stmts = [
    `ALTER TABLE igcse_subscriptions MODIFY COLUMN plan ENUM('m1','m2','m3','a1','a2','a3') NOT NULL`,
    `ALTER TABLE igcse_subscriptions ADD COLUMN subjectsLimit INT NOT NULL DEFAULT 1`,
    `ALTER TABLE igcse_subscriptions ADD COLUMN subjectsSelected JSON NULL`,
    `ALTER TABLE igcse_subscriptions ADD COLUMN topUpHours INT NOT NULL DEFAULT 0`,
    `ALTER TABLE igcse_subscriptions ADD COLUMN parentEmail VARCHAR(255) NULL`,
    `ALTER TABLE igcse_subscriptions ADD COLUMN parentName VARCHAR(120) NULL`,
    `ALTER TABLE igcse_subscriptions MODIFY COLUMN hoursLimit INT NOT NULL DEFAULT 6`,
  ];
  for (const stmt of stmts) {
    try { await db.execute(sql.raw(stmt)); }
    catch (e) { /* duplicate column / enum already wide — harmless */ }
  }
}

export async function ensureIgcsePhysicsSubject(): Promise<boolean> {
  return ensureIgcseSubject("physics");
}

export async function ensureIgcseEconomicsSubject(): Promise<boolean> {
  return ensureIgcseSubject("economics");
}

export async function ensureIgcseBusinessSubject(): Promise<boolean> {
  return ensureIgcseSubject("business");
}

export async function ensureIgcseBiologySubject(): Promise<boolean> {
  return ensureIgcseSubject("biology");
}

export async function ensureIgcseChemistrySubject(): Promise<boolean> {
  return ensureIgcseSubject("chemistry");
}

/**
 * Persistent scheduler markers — so a server restart can't re-trigger a
 * once-per-week/day job (e.g. the Monday parent-report send). Survives the
 * frequent redeploys that reset in-memory guards.
 */
export async function getSchedulerState(jobKey: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows: any = await db.execute(sql`SELECT value FROM scheduler_state WHERE jobKey = ${jobKey} LIMIT 1`);
    const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
    return list?.[0]?.value ?? null;
  } catch { return null; }
}

export async function setSchedulerState(jobKey: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      INSERT INTO scheduler_state (jobKey, value) VALUES (${jobKey}, ${value})
      ON DUPLICATE KEY UPDATE value = ${value}
    `);
  } catch (e) { console.error("[Scheduler] setState failed:", (e as Error).message); }
}

// ── Growth digests + GEO snapshots (Phase C) ─────────────────────────────────
export async function createGrowthDigest(data: InsertGrowthDigest): Promise<GrowthDigest | null> {
  const db = await getDb();
  if (!db) return null;
  const r = await db.insert(growthDigests).values(data);
  const id = (r as any)[0].insertId;
  const [row] = await db.select().from(growthDigests).where(eq(growthDigests.id, id)).limit(1);
  return row || null;
}

export async function listGrowthDigests(limit = 12): Promise<GrowthDigest[]> {
  const db = await getDb();
  if (!db) return [];
  return (await db.select().from(growthDigests).orderBy(desc(growthDigests.createdAt)).limit(limit)) as GrowthDigest[];
}

export async function insertGeoSnapshots(rows: InsertGeoSnapshot[]): Promise<void> {
  const db = await getDb();
  if (!db || !rows.length) return;
  await db.insert(geoSnapshots).values(rows);
}

export async function listGeoSnapshots(limit = 200): Promise<GeoSnapshot[]> {
  const db = await getDb();
  if (!db) return [];
  return (await db.select().from(geoSnapshots).orderBy(desc(geoSnapshots.createdAt)).limit(limit)) as GeoSnapshot[];
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

// ── AI IELTS Tutor ───────────────────────────────────────────────────────────
export async function getActiveTutorSubscription(leadId: number): Promise<TutorSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(tutorSubscriptions)
    .where(and(eq(tutorSubscriptions.leadId, leadId), eq(tutorSubscriptions.status, "active"), gte(tutorSubscriptions.expiresAt, new Date())))
    .orderBy(desc(tutorSubscriptions.expiresAt)).limit(1);
  return row || null;
}

export async function createTutorSubscription(data: InsertTutorSubscription): Promise<TutorSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  const r = await db.insert(tutorSubscriptions).values(data);
  const id = (r as any)[0].insertId;
  const [row] = await db.select().from(tutorSubscriptions).where(eq(tutorSubscriptions.id, id)).limit(1);
  return row || null;
}

export async function updateTutorSubscription(id: number, data: Partial<InsertTutorSubscription>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(tutorSubscriptions).set(data).where(eq(tutorSubscriptions.id, id));
}

export async function getTutorSubscriptionByInvoice(invoiceId: string): Promise<TutorSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(tutorSubscriptions).where(eq(tutorSubscriptions.xenditInvoiceId, invoiceId)).limit(1);
  return row || null;
}

// ── IGCSE AI Teacher subscriptions + free trial accounting ──────────────────

export async function getActiveIgcseSubscription(leadId: number): Promise<IgcseSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  // Defensive: if the igcse_subscriptions schema is mid-migration (e.g. the
  // ADD COLUMN ALTERs haven't run yet on a particular deploy), Drizzle's
  // SELECT * would throw and bubble up into the status endpoint, which then
  // appears to the student as "I just logged in but got bounced back".
  // Return null on any DB error so login still completes — worst case the
  // student just sees "free trial" until the next deploy + ALTER lands.
  try {
    const [row] = await db.select().from(igcseSubscriptions)
      .where(and(
        eq(igcseSubscriptions.leadId, leadId),
        eq(igcseSubscriptions.status, "active"),
        gte(igcseSubscriptions.expiresAt, new Date()),
      ))
      .orderBy(desc(igcseSubscriptions.expiresAt)).limit(1);
    return row || null;
  } catch (e) {
    console.error(`[IGCSE] getActiveIgcseSubscription failed for lead ${leadId}:`, (e as Error).message);
    return null;
  }
}

export async function createIgcseSubscription(data: InsertIgcseSubscription): Promise<IgcseSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  const r = await db.insert(igcseSubscriptions).values(data);
  const id = (r as any)[0].insertId;
  const [row] = await db.select().from(igcseSubscriptions).where(eq(igcseSubscriptions.id, id)).limit(1);
  return row || null;
}

export async function updateIgcseSubscription(id: number, data: Partial<InsertIgcseSubscription>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(igcseSubscriptions).set(data).where(eq(igcseSubscriptions.id, id));
}

export async function getIgcseSubscriptionByInvoice(invoiceId: string): Promise<IgcseSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(igcseSubscriptions)
    .where(eq(igcseSubscriptions.xenditInvoiceId, invoiceId)).limit(1);
  return row || null;
}

/** Total seconds the student has used across all IGCSE sessions (for the
 *  30-minute lifetime free-trial cap). */
export async function getIgcseLifetimeSecondsUsed(leadId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [r] = await db.select({ s: sql<number>`COALESCE(SUM(durationSec), 0)` })
    .from(igcseSessions)
    .where(eq(igcseSessions.leadId, leadId));
  return Number(r?.s ?? 0);
}

/**
 * Candidates for a "your free trial is done — subscribe" nurture email:
 * leads who tried the Tutor (have a session) but never created a paid Xendit
 * invoice and have no currently-active access. People who reached a real Xendit
 * invoice are handled by Xendit's own invoice reminders, so we exclude them
 * here to avoid double-nudging. Returns the trial-start anchor + reminders sent.
 */
export async function getTutorReminderCandidates(): Promise<
  Array<{ leadId: number; email: string; name: string | null; anchorAt: Date; remindersSent: number }>
> {
  const db = await getDb();
  if (!db) return [];
  const rows: any = await db.execute(sql`
    SELECT l.id AS leadId, l.studentEmail AS email, l.studentName AS name,
           MIN(ts.createdAt) AS anchorAt,
           COALESCE(tr.remindersSent, 0) AS remindersSent
    FROM leads l
    JOIN tutor_sessions ts ON ts.leadId = l.id
    LEFT JOIN tutor_reminders tr ON tr.leadId = l.id
    WHERE l.studentEmail IS NOT NULL AND l.studentEmail <> ''
      AND COALESCE(tr.remindersSent, 0) < 2
      AND NOT EXISTS (
        SELECT 1 FROM tutor_subscriptions s
        WHERE s.leadId = l.id
          AND ((s.status = 'active' AND s.expiresAt >= NOW())
               OR (s.xenditInvoiceId IS NOT NULL AND s.xenditInvoiceId NOT LIKE 'FREE-%'))
      )
    GROUP BY l.id, l.studentEmail, l.studentName, tr.remindersSent
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return (list as any[]).map(r => ({
    leadId: Number(r.leadId),
    email: String(r.email),
    name: r.name ?? null,
    anchorAt: new Date(r.anchorAt),
    remindersSent: Number(r.remindersSent ?? 0),
  }));
}

/**
 * Candidates for the "you tried our free IELTS practice — here's the full Mock
 * Test + AI Tutor" follow-up: distinct emails that took a practice test, whose
 * first attempt was ≥1 day ago, and who haven't been emailed yet. Throttled by
 * `limit` so a backlog drips out gradually (protects sender reputation).
 */
export async function getPracticeFollowupCandidates(
  limit = 40,
): Promise<Array<{ email: string; name: string | null; anchorAt: Date }>> {
  const db = await getDb();
  if (!db) return [];
  const lim = Math.max(1, Math.min(200, Math.floor(limit)));
  const rows: any = await db.execute(sql`
    SELECT LOWER(p.studentEmail) AS email, MAX(p.studentName) AS name, MIN(p.createdAt) AS anchorAt
    FROM ieltsPracticeResults p
    LEFT JOIN practice_followups f ON f.email = LOWER(p.studentEmail)
    WHERE p.studentEmail IS NOT NULL AND p.studentEmail <> '' AND f.email IS NULL
    GROUP BY LOWER(p.studentEmail)
    ORDER BY MAX(p.createdAt) DESC
    LIMIT ${sql.raw(String(lim))}
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return (list as any[]).map(r => ({
    email: String(r.email),
    name: r.name ?? null,
    anchorAt: new Date(r.anchorAt),
  }));
}

/**
 * Atomically claim a practice taker for the follow-up email. Returns true only
 * for the FIRST caller (row newly inserted) — so the instant on-completion send
 * and the scheduler can never both email the same person.
 */
export async function claimPracticeFollowup(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const res: any = await db.execute(sql`
    INSERT IGNORE INTO practice_followups (email, sentAt) VALUES (${email.toLowerCase().trim()}, NOW())
  `);
  const header = Array.isArray(res) ? res[0] : res;
  return Number(header?.affectedRows ?? 0) === 1;
}

/** Mark a practice-test taker as followed-up so they're emailed only once. */
export async function recordPracticeFollowupSent(email: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    INSERT INTO practice_followups (email, sentAt) VALUES (${email.toLowerCase().trim()}, NOW())
    ON DUPLICATE KEY UPDATE sentAt = NOW()
  `);
}

/**
 * Mock Test buyers who completed their test ≥24h ago and haven't received
 * the AI IELTS Tutor upsell email yet. Returns their name + email + overall
 * band + completion date so the email can be personalised ("Your band was 6.5
 * — here's how to push it to 7.5 with unlimited Writing + Speaking practice…").
 *
 * Cap age at 90 days — after that they've moved on and an upsell feels stale.
 * Requires the attempt to have completedAt AND paidAt (both real customers
 * only — free comp attempts are excluded).
 */
export async function getMockTestUpsellCandidates(
  limit = 30,
): Promise<Array<{ email: string; name: string | null; attemptId: number; overallBand: number | null; completedAt: Date }>> {
  const db = await getDb();
  if (!db) return [];
  const lim = Math.max(1, Math.min(100, Math.floor(limit)));
  const rows: any = await db.execute(sql`
    SELECT a.id AS attemptId,
           LOWER(a.customerEmail) AS email,
           a.customerName AS name,
           s.overallBand AS overallBand,
           a.completedAt AS completedAt
    FROM ieltsMockAttempts a
    LEFT JOIN ieltsMockScores s ON s.attemptId = a.id
    LEFT JOIN mock_test_upsells m ON m.email = LOWER(a.customerEmail)
    WHERE a.status = 'completed'
      AND a.paidAt IS NOT NULL
      AND a.completedAt IS NOT NULL
      AND a.customerEmail IS NOT NULL
      AND a.customerEmail <> ''
      AND a.completedAt <= NOW() - INTERVAL 24 HOUR
      AND a.completedAt >= NOW() - INTERVAL 90 DAY
      AND m.email IS NULL
      AND a.paymentRef NOT LIKE 'ADMIN-%'
      AND a.paymentRef NOT LIKE 'COMP-%'
    ORDER BY a.completedAt DESC
    LIMIT ${sql.raw(String(lim))}
  `);
  const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
  return (list as any[]).map(r => ({
    email: String(r.email),
    name: r.name ?? null,
    attemptId: Number(r.attemptId),
    overallBand: r.overallBand != null ? Number(r.overallBand) : null,
    completedAt: new Date(r.completedAt),
  }));
}

/** Mark a Mock Test buyer as upsold so we never re-email them. */
export async function recordMockTestUpsellSent(
  email: string,
  meta: { attemptId?: number; overallBand?: number | null } = {},
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    INSERT INTO mock_test_upsells (email, attemptId, overallBand, sentAt)
    VALUES (${email.toLowerCase().trim()}, ${meta.attemptId ?? null}, ${meta.overallBand ?? null}, NOW())
    ON DUPLICATE KEY UPDATE sentAt = NOW()
  `);
}

/** Upsert the per-lead reminder counter after a nurture email is sent. */
export async function recordTutorReminderSent(leadId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    INSERT INTO tutor_reminders (leadId, remindersSent, lastSentAt)
    VALUES (${leadId}, 1, NOW())
    ON DUPLICATE KEY UPDATE remindersSent = remindersSent + 1, lastSentAt = NOW()
  `);
}

export async function countTutorSessions(leadId: number, skill: "speaking" | "writing"): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [r] = await db.select({ c: sql<number>`COUNT(*)` }).from(tutorSessions)
    .where(and(eq(tutorSessions.leadId, leadId), eq(tutorSessions.skill, skill)));
  return Number(r?.c ?? 0);
}

export async function createTutorSession(data: InsertTutorSession): Promise<TutorSession | null> {
  const db = await getDb();
  if (!db) return null;
  const r = await db.insert(tutorSessions).values(data);
  const id = (r as any)[0].insertId;
  const [row] = await db.select().from(tutorSessions).where(eq(tutorSessions.id, id)).limit(1);
  return row || null;
}

export async function updateTutorSession(id: number, data: Partial<InsertTutorSession>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(tutorSessions).set(data).where(eq(tutorSessions.id, id));
}

export async function listTutorSessions(leadId: number, limit = 50): Promise<TutorSession[]> {
  const db = await getDb();
  if (!db) return [];
  return (await db.select().from(tutorSessions).where(eq(tutorSessions.leadId, leadId)).orderBy(desc(tutorSessions.createdAt)).limit(limit)) as TutorSession[];
}

export async function getTutorSession(id: number, leadId: number): Promise<TutorSession | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(tutorSessions).where(and(eq(tutorSessions.id, id), eq(tutorSessions.leadId, leadId))).limit(1);
  return row || null;
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

/** Replace all spend rows for a given source+month (used by the Google Ads import). */
export async function replaceMonthlySpend(source: string, month: string, rows: InsertMarketingSpend[]): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  await db.delete(marketingSpend).where(and(eq(marketingSpend.source, source), eq(marketingSpend.periodMonth, month)));
  if (rows.length) await db.insert(marketingSpend).values(rows);
  return rows.length;
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
 * Update the aiAnalysis + derived fields for an existing aptitude result.
 * Used by the "Regenerate full analysis" admin action to backfill records
 * where the original AI call failed (e.g. the Cherise incident where
 * aiAnalysis was silently saved as `{ error: "Failed to parse" }`).
 */
export async function updateAptitudeResultAnalysis(
  id: number,
  aiAnalysis: any,
): Promise<AptitudeResult | null> {
  const db = await getDb();
  if (!db) return null;
  await db.update(aptitudeResults).set({
    aiAnalysis: JSON.stringify(aiAnalysis),
    personalitySnapshot: aiAnalysis?.personalitySnapshot ? JSON.stringify(aiAnalysis.personalitySnapshot) : null,
    recommendedMajors: JSON.stringify(aiAnalysis?.recommendedMajors || []),
    careerOutlook: aiAnalysis?.careerOutlook || null,
    parentSummary: aiAnalysis?.parentSummary || null,
  }).where(eq(aptitudeResults.id, id));
  const [row] = await db.select().from(aptitudeResults).where(eq(aptitudeResults.id, id));
  return row || null;
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
      // Select only the columns we use — avoids errors if the table is missing
      // optional columns (e.g. description/createdAt) on older schemas.
      try {
        const [cat] = await db
          .select({ id: blogCategories.id, name: blogCategories.name })
          .from(blogCategories)
          .where(eq(blogCategories.id, post.categoryId));
        categoryName = cat?.name;
      } catch { /* category lookup is non-critical */ }
    }
    const tags: string[] = [];
    try {
      const postTagRows = await db.select({ tagId: blogPostTags.tagId }).from(blogPostTags).where(eq(blogPostTags.postId, post.id));
      for (const pt of postTagRows) {
        const [tag] = await db.select({ name: blogTags.name }).from(blogTags).where(eq(blogTags.id, pt.tagId));
        if (tag) tags.push(tag.name);
      }
    } catch { /* tags are non-critical */ }
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
