import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "general_manager"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Conversations table - tracks each chat session
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  userId: int("userId"),
  studentName: varchar("studentName", { length: 255 }),
  studentEmail: varchar("studentEmail", { length: 320 }),
  studentPhone: varchar("studentPhone", { length: 50 }),
  preferredCountry: varchar("preferredCountry", { length: 100 }),
  studyLevel: varchar("studyLevel", { length: 100 }),
  intakeDate: varchar("intakeDate", { length: 100 }),
  status: mysqlEnum("status", ["active", "lead_captured", "documents_uploaded", "forwarded", "closed"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Chat messages table - stores all messages in conversations
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Leads table - captured student information for marketing
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  studentEmail: varchar("studentEmail", { length: 320 }),
  studentPhone: varchar("studentPhone", { length: 50 }).notNull(),
  preferredCountry: varchar("preferredCountry", { length: 100 }),
  studyLevel: varchar("studyLevel", { length: 100 }),
  intakeDate: varchar("intakeDate", { length: 100 }),
  notes: text("notes"),
  assignedTo: varchar("assignedTo", { length: 255 }),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "closed"]).default("new").notNull(),
  forwardedAt: timestamp("forwardedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Documents table - uploaded student documents
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  leadId: int("leadId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 100 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  documentType: mysqlEnum("documentType", ["passport", "transcript", "certificate", "other"]).default("other").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * WhatsApp messages table - logs all WhatsApp contact form submissions
 */
export const whatsappMessages = mysqlTable("whatsappMessages", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  destinations: text("destinations").notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessage = typeof whatsappMessages.$inferInsert;

/**
 * Applications table - student university applications with document uploads
 * Enhanced with tracking fields for Application Tracker Portal
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  referenceNumber: varchar("referenceNumber", { length: 20 }).unique(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  currentSchool: varchar("currentSchool", { length: 255 }),
  educationLevel: varchar("educationLevel", { length: 100 }),
  selectedUniversities: text("selectedUniversities").notNull(), // JSON array of {university, country, program}
  ieltsScore: varchar("ieltsScore", { length: 20 }),
  transcriptUrl: text("transcriptUrl"),
  transcriptKey: varchar("transcriptKey", { length: 500 }),
  passportUrl: text("passportUrl"),
  passportKey: varchar("passportKey", { length: 500 }),
  ieltsDocUrl: text("ieltsDocUrl"),
  ieltsDocKey: varchar("ieltsDocKey", { length: 500 }),
  certificateUrl: text("certificateUrl"),
  certificateKey: varchar("certificateKey", { length: 500 }),
  additionalNotes: text("additionalNotes"),
  assignedCounselor: varchar("assignedCounselor", { length: 255 }),
  universityResponse: text("universityResponse"),
  statusHistory: text("statusHistory"), // JSON array of {status, timestamp, note}
  status: mysqlEnum("status", ["submitted", "reviewing", "processing", "on_hold", "offer_received", "accepted", "enrolled", "rejected"]).default("submitted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Application notes - counselor and student notes on applications
 */
export const applicationNotes = mysqlTable("applicationNotes", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApplicationNote = typeof applicationNotes.$inferSelect;
export type InsertApplicationNote = typeof applicationNotes.$inferInsert;

/**
 * Application documents - flexible document management per application
 */
export const applicationDocuments = mysqlTable("applicationDocuments", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 100 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  documentType: mysqlEnum("documentType", ["transcript", "passport", "ielts", "certificate", "offer_letter", "visa", "other"]).default("other").notNull(),
  uploadedBy: mysqlEnum("uploadedBy", ["student", "counselor"]).default("student").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApplicationDocument = typeof applicationDocuments.$inferSelect;
export type InsertApplicationDocument = typeof applicationDocuments.$inferInsert;

/**
 * Tracking tokens - magic link tokens for student application tracking
 */
export const trackingTokens = mysqlTable("trackingTokens", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrackingToken = typeof trackingTokens.$inferSelect;
export type InsertTrackingToken = typeof trackingTokens.$inferInsert;

/**
 * Appointments table - consultation booking system
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  date: varchar("date", { length: 20 }).notNull(), // YYYY-MM-DD format
  timeSlot: varchar("timeSlot", { length: 20 }).notNull(), // e.g. "10:00", "14:30"
  consultationType: mysqlEnum("consultationType", ["general", "ielts", "university", "visa", "scholarship"]).default("general").notNull(),
  preferredCountry: varchar("preferredCountry", { length: 100 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled", "rescheduled"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * IELTS Practice Results - stores student practice test results
 */
export const ieltsPracticeResults = mysqlTable("ieltsPracticeResults", {
  id: int("id").autoincrement().primaryKey(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  studentEmail: varchar("studentEmail", { length: 320 }).notNull(),
  studentPhone: varchar("studentPhone", { length: 50 }),
  section: mysqlEnum("section", ["reading", "writing", "listening", "speaking"]).notNull(),
  questions: text("questions").notNull(), // JSON: the questions asked
  answers: text("answers").notNull(), // JSON: student's answers
  score: varchar("score", { length: 10 }), // Band score estimation
  aiFeedback: text("aiFeedback"), // AI-generated feedback
  timeTaken: int("timeTaken"), // seconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IeltsPracticeResult = typeof ieltsPracticeResults.$inferSelect;
export type InsertIeltsPracticeResult = typeof ieltsPracticeResults.$inferInsert;

/**
 * Counselors table - registered counselors for assignment
 */
export const counselors = mysqlTable("counselors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  specialization: varchar("specialization", { length: 255 }), // e.g. "UK Universities", "IELTS", "Visa Support"
  isActive: boolean("isActive").default(true).notNull(),
  activeApplications: int("activeApplications").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Counselor = typeof counselors.$inferSelect;
export type InsertCounselor = typeof counselors.$inferInsert;

/**
 * Quiz Results table - stores "Which Country Fits You?" quiz results
 */
export const quizResults = mysqlTable("quizResults", {
  id: int("id").autoincrement().primaryKey(),
  studentName: varchar("studentName", { length: 255 }),
  studentEmail: varchar("studentEmail", { length: 320 }),
  studentPhone: varchar("studentPhone", { length: 50 }),
  answers: text("answers").notNull(), // JSON: array of {questionId, answer}
  matchedCountries: text("matchedCountries").notNull(), // JSON: array of {country, matchPercentage, universities}
  topMatch: varchar("topMatch", { length: 100 }).notNull(), // Top matched country
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizResult = typeof quizResults.$inferSelect;
export type InsertQuizResult = typeof quizResults.$inferInsert;

/**
 * Persona Results table - stores "My Study Abroad Persona" generator results
 */
export const personaResults = mysqlTable("personaResults", {
  id: int("id").autoincrement().primaryKey(),
  studentName: varchar("studentName", { length: 255 }),
  studentEmail: varchar("studentEmail", { length: 320 }),
  answers: text("answers").notNull(), // JSON: array of {questionId, answer}
  personaName: varchar("personaName", { length: 255 }).notNull(),
  personaData: text("personaData").notNull(), // JSON: full persona card data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PersonaResult = typeof personaResults.$inferSelect;
export type InsertPersonaResult = typeof personaResults.$inferInsert;

/**
 * Scholarship Leads table - captured from the interactive eligibility checker
 */
export const scholarshipLeads = mysqlTable("scholarshipLeads", {
  id: int("id").autoincrement().primaryKey(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  studentEmail: varchar("studentEmail", { length: 320 }).notNull(),
  studentPhone: varchar("studentPhone", { length: 50 }).notNull(),
  educationLevel: varchar("educationLevel", { length: 100 }).notNull(), // SMA/SMK, D3, S1, S2
  gpa: varchar("gpa", { length: 10 }).notNull(), // e.g. "3.5"
  scholarshipInterest: varchar("scholarshipInterest", { length: 100 }).notNull(), // china, mila_malaysia, lpdp, not_sure
  ieltsStatus: varchar("ieltsStatus", { length: 50 }).notNull(), // yes, not_yet, planning
  ieltsScore: varchar("ieltsScore", { length: 10 }), // optional, e.g. "6.5"
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "closed"]).default("new").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScholarshipLead = typeof scholarshipLeads.$inferSelect;
export type InsertScholarshipLead = typeof scholarshipLeads.$inferInsert;

/***
 * Staff Accounts table - separate login system for counselors and staff
 */
export const staffAccounts = mysqlTable("staffAccounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "counselor", "staff"]).default("staff").notNull(),
  mustChangePassword: boolean("mustChangePassword").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StaffAccount = typeof staffAccounts.$inferSelect;
export type InsertStaffAccount = typeof staffAccounts.$inferInsert;

/**
 * Aptitude Test Results - AI-powered Tes Bakat using RIASEC + Multiple Intelligences
 */
export const aptitudeResults = mysqlTable("aptitudeResults", {
  id: int("id").autoincrement().primaryKey(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  studentEmail: varchar("studentEmail", { length: 320 }).notNull(),
  studentPhone: varchar("studentPhone", { length: 50 }),
  language: mysqlEnum("language", ["id", "en"]).default("id").notNull(),
  riasecAnswers: text("riasecAnswers").notNull(), // JSON: {R: [scores], I: [scores], A: [scores], S: [scores], E: [scores], C: [scores]}
  miAnswers: text("miAnswers").notNull(), // JSON: {linguistic: [scores], logical: [scores], ...}
  personalAnswers: text("personalAnswers").notNull(), // JSON: {subjects, hobbies, educationLevel, etc.}
  riasecScores: text("riasecScores").notNull(), // JSON: {R: number, I: number, A: number, S: number, E: number, C: number}
  miScores: text("miScores").notNull(), // JSON: {linguistic: number, logical: number, ...}
  hollandCode: varchar("hollandCode", { length: 10 }).notNull(), // e.g. "IAR"
  topIntelligences: text("topIntelligences").notNull(), // JSON: top 3 intelligences
  aiAnalysis: text("aiAnalysis").notNull(), // JSON: full AI-generated analysis
  personalitySnapshot: text("personalitySnapshot"), // Short shareable summary
  recommendedMajors: text("recommendedMajors").notNull(), // JSON: top 3 majors with reasoning
  careerOutlook: text("careerOutlook"), // JSON: career paths for each major
  parentSummary: text("parentSummary"), // Parent-friendly explanation
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AptitudeResult = typeof aptitudeResults.$inferSelect;
export type InsertAptitudeResult = typeof aptitudeResults.$inferInsert;

/**
 * Aptitude Access Tokens - single-use links for gated aptitude test access
 */
export const aptitudeAccessTokens = mysqlTable("aptitudeAccessTokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["unused", "in_progress", "completed", "expired"]).default("unused").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedByName: varchar("usedByName", { length: 255 }),
  usedByEmail: varchar("usedByEmail", { length: 320 }),
  usedByPhone: varchar("usedByPhone", { length: 50 }),
  usedAt: timestamp("usedAt"),
  completedAt: timestamp("completedAt"),
  resultId: int("resultId"), // links to aptitudeResults.id after completion
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AptitudeAccessToken = typeof aptitudeAccessTokens.$inferSelect;
export type InsertAptitudeAccessToken = typeof aptitudeAccessTokens.$inferInsert;

/**
 * Match Universities table - universities for the matching engine
 * Stores university profiles with entry requirements and tags for matching
 */
export const matchUniversities = mysqlTable("matchUniversities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameId: varchar("nameId", { length: 255 }), // Indonesian name if different
  country: varchar("country", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  description: text("description"), // English description
  descriptionId: text("descriptionId"), // Indonesian description
  logoUrl: text("logoUrl"),
  website: varchar("website", { length: 500 }),
  tuitionMinUsd: int("tuitionMinUsd"), // Annual tuition in USD (min)
  tuitionMaxUsd: int("tuitionMaxUsd"), // Annual tuition in USD (max)
  ieltsMin: varchar("ieltsMin", { length: 10 }), // Minimum IELTS score e.g. "5.5"
  gpaMin: varchar("gpaMin", { length: 10 }), // Minimum GPA e.g. "2.5"
  scholarshipAvailable: boolean("scholarshipAvailable").default(false).notNull(),
  ranking: varchar("ranking", { length: 100 }), // e.g. "QS 200-300"
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchUniversity = typeof matchUniversities.$inferSelect;
export type InsertMatchUniversity = typeof matchUniversities.$inferInsert;

/**
 * Match Programs table - programs offered by universities
 * Each program has RIASEC codes and MI types for matching with aptitude test results
 */
export const matchPrograms = mysqlTable("matchPrograms", {
  id: int("id").autoincrement().primaryKey(),
  universityId: int("universityId").notNull(),
  programName: varchar("programName", { length: 255 }).notNull(),
  programNameId: varchar("programNameId", { length: 255 }), // Indonesian name
  degreeLevel: mysqlEnum("degreeLevel", ["bachelor", "master", "doctorate", "diploma"]).default("bachelor").notNull(),
  fieldOfStudy: varchar("fieldOfStudy", { length: 255 }).notNull(), // e.g. "Engineering", "Business"
  fieldOfStudyId: varchar("fieldOfStudyId", { length: 255 }), // Indonesian field name
  riasecCodes: varchar("riasecCodes", { length: 20 }).notNull(), // e.g. "RIA", "SEC" - top 2-3 RIASEC codes
  miTypes: varchar("miTypes", { length: 255 }).notNull(), // comma-separated MI types e.g. "logical,spatial"
  description: text("description"),
  descriptionId: text("descriptionId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchProgram = typeof matchPrograms.$inferSelect;
export type InsertMatchProgram = typeof matchPrograms.$inferInsert;


/**
 * Cost of Living data - detailed city-level cost breakdowns for the calculator
 */
export const costOfLivingData = mysqlTable("costOfLivingData", {
  id: int("id").autoincrement().primaryKey(),
  country: varchar("country", { length: 100 }).notNull(),
  countrySlug: varchar("countrySlug", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  category: mysqlEnum("category", ["rent", "food", "transport", "utilities", "entertainment", "tuition"]).notNull(),
  amountMinUsd: int("amountMinUsd").notNull(), // monthly minimum in USD
  amountMaxUsd: int("amountMaxUsd").notNull(), // monthly maximum in USD
  localCurrency: varchar("localCurrency", { length: 10 }).notNull(), // e.g. "AUD", "GBP"
  amountMinLocal: int("amountMinLocal").notNull(),
  amountMaxLocal: int("amountMaxLocal").notNull(),
  notes: text("notes"), // e.g. "Shared apartment in city center"
  notesId: text("notesId"), // Indonesian notes
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CostOfLivingData = typeof costOfLivingData.$inferSelect;
export type InsertCostOfLivingData = typeof costOfLivingData.$inferInsert;

/**
 * Study Abroad Checklist - predefined checklist items with timeline phases
 */
export const checklistItems = mysqlTable("checklistItems", {
  id: int("id").autoincrement().primaryKey(),
  phase: mysqlEnum("phase", ["12_months", "9_months", "6_months", "3_months", "1_month", "2_weeks", "departure"]).notNull(),
  category: mysqlEnum("category", ["documents", "tests", "applications", "visa", "accommodation", "finances", "travel", "health"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  titleId: varchar("titleId", { length: 255 }), // Indonesian title
  description: text("description"),
  descriptionId: text("descriptionId"), // Indonesian description
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

/**
 * User Checklist Progress - tracks which items each user has completed
 */
export const userChecklistProgress = mysqlTable("userChecklistProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  checklistItemId: int("checklistItemId").notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  notes: text("notes"), // user's personal notes for this item
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserChecklistProgress = typeof userChecklistProgress.$inferSelect;
export type InsertUserChecklistProgress = typeof userChecklistProgress.$inferInsert;

/**
 * Aptitude Pro Orders - tracks Xendit payment orders for Tes Bakat AI Pro
 */
export const aptitudeProOrders = mysqlTable("aptitudeProOrders", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 128 }).notNull().unique(), // unique order ref
  xenditInvoiceId: varchar("xenditInvoiceId", { length: 128 }), // Xendit invoice ID
  xenditInvoiceUrl: varchar("xenditInvoiceUrl", { length: 512 }), // Xendit payment URL
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 50 }),
  amount: int("amount").notNull(), // in IDR (e.g. 79000)
  status: mysqlEnum("status", ["pending", "paid", "expired", "failed"]).default("pending").notNull(),
  accessTokenId: int("accessTokenId"), // links to aptitudeAccessTokens.id after payment
  paidAt: timestamp("paidAt"),
  source: varchar("source", { length: 50 }).default("landing").notNull(), // "landing" or "upsell"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AptitudeProOrder = typeof aptitudeProOrders.$inferSelect;
export type InsertAptitudeProOrder = typeof aptitudeProOrders.$inferInsert;


/**
 * Drip Campaigns - defines a named email sequence (e.g. "Pro Test Upsell", "General Follow-up")
 */
export const dripCampaigns = mysqlTable("dripCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerSource: mysqlEnum("triggerSource", [
    "aptitude_test", "contact_form", "scholarship_form", "quiz", "manual", "pro_purchase"
  ]).default("manual").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DripCampaign = typeof dripCampaigns.$inferSelect;
export type InsertDripCampaign = typeof dripCampaigns.$inferInsert;

/**
 * Drip Email Steps - individual emails in a campaign sequence
 * delayDays = number of days after enrollment (or previous step) to send
 */
export const dripEmailSteps = mysqlTable("dripEmailSteps", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  stepOrder: int("stepOrder").notNull(), // 1, 2, 3...
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlContent: text("htmlContent").notNull(), // full HTML email body
  delayDays: int("delayDays").notNull(), // days after enrollment to send this step
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DripEmailStep = typeof dripEmailSteps.$inferSelect;
export type InsertDripEmailStep = typeof dripEmailSteps.$inferInsert;

/**
 * Drip Enrollments - tracks which contacts are enrolled in which campaigns
 */
export const dripEnrollments = mysqlTable("dripEnrollments", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  source: varchar("source", { length: 100 }), // where the lead came from
  currentStepOrder: int("currentStepOrder").default(0).notNull(), // last completed step (0 = none sent yet)
  status: mysqlEnum("status", ["active", "completed", "unsubscribed", "paused"]).default("active").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  lastEmailSentAt: timestamp("lastEmailSentAt"),
  nextSendAt: timestamp("nextSendAt"), // pre-calculated next send time
  completedAt: timestamp("completedAt"),
  unsubscribedAt: timestamp("unsubscribedAt"),
  unsubscribeToken: varchar("unsubscribeToken", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DripEnrollment = typeof dripEnrollments.$inferSelect;
export type InsertDripEnrollment = typeof dripEnrollments.$inferInsert;

/**
 * Drip Email Logs - tracks every email sent, with open/click tracking
 */
export const dripEmailLogs = mysqlTable("dripEmailLogs", {
  id: int("id").autoincrement().primaryKey(),
  enrollmentId: int("enrollmentId").notNull(),
  stepId: int("stepId").notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "bounced"]).default("sent").notNull(),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DripEmailLog = typeof dripEmailLogs.$inferSelect;
export type InsertDripEmailLog = typeof dripEmailLogs.$inferInsert;


// ==========================================
// Blog System Tables
// ==========================================

/**
 * Blog categories for organizing articles
 */
export const blogCategories = mysqlTable("blog_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = typeof blogCategories.$inferInsert;

/**
 * Blog posts / articles
 */
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featuredImage"),
  metaTitle: varchar("metaTitle", { length: 500 }),
  metaDescription: text("metaDescription"),
  targetKeyword: varchar("targetKeyword", { length: 255 }),
  categoryId: int("categoryId"),
  authorId: int("authorId"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Blog tags for flexible content labeling
 */
export const blogTags = mysqlTable("blog_tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
});

export type BlogTag = typeof blogTags.$inferSelect;
export type InsertBlogTag = typeof blogTags.$inferInsert;

/**
 * Many-to-many relationship between posts and tags
 */
export const blogPostTags = mysqlTable("blog_post_tags", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  tagId: int("tagId").notNull(),
});

export type BlogPostTag = typeof blogPostTags.$inferSelect;
export type InsertBlogPostTag = typeof blogPostTags.$inferInsert;


/**
 * Blog comments with ratings for user engagement
 */
export const blogComments = mysqlTable("blog_comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  content: text("content").notNull(),
  rating: int("rating"), // 1-5 star rating, nullable (comment without rating)
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type BlogComment = typeof blogComments.$inferSelect;
export type InsertBlogComment = typeof blogComments.$inferInsert;
