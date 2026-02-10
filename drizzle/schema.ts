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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
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
  status: mysqlEnum("status", ["submitted", "reviewing", "processing", "accepted", "rejected"]).default("submitted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;
