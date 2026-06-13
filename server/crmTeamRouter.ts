/**
 * CRM — Team & access (Phase 1).
 *
 * Single login: the whole team are rows in the `users` table. A user is a CRM
 * team member when `crmRole != "none"`. The site admin (role="admin") always
 * has full owner-level CRM access. Mounted in the app router as `team`.
 *
 * Team management (create/update/activate) is admin-only (adminProcedure).
 * `me` is any authenticated user — the CRM workspace calls it to decide what
 * the signed-in person may see.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, ne, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CRM_ROLES = [
  "none",
  "owner",
  "counselor",
  "ielts_instructor",
  "visa_specialist",
  "front_desk",
] as const;
const OFFICES = ["kelapa_gading", "pik", "gading_serpong"] as const;

/** Owner-level access = site admin OR explicit crmRole "owner". */
function isOwnerLevel(u: { role: string; crmRole: string | null }): boolean {
  return u.role === "admin" || u.crmRole === "owner";
}

/** Throw unless the caller has owner-level CRM access. */
function assertOwner(u: { role: string; crmRole: string | null }) {
  if (!isOwnerLevel(u)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required." });
  }
}

export const crmTeamRouter = router({
  /**
   * Who am I, for the CRM? The workspace uses this to gate access and nav.
   * `canAccess` is false for ordinary site users (crmRole "none" + not admin).
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const u = ctx.user;
    const owner = isOwnerLevel(u);
    const canAccess = owner || (u.crmRole !== "none" && u.crmActive);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      crmRole: u.crmRole,
      office: u.office,
      jobTitle: u.jobTitle,
      crmActive: u.crmActive,
      isOwner: owner,
      canAccess,
    };
  }),

  /** All CRM team members (owner only). */
  list: protectedProcedure.query(async ({ ctx }) => {
    assertOwner(ctx.user);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        crmRole: users.crmRole,
        office: users.office,
        phone: users.phone,
        jobTitle: users.jobTitle,
        crmActive: users.crmActive,
        lastSignedIn: users.lastSignedIn,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(or(ne(users.crmRole, "none"), eq(users.role, "admin")))
      .orderBy(desc(users.crmActive), users.name);
    return rows;
  }),

  /** Create a new team member = a users row with a CRM role + a login password. */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().refine(v => EMAIL_RE.test(v), { message: "Invalid email" }),
        password: z.string().min(8).max(200),
        crmRole: z.enum(CRM_ROLES),
        office: z.enum(OFFICES).optional(),
        phone: z.string().max(50).optional(),
        jobTitle: z.string().max(120).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertOwner(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const emailLower = input.email.trim().toLowerCase();

      const [existing] = await db
        .select({ id: users.id, crmRole: users.crmRole })
        .from(users)
        .where(eq(users.emailLower, emailLower))
        .limit(1);
      if (existing) {
        // If the email already exists (e.g. a past site signup), upgrade that
        // account into a team member rather than erroring.
        await db
          .update(users)
          .set({
            name: input.name.trim(),
            crmRole: input.crmRole,
            office: input.office ?? null,
            phone: input.phone?.trim() || null,
            jobTitle: input.jobTitle?.trim() || null,
            crmActive: true,
            passwordHash: await bcrypt.hash(input.password, 12),
            loginMethod: "password",
          })
          .where(eq(users.id, existing.id));
        return { id: existing.id, upgraded: true };
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.insert(users).values({
        openId: `email:${nanoid(20)}`,
        name: input.name.trim(),
        email: emailLower,
        emailLower,
        passwordHash,
        loginMethod: "password",
        role: "user",
        crmRole: input.crmRole,
        office: input.office ?? null,
        phone: input.phone?.trim() || null,
        jobTitle: input.jobTitle?.trim() || null,
        crmActive: true,
      });
      const id = (result as any)[0]?.insertId as number;
      return { id, upgraded: false };
    }),

  /** Edit a team member's profile/role (admin only). */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255).optional(),
        crmRole: z.enum(CRM_ROLES).optional(),
        office: z.enum(OFFICES).nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        jobTitle: z.string().max(120).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertOwner(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.crmRole !== undefined) patch.crmRole = input.crmRole;
      if (input.office !== undefined) patch.office = input.office;
      if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
      if (input.jobTitle !== undefined) patch.jobTitle = input.jobTitle?.trim() || null;
      if (Object.keys(patch).length === 0) return { ok: true };
      await db.update(users).set(patch).where(eq(users.id, input.id));
      void ctx;
      return { ok: true };
    }),

  /** Activate / deactivate a team member (keeps the account, removes access). */
  setActive: protectedProcedure
    .input(z.object({ id: z.number().int(), crmActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      assertOwner(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.id === ctx.user.id && !input.crmActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't deactivate your own account.",
        });
      }
      await db
        .update(users)
        .set({ crmActive: input.crmActive })
        .where(and(eq(users.id, input.id), ne(users.role, "admin")));
      return { ok: true };
    }),

  /** Reset a team member's login password (admin only). */
  resetPassword: protectedProcedure
    .input(z.object({ id: z.number().int(), password: z.string().min(8).max(200) }))
    .mutation(async ({ input, ctx }) => {
      assertOwner(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(users)
        .set({ passwordHash: await bcrypt.hash(input.password, 12), loginMethod: "password" })
        .where(eq(users.id, input.id));
      return { ok: true };
    }),
});
