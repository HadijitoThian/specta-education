/**
 * Social Media workspace (/sosmed) — server (Phase 1). Mounted as `sosmed`.
 *
 * Access: site admin, crmRole "owner", or crmRole "marketing" (active). The
 * marketing team does NOT get the student CRM — that's gated separately.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { brandKit } from "../drizzle/schema";

function isOwner(u: { role: string; crmRole: string | null }) {
  return u.role === "admin" || u.crmRole === "owner";
}
function canAccessSosmed(u: { role: string; crmRole: string | null; crmActive: boolean }) {
  return isOwner(u) || (u.crmRole === "marketing" && u.crmActive);
}
function assertSosmed(u: { role: string; crmRole: string | null; crmActive: boolean }) {
  if (!canAccessSosmed(u)) throw new TRPCError({ code: "FORBIDDEN", message: "Marketing access required." });
}

export const sosmedRouter = router({
  /** Who am I, for the SosMed workspace (gates access + nav). */
  me: protectedProcedure.query(({ ctx }) => {
    const u = ctx.user;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      crmRole: u.crmRole,
      isOwner: isOwner(u),
      canAccess: canAccessSosmed(u),
    };
  }),

  getBrandKit: protectedProcedure.query(async ({ ctx }) => {
    assertSosmed(ctx.user);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [row] = await db.select().from(brandKit).limit(1);
    return row ?? null;
  }),

  updateBrandKit: protectedProcedure
    .input(
      z.object({
        brandName: z.string().max(160).optional(),
        logoUrl: z.string().max(500).nullable().optional(),
        primaryColor: z.string().max(16).optional(),
        secondaryColor: z.string().max(16).optional(),
        accentColor: z.string().max(16).optional(),
        fontHeading: z.string().max(80).optional(),
        fontBody: z.string().max(80).optional(),
        toneOfVoice: z.string().max(4000).nullable().optional(),
        targetAudience: z.string().max(4000).nullable().optional(),
        keyOffers: z.string().max(4000).nullable().optional(),
        doList: z.string().max(4000).nullable().optional(),
        dontList: z.string().max(4000).nullable().optional(),
        contentAngles: z.string().max(8000).nullable().optional(),
        hashtags: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertSosmed(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) if (v !== undefined) patch[k] = v;
      const [existing] = await db.select({ id: brandKit.id }).from(brandKit).limit(1);
      if (!existing) {
        await db.insert(brandKit).values(patch as any);
      } else if (Object.keys(patch).length) {
        await db.update(brandKit).set(patch).where(eq(brandKit.id, existing.id));
      }
      return { ok: true };
    }),
});
