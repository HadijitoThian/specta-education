import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, tinyint } from "drizzle-orm/mysql-core";

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
  conversationId: int("conversationId"),  // nullable for manual CRM entries
  studentName: varchar("studentName", { length: 255 }).notNull(),
  studentEmail: varchar("studentEmail", { length: 320 }),
  studentPhone: varchar("studentPhone", { length: 50 }),
  preferredCountry: varchar("preferredCountry", { length: 100 }),
  studyLevel: varchar("studyLevel", { length: 100 }),
  intakeDate: varchar("intakeDate", { length: 100 }),
  notes: text("notes"),
  assignedTo: varchar("assignedTo", { length: 255 }),
  assignedCounselor: varchar("assignedCounselor", { length: 255 }),
  programInterest: varchar("programInterest", { length: 255 }),
  parentName: varchar("parentName", { length: 255 }),
  parentEmail: varchar("parentEmail", { length: 320 }),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "closed"]).default("new").notNull(),
  forwardedAt: timestamp("forwardedAt"),
  intentSummary: text("intentSummary"),
  tags: text("tags"),
  chatTranscript: text("chatTranscript"),
  source: varchar("source", { length: 50 }).default("chatbot"),
  isAnonymous: boolean("isAnonymous").default(false),
  isAssigned: int("isAssigned").default(0).notNull(), // 1 = already assigned to counselor, prevents re-processing
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
  isAssigned: int("isAssigned").default(0).notNull(), // 1 = already assigned to counselor, prevents re-processing
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ScholarshipLead = typeof scholarshipLeads.$inferSelect;
export type InsertScholarshipLead = typeof scholarshipLeads.$inferInsert;

/**
 * Simulator Sessions table - tracks each student's simulator journey
 */
export const simulatorSessions = mysqlTable("simulatorSessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  studentEmail: varchar("studentEmail", { length: 320 }).notNull(),
  studentPhone: varchar("studentPhone", { length: 50 }),
  country: varchar("country", { length: 100 }).notNull(), // australia, uk, usa, etc.
  universityTier: varchar("universityTier", { length: 50 }).notNull(), // top10, mid_tier, budget
  intendedMajor: varchar("intendedMajor", { length: 255 }).notNull(),
  budgetLevel: varchar("budgetLevel", { length: 50 }).notNull(), // tight, moderate, comfortable
  personalityType: varchar("personalityType", { length: 100 }), // from aptitude test or quick quiz
  currentDay: int("currentDay").default(1).notNull(),
  status: mysqlEnum("status", ["in_progress", "completed", "abandoned"]).default("in_progress").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SimulatorSession = typeof simulatorSessions.$inferSelect;
export type InsertSimulatorSession = typeof simulatorSessions.$inferInsert;

/**
 * Simulator Choices table - stores each choice made during simulation
 */
export const simulatorChoices = mysqlTable("simulatorChoices", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  day: int("day").notNull(),
  scenarioType: varchar("scenarioType", { length: 100 }).notNull(), // arrival, academic, social, financial, etc.
  scenarioText: text("scenarioText").notNull(),
  choiceOptions: text("choiceOptions").notNull(), // JSON: array of options
  selectedChoice: varchar("selectedChoice", { length: 10 }).notNull(), // A, B, or C
  choiceText: text("choiceText").notNull(),
  aiResponse: text("aiResponse").notNull(),
  impactBudget: int("impactBudget").default(0).notNull(), // +/- amount
  impactMood: int("impactMood").default(0).notNull(), // +/- points
  impactConnections: int("impactConnections").default(0).notNull(), // +/- points
  impactAcademic: int("impactAcademic").default(0).notNull(), // +/- points
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SimulatorChoice = typeof simulatorChoices.$inferSelect;
export type InsertSimulatorChoice = typeof simulatorChoices.$inferInsert;

/**
 * Simulator Results table - final readiness report for each completed simulation
 */
export const simulatorResults = mysqlTable("simulatorResults", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  readinessScore: int("readinessScore").notNull(), // 0-100
  socialScore: int("socialScore").notNull(),
  financialScore: int("financialScore").notNull(),
  academicScore: int("academicScore").notNull(),
  emotionalScore: int("emotionalScore").notNull(),
  strengths: text("strengths").notNull(), // JSON array
  weaknesses: text("weaknesses").notNull(), // JSON array
  recommendations: text("recommendations").notNull(), // JSON array
  reportSent: boolean("reportSent").default(false).notNull(),
  bookedConsultation: boolean("bookedConsultation").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SimulatorResult = typeof simulatorResults.$inferSelect;
export type InsertSimulatorResult = typeof simulatorResults.$inferInsert;

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
  nurtureEmailSent: int("nurtureEmailSent").default(0),
  isAssigned: int("isAssigned").default(0).notNull(), // 1 = already assigned to counselor, prevents re-processing on agent cycles
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
  amplified: int("amplified").default(0),
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


// ==========================================
// AI Agents Command Center Tables
// ==========================================

/**
 * Agent configurations - settings for each AI agent
 */
export const agentConfigs = mysqlTable("agent_configs", {
  id: int("id").autoincrement().primaryKey(),
  agentName: varchar("agentName", { length: 100 }).notNull().unique(), // e.g. "crm_distributor", "seo_builder", "central_reporter"
  displayName: varchar("displayName", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  settings: text("settings"), // JSON: agent-specific config (e.g. follow-up intervals, article frequency)
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  runIntervalMinutes: int("runIntervalMinutes").default(60).notNull(), // how often to run
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentConfig = typeof agentConfigs.$inferSelect;
export type InsertAgentConfig = typeof agentConfigs.$inferInsert;

/**
 * Agent run logs - tracks every execution of each agent
 */
export const agentRunLogs = mysqlTable("agent_run_logs", {
  id: int("id").autoincrement().primaryKey(),
  agentName: varchar("agentName", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["running", "success", "failed", "partial"]).default("running").notNull(),
  summary: text("summary"), // Human-readable summary of what the agent did
  details: text("details"), // JSON: detailed execution data
  itemsProcessed: int("itemsProcessed").default(0).notNull(),
  itemsSucceeded: int("itemsSucceeded").default(0).notNull(),
  itemsFailed: int("itemsFailed").default(0).notNull(),
  errorMessage: text("errorMessage"),
  durationMs: int("durationMs"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentRunLog = typeof agentRunLogs.$inferSelect;
export type InsertAgentRunLog = typeof agentRunLogs.$inferInsert;

/**
 * Lead assignments - tracks which counselor is assigned to which lead
 * with follow-up scheduling and escalation tracking
 */
export const leadAssignments = mysqlTable("lead_assignments", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  leadSource: varchar("leadSource", { length: 50 }).notNull(), // "chatbot", "contact_form", "scholarship", "quiz", "whatsapp", "aptitude"
  counselorId: int("counselorId").notNull(), // references counselors.id
  counselorName: varchar("counselorName", { length: 255 }).notNull(),
  counselorEmail: varchar("counselorEmail", { length: 320 }).notNull(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  studentEmail: varchar("studentEmail", { length: 320 }),
  studentPhone: varchar("studentPhone", { length: 50 }),
  preferredCountry: varchar("preferredCountry", { length: 100 }),
  status: mysqlEnum("status", ["assigned", "contacted", "follow_up", "qualified", "converted", "closed", "escalated"]).default("assigned").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  lastContactedAt: timestamp("lastContactedAt"),
  nextFollowUpAt: timestamp("nextFollowUpAt"),
  followUpCount: int("followUpCount").default(0).notNull(),
  escalatedAt: timestamp("escalatedAt"),
  escalationReason: text("escalationReason"),
  notes: text("notes"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadAssignment = typeof leadAssignments.$inferSelect;
export type InsertLeadAssignment = typeof leadAssignments.$inferInsert;

/**
 * Follow-up actions - individual follow-up emails/actions for each lead assignment
 */
export const followUpActions = mysqlTable("follow_up_actions", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull(), // references lead_assignments.id
  actionType: mysqlEnum("actionType", ["email_student", "email_counselor", "escalation", "reminder"]).notNull(),
  dayOffset: int("dayOffset").notNull(), // days after assignment (0 = immediate, 1 = day 1, etc.)
  subject: varchar("subject", { length: 500 }),
  content: text("content"), // email body or action description
  status: mysqlEnum("status", ["pending", "sent", "failed", "skipped"]).default("pending").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FollowUpAction = typeof followUpActions.$inferSelect;
export type InsertFollowUpAction = typeof followUpActions.$inferInsert;

/**
 * SEO content calendar - planned and generated articles
 */
export const seoContentCalendar = mysqlTable("seo_content_calendar", {
  id: int("id").autoincrement().primaryKey(),
  targetKeyword: varchar("targetKeyword", { length: 255 }).notNull(),
  secondaryKeywords: text("secondaryKeywords"), // JSON array of related keywords
  title: varchar("title", { length: 500 }),
  titleId: varchar("titleId", { length: 500 }), // Indonesian title
  slug: varchar("slug", { length: 500 }),
  contentBrief: text("contentBrief"), // AI-generated content brief
  language: mysqlEnum("language", ["id", "en"]).default("id").notNull(),
  category: varchar("category", { length: 100 }), // e.g. "study_australia", "ielts_tips", "scholarships"
  status: mysqlEnum("status", ["planned", "generating", "generated", "review", "published", "failed"]).default("planned").notNull(),
  blogPostId: int("blogPostId"), // references blog_posts.id after publishing
  scheduledDate: varchar("scheduledDate", { length: 20 }), // YYYY-MM-DD
  publishedAt: timestamp("publishedAt"),
  searchVolume: int("searchVolume"), // estimated monthly search volume
  difficulty: varchar("difficulty", { length: 20 }), // "easy", "medium", "hard"
  agentRunId: int("agentRunId"), // which agent run generated this
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SeoContentCalendar = typeof seoContentCalendar.$inferSelect;
export type InsertSeoContentCalendar = typeof seoContentCalendar.$inferInsert;

/**
 * Daily reports - stores generated daily reports for history
 */
export const dailyReports = mysqlTable("daily_reports", {
  id: int("id").autoincrement().primaryKey(),
  reportDate: varchar("reportDate", { length: 20 }).notNull(), // YYYY-MM-DD
  reportType: mysqlEnum("reportType", ["daily_summary", "weekly_summary", "monthly_summary"]).default("daily_summary").notNull(),
  htmlContent: text("htmlContent").notNull(), // full HTML email content
  summary: text("summary"), // plain text summary
  metrics: text("metrics"), // JSON: key metrics snapshot
  sentTo: varchar("sentTo", { length: 320 }).notNull(),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["generated", "sent", "failed"]).default("generated").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = typeof dailyReports.$inferInsert;

// ==========================================
// Phase 2 Agent Tables
// ==========================================

/**
 * Visitor tracking — captures website visitor behavior for Lead Hunter agent
 */
export const visitorTracking = mysqlTable("visitor_tracking", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  visitorFingerprint: varchar("visitorFingerprint", { length: 128 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  // Behavior data
  pagesVisited: text("pagesVisited"), // JSON array of page paths
  totalPageViews: int("totalPageViews").default(0),
  timeOnSite: int("timeOnSite").default(0), // seconds
  referrerUrl: text("referrerUrl"),
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  // Engagement signals
  chatbotEngaged: boolean("chatbotEngaged").default(false),
  formStarted: boolean("formStarted").default(false),
  formCompleted: boolean("formCompleted").default(false),
  contactPageVisited: boolean("contactPageVisited").default(false),
  ieltsPageVisited: boolean("ieltsPageVisited").default(false),
  countryPagesVisited: text("countryPagesVisited"), // JSON array
  aptitudeTestStarted: boolean("aptitudeTestStarted").default(false),
  // Lead scoring
  engagementScore: int("engagementScore").default(0),
  isHighIntent: boolean("isHighIntent").default(false),
  convertedToLead: boolean("convertedToLead").default(false),
  leadId: int("leadId"),
  // Timestamps
  firstVisitAt: timestamp("firstVisitAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VisitorTracking = typeof visitorTracking.$inferSelect;
export type InsertVisitorTracking = typeof visitorTracking.$inferInsert;

/**
 * Competitor intelligence — stores competitor monitoring data
 */
export const competitorIntelligence = mysqlTable("competitor_intelligence", {
  id: int("id").autoincrement().primaryKey(),
  competitorName: varchar("competitorName", { length: 255 }).notNull(),
  competitorUrl: varchar("competitorUrl", { length: 500 }),
  // Intelligence type
  intelligenceType: mysqlEnum("intelligenceType", [
    "website_change", "new_program", "pricing_change", "social_campaign",
    "ranking_change", "partnership_announcement", "event", "promotion", "general"
  ]).notNull(),
  // Details
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary"),
  details: text("details"), // JSON with full analysis
  sourceUrl: text("sourceUrl"),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium"),
  // Strategic response
  strategicRecommendation: text("strategicRecommendation"),
  actionRequired: boolean("actionRequired").default(false),
  actionTaken: boolean("actionTaken").default(false),
  // Status
  status: mysqlEnum("status", ["new", "reviewed", "actioned", "dismissed"]).default("new"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: varchar("reviewedBy", { length: 255 }),
  // Timestamps
  detectedAt: timestamp("detectedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompetitorIntelligence = typeof competitorIntelligence.$inferSelect;
export type InsertCompetitorIntelligence = typeof competitorIntelligence.$inferInsert;

/**
 * Competitor profiles — stores baseline data for each competitor
 */
export const competitorProfiles = mysqlTable("competitor_profiles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  instagramUrl: varchar("instagramUrl", { length: 500 }),
  facebookUrl: varchar("facebookUrl", { length: 500 }),
  tiktokUrl: varchar("tiktokUrl", { length: 500 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  // Baseline data
  description: text("description"),
  services: text("services"), // JSON array
  countries: text("countries"), // JSON array of countries they serve
  estimatedStudents: varchar("estimatedStudents", { length: 100 }),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  // Monitoring
  lastScannedAt: timestamp("lastScannedAt"),
  lastSnapshotHash: varchar("lastSnapshotHash", { length: 64 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompetitorProfile = typeof competitorProfiles.$inferSelect;
export type InsertCompetitorProfile = typeof competitorProfiles.$inferInsert;

/**
 * University partnership opportunities — tracks potential university partners
 */
export const universityPartnerships = mysqlTable("university_partnerships", {
  id: int("id").autoincrement().primaryKey(),
  universityName: varchar("universityName", { length: 500 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  city: varchar("city", { length: 255 }),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  // Rankings & reputation
  worldRanking: int("worldRanking"),
  countryRanking: int("countryRanking"),
  rankingSource: varchar("rankingSource", { length: 100 }),
  // Partnership details
  partnershipType: mysqlEnum("partnershipType", [
    "agent_agreement", "pathway_program", "scholarship_partner",
    "articulation_agreement", "exchange_program", "general"
  ]).default("agent_agreement"),
  hasExistingIndonesianAgent: boolean("hasExistingIndonesianAgent"),
  existingAgents: text("existingAgents"), // JSON array of known agents
  // Contact info
  internationalOfficeEmail: varchar("internationalOfficeEmail", { length: 320 }),
  agentRecruitmentEmail: varchar("agentRecruitmentEmail", { length: 320 }),
  contactPersonName: varchar("contactPersonName", { length: 255 }),
  contactPersonTitle: varchar("contactPersonTitle", { length: 255 }),
  contactPersonLinkedin: varchar("contactPersonLinkedin", { length: 500 }),
  // Programs of interest
  popularPrograms: text("popularPrograms"), // JSON array
  tuitionRange: varchar("tuitionRange", { length: 255 }),
  intakeMonths: varchar("intakeMonths", { length: 255 }),
  // Outreach tracking
  outreachStatus: mysqlEnum("outreachStatus", [
    "identified", "researching", "draft_ready", "email_sent",
    "follow_up_sent", "responded", "meeting_scheduled",
    "agreement_pending", "partnered", "rejected", "no_response"
  ]).default("identified"),
  outreachEmailDraft: text("outreachEmailDraft"),
  outreachEmailSubject: varchar("outreachEmailSubject", { length: 500 }),
  outreachRecipientEmail: varchar("outreachRecipientEmail", { length: 320 }),
  approvalStatus: mysqlEnum("approvalStatus", [
    "pending_draft", "pending_approval", "approved", "rejected", "sent", "failed"
  ]).default("pending_draft"),
  approvalToken: varchar("approvalToken", { length: 128 }),
  approvalRequestedAt: timestamp("approvalRequestedAt"),
  approvedAt: timestamp("approvedAt"),
  rejectedAt: timestamp("rejectedAt"),
  rejectionReason: text("rejectionReason"),
  outreachSentAt: timestamp("outreachSentAt"),
  lastFollowUpAt: timestamp("lastFollowUpAt"),
  responseReceived: text("responseReceived"),
  // Priority & scoring
  partnershipScore: int("partnershipScore").default(0), // 0-100
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  notes: text("notes"),
  // Timestamps
  discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UniversityPartnership = typeof universityPartnerships.$inferSelect;
export type InsertUniversityPartnership = typeof universityPartnerships.$inferInsert;

/**
 * University Reply Queue — stores incoming replies from universities awaiting Hadi's approval
 */
export const universityReplyQueue = mysqlTable("university_reply_queue", {
  id: int("id").autoincrement().primaryKey(),
  // Link to the outreach record
  universityPartnershipId: int("universityPartnershipId").notNull(),
  universityName: varchar("universityName", { length: 500 }).notNull(),
  universityCountry: varchar("universityCountry", { length: 100 }),
  // Incoming email details
  resendEmailId: varchar("resendEmailId", { length: 128 }).unique(), // Resend email_id for dedup
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  subject: varchar("subject", { length: 500 }),
  emailBody: text("emailBody"), // Full email body fetched from Resend API
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  // LLM Analysis
  classification: mysqlEnum("classification", [
    "interested", "needs_more_info", "declined", "counter_offer", "meeting_request", "unknown"
  ]).default("unknown"),
  classificationReason: text("classificationReason"),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]).default("neutral"),
  urgency: mysqlEnum("urgency", ["low", "medium", "high"]).default("medium"),
  keyPoints: text("keyPoints"), // JSON array of key points from the reply
  // Drafted response
  draftedResponse: text("draftedResponse"),
  draftedSubject: varchar("draftedSubject", { length: 500 }),
  // Approval workflow
  approvalStatus: mysqlEnum("approvalStatus", [
    "pending_review", "approved", "edited_and_approved", "declined", "sent", "failed"
  ]).default("pending_review"),
  approvedAt: timestamp("approvedAt"),
  declinedAt: timestamp("declinedAt"),
  declineReason: text("declineReason"),
  editedResponse: text("editedResponse"), // If Hadi edits the draft before approving
  sentAt: timestamp("sentAt"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UniversityReplyQueue = typeof universityReplyQueue.$inferSelect;
export type InsertUniversityReplyQueue = typeof universityReplyQueue.$inferInsert;

/**
 * Social media mentions — tracks social media activity related to study abroad in Indonesia
 */
export const socialMentions = mysqlTable("social_mentions", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["instagram", "facebook", "tiktok", "twitter", "linkedin", "youtube", "other"]).notNull(),
  mentionType: mysqlEnum("mentionType", ["lead_signal", "competitor_activity", "brand_mention", "industry_trend"]).notNull(),
  // Content
  authorName: varchar("authorName", { length: 255 }),
  authorHandle: varchar("authorHandle", { length: 255 }),
  content: text("content"),
  sourceUrl: text("sourceUrl"),
  // Analysis
  sentiment: mysqlEnum("sentiment", ["positive", "negative", "neutral"]),
  relevanceScore: int("relevanceScore").default(0), // 0-100
  isLeadOpportunity: boolean("isLeadOpportunity").default(false),
  convertedToLead: boolean("convertedToLead").default(false),
  leadId: int("leadId"),
  // Status
  status: mysqlEnum("status", ["new", "reviewed", "actioned", "dismissed"]).default("new"),
  // Timestamps
  detectedAt: timestamp("detectedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SocialMention = typeof socialMentions.$inferSelect;
export type InsertSocialMention = typeof socialMentions.$inferInsert;


// ==========================================
// SEO Optimizer Agent Tables
// ==========================================

/**
 * SEO page audits — stores audit results for each page
 */
export const seoPageAudits = mysqlTable("seo_page_audits", {
  id: int("id").autoincrement().primaryKey(),
  pageUrl: varchar("pageUrl", { length: 500 }).notNull(),
  pageTitle: varchar("pageTitle", { length: 500 }),
  // Meta tag analysis
  metaTitle: varchar("metaTitle", { length: 500 }),
  metaTitleLength: int("metaTitleLength"),
  metaTitleScore: int("metaTitleScore"), // 0-100
  metaDescription: text("metaDescription"),
  metaDescriptionLength: int("metaDescriptionLength"),
  metaDescriptionScore: int("metaDescriptionScore"), // 0-100
  // Open Graph
  hasOgTitle: boolean("hasOgTitle").default(false),
  hasOgDescription: boolean("hasOgDescription").default(false),
  hasOgImage: boolean("hasOgImage").default(false),
  // Content analysis
  h1Count: int("h1Count").default(0),
  h2Count: int("h2Count").default(0),
  imageCount: int("imageCount").default(0),
  imagesWithAlt: int("imagesWithAlt").default(0),
  wordCount: int("wordCount").default(0),
  internalLinks: int("internalLinks").default(0),
  externalLinks: int("externalLinks").default(0),
  // Technical
  hasCanonical: boolean("hasCanonical").default(false),
  hasStructuredData: boolean("hasStructuredData").default(false),
  isIndexable: boolean("isIndexable").default(true),
  loadTimeMs: int("loadTimeMs"),
  // Scores
  overallScore: int("overallScore").default(0), // 0-100
  issues: text("issues"), // JSON array of issues found
  recommendations: text("recommendations"), // JSON array of AI recommendations
  // Tracking
  targetKeyword: varchar("targetKeyword", { length: 255 }),
  keywordInTitle: boolean("keywordInTitle").default(false),
  keywordInDescription: boolean("keywordInDescription").default(false),
  keywordInH1: boolean("keywordInH1").default(false),
  keywordDensity: varchar("keywordDensity", { length: 10 }),
  // Timestamps
  auditedAt: timestamp("auditedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SeoPageAudit = typeof seoPageAudits.$inferSelect;
export type InsertSeoPageAudit = typeof seoPageAudits.$inferInsert;

/**
 * SEO recommendations — actionable items from audits
 */
export const seoRecommendations = mysqlTable("seo_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId"),
  pageUrl: varchar("pageUrl", { length: 500 }).notNull(),
  type: mysqlEnum("type", [
    "meta_title", "meta_description", "og_tags", "h1_missing", "h1_multiple",
    "alt_text", "internal_links", "keyword_optimization", "structured_data",
    "canonical", "content_length", "load_speed", "sitemap"
  ]).notNull(),
  severity: mysqlEnum("severity", ["critical", "warning", "info"]).default("warning").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  currentValue: text("currentValue"),
  suggestedValue: text("suggestedValue"), // AI-generated suggestion
  status: mysqlEnum("status", ["open", "applied", "dismissed"]).default("open").notNull(),
  appliedAt: timestamp("appliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SeoRecommendation = typeof seoRecommendations.$inferSelect;
export type InsertSeoRecommendation = typeof seoRecommendations.$inferInsert;

/**
 * SEO score history — tracks overall site SEO health over time
 */
export const seoScoreHistory = mysqlTable("seo_score_history", {
  id: int("id").autoincrement().primaryKey(),
  overallScore: int("overallScore").default(0).notNull(), // 0-100
  metaScore: int("metaScore").default(0), // meta tags health
  contentScore: int("contentScore").default(0), // content quality
  technicalScore: int("technicalScore").default(0), // technical SEO
  pagesAudited: int("pagesAudited").default(0),
  issuesFound: int("issuesFound").default(0),
  issuesFixed: int("issuesFixed").default(0),
  topIssues: text("topIssues"), // JSON: top 5 issues summary
  reportSentAt: timestamp("reportSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SeoScoreHistory = typeof seoScoreHistory.$inferSelect;
export type InsertSeoScoreHistory = typeof seoScoreHistory.$inferInsert;

// ==========================================
// AI General Manager Tables
// ==========================================

/**
 * GM Health Checks — every 4-hour cycle evaluation of all agents
 */
export const gmHealthChecks = mysqlTable("gm_health_checks", {
  id: int("id").autoincrement().primaryKey(),
  checkAt: timestamp("checkAt").defaultNow().notNull(),
  cycleLabel: varchar("cycleLabel", { length: 50 }).notNull(),
  agentName: varchar("agentName", { length: 100 }).notNull(),
  agentDisplayName: varchar("agentDisplayName", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["healthy", "warning", "critical", "missed", "recovered"]).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  expectedRunAt: timestamp("expectedRunAt"),
  wasAutoHealed: boolean("wasAutoHealed").default(false).notNull(),
  errorSummary: text("errorSummary"),
  outputSummary: text("outputSummary"),
  healthScore: int("healthScore").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GmHealthCheck = typeof gmHealthChecks.$inferSelect;
export type InsertGmHealthCheck = typeof gmHealthChecks.$inferInsert;

/**
 * GM Recommendations — strategic suggestions generated by the AI GM
 */
export const gmRecommendations = mysqlTable("gm_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  reportDate: varchar("reportDate", { length: 20 }).notNull(),
  category: mysqlEnum("category", [
    "competitor_response",
    "seo_improvement",
    "lead_generation",
    "university_partnership",
    "student_engagement",
    "operational_fix",
    "strategic_opportunity"
  ]).notNull(),
  priority: mysqlEnum("priority", ["urgent", "high", "medium", "low"]).default("medium").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  rationale: text("rationale"),
  suggestedAction: text("suggestedAction"),
  dataSource: varchar("dataSource", { length: 255 }),
  status: mysqlEnum("status", ["pending", "acknowledged", "in_progress", "done", "dismissed"]).default("pending").notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GmRecommendation = typeof gmRecommendations.$inferSelect;
export type InsertGmRecommendation = typeof gmRecommendations.$inferInsert;

/**
 * GM Executive Reports — the daily 8 AM report compiled by the AI GM
 */
export const gmExecutiveReports = mysqlTable("gm_executive_reports", {
  id: int("id").autoincrement().primaryKey(),
  reportDate: varchar("reportDate", { length: 20 }).notNull(),
  totalAgents: int("totalAgents").default(0).notNull(),
  healthyAgents: int("healthyAgents").default(0).notNull(),
  warningAgents: int("warningAgents").default(0).notNull(),
  criticalAgents: int("criticalAgents").default(0).notNull(),
  autoHealedCount: int("autoHealedCount").default(0).notNull(),
  metricsSnapshot: text("metricsSnapshot"),
  executiveSummary: text("executiveSummary").notNull(),
  operationsReport: text("operationsReport").notNull(),
  recommendationsJson: text("recommendationsJson"),
  competitorAlerts: text("competitorAlerts"),
  seoInsights: text("seoInsights"),
  leadInsights: text("leadInsights"),
  partnershipInsights: text("partnershipInsights"),
  htmlContent: text("htmlContent"),
  sentTo: varchar("sentTo", { length: 320 }),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["generated", "sent", "failed"]).default("generated").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GmExecutiveReport = typeof gmExecutiveReports.$inferSelect;
export type InsertGmExecutiveReport = typeof gmExecutiveReports.$inferInsert;

// ==========================================
// Sprint 1 CRM Tables — Counselor Workspace
// ==========================================

/**
 * CRM Tasks — AI-generated and manual daily tasks for counselors
 */
export const crmTasks = mysqlTable("crm_tasks", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(), // references staffAccounts.id
  staffEmail: varchar("staffEmail", { length: 320 }).notNull(),
  // What the task is about
  relatedType: mysqlEnum("relatedType", ["lead", "application", "general"]).default("lead").notNull(),
  relatedId: int("relatedId"), // leadId or applicationId
  relatedName: varchar("relatedName", { length: 255 }), // student name for display
  // Task details
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  taskType: mysqlEnum("taskType", ["call", "whatsapp", "email", "document_request", "follow_up", "consultation", "other"]).default("follow_up").notNull(),
  priority: mysqlEnum("priority", ["urgent", "high", "medium", "low"]).default("medium").notNull(),
  // Status
  status: mysqlEnum("status", ["pending", "in_progress", "done", "skipped"]).default("pending").notNull(),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  // AI or manual
  isAiGenerated: boolean("isAiGenerated").default(false).notNull(),
  aiReason: text("aiReason"), // why AI generated this task
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CrmTask = typeof crmTasks.$inferSelect;
export type InsertCrmTask = typeof crmTasks.$inferInsert;

/**
 * Lead Pipeline Stage — tracks which pipeline stage a lead is in
 * Extends the basic leads.status with richer CRM pipeline tracking
 */
export const leadPipelineStages = mysqlTable("lead_pipeline_stages", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull().unique(), // references leads.id
  stage: mysqlEnum("stage", ["new", "contacted", "qualified", "enrolled", "in_progress", "completed", "lost"]).default("new").notNull(),
  previousStage: mysqlEnum("previousStage", ["new", "contacted", "qualified", "enrolled", "in_progress", "completed", "lost"]),
  stageChangedAt: timestamp("stageChangedAt").defaultNow().notNull(),
  stageChangedBy: varchar("stageChangedBy", { length: 255 }), // staff name
  stageNote: text("stageNote"), // reason for stage change
  // Scoring
  leadScore: int("leadScore").default(50), // 0-100 AI score
  scoreReason: text("scoreReason"),
  // Next action
  nextActionDue: timestamp("nextActionDue"),
  nextActionNote: varchar("nextActionNote", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LeadPipelineStage = typeof leadPipelineStages.$inferSelect;
export type InsertLeadPipelineStage = typeof leadPipelineStages.$inferInsert;

/**
 * Consultation Notes — structured notes from counselor consultations
 */
export const consultationNotes = mysqlTable("consultation_notes", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  staffName: varchar("staffName", { length: 255 }).notNull(),
  // What was consulted
  relatedType: mysqlEnum("relatedType", ["lead", "application"]).default("lead").notNull(),
  relatedId: int("relatedId").notNull(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  // Note content
  rawNote: text("rawNote"), // what counselor typed
  expandedNote: text("expandedNote"), // AI-expanded structured note
  consultationType: mysqlEnum("consultationType", ["call", "whatsapp", "in_person", "email", "online_meeting"]).default("call").notNull(),
  durationMinutes: int("durationMinutes"),
  // Outcomes
  outcome: mysqlEnum("outcome", ["positive", "neutral", "negative", "no_answer"]).default("neutral").notNull(),
  nextStepAction: varchar("nextStepAction", { length: 500 }),
  nextStepDueDate: timestamp("nextStepDueDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ConsultationNote = typeof consultationNotes.$inferSelect;
export type InsertConsultationNote = typeof consultationNotes.$inferInsert;

/**
 * Counselor Performance Snapshots — daily KPI snapshots per counselor
 */
export const counselorPerformance = mysqlTable("counselor_performance", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  staffEmail: varchar("staffEmail", { length: 320 }).notNull(),
  snapshotDate: varchar("snapshotDate", { length: 20 }).notNull(), // YYYY-MM-DD
  // KPIs
  leadsAssigned: int("leadsAssigned").default(0).notNull(),
  leadsContacted: int("leadsContacted").default(0).notNull(),
  leadsQualified: int("leadsQualified").default(0).notNull(),
  leadsConverted: int("leadsConverted").default(0).notNull(),
  applicationsActive: int("applicationsActive").default(0).notNull(),
  applicationsCompleted: int("applicationsCompleted").default(0).notNull(),
  tasksCompleted: int("tasksCompleted").default(0).notNull(),
  tasksPending: int("tasksPending").default(0).notNull(),
  avgResponseTimeMinutes: int("avgResponseTimeMinutes"),
  conversionRate: varchar("conversionRate", { length: 10 }), // e.g. "23.5"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CounselorPerformance = typeof counselorPerformance.$inferSelect;
export type InsertCounselorPerformance = typeof counselorPerformance.$inferInsert;

/**
 * CRM AI Chat History — persisted chat messages per student for AI memory
 */
export const crmChatHistory = mysqlTable("crm_chat_history", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(), // references leads.id
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  staffEmail: varchar("staffEmail", { length: 320 }), // who sent the message (for user role)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CrmChatHistory = typeof crmChatHistory.$inferSelect;
export type InsertCrmChatHistory = typeof crmChatHistory.$inferInsert;

/**
 * CRM Student Documents — document checklist per student lead
 */
export const crmStudentDocuments = mysqlTable("crm_student_documents", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  docType: varchar("docType", { length: 100 }).notNull(),
  docLabel: varchar("docLabel", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "submitted", "verified", "rejected"]).default("pending").notNull(),
  fileUrl: text("fileUrl"),
  fileKey: varchar("fileKey", { length: 500 }),
  fileName: varchar("fileName", { length: 255 }),
  fileMimeType: varchar("fileMimeType", { length: 100 }),
  notes: text("notes"),
  dueDate: timestamp("dueDate"),
  submittedAt: timestamp("submittedAt"),
  verifiedAt: timestamp("verifiedAt"),
  staffEmail: varchar("staffEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CrmStudentDocument = typeof crmStudentDocuments.$inferSelect;
export type InsertCrmStudentDocument = typeof crmStudentDocuments.$inferInsert;

/**
 * CRM Appointments — consultation bookings between counselors and students
 */
export const crmAppointments = mysqlTable("crm_appointments", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  studentEmail: varchar("studentEmail", { length: 320 }),
  studentPhone: varchar("studentPhone", { length: 50 }),
  staffEmail: varchar("staffEmail", { length: 320 }).notNull(),
  staffName: varchar("staffName", { length: 255 }),
  appointmentType: mysqlEnum("appointmentType", ["initial_consultation", "follow_up", "document_review", "offer_discussion", "visa_prep", "other"]).default("initial_consultation").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  durationMinutes: int("durationMinutes").default(30).notNull(),
  location: varchar("location", { length: 255 }),
  meetingLink: text("meetingLink"),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "no_show"]).default("scheduled").notNull(),
  notes: text("notes"),
  reminderSent: tinyint("reminderSent").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CrmAppointment = typeof crmAppointments.$inferSelect;
export type InsertCrmAppointment = typeof crmAppointments.$inferInsert;

/**
 * CRM Activity Timeline — log of all actions per student
 */
export const crmActivityTimeline = mysqlTable("crm_activity_timeline", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  activityType: varchar("activityType", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  staffEmail: varchar("staffEmail", { length: 320 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CrmActivityTimeline = typeof crmActivityTimeline.$inferSelect;
export type InsertCrmActivityTimeline = typeof crmActivityTimeline.$inferInsert;

/**
 * CRM Notifications — in-app alerts for counselors
 */
export const crmNotifications = mysqlTable("crm_notifications", {
  id: int("id").autoincrement().primaryKey(),
  staffEmail: varchar("staffEmail", { length: 320 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message"),
  leadId: int("leadId"),
  isRead: tinyint("isRead").default(0).notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CrmNotification = typeof crmNotifications.$inferSelect;
export type InsertCrmNotification = typeof crmNotifications.$inferInsert;

/**
 * Student Applications — track university applications per student
 */
export const studentApplications = mysqlTable("student_applications", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  universityName: varchar("universityName", { length: 500 }).notNull(),
  programName: varchar("programName", { length: 500 }).notNull(),
  country: varchar("country", { length: 100 }),
  intakePeriod: varchar("intakePeriod", { length: 100 }),
  applicationStatus: varchar("applicationStatus", { length: 50 }).default("preparing").notNull(),
  // preparing | submitted | under_review | conditional_offer | unconditional_offer | rejected | enrolled | withdrawn
  submittedAt: timestamp("submittedAt"),
  offerReceivedAt: timestamp("offerReceivedAt"),
  offerDeadline: timestamp("offerDeadline"),
  tuitionFee: varchar("tuitionFee", { length: 100 }),
  scholarshipInfo: text("scholarshipInfo"),
  notes: text("notes"),
  staffEmail: varchar("staffEmail", { length: 320 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudentApplication = typeof studentApplications.$inferSelect;
export type InsertStudentApplication = typeof studentApplications.$inferInsert;

/**
 * Staff Team Chat — internal messaging between counselors
 */
export const staffTeamChat = mysqlTable("staff_team_chat", {
  id: int("id").autoincrement().primaryKey(),
  senderEmail: varchar("senderEmail", { length: 320 }).notNull(),
  senderName: varchar("senderName", { length: 200 }).notNull(),
  message: text("message").notNull(),
  channel: varchar("channel", { length: 100 }).default("general").notNull(),
  // general | leads | announcements
  replyToId: int("replyToId"),
  isEdited: tinyint("isEdited").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StaffTeamChat = typeof staffTeamChat.$inferSelect;
export type InsertStaffTeamChat = typeof staffTeamChat.$inferInsert;

/**
 * Universities — searchable database of universities per country
 * Sprint 9: Used in Application Tracker dropdown
 */
export const universities = mysqlTable("universities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  city: varchar("city", { length: 150 }),
  ranking: int("ranking"),
  website: varchar("website", { length: 500 }),
  programs: text("programs"),
  type: varchar("type", { length: 50 }).default("public"),
  isActive: tinyint("isActive").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type University = typeof universities.$inferSelect;
export type InsertUniversity = typeof universities.$inferInsert;

/**
 * Student Visa Tracking — per-student visa application progress
 * Sprint 9: Dedicated visa section in StudentProfile360
 */
export const studentVisaTracking = mysqlTable("student_visa_tracking", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  visaType: varchar("visaType", { length: 100 }),
  visaStatus: varchar("visaStatus", { length: 100 }).default("not_started"),
  embassy: varchar("embassy", { length: 200 }),
  applicationDate: timestamp("applicationDate"),
  biometricsDate: timestamp("biometricsDate"),
  decisionDate: timestamp("decisionDate"),
  visaExpiryDate: timestamp("visaExpiryDate"),
  requiredDocs: text("requiredDocs"),
  completedDocs: text("completedDocs"),
  notes: text("notes"),
  staffEmail: varchar("staffEmail", { length: 320 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudentVisaTracking = typeof studentVisaTracking.$inferSelect;
export type InsertStudentVisaTracking = typeof studentVisaTracking.$inferInsert;

/**
 * Student Portal Accounts — email+password auth for students (no Manus account needed)
 * Sprint 12: Student self-service portal
 */
export const studentPortalAccounts = mysqlTable("student_portal_accounts", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  isVerified: tinyint("isVerified").default(0),
  verifyToken: varchar("verifyToken", { length: 128 }),
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudentPortalAccount = typeof studentPortalAccounts.$inferSelect;
export type InsertStudentPortalAccount = typeof studentPortalAccounts.$inferInsert;

/**
 * AI Follow-up Suggestions — AI-generated counselor action items
 * Sprint 12: AI Counselor Assistant
 */
export const aiFollowupSuggestions = mysqlTable("ai_followup_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  counselorEmail: varchar("counselorEmail", { length: 320 }).notNull(),
  leadId: int("leadId").notNull(),
  suggestionType: mysqlEnum("suggestionType", ["overdue_followup", "deadline_alert", "missing_docs", "rapport_checkin", "application_update", "visa_reminder"]).notNull(),
  priority: mysqlEnum("priority", ["urgent", "high", "medium", "low"]).default("medium"),
  title: varchar("title", { length: 500 }).notNull(),
  aiMessage: text("aiMessage"),
  aiAdvice: text("aiAdvice"),
  isActioned: tinyint("isActioned").default(0),
  actionedAt: timestamp("actionedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiFollowupSuggestion = typeof aiFollowupSuggestions.$inferSelect;
export type InsertAiFollowupSuggestion = typeof aiFollowupSuggestions.$inferInsert;

/**
 * Student Portal Profile Extensions — Sprint 13
 * Stores avatar, bio, intake preferences for student portal accounts
 */
export const studentPortalProfiles = mysqlTable("student_portal_profiles", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull().unique(),
  avatarUrl: varchar("avatarUrl", { length: 1024 }),
  avatarKey: varchar("avatarKey", { length: 512 }),
  bio: text("bio"),
  intakeMonth: varchar("intakeMonth", { length: 20 }),
  intakeYear: varchar("intakeYear", { length: 10 }),
  dreamCountry: varchar("dreamCountry", { length: 100 }),
  dreamProgram: varchar("dreamProgram", { length: 255 }),
  motivationNote: text("motivationNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudentPortalProfile = typeof studentPortalProfiles.$inferSelect;
export type InsertStudentPortalProfile = typeof studentPortalProfiles.$inferInsert;

/**
 * Student Portal Appointments — Sprint 13
 * Students can book counselling sessions from their portal
 */
export const studentPortalAppointments = mysqlTable("student_portal_appointments", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  studentName: varchar("studentName", { length: 255 }).notNull(),
  studentEmail: varchar("studentEmail", { length: 320 }).notNull(),
  appointmentDate: varchar("appointmentDate", { length: 20 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 10 }).notNull(),
  sessionType: mysqlEnum("sessionType", ["initial_consultation", "application_review", "visa_guidance", "scholarship_advice", "general_inquiry"]).default("initial_consultation").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  counselorNotes: text("counselorNotes"),
  meetingLink: varchar("meetingLink", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudentPortalAppointment = typeof studentPortalAppointments.$inferSelect;
export type InsertStudentPortalAppointment = typeof studentPortalAppointments.$inferInsert;

/**
 * Student University Wishlist — Sprint 13
 * Students can save universities they are interested in
 */
export const studentUniversityWishlist = mysqlTable("student_university_wishlist", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  universityName: varchar("universityName", { length: 255 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  program: varchar("program", { length: 255 }),
  notes: text("notes"),
  ranking: varchar("ranking", { length: 50 }),
  tuitionFee: varchar("tuitionFee", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StudentUniversityWishlist = typeof studentUniversityWishlist.$inferSelect;
export type InsertStudentUniversityWishlist = typeof studentUniversityWishlist.$inferInsert;

/**
 * Student AI Advisor Chat History — Sprint 13
 * Stores conversation history for the student AI advisor
 */
export const studentAiChatHistory = mysqlTable("student_ai_chat_history", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StudentAiChatHistory = typeof studentAiChatHistory.$inferSelect;
export type InsertStudentAiChatHistory = typeof studentAiChatHistory.$inferInsert;

/**
 * Student Referral Codes — Sprint 14
 * Each student gets a unique referral code for sharing
 */
export const studentReferralCodes = mysqlTable("student_referral_codes", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull().unique(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  totalReferrals: int("totalReferrals").default(0).notNull(),
  completedReferrals: int("completedReferrals").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudentReferralCode = typeof studentReferralCodes.$inferSelect;
export type InsertStudentReferralCode = typeof studentReferralCodes.$inferInsert;

/**
 * Student Referrals — Sprint 14
 * Tracks each referral from a student to a friend
 */
export const studentReferrals = mysqlTable("student_referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerLeadId: int("referrerLeadId").notNull(),
  referralCode: varchar("referralCode", { length: 20 }).notNull(),
  friendName: varchar("friendName", { length: 255 }),
  friendEmail: varchar("friendEmail", { length: 320 }).notNull(),
  friendPhone: varchar("friendPhone", { length: 50 }),
  status: mysqlEnum("status", ["pending", "signed_up", "booked_session", "completed"]).default("pending").notNull(),
  signedUpAt: timestamp("signedUpAt"),
  bookedSessionAt: timestamp("bookedSessionAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StudentReferral = typeof studentReferrals.$inferSelect;
export type InsertStudentReferral = typeof studentReferrals.$inferInsert;

/**
 * Student Rewards — Sprint 14
 * Rewards earned by students for successful referrals
 */
export const studentRewards = mysqlTable("student_rewards", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  referralId: int("referralId").notNull(),
  rewardType: mysqlEnum("rewardType", ["ielts_mock_test", "priority_session", "scholarship_guide", "application_fee_waiver"]).notNull(),
  rewardLabel: varchar("rewardLabel", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "claimed", "redeemed"]).default("pending").notNull(),
  claimedAt: timestamp("claimedAt"),
  redeemedAt: timestamp("redeemedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StudentReward = typeof studentRewards.$inferSelect;
export type InsertStudentReward = typeof studentRewards.$inferInsert;

/**
 * Student Notifications — in-app notifications for the student portal
 */
export const studentNotifications = mysqlTable("student_notifications", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  type: varchar("type", { length: 100 }).notNull(), // "document_request" | "doc_verified" | "doc_rejected" | "appointment_confirmed" | "appointment_cancelled" | "general"
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message"),
  isRead: tinyint("isRead").default(0).notNull(),
  actionTab: varchar("actionTab", { length: 50 }), // which tab to open: "documents" | "sessions" | "journey"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StudentNotification = typeof studentNotifications.$inferSelect;
export type InsertStudentNotification = typeof studentNotifications.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Social Media Manager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Social Media Connected Accounts — stores Meta/TikTok page tokens
 */
export const socialMediaAccounts = mysqlTable("social_media_accounts", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["facebook", "instagram", "tiktok"]).notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountId: varchar("accountId", { length: 255 }).notNull(),
  accessToken: text("accessToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  isActive: tinyint("isActive").default(1).notNull(),
  connectedBy: varchar("connectedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SocialMediaAccount = typeof socialMediaAccounts.$inferSelect;
export type InsertSocialMediaAccount = typeof socialMediaAccounts.$inferInsert;

/**
 * Social Media Posts — stores all created/scheduled/published posts
 */
export const socialMediaPosts = mysqlTable("social_media_posts", {
  id: int("id").autoincrement().primaryKey(),
  brief: text("brief").notNull(),
  caption: text("caption").notNull(),
  imageUrl: text("imageUrl"),
  videoUrl: text("videoUrl"),
  platforms: varchar("platforms", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "publishing", "published", "failed"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  facebookPostId: varchar("facebookPostId", { length: 255 }),
  instagramPostId: varchar("instagramPostId", { length: 255 }),
  errorMessage: text("errorMessage"),
  createdBy: varchar("createdBy", { length: 255 }).notNull(),
  contentType: mysqlEnum("contentType", ["image", "reel", "text"]).default("image").notNull(),
  hashtags: text("hashtags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SocialMediaPost = typeof socialMediaPosts.$inferSelect;
export type InsertSocialMediaPost = typeof socialMediaPosts.$inferInsert;

/**
 * Social Media Templates — reusable branded content templates
 */
export const socialMediaTemplates = mysqlTable("social_media_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["scholarship", "destination", "ielts", "testimonial", "promo", "general"]).notNull(),
  promptTemplate: text("promptTemplate").notNull(),
  exampleImageUrl: text("exampleImageUrl"),
  isActive: tinyint("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SocialMediaTemplate = typeof socialMediaTemplates.$inferSelect;
export type InsertSocialMediaTemplate = typeof socialMediaTemplates.$inferInsert;
