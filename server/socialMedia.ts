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

// ─── AI Image Prompt Builder (Expert Digital Marketing Designer) ─────────────

async function buildImagePrompt(brief: string, postCategory?: string, tone?: string): Promise<string> {

  // ── Category-specific layout & copy templates ────────────────────────────
  const categoryLayouts: Record<string, string> = {
    ielts_prep: `LAYOUT: Full-bleed dark background (deep charcoal #1A1A1A). TOP ZONE (top 20%): SpecTa Education logo text 'SpecTa Education ❤' in white Poppins Bold top-left, and a gold pill badge 'IELTS PREPARATION' top-right. HERO ZONE (middle 55%): photorealistic confident young Indonesian student (male or female, 20s, professional attire) studying at a sleek modern desk, IELTS preparation book open, laptop screen showing a score graph climbing to Band 7.5, warm amber desk lamp glow, shallow depth of field, bokeh background. COPY ZONE (bottom 25%): bold white headline 'Raih IELTS Band 7+' in Poppins ExtraBold 72px, subheadline 'Kelas intensif dengan tutor berpengalaman' in white 28px, then a bright red rounded rectangle CTA button with white text 'DAFTAR SEKARANG →'. FOOTER: thin red divider line, then small white text '© SpecTa Education | spectaeducation.com | @spectaeducation'. Gold star accent elements scattered subtly.`,
    scholarship_alert: `LAYOUT: Vibrant red-to-black diagonal gradient background. TOP ZONE: SpecTa Education logo 'SpecTa Education ❤' in white top-left, flashing gold badge 'BEASISWA TERSEDIA' top-right with star icon. HERO ZONE: joyful Indonesian student (female, hijab, 20s) holding an acceptance letter, huge smile, confetti falling in gold and white, blurred prestigious university campus (stone architecture) in background, warm golden light. COPY ZONE: bold gold headline 'Kuliah Luar Negeri GRATIS?' in Poppins Black, white subheadline 'Ribuan beasiswa menanti kamu — kami bantu prosesnya', gold CTA button 'CEK BEASISWA SEKARANG →'. FOOTER: '© SpecTa Education | spectaeducation.com | @spectaeducation' in small white text on dark strip.`,
    student_success: `LAYOUT: Split design — left half deep red (#E63946), right half hero photo. TOP: SpecTa Education logo white on red side. LEFT COPY ZONE: large white quotation marks, italic white testimonial quote 'Saya diterima di University of Melbourne berkat SpecTa!', student name in gold 'Rina, 22 — Melbourne Uni', gold 5-star rating row, white CTA button 'Ceritamu Bisa Seperti Ini →'. RIGHT HERO: photorealistic smiling Indonesian female student in graduation gown at Sydney Opera House, golden hour light, professional portrait. FOOTER strip: red background, white '© SpecTa Education | spectaeducation.com | @spectaeducation'.`,
    university_spotlight: `LAYOUT: Dark navy overlay on full-bleed stunning university campus photo (aerial view of green campus with modern glass buildings). TOP: SpecTa Education logo white top-left, gold 'PARTNER UNIVERSITY' badge top-right. CENTER HERO: university name in massive white Poppins Black text, world ranking badge '#47 QS World Ranking' in gold rounded badge, 3 white icon+text pairs: '🎓 50+ Programs', '🌍 International Campus', '✈️ Visa Support'. BOTTOM CTA: red rounded button 'Pelajari Lebih Lanjut →', then footer '© SpecTa Education | spectaeducation.com | @spectaeducation' in small white.`,
    tips_advice: `LAYOUT: Clean white background with red accent bar on left edge. TOP: SpecTa Education logo in brand red top-left, category label 'TIPS STUDI LUAR NEGERI' in red pill badge. CONTENT GRID: 3 tip cards arranged vertically, each with red numbered circle (1, 2, 3), bold dark headline, short description in gray. Example tips derived from brief. Red geometric accent shapes in corners. BOTTOM: red CTA button 'Konsultasi GRATIS →', footer '© SpecTa Education | spectaeducation.com | @spectaeducation' in small gray text.`,
    event_promo: `LAYOUT: Bold red background with dark geometric pattern overlay. TOP: SpecTa Education logo white top-left, 'EVENT' label in white pill. CENTER: large white event title in Poppins Black (derived from brief), gold divider line, white date/time/location details with calendar and map pin icons, 'GRATIS' badge in gold if applicable. BOTTOM: white rounded CTA button with red text 'DAFTAR SEKARANG', subtext 'Tempat terbatas — segera daftar!', footer '© SpecTa Education | spectaeducation.com | @spectaeducation'.`,
    general_promo: `LAYOUT: Full-bleed aspirational photo of Indonesian student at iconic international location (London, Sydney, or Amsterdam) with 60% dark gradient overlay from bottom. TOP: SpecTa Education logo 'SpecTa Education ❤' in white top-left. CENTER-BOTTOM COPY: bold white headline 'Wujudkan Impian Studimu di Luar Negeri' in Poppins ExtraBold, white subheadline 'Konsultasi gratis dengan education counselor kami', destination flag icons row. BOTTOM: red rounded CTA button 'MULAI PERJALANANMU →', footer strip '© SpecTa Education | spectaeducation.com | @spectaeducation'.`,
  };

  const toneModifier: Record<string, string> = {
    professional: "Use clean, authoritative typography. Muted sophisticated palette. Trust-building copy tone.",
    inspirational: "Use warm golden light treatment. Emotionally charged copy. Make the viewer feel the dream is within reach.",
    urgent: "Add urgency elements: countdown badge, 'LIMITED SEATS', 'DEADLINE' stamp in red. Bold urgent CTA.",
    casual: "Brighter, friendlier color treatment. Conversational copy tone. Instagram-native candid feel.",
    friendly: "Warm smiling faces. Welcoming copy. Soft warm color grading on photos.",
    educational: "Add infographic elements, data points, icons. Structured credible layout. Authoritative copy.",
  };

  const catKey = (postCategory || 'general_promo').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
  const layoutTemplate = categoryLayouts[catKey] || categoryLayouts['general_promo'];
  const toneInstruction = toneModifier[(tone || 'professional').toLowerCase()] || toneModifier['professional'];

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a senior creative director and Instagram marketing specialist at a top-tier digital agency in Jakarta. You have 15+ years of experience producing award-winning social media campaigns for education brands across Southeast Asia.

You produce COMPLETE, READY-TO-POST Instagram graphics — not just backgrounds or stock photos. Every image you design is a full marketing package that a professional agency would charge Rp 2,000,000+ to produce.

## SpecTa Education — Complete Brand System

### Logo & Identity
- Brand name: "SpecTa Education" with a heart (❤) icon
- Logo always appears in the TOP-LEFT corner of every post
- Logo text: "SpecTa" in bold red (#E63946), "Education" in black or white depending on background
- Website: spectaeducation.com | Instagram: @spectaeducation
- Copyright line: "© SpecTa Education" — ALWAYS in footer

### Color Palette
- Primary Red: #E63946 (dominant brand color — headlines, CTAs, accents)
- Deep Black: #1A1A1A (backgrounds, overlays, contrast)
- Gold: #D4AF37 (premium badges, highlights, star ratings)
- White: #FFFFFF (body text on dark backgrounds)
- Light Gray: #F5F5F5 (backgrounds for light-theme posts)

### Typography System
- Headline: Poppins ExtraBold / Black — 64-80px — ALL CAPS or Title Case
- Subheadline: Poppins SemiBold — 28-36px
- Body: Poppins Regular — 18-22px
- CTA Button text: Poppins Bold — 24px
- Footer/Copyright: Poppins Regular — 12-14px

### Mandatory Elements on EVERY Post
1. SpecTa Education logo (top-left corner, always visible)
2. Bold headline (main marketing message)
3. Subheadline (supporting message or benefit)
4. CTA button (rounded rectangle, red or gold, with action text + arrow)
5. Footer copyright line: "© SpecTa Education | spectaeducation.com | @spectaeducation"
6. At least one graphic design element: badge, icon, geometric shape, or divider

### Design Quality Standards
- 1080x1080px square format for Instagram feed
- High contrast — text must be readable at thumbnail size
- Professional photo quality — photorealistic, not cartoon or illustration
- Layered composition: background photo + color overlay + text layer + graphic elements
- No cluttered layouts — maximum 3 text elements in the hero zone
- Every post must make someone STOP SCROLLING and feel compelled to act

Your output is a detailed image generation prompt (150-300 words) that describes EVERY visual element with pixel-level precision. Include exact text content, colors, positions, fonts, and graphic elements. The AI image generator will render this exactly as described.` as string,
      },
      {
        role: "user",
        content: `Generate a complete, agency-quality Instagram marketing post for SpecTa Education.

## Campaign Brief
${brief}

## Layout Template to Follow
${layoutTemplate}

## Tone Modifier
${toneInstruction}

## Your Task
Write a single detailed image generation prompt (150-300 words) that describes this complete Instagram post with ALL elements: SpecTa logo placement, hero scene, headline text with exact wording, subheadline, CTA button with exact text, copyright footer, colors, typography, graphic accents, and overall mood. The prompt must be specific enough that an AI image generator produces a complete, professional, ready-to-post Instagram graphic — not just a background photo.

Include the exact Indonesian/English marketing copy that should appear on the image, derived from the campaign brief above.` as string,
      },
    ],
  });
  const rawContent = response.choices[0]?.message?.content;
  return (typeof rawContent === 'string' ? rawContent : null) ?? `Complete professional Instagram marketing post for SpecTa Education. 1080x1080px square. Deep charcoal background. TOP-LEFT: SpecTa Education logo text in white with red heart icon. HERO: photorealistic confident Indonesian student in international university setting, warm professional lighting. HEADLINE: bold white Poppins ExtraBold text '${brief.substring(0, 40)}' on semi-transparent dark overlay. SUBHEADLINE: white Poppins Regular supporting text. CTA: bright red rounded rectangle button with white text 'DAFTAR SEKARANG →'. FOOTER: thin red line divider, small white text '© SpecTa Education | spectaeducation.com | @spectaeducation'. Gold accent badge. High contrast, conversion-focused, premium quality.`;
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
    .input(z.object({
      brief: z.string().min(5),
      postCategory: z.string().optional(),
      tone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = await buildImagePrompt(input.brief, input.postCategory, input.tone);
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

  // AI Content Strategy Chat
  chat: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = `You are SpecTa Social AI, a creative social media strategist and content expert for SpecTa Education — an Indonesian study abroad consultancy. Your job is to help the marketing team create engaging, high-performing social media content.

You specialise in:
- Writing captions for Instagram, Facebook, and TikTok in Bahasa Indonesia (and English when asked)
- Suggesting relevant hashtags (trending + niche) for study abroad content
- Content strategy: what to post, when to post, content calendars
- Visual content ideas: what kind of images or reels to create
- Engagement tactics: polls, questions, CTAs that drive DMs and inquiries
- Competitor analysis insights for study abroad consultancies in Indonesia
- Trending topics in education, study abroad, and Indonesian student culture

Brand voice: professional yet relatable, inspiring, warm, focused on student dreams and international opportunities. Brand colors: deep red (#E63946) and black.

When writing captions, always offer 2-3 variations so the team can choose. When suggesting hashtags, group them by category (brand, niche, trending). Be proactive — if the team describes a topic, suggest angles they might not have considered. Keep responses concise and actionable.`;

      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const response = await invokeLLM({ messages: llmMessages });
      const rawContent = response.choices?.[0]?.message?.content;
      const reply = typeof rawContent === "string" ? rawContent : "Maaf, ada masalah teknis. Silakan coba lagi.";
      return { reply };
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
