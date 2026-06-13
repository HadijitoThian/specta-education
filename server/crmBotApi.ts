/**
 * CRM inbound API for the SpecTa WhatsApp bot (Step B of the "one CRM" merge).
 *
 * The bot calls these to feed the CRM (the single source of truth) — matched by
 * phone number. Plain Express + JSON (the bot uses native fetch), protected by a
 * shared secret header `x-crm-key` == CRM_BOT_API_KEY.
 *
 *   POST /api/bot/upsert-student   { phone, name?, email?, country?, program?,
 *                                    studyLevel?, intake?, source?, parent* }
 *   POST /api/bot/activity         { phone, type?, title, note? }
 *   POST /api/bot/document         { phone, label, fileName, fileType, fileBase64 }
 *   GET  /api/bot/student?phone=…  → context for Emma (stage, counsellor, goals…)
 */
import type { Express, Request, Response } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "./db";
import { leads, users, crmActivityTimeline, crmStudentDocuments } from "../drizzle/schema";
import { storagePut } from "./storage";
import { normalizePhone } from "./whatsappGateway";
import { REPORT_STAGE_LABEL } from "./crmParentReports";
import { distributeOne } from "./leadDistribution";

function authed(req: Request): boolean {
  const key = process.env.CRM_BOT_API_KEY;
  return !!key && req.headers["x-crm-key"] === key;
}

/** Variants of a phone number that might be stored in `leads.studentPhone`. */
function phoneCandidates(raw: string): string[] {
  const set = new Set<string>();
  if (raw && raw.trim()) set.add(raw.trim());
  const norm = normalizePhone(raw);
  if (norm) {
    set.add(norm);
    set.add("+" + norm);
    if (norm.startsWith("62")) set.add("0" + norm.slice(2));
  }
  return Array.from(set).filter(Boolean);
}

async function findLeadByPhone(db: any, raw: string) {
  const candidates = phoneCandidates(raw);
  if (!candidates.length) return null;
  const [lead] = await db.select().from(leads).where(inArray(leads.studentPhone, candidates)).limit(1);
  return lead ?? null;
}

/** Find an existing student by phone, or create a minimal one. Returns the row. */
async function findOrCreate(db: any, rawPhone: string, name?: string, source = "whatsapp") {
  const existing = await findLeadByPhone(db, rawPhone);
  if (existing) return existing;
  const phone = normalizePhone(rawPhone) || rawPhone.trim();
  const journeyToken = nanoid(16);
  const res = await db.insert(leads).values({
    studentName: (name && name.trim()) || "WhatsApp lead",
    studentPhone: phone,
    pipelineStage: "new_lead",
    source,
    journeyToken,
  });
  const id = (res as any)[0]?.insertId as number;
  await db.insert(crmActivityTimeline).values({
    leadId: id, activityType: "whatsapp",
    title: "Captured via WhatsApp (Emma)", staffEmail: null,
  });
  const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return row;
}

export function registerCrmBotRoutes(app: Express) {
  // Upsert a student by phone. Fills only fields the CRM doesn't already have,
  // so counsellor-entered data is never clobbered.
  app.post("/api/bot/upsert-student", async (req: Request, res: Response) => {
    if (!authed(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });
      const b = req.body || {};
      if (!b.phone) return res.status(400).json({ error: "phone required" });

      const existing = await findLeadByPhone(db, b.phone);
      const fill = (cur: any, val: any) => (cur && String(cur).trim() ? cur : (val ?? cur ?? null));

      if (existing) {
        const patch: Record<string, unknown> = {
          studentName: fill(existing.studentName === "WhatsApp lead" ? null : existing.studentName, b.name) ?? existing.studentName,
          studentEmail: fill(existing.studentEmail, b.email),
          preferredCountry: fill(existing.preferredCountry, b.country),
          programInterest: fill(existing.programInterest, b.program),
          studyLevel: fill(existing.studyLevel, b.studyLevel),
          intakeDate: fill(existing.intakeDate, b.intake),
          parentName: fill(existing.parentName, b.parentName),
          parentPhone: fill(existing.parentPhone, b.parentPhone),
          parentEmail: fill(existing.parentEmail, b.parentEmail),
        };
        let journeyToken = existing.journeyToken;
        if (!journeyToken) { journeyToken = nanoid(16); patch.journeyToken = journeyToken; }
        await db.update(leads).set(patch).where(eq(leads.id, existing.id));
        return res.json({ ok: true, id: existing.id, journeyToken, created: false });
      }

      const phone = normalizePhone(b.phone) || String(b.phone).trim();
      const journeyToken = nanoid(16);
      const r = await db.insert(leads).values({
        studentName: (b.name && String(b.name).trim()) || "WhatsApp lead",
        studentPhone: phone,
        studentEmail: b.email || null,
        preferredCountry: b.country || null,
        programInterest: b.program || null,
        studyLevel: b.studyLevel || null,
        intakeDate: b.intake || null,
        parentName: b.parentName || null,
        parentPhone: b.parentPhone || null,
        parentEmail: b.parentEmail || null,
        pipelineStage: "new_lead",
        source: b.source || "whatsapp",
        journeyToken,
      });
      const id = (r as any)[0]?.insertId as number;
      await db.insert(crmActivityTimeline).values({
        leadId: id, activityType: "whatsapp", title: "Captured via WhatsApp (Emma)", staffEmail: null,
      });
      void distributeOne(id); // even split across offices/counsellors (best-effort)
      return res.json({ ok: true, id, journeyToken, created: true });
    } catch (e: any) {
      console.error("[BotAPI] upsert-student:", e?.message);
      return res.status(500).json({ error: e?.message || "error" });
    }
  });

  // Log an activity on a student's timeline.
  app.post("/api/bot/activity", async (req: Request, res: Response) => {
    if (!authed(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });
      const b = req.body || {};
      if (!b.phone || !b.title) return res.status(400).json({ error: "phone and title required" });
      const lead = await findOrCreate(db, b.phone, b.name);
      await db.insert(crmActivityTimeline).values({
        leadId: lead.id,
        activityType: (b.type || "whatsapp").slice(0, 100),
        title: String(b.title).slice(0, 500),
        description: b.note ? String(b.note).slice(0, 4000) : null,
        staffEmail: null,
      });
      return res.json({ ok: true, id: lead.id });
    } catch (e: any) {
      console.error("[BotAPI] activity:", e?.message);
      return res.status(500).json({ error: e?.message || "error" });
    }
  });

  // Attach a document (e.g. an OCR'd transcript) to a student.
  app.post("/api/bot/document", async (req: Request, res: Response) => {
    if (!authed(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });
      const b = req.body || {};
      if (!b.phone || !b.fileBase64 || !b.fileName) {
        return res.status(400).json({ error: "phone, fileName, fileBase64 required" });
      }
      const buffer = Buffer.from(b.fileBase64, "base64");
      if (buffer.length > 16 * 1024 * 1024) return res.status(413).json({ error: "File too large (max 16MB)" });
      const lead = await findOrCreate(db, b.phone, b.name);
      const label = (b.label && String(b.label).trim()) || b.fileName;
      const safe = String(b.fileName).replace(/[^\w.\-]+/g, "_").slice(-80);
      const key = `crm/documents/${lead.id}/${nanoid(8)}-${safe}`;
      const { url } = await storagePut(key, buffer, b.fileType || "application/octet-stream");
      await db.insert(crmStudentDocuments).values({
        leadId: lead.id,
        docType: label.toLowerCase().replace(/\s+/g, "_").slice(0, 60),
        docLabel: label.slice(0, 255),
        status: "submitted",
        fileUrl: url, fileKey: key, fileName: b.fileName, fileMimeType: b.fileType, submittedAt: new Date(),
        staffEmail: null,
      });
      await db.insert(crmActivityTimeline).values({
        leadId: lead.id, activityType: "document",
        title: `Sent document via WhatsApp: ${label.slice(0, 200)}`, staffEmail: null,
      });
      return res.json({ ok: true, id: lead.id, url });
    } catch (e: any) {
      console.error("[BotAPI] document:", e?.message);
      return res.status(500).json({ error: e?.message || "error" });
    }
  });

  // Read student context (for Emma to personalize replies).
  app.get("/api/bot/student", async (req: Request, res: Response) => {
    if (!authed(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "DB unavailable" });
      const phone = String(req.query.phone || "");
      if (!phone) return res.status(400).json({ error: "phone required" });
      const lead = await findLeadByPhone(db, phone);
      if (!lead) return res.json({ found: false });
      let counsellor: string | null = null;
      if (lead.assignedCounselorId) {
        const [c] = await db.select({ name: users.name }).from(users).where(eq(users.id, lead.assignedCounselorId)).limit(1);
        counsellor = c?.name ?? null;
      }
      const docs = await db.select({ status: crmStudentDocuments.status }).from(crmStudentDocuments).where(eq(crmStudentDocuments.leadId, lead.id));
      const recent = await db
        .select({ title: crmActivityTimeline.title, createdAt: crmActivityTimeline.createdAt })
        .from(crmActivityTimeline).where(eq(crmActivityTimeline.leadId, lead.id))
        .orderBy(desc(crmActivityTimeline.createdAt)).limit(5);
      return res.json({
        found: true,
        studentName: lead.studentName,
        stage: lead.pipelineStage,
        stageLabel: REPORT_STAGE_LABEL[lead.pipelineStage] ?? lead.pipelineStage,
        counsellor,
        country: lead.preferredCountry,
        program: lead.programInterest,
        studyLevel: lead.studyLevel,
        intake: lead.intakeDate,
        documentsSubmitted: docs.filter(d => d.status === "submitted" || d.status === "verified").length,
        documentsTotal: docs.length,
        recentActivity: recent.map(r => r.title),
      });
    } catch (e: any) {
      console.error("[BotAPI] student:", e?.message);
      return res.status(500).json({ error: e?.message || "error" });
    }
  });
}
