/**
 * AI IELTS Tutor — admin tRPC routes.
 *
 * Mounted under `admin.tutor` in the main app router. All procedures require
 * role === "admin". Powers `/admin/ielts-tutor`: subscription oversight,
 * revenue, session activity, free-trial funnel, manual grants / extends /
 * cancellations.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { leads, tutorSubscriptions, tutorSessions } from "../drizzle/schema";
import { TUTOR_PLANS } from "./xenditService";
import { sendEmail } from "./email";
import { ENV } from "./_core/env";

/**
 * Build the "AI IELTS Tutor free access granted" email. Used by
 * grantFreeAccess to notify the student they've been given (or extended)
 * a free subscription. Kept inline here — it's a small, one-off template
 * and there's no reuse elsewhere yet.
 */
function buildFreeAccessGrantedEmail(params: {
  studentName: string;
  days: number;
  plan: "w2" | "m1";
  expiresAt: Date;
  extended: boolean;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { studentName, days, plan, expiresAt, extended, appUrl } = params;
  const planLabel = plan === "w2" ? "2-week" : "1-month";
  const expiresStr = expiresAt.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const tutorUrl = `${appUrl}/ielts/tutor`;
  const subject = extended
    ? `🎓 SpecTa AI IELTS Tutor — akses kamu diperpanjang ${days} hari`
    : `🎓 SpecTa AI IELTS Tutor — akses ${planLabel} kamu sudah aktif`;
  const headingId = extended ? "Akses AI IELTS Tutor Diperpanjang! 🎉" : "Selamat! Akses AI IELTS Tutor Kamu Aktif 🎉";
  const bodyIntroId = extended
    ? `Kabar baik, ${studentName}! Tim SpecTa Education memperpanjang akses AI IELTS Tutor kamu selama ${days} hari lagi. Latihanmu bisa langsung dilanjutkan tanpa perlu bayar.`
    : `Halo ${studentName}! Tim SpecTa Education memberikan akses GRATIS ke AI IELTS Tutor selama ${days} hari untuk kamu. Tidak perlu bayar apapun — langsung mulai latihan.`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;">${headingId}</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">AI IELTS Tutor · Free Access Granted</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">${bodyIntroId}</p>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:16px 0;">
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
            <tr><td style="padding:6px 0;color:#6b7280;">Paket</td><td style="padding:6px 0;text-align:right;font-weight:600;">${planLabel} (${plan.toUpperCase()})</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Durasi</td><td style="padding:6px 0;text-align:right;font-weight:600;">${days} hari</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Berlaku hingga</td><td style="padding:6px 0;text-align:right;font-weight:600;">${expiresStr}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Biaya</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#10b981;">GRATIS</td></tr>
          </table>
        </div>
        <div style="text-align:center;margin:28px 0 20px;">
          <a href="${tutorUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:bold;font-size:15px;">Mulai Latihan Sekarang →</a>
        </div>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:20px 0 0;">
          Kalau butuh bantuan atau ada masalah saat login, WhatsApp kami di <a href="https://wa.me/62818218388" style="color:#6366f1;">0818-2183-8888</a>.
        </p>
      </div>
      <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} SpecTa Education • www.spectaeducation.com</p>
      </div>
    </div>
  </div>
</body></html>`;
  const text = `${headingId}\n\n${bodyIntroId}\n\nPaket: ${planLabel} (${plan.toUpperCase()})\nDurasi: ${days} hari\nBerlaku hingga: ${expiresStr}\nBiaya: GRATIS\n\nMulai latihan: ${tutorUrl}\n\nBantuan: WhatsApp 0818-2183-8888`;
  return { subject, html, text };
}

function assertAdmin(ctx: { user: { role: string } | null }) {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
}

const DAY = 24 * 60 * 60 * 1000;

/** Plan → IDR amount for the "MRR" estimate (paid subs only, not FREE-). */
function planAmountIdr(plan: string | null | undefined): number {
  if (!plan) return 0;
  const p = (TUTOR_PLANS as any)[plan];
  return p?.amount || 0;
}

/** Free subs (admin-issued via createTutorFreePass) have xenditInvoiceId like FREE-…. */
function isFreeInvoice(inv: string | null | undefined): boolean {
  return !!inv && inv.startsWith("FREE-");
}

export const tutorAdminRouter = router({
  /**
   * Headline numbers for the top of /admin/ielts-tutor.
   *
   * activeSubs        — status=active AND expiresAt>=now
   * activePaidSubs    — activeSubs excluding FREE- invoices
   * activeFreeSubs    — activeSubs where xenditInvoiceId starts FREE-
   * newSubs7d         — subs whose startsAt fell inside the last 7 days
   * expiring7d        — active subs expiring in the next 7 days (churn radar)
   * mrrIdr            — sum of plan amounts across active PAID subs (proxy for MRR)
   * revenue30dIdr     — sum of plan amounts across paid subs that STARTED in
   *                     the last 30 days (approx cash inflow for the month)
   * sessions7d        — total tutor_sessions rows created in the last 7 days
   * sessionsToday     — created since 00:00 UTC today
   * paidUsersAllTime  — distinct leadIds with ANY paid sub (active OR expired)
   * freeTrialUsers    — leadIds with any session but no paid sub ever
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * DAY);
    const ago7d = new Date(now.getTime() - 7 * DAY);
    const ago30d = new Date(now.getTime() - 30 * DAY);
    const startOfDay = new Date(now); startOfDay.setUTCHours(0, 0, 0, 0);

    // Pull the active subs in one shot; compute breakdowns in memory. Cheap:
    // an IELTS tutor sub list is bounded by student count.
    const activeRows = await db.select({
      id: tutorSubscriptions.id,
      leadId: tutorSubscriptions.leadId,
      plan: tutorSubscriptions.plan,
      xenditInvoiceId: tutorSubscriptions.xenditInvoiceId,
      startsAt: tutorSubscriptions.startsAt,
      expiresAt: tutorSubscriptions.expiresAt,
    }).from(tutorSubscriptions)
      .where(and(
        eq(tutorSubscriptions.status, "active"),
        gte(tutorSubscriptions.expiresAt, now),
      ));

    const activeSubs = activeRows.length;
    const activeFreeSubs = activeRows.filter(r => isFreeInvoice(r.xenditInvoiceId)).length;
    const activePaidSubs = activeSubs - activeFreeSubs;
    const mrrIdr = activeRows
      .filter(r => !isFreeInvoice(r.xenditInvoiceId))
      .reduce((s, r) => s + planAmountIdr(r.plan), 0);
    const expiring7d = activeRows.filter(r => r.expiresAt && r.expiresAt <= in7d).length;

    // New subs in the last 7 days (any status — captures activations that then expired).
    const [{ c: newSubs7d }] = await db.select({ c: sql<number>`COUNT(*)` }).from(tutorSubscriptions)
      .where(gte(tutorSubscriptions.startsAt, ago7d));

    // Revenue 30d — sum of plan amounts across non-FREE subs that started in the last 30d.
    const paid30dRows = await db.select({
      plan: tutorSubscriptions.plan, xenditInvoiceId: tutorSubscriptions.xenditInvoiceId,
    }).from(tutorSubscriptions)
      .where(and(
        gte(tutorSubscriptions.startsAt, ago30d),
        ne(tutorSubscriptions.status, "pending"),
      ));
    const revenue30dIdr = paid30dRows
      .filter(r => !isFreeInvoice(r.xenditInvoiceId))
      .reduce((s, r) => s + planAmountIdr(r.plan), 0);

    const [{ c: sessions7d }] = await db.select({ c: sql<number>`COUNT(*)` }).from(tutorSessions)
      .where(gte(tutorSessions.createdAt, ago7d));
    const [{ c: sessionsToday }] = await db.select({ c: sql<number>`COUNT(*)` }).from(tutorSessions)
      .where(gte(tutorSessions.createdAt, startOfDay));

    // Distinct paying customers, all-time (excludes FREE-).
    const paidRows = await db.select({
      leadId: tutorSubscriptions.leadId,
      xenditInvoiceId: tutorSubscriptions.xenditInvoiceId,
    }).from(tutorSubscriptions)
      .where(ne(tutorSubscriptions.status, "pending"));
    const paidLeadIds = new Set(
      paidRows.filter(r => !isFreeInvoice(r.xenditInvoiceId)).map(r => r.leadId),
    );
    const paidUsersAllTime = paidLeadIds.size;

    // Free-trial users: leadIds with any session AND not in paidLeadIds.
    const sessionLeadRows = await db.selectDistinct({ leadId: tutorSessions.leadId }).from(tutorSessions);
    const freeTrialUsers = sessionLeadRows.filter(r => !paidLeadIds.has(r.leadId)).length;

    return {
      activeSubs, activePaidSubs, activeFreeSubs,
      newSubs7d: Number(newSubs7d ?? 0),
      expiring7d,
      mrrIdr, revenue30dIdr,
      sessions7d: Number(sessions7d ?? 0),
      sessionsToday: Number(sessionsToday ?? 0),
      paidUsersAllTime, freeTrialUsers,
    };
  }),

  /**
   * Paginated subscription list, newest first. Optional status filter. Joins
   * `leads` so admins see who the customer is without a second call.
   */
  listSubscriptions: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "pending", "expired", "cancelled", "all"]).default("active"),
      kind: z.enum(["all", "paid", "free"]).default("all"),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const now = new Date();
      const conds: any[] = [];
      if (input.status === "active") {
        conds.push(and(eq(tutorSubscriptions.status, "active"), gte(tutorSubscriptions.expiresAt, now)));
      } else if (input.status !== "all") {
        conds.push(eq(tutorSubscriptions.status, input.status));
      }
      const whereClause = conds.length ? and(...conds) : undefined;

      const rows = await db.select({
        id: tutorSubscriptions.id,
        leadId: tutorSubscriptions.leadId,
        plan: tutorSubscriptions.plan,
        status: tutorSubscriptions.status,
        amount: tutorSubscriptions.amount,
        currency: tutorSubscriptions.currency,
        xenditInvoiceId: tutorSubscriptions.xenditInvoiceId,
        startsAt: tutorSubscriptions.startsAt,
        expiresAt: tutorSubscriptions.expiresAt,
        createdAt: tutorSubscriptions.createdAt,
        studentName: leads.studentName,
        studentEmail: leads.studentEmail,
        studentPhone: leads.studentPhone,
      }).from(tutorSubscriptions)
        .leftJoin(leads, eq(leads.id, tutorSubscriptions.leadId))
        .where(whereClause as any)
        .orderBy(desc(tutorSubscriptions.createdAt))
        .limit(input.limit + 1)
        .offset(input.offset);

      // Filter free/paid AFTER SQL because it's a prefix check, not an indexed column.
      let filtered = rows;
      if (input.kind === "free") filtered = rows.filter(r => isFreeInvoice(r.xenditInvoiceId));
      else if (input.kind === "paid") filtered = rows.filter(r => !isFreeInvoice(r.xenditInvoiceId));

      const hasMore = filtered.length > input.limit;
      const items = filtered.slice(0, input.limit).map(r => ({
        ...r,
        isFree: isFreeInvoice(r.xenditInvoiceId),
        planAmountIdr: planAmountIdr(r.plan),
      }));
      return { items, hasMore };
    }),

  /**
   * Most recent tutor sessions across all students. Session content itself
   * (essay, transcript, feedback) is fetched via a follow-up drilldown; here we
   * return just the metadata so the table stays fast.
   */
  recentSessions: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).default(50),
      skill: z.enum(["all", "writing", "speaking"]).default("all"),
    }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const conds: any[] = [];
      if (input.skill !== "all") conds.push(eq(tutorSessions.skill, input.skill));
      const whereClause = conds.length ? and(...conds) : undefined;

      const rows = await db.select({
        id: tutorSessions.id,
        leadId: tutorSessions.leadId,
        skill: tutorSessions.skill,
        taskType: tutorSessions.taskType,
        overallBand: tutorSessions.overallBand,
        durationSec: tutorSessions.durationSec,
        isFree: tutorSessions.isFree,
        createdAt: tutorSessions.createdAt,
        studentName: leads.studentName,
        studentEmail: leads.studentEmail,
      }).from(tutorSessions)
        .leftJoin(leads, eq(leads.id, tutorSessions.leadId))
        .where(whereClause as any)
        .orderBy(desc(tutorSessions.createdAt))
        .limit(input.limit);
      return { items: rows };
    }),

  /**
   * Free-trial funnel: leads that have ever tried the free taster but have
   * never bought a paid sub. Returns them ranked by how recently they tried,
   * so the admin can prioritise outreach.
   */
  freeTrialFunnel: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Distinct leadIds that ever had a session, with counts + last-tried.
      const rows = await db.execute<any>(sql`
        SELECT s.leadId AS leadId,
               COUNT(*) AS sessionCount,
               SUM(CASE WHEN s.skill = 'writing' THEN 1 ELSE 0 END) AS writingCount,
               SUM(CASE WHEN s.skill = 'speaking' THEN 1 ELSE 0 END) AS speakingCount,
               MAX(s.createdAt) AS lastTriedAt,
               l.studentName AS studentName,
               l.studentEmail AS studentEmail,
               l.studentPhone AS studentPhone
        FROM tutor_sessions s
        LEFT JOIN leads l ON l.id = s.leadId
        LEFT JOIN (
          SELECT DISTINCT leadId FROM tutor_subscriptions
          WHERE status IN ('active','expired','cancelled')
          AND (xenditInvoiceId IS NULL OR xenditInvoiceId NOT LIKE 'FREE-%')
        ) paid ON paid.leadId = s.leadId
        WHERE paid.leadId IS NULL
        GROUP BY s.leadId, l.studentName, l.studentEmail, l.studentPhone
        ORDER BY lastTriedAt DESC
        LIMIT ${input.limit}
      `);

      // mysql2 returns [rows, fields]; drizzle wraps this.
      const arr = Array.isArray(rows) ? (rows as any)[0] || rows : (rows as any).rows || [];
      const items = (arr as any[]).map((r: any) => ({
        leadId: Number(r.leadId),
        sessionCount: Number(r.sessionCount || 0),
        writingCount: Number(r.writingCount || 0),
        speakingCount: Number(r.speakingCount || 0),
        lastTriedAt: r.lastTriedAt ? new Date(r.lastTriedAt) : null,
        studentName: r.studentName || null,
        studentEmail: r.studentEmail || null,
        studentPhone: r.studentPhone || null,
      }));
      return { items };
    }),

  /**
   * Extend the expiry of an active or expired sub by N days. Owner asked for
   * this so we can compensate customers whose credit was blocked by an outage
   * or ElevenLabs credit exhaustion.
   */
  extendSubscription: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      days: z.number().int().min(1).max(365),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [sub] = await db.select().from(tutorSubscriptions).where(eq(tutorSubscriptions.id, input.id)).limit(1);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });

      // Base = the later of now vs current expiresAt so we don't shorten it.
      const base = sub.expiresAt && sub.expiresAt > new Date() ? sub.expiresAt : new Date();
      const newExpires = new Date(base.getTime() + input.days * DAY);
      await db.update(tutorSubscriptions).set({
        expiresAt: newExpires,
        status: "active", // re-activate if it had expired
      }).where(eq(tutorSubscriptions.id, input.id));
      return { newExpiresAt: newExpires };
    }),

  /**
   * Manually cancel an active sub. Doesn't refund the payment (Xendit
   * handles that separately) — just marks the row so the user can't take
   * more free rides.
   */
  cancelSubscription: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(tutorSubscriptions).set({
        status: "cancelled",
        expiresAt: new Date(), // cut access immediately
      }).where(eq(tutorSubscriptions.id, input.id));
      return { ok: true };
    }),

  /**
   * Give free Tutor access to a SPECIFIC existing student by email. Simpler
   * than the shareable free-pass link when we know exactly who we're helping
   * (e.g. a paying Mock Test customer whose feedback deserves a gift).
   *
   * Fails if the email isn't already a lead — we don't want to auto-create
   * ghost accounts here. In that case the admin should send the shareable
   * free-pass link instead so the student registers themselves.
   */
  grantFreeAccess: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      days: z.number().int().min(1).max(365).default(7),
      plan: z.enum(["w2", "m1"]).default("w2"),
    }))
    .mutation(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const email = input.email.trim().toLowerCase();
      const [lead] = await db.select({ id: leads.id, name: leads.studentName, studentEmail: leads.studentEmail })
        .from(leads).where(sql`LOWER(${leads.studentEmail}) = ${email}`).limit(1);
      if (!lead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No student found with that email. Use 'AI Tutor free link' instead so they can self-register.",
        });
      }

      const appUrl = ENV.appUrl.replace(/\/+$/, "");
      const notifyStudent = async (expiresAt: Date, extended: boolean, subId: number) => {
        try {
          const { subject, html, text } = buildFreeAccessGrantedEmail({
            studentName: lead.name || "there",
            days: input.days,
            plan: input.plan,
            expiresAt,
            extended,
            appUrl,
          });
          const ok = await sendEmail({ to: (lead.studentEmail || email), subject, html, text });
          if (ok) {
            console.log(`[TutorAdmin] Free-access ${extended ? "extension" : "grant"} email sent to ${(lead.studentEmail || email)} (sub #${subId})`);
          } else {
            console.warn(`[TutorAdmin] Free-access email NOT sent to ${(lead.studentEmail || email)} (sub #${subId}) — sendEmail returned false. Check RESEND_API_KEY + Resend logs.`);
          }
          return ok;
        } catch (err) {
          console.error(`[TutorAdmin] Free-access email threw for ${(lead.studentEmail || email)} (sub #${subId}):`, err);
          return false;
        }
      };

      // If they already have an active sub, extend it instead of stacking.
      const [active] = await db.select().from(tutorSubscriptions)
        .where(and(
          eq(tutorSubscriptions.leadId, lead.id),
          eq(tutorSubscriptions.status, "active"),
          gte(tutorSubscriptions.expiresAt, new Date()),
        ))
        .orderBy(desc(tutorSubscriptions.expiresAt))
        .limit(1);
      if (active) {
        const base = active.expiresAt && active.expiresAt > new Date() ? active.expiresAt : new Date();
        const newExpires = new Date(base.getTime() + input.days * DAY);
        await db.update(tutorSubscriptions).set({ expiresAt: newExpires })
          .where(eq(tutorSubscriptions.id, active.id));
        const emailSent = await notifyStudent(newExpires, true, active.id);
        return { extendedExistingSub: true, subscriptionId: active.id, expiresAt: newExpires, emailSent, notifiedEmail: (lead.studentEmail || email) };
      }

      const startsAt = new Date();
      const expiresAt = new Date(Date.now() + input.days * DAY);
      const r = await db.insert(tutorSubscriptions).values({
        leadId: lead.id,
        plan: input.plan,
        status: "active",
        amount: "0" as any,
        currency: "IDR",
        xenditInvoiceId: `FREE-${nanoid(10)}`,
        startsAt,
        expiresAt,
      });
      const id = (r as any)[0]?.insertId as number;
      const emailSent = await notifyStudent(expiresAt, false, id);
      return { extendedExistingSub: false, subscriptionId: id, expiresAt, emailSent, notifiedEmail: (lead.studentEmail || email) };
    }),

  /**
   * Full detail on ONE subscription: the sub itself + the student + all their
   * tutor sessions. Used by the /admin/ielts-tutor drilldown row expander.
   */
  getSubscriptionDetail: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      assertAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [sub] = await db.select().from(tutorSubscriptions).where(eq(tutorSubscriptions.id, input.id)).limit(1);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      const [lead] = await db.select({
        id: leads.id, studentName: leads.studentName,
        studentEmail: leads.studentEmail, studentPhone: leads.studentPhone,
      }).from(leads).where(eq(leads.id, sub.leadId)).limit(1);
      const sessions = await db.select({
        id: tutorSessions.id,
        skill: tutorSessions.skill,
        taskType: tutorSessions.taskType,
        overallBand: tutorSessions.overallBand,
        durationSec: tutorSessions.durationSec,
        isFree: tutorSessions.isFree,
        createdAt: tutorSessions.createdAt,
      }).from(tutorSessions)
        .where(eq(tutorSessions.leadId, sub.leadId))
        .orderBy(desc(tutorSessions.createdAt))
        .limit(50);
      return {
        subscription: { ...sub, isFree: isFreeInvoice(sub.xenditInvoiceId), planAmountIdr: planAmountIdr(sub.plan) },
        student: lead || null,
        sessions,
      };
    }),
});
