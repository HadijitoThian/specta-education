/**
 * CRM — public student intake (Phase 5). Mounted as `intake`.
 *
 * A student opens a counselor's QR/link (/join/:token), fills a short form, and
 * a CRM student record is created — auto-assigned to that counselor, stage
 * "new_lead", source "intake_form". No login. Returns a passwordless
 * `journeyToken` the thank-you page can hand back for "My Journey".
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";

import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { leads, users, crmActivityTimeline } from "../drizzle/schema";
import { sendEmail } from "./email";
import { ENV } from "./_core/env";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function appBase(): string {
  const base = ENV.appUrl?.replace(/\/+$/, "") || "https://www.spectaeducation.com";
  return /^https?:\/\//i.test(base) ? base : `https://${base}`;
}

async function resolveCounselor(token: string | undefined) {
  if (!token) return null;
  const db = await getDb();
  if (!db) return null;
  const [u] = await db
    .select({ id: users.id, name: users.name, email: users.email, crmRole: users.crmRole })
    .from(users)
    .where(eq(users.intakeToken, token))
    .limit(1);
  return u ?? null;
}

export const crmIntakeRouter = router({
  /** Branding for the public form: whose link is this? */
  form: publicProcedure
    .input(z.object({ token: z.string().optional() }))
    .query(async ({ input }) => {
      const c = await resolveCounselor(input.token);
      return { counselorName: c?.name ?? null, valid: !input.token || !!c };
    }),

  /** Student self-registration. Creates (or de-dupes) a CRM student. */
  submit: publicProcedure
    .input(
      z.object({
        token: z.string().optional(),
        studentName: z.string().min(1).max(255),
        studentPhone: z.string().min(3).max(50),
        studentEmail: z.string().max(320).optional(),
        parentName: z.string().max(255).optional(),
        parentPhone: z.string().max(50).optional(),
        parentEmail: z.string().max(320).optional(),
        preferredCountry: z.string().max(100).optional(),
        programInterest: z.string().max(255).optional(),
        studyLevel: z.string().max(100).optional(),
        intakeDate: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const counselor = await resolveCounselor(input.token);
      const counselorName = counselor?.name ?? "our team";

      const phone = input.studentPhone.trim();
      const email = input.studentEmail?.trim() || null;

      // De-dupe by phone or email — never create a duplicate; flag the existing.
      const dupeConds = [eq(leads.studentPhone, phone)];
      if (email) dupeConds.push(eq(leads.studentEmail, email));
      const [existing] = await db
        .select({ id: leads.id, journeyToken: leads.journeyToken })
        .from(leads)
        .where(or(...dupeConds))
        .limit(1);

      if (existing) {
        let journeyToken = existing.journeyToken;
        if (!journeyToken) {
          journeyToken = nanoid(16);
          await db.update(leads).set({ journeyToken }).where(eq(leads.id, existing.id));
        }
        await db.insert(crmActivityTimeline).values({
          leadId: existing.id,
          activityType: "note",
          title: "Re-submitted the intake form",
          description: `Via ${counselorName}'s intake link.`,
          staffEmail: null,
        });
        return { journeyToken, counselorName, duplicate: true };
      }

      const journeyToken = nanoid(16);
      const res = await db.insert(leads).values({
        studentName: input.studentName.trim(),
        studentPhone: phone,
        studentEmail: email,
        parentName: input.parentName?.trim() || null,
        parentPhone: input.parentPhone?.trim() || null,
        parentEmail: input.parentEmail?.trim() || null,
        preferredCountry: input.preferredCountry?.trim() || null,
        programInterest: input.programInterest?.trim() || null,
        studyLevel: input.studyLevel?.trim() || null,
        intakeDate: input.intakeDate?.trim() || null,
        assignedCounselorId: counselor?.id ?? null,
        pipelineStage: "new_lead",
        source: "intake_form",
        journeyToken,
      });
      const id = (res as any)[0]?.insertId as number;
      await db.insert(crmActivityTimeline).values({
        leadId: id,
        activityType: "note",
        title: "Self-registered via intake form",
        description: counselor ? `Through ${counselorName}'s link.` : "Via the general intake link.",
        staffEmail: null,
      });

      // Notify the counselor (best-effort).
      if (counselor?.email && EMAIL_RE.test(counselor.email)) {
        sendEmail({
          to: counselor.email,
          subject: `New student registered: ${input.studentName.trim()}`,
          html: `<p>A new student just registered through your intake link:</p>
            <p><strong>${input.studentName.trim()}</strong><br/>
            Phone: ${phone}${email ? `<br/>Email: ${email}` : ""}
            ${input.preferredCountry ? `<br/>Country: ${input.preferredCountry}` : ""}
            ${input.programInterest ? `<br/>Program: ${input.programInterest}` : ""}</p>
            <p><a href="${appBase()}/crm/students/${id}">Open in CRM →</a></p>`,
        }).catch(e => console.warn("[Intake] counselor notify failed:", e));
      }

      return { journeyToken, counselorName, duplicate: false };
    }),
});
