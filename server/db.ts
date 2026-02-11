import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
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
  aptitudeAccessTokens, InsertAptitudeAccessToken, AptitudeAccessToken
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
