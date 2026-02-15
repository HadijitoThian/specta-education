import { eq, desc, and, gte, lte, lt, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  conversations, InsertConversation, Conversation,
  messages, InsertMessage, Message,
  leads, InsertLead, Lead,
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
  whatsappMessages
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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
    } else if (user.openId === ENV.ownerOpenId) {
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
