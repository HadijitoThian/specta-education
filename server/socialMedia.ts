/**
 * Social Media Manager — DB helpers + tRPC router
 * Handles AI content generation, image generation, scheduling, and Meta API posting
 */
import { z } from "zod";
import { eq, desc, and, lte, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  socialMediaPosts,
  socialMediaAccounts,
  socialMediaTemplates,
  InsertSocialMediaPost,
  InsertSocialMediaAccount,
} from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── DB Helpers ──────────────────────────────────────────────────────────────

export async function getAllSocialPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialMediaPosts).orderBy(desc(socialMediaPosts.createdAt)).limit(100);
}

export async function getSocialPostById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(socialMediaPosts).where(eq(socialMediaPosts.id, id));
  return rows[0] ?? null;
}

export async function createSocialPost(data: InsertSocialMediaPost) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(socialMediaPosts).values(data);
  return result;
}

export async function updateSocialPost(id: number, data: Partial<InsertSocialMediaPost>) {
  const db = await getDb();
  if (!db) return null;
  return db.update(socialMediaPosts).set({ ...data, updatedAt: new Date() }).where(eq(socialMediaPosts.id, id));
}

export async function deleteSocialPost(id: number) {
  const db = await getDb();
  if (!db) return null;
  return db.delete(socialMediaPosts).where(eq(socialMediaPosts.id, id));
}

export async function getDueSocialPosts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(socialMediaPosts)
    .where(
      and(
        eq(socialMediaPosts.status, "scheduled"),
        lte(socialMediaPosts.scheduledAt, new Date())
      )
    );
}

export async function getAllSocialAccounts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialMediaAccounts).where(eq(socialMediaAccounts.isActive, 1));
}

export async function upsertSocialAccount(data: InsertSocialMediaAccount) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db
    .select()
    .from(socialMediaAccounts)
    .where(and(eq(socialMediaAccounts.platform, data.platform), eq(socialMediaAccounts.accountId, data.accountId)));
  if (existing.length > 0) {
    return db.update(socialMediaAccounts).set({ ...data, updatedAt: new Date() }).where(eq(socialMediaAccounts.id, existing[0].id));
  }
  return db.insert(socialMediaAccounts).values(data);
}

export async function getAllSocialTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialMediaTemplates).where(eq(socialMediaTemplates.isActive, 1));
}

// ─── AI Caption Generator ────────────────────────────────────────────────────

async function generateCaption(brief: string, platform: string, tone?: string): Promise<{ caption: string; hashtags: string }> {
  const platformGuide: Record<string, string> = {
    instagram: "Instagram: engaging, emoji-rich, storytelling tone, 150-220 words, 15-20 relevant hashtags",
    facebook: "Facebook: conversational, informative, 100-150 words, 5-8 hashtags, encourage sharing",
    tiktok: "TikTok: punchy, trendy, 50-80 words, hook in first line, 10-15 trending hashtags",
  };
  const guide = platformGuide[platform] || platformGuide.instagram;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a social media content writer for SpecTa Education, an Indonesian study abroad consultancy. Brand voice: professional yet friendly, inspiring, focused on student success and international opportunities. Brand colors: red (#E63946) and black. Always write in Bahasa Indonesia unless the brief specifies English. Platform guide: ${guide}${tone ? ` Tone: ${tone}` : ""} Return a JSON object with exactly two fields: caption (the post text) and hashtags (hashtags as a single string separated by spaces).` as string,
      },
      {
        role: "user",
        content: `Create a social media post for: ${brief}` as string,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "social_post",
        strict: true,
        schema: {
          type: "object",
          properties: {
            caption: { type: "string" },
            hashtags: { type: "string" },
          },
          required: ["caption", "hashtags"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawMsg = response.choices[0]?.message?.content;
  const content = typeof rawMsg === 'string' ? rawMsg : null;
  if (!content) throw new Error("No caption generated");
  const parsed = JSON.parse(content);
  return { caption: parsed.caption, hashtags: parsed.hashtags };
}

// ─── AI Image Prompt Builder ─────────────────────────────────────────────────

async function buildImagePrompt(brief: string): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a visual art director for SpecTa Education. Create a detailed image generation prompt for a social media post graphic. Style: clean modern educational, SpecTa brand colors deep red and black, Indonesian students in international settings, professional aspirational. No text overlays. Return ONLY the image generation prompt as a plain string.` as string,
      },
      {
        role: "user",
        content: `Create an image prompt for a social media post about: ${brief}` as string,
      },
    ],
  });
  const rawContent = response.choices[0]?.message?.content;
  return (typeof rawContent === 'string' ? rawContent : null) ?? `Professional educational social media graphic for ${brief}, modern design, red and black color scheme`;
}

// ─── Slideshow Reel Generator (FFmpeg) ───────────────────────────────────────

async function generateSlideReel(imageUrls: string[], caption: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "specta-reel-"));
  const outputPath = path.join(tmpDir, "reel.mp4");

  try {
    // Download images
    const localImages: string[] = [];
    for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
      const imgPath = path.join(tmpDir, `img${i}.jpg`);
      const res = await fetch(imageUrls[i]);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(imgPath, buf);
      localImages.push(imgPath);
    }

    if (localImages.length === 0) throw new Error("No images to create reel");

    // Build FFmpeg concat input
    const concatFile = path.join(tmpDir, "concat.txt");
    const concatContent = localImages.map(img => `file '${img}'\nduration 3`).join("\n");
    fs.writeFileSync(concatFile, concatContent);

    // Generate reel: 1080x1080, 30fps, fade transitions, 3s per image
    const ffmpegCmd = [
      "ffmpeg -y",
      `-f concat -safe 0 -i "${concatFile}"`,
      `-vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black,fps=30"`,
      `-c:v libx264 -pix_fmt yuv420p -movflags +faststart`,
      `-t ${localImages.length * 3}`,
      `"${outputPath}"`,
    ].join(" ");

    execSync(ffmpegCmd, { timeout: 120000 });

    // Upload to S3
    const videoBuffer = fs.readFileSync(outputPath);
    const { url } = await storagePut(
      `social-reels/${Date.now()}.mp4`,
      videoBuffer,
      "video/mp4"
    );
    return url;
  } finally {
    // Cleanup temp files
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

// ─── Meta Graph API Publisher ─────────────────────────────────────────────────

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  caption: string,
  imageUrl?: string
): Promise<string> {
  const endpoint = imageUrl
    ? `https://graph.facebook.com/v19.0/${pageId}/photos`
    : `https://graph.facebook.com/v19.0/${pageId}/feed`;

  const body: Record<string, string> = { access_token: accessToken, message: caption };
  if (imageUrl) body.url = imageUrl;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Facebook API error: ${err}`);
  }
  const data = (await res.json()) as { id?: string; post_id?: string };
  return data.post_id ?? data.id ?? "unknown";
}

async function publishToInstagram(
  igAccountId: string,
  accessToken: string,
  caption: string,
  imageUrl: string
): Promise<string> {
  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
    }
  );
  if (!containerRes.ok) {
    const err = await containerRes.text();
    throw new Error(`Instagram container error: ${err}`);
  }
  const { id: creationId } = (await containerRes.json()) as { id: string };

  // Step 2: Publish container
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
    }
  );
  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Instagram publish error: ${err}`);
  }
  const { id } = (await publishRes.json()) as { id: string };
  return id;
}

// ─── tRPC Router ─────────────────────────────────────────────────────────────

export const socialMediaRouter = router({
  // Get all posts
  getPosts: protectedProcedure.query(async () => {
    return getAllSocialPosts();
  }),

  // Get connected accounts
  getAccounts: protectedProcedure.query(async () => {
    return getAllSocialAccounts();
  }),

  // Get templates
  getTemplates: protectedProcedure.query(async () => {
    return getAllSocialTemplates();
  }),

  // Generate AI caption
  generateCaption: protectedProcedure
    .input(z.object({
      brief: z.string().min(5),
      platform: z.enum(["instagram", "facebook", "tiktok"]),
      tone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return generateCaption(input.brief, input.platform, input.tone);
    }),

  // Generate AI image
  generateImage: protectedProcedure
    .input(z.object({ brief: z.string().min(5) }))
    .mutation(async ({ input }) => {
      const prompt = await buildImagePrompt(input.brief);
      const { url } = await generateImage({ prompt });
      return { url, prompt };
    }),

  // Generate slideshow reel
  generateReel: protectedProcedure
    .input(z.object({
      imageUrls: z.array(z.string()).min(1).max(5),
      caption: z.string(),
    }))
    .mutation(async ({ input }) => {
      const url = await generateSlideReel(input.imageUrls, input.caption);
      return { url };
    }),

  // Create/save a post (draft or scheduled)
  createPost: protectedProcedure
    .input(z.object({
      brief: z.string().min(5),
      caption: z.string().min(1),
      imageUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      platforms: z.array(z.string()).min(1),
      contentType: z.enum(["image", "reel", "text"]),
      hashtags: z.string().optional(),
      scheduledAt: z.string().optional(), // ISO string
      publishNow: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const post: InsertSocialMediaPost = {
        brief: input.brief,
        caption: input.caption,
        imageUrl: input.imageUrl,
        videoUrl: input.videoUrl,
        platforms: input.platforms.join(","),
        contentType: input.contentType,
        hashtags: input.hashtags,
        status: input.publishNow ? "publishing" : input.scheduledAt ? "scheduled" : "draft",
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        createdBy: ctx.user.name ?? ctx.user.email ?? "staff",
      };

      await createSocialPost(post);

      // Get the inserted post ID
      const db = await getDb();
      if (!db) return { success: false, postId: undefined };
      const rows = await db.select().from(socialMediaPosts).orderBy(desc(socialMediaPosts.createdAt)).limit(1);
      const savedPost = rows[0];

      if (input.publishNow && savedPost) {
        // Attempt to publish immediately
        await publishPostNow(savedPost.id);
      }

      return { success: true, postId: savedPost?.id };
    }),

  // Update a post
  updatePost: protectedProcedure
    .input(z.object({
      id: z.number(),
      caption: z.string().optional(),
      imageUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      platforms: z.array(z.string()).optional(),
      scheduledAt: z.string().optional(),
      status: z.enum(["draft", "scheduled", "publishing", "published", "failed"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, platforms, scheduledAt, ...rest } = input;
      await updateSocialPost(id, {
        ...rest,
        ...(platforms ? { platforms: platforms.join(",") } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      });
      return { success: true };
    }),

  // Delete a post
  deletePost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteSocialPost(input.id);
      return { success: true };
    }),

  // Publish a draft/scheduled post now
  publishNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return publishPostNow(input.id);
    }),

  // Save Meta account credentials
  saveAccount: protectedProcedure
    .input(z.object({
      platform: z.enum(["facebook", "instagram", "tiktok"]),
      accountName: z.string(),
      accountId: z.string(),
      accessToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await upsertSocialAccount({
        ...input,
        connectedBy: ctx.user.name ?? ctx.user.email ?? "admin",
      });
      return { success: true };
    }),

  // Get post analytics summary
  getStats: protectedProcedure.query(async () => {
    const posts = await getAllSocialPosts();
    return {
      total: posts.length,
      published: posts.filter((p: {status: string}) => p.status === "published").length,
      scheduled: posts.filter((p: {status: string}) => p.status === "scheduled").length,
      draft: posts.filter((p: {status: string}) => p.status === "draft").length,
      failed: posts.filter((p: {status: string}) => p.status === "failed").length,
    };
  }),
});

// ─── Publish Post Helper ──────────────────────────────────────────────────────

async function publishPostNow(postId: number): Promise<{ success: boolean; message: string }> {
  const post = await getSocialPostById(postId);
  if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

  const accounts = await getAllSocialAccounts();
  const platforms = post.platforms.split(",").map((p: string) => p.trim());

  let fbPostId: string | undefined;
  let igPostId: string | undefined;
  const errors: string[] = [];

  for (const platform of platforms) {
    const account = accounts.find((a: typeof accounts[0]) => a.platform === platform && a.isActive === 1);
    if (!account || !account.accessToken) {
      errors.push(`${platform}: No connected account or access token`);
      continue;
    }

    try {
      if (platform === "facebook") {
        fbPostId = await publishToFacebook(
          account.accountId,
          account.accessToken,
          `${post.caption}\n\n${post.hashtags ?? ""}`.trim(),
          post.imageUrl ?? undefined
        );
      } else if (platform === "instagram" && post.imageUrl) {
        igPostId = await publishToInstagram(
          account.accountId,
          account.accessToken,
          `${post.caption}\n\n${post.hashtags ?? ""}`.trim(),
          post.imageUrl
        );
      } else if (platform === "tiktok") {
        errors.push("TikTok: Content ready for manual download and posting");
      }
    } catch (err: any) {
      errors.push(`${platform}: ${err.message}`);
    }
  }

  const hasSuccess = fbPostId || igPostId;
  const status = hasSuccess ? "published" : errors.length > 0 ? "failed" : "published";

  await updateSocialPost(postId, {
    status,
    publishedAt: hasSuccess ? new Date() : undefined,
    facebookPostId: fbPostId,
    instagramPostId: igPostId,
    errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
  });

  return {
    success: !!(hasSuccess) || platforms.includes("tiktok"),
    message: errors.length > 0 ? errors.join("; ") : "Published successfully",
  };
}

// ─── Scheduled Post Processor (called by agent runner) ───────────────────────

export async function processScheduledSocialPosts() {
  const duePosts = await getDueSocialPosts();
  for (const post of duePosts) {
    await updateSocialPost(post.id, { status: "publishing" });
    try {
      await publishPostNow(post.id);
    } catch (err: any) {
      await updateSocialPost(post.id, {
        status: "failed",
        errorMessage: err.message,
      });
    }
  }
  return duePosts.length;
}
