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
