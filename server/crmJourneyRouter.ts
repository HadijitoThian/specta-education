/**
 * CRM — public student "My Journey" (Phase 5, step 2). Mounted as `journey`.
 *
 * Passwordless: the student opens /journey/:token (handed to them after intake)
 * and sees their stage, recent updates, and document checklist — and can upload
 * their own documents. The secret journeyToken in the URL is the credential.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { leads, users, crmActivityTimeline, crmStudentDocuments } from "../drizzle/schema";
import { storagePut } from "./storage";

const STAGE_LABEL: Record<string, string> = {
  new_lead: "Getting started", consultation: "Consultation", ielts_prep: "IELTS Preparation",
  shortlist: "Choosing universities", application: "Application", offer: "Offer received",
  visa: "Visa process", pre_departure: "Getting ready to go", enrolled: "Enrolled 🎓", inactive: "On hold",
};
const STAGE_STEPS = ["new_lead", "consultation", "ielts_prep", "shortlist", "application", "offer", "visa", "pre_departure", "enrolled"];

async function findByToken(token: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [lead] = await db.select().from(leads).where(eq(leads.journeyToken, token)).limit(1);
  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "This link is invalid or expired." });
  return { db, lead };
}

export const crmJourneyRouter = router({
  get: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const { db, lead } = await findByToken(input.token);
      let counselorName: string | null = null;
      if (lead.assignedCounselorId) {
        const [c] = await db.select({ name: users.name }).from(users).where(eq(users.id, lead.assignedCounselorId)).limit(1);
        counselorName = c?.name ?? null;
      }
      const documents = await db
        .select({ id: crmStudentDocuments.id, docLabel: crmStudentDocuments.docLabel, status: crmStudentDocuments.status, fileUrl: crmStudentDocuments.fileUrl })
        .from(crmStudentDocuments)
        .where(eq(crmStudentDocuments.leadId, lead.id))
        .orderBy(desc(crmStudentDocuments.createdAt));
      const updates = await db
        .select({ title: crmActivityTimeline.title, createdAt: crmActivityTimeline.createdAt })
        .from(crmActivityTimeline)
        .where(eq(crmActivityTimeline.leadId, lead.id))
        .orderBy(desc(crmActivityTimeline.createdAt))
        .limit(15);

      return {
        studentName: lead.studentName,
        stage: lead.pipelineStage,
        stageLabel: STAGE_LABEL[lead.pipelineStage] ?? lead.pipelineStage,
        stageIndex: STAGE_STEPS.indexOf(lead.pipelineStage),
        steps: STAGE_STEPS.map(s => ({ stage: s, label: STAGE_LABEL[s] })),
        counselorName,
        country: lead.preferredCountry,
        program: lead.programInterest,
        intake: lead.intakeDate,
        documents,
        updates: updates.map(u => ({ title: u.title, date: new Date(u.createdAt).toISOString() })),
      };
    }),

  uploadDocument: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      docLabel: z.string().min(1).max(255),
      fileName: z.string().min(1).max(255),
      fileType: z.string().max(100),
      fileBase64: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { db, lead } = await findByToken(input.token);
      const buffer = Buffer.from(input.fileBase64, "base64");
      if (buffer.length > 16 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File too large (max 16MB)." });
      const safeName = input.fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
      const docType = input.docLabel.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 60);
      const key = `crm/documents/${lead.id}/${nanoid(8)}-${safeName}`;
      const { url } = await storagePut(key, buffer, input.fileType || "application/octet-stream");
      await db.insert(crmStudentDocuments).values({
        leadId: lead.id, docType, docLabel: input.docLabel.trim(), status: "submitted",
        fileUrl: url, fileKey: key, fileName: input.fileName, fileMimeType: input.fileType, submittedAt: new Date(),
      });
      await db.insert(crmActivityTimeline).values({
        leadId: lead.id, activityType: "document",
        title: `Student uploaded: ${input.docLabel.trim()}`, staffEmail: null,
      });
      return { ok: true, url };
    }),
});
