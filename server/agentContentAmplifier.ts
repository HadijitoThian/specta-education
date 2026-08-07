/**
 * Agent 11 — Content Amplifier Agent
 * Converts blog posts into multi-platform content
 */
import { createAgentRunLog, updateAgentRunLog, getTrackingDb } from "./db";
import { invokeLLM } from "./_core/llm";
import { blogPosts } from "../drizzle/schema";
import { sql, desc, eq } from "drizzle-orm";

interface AmplifiedContent {
  blogId: number; blogTitle: string;
  instagramCaption: string; instagramHashtags: string;
  tiktokScript: string; whatsappMessage: string;
  twitterThread: string[]; linkedinPost: string;
}

async function generateContent(sysPrompt: string, userPrompt: string, fallback: string): Promise<string> {
  try {
    const resp = await invokeLLM({ messages: [{ role: "system", content: sysPrompt }, { role: "user", content: userPrompt }] });
    const c = resp.choices?.[0]?.message?.content;
    return typeof c === "string" ? c : fallback;
  } catch { return fallback; }
}

export async function runContentAmplifierAgent(specificBlogId?: number): Promise<{
  articlesProcessed: number; contentGenerated: number; results: AmplifiedContent[]; errors: number;
}> {
  const runLog = await createAgentRunLog({ agentName: "content_amplifier", status: "running", startedAt: new Date() });
  let articlesProcessed = 0, contentGenerated = 0, errors = 0;
  const results: AmplifiedContent[] = [];

  try {
    // Was: drizzle(process.env.DATABASE_URL!) — a brand new, never-closed
    // pool on every call. Now uses the shared isolated tracking pool.
    const db = await getTrackingDb();
    if (!db) throw new Error("Database unavailable");
    const articles = specificBlogId
      ? await db.select().from(blogPosts).where(eq(blogPosts.id, specificBlogId)).limit(1)
      : await db.select().from(blogPosts).where(sql`status = 'published' AND (amplified IS NULL OR amplified = 0)`).orderBy(desc(blogPosts.createdAt)).limit(3);

    for (const article of articles) {
      try {
        const summary = (article.content || "").substring(0, 1500);
        const title = article.title || "Untitled";

        const igRaw = await generateContent(
          "Social media manager for SpecTa Education. Instagram captions in Bahasa Indonesia.",
          `Caption (max 300 chars) for: ${title}\n${summary}\nCTA to spectaeducation.com. After "HASHTAGS:" add 15 hashtags.`,
          `📚 ${title}\nBaca di spectaeducation.com!\nHASHTAGS: #StudyAbroad #SpecTaEducation`
        );
        const igParts = igRaw.split(/HASHTAGS?:?/i);

        const tiktokScript = await generateContent(
          "TikTok creator for SpecTa Education. 30-60s scripts in Bahasa Indonesia.",
          `Script for: ${title}\n${summary}\nFormat: [HOOK 5s] [CONTENT 20s] [CTA 5s]`,
          `[HOOK] ${title}\n[CTA] Follow @spectaeducation!`
        );

        const whatsappMessage = await generateContent(
          "WhatsApp writer for SpecTa Education. Short Bahasa Indonesia (max 200 chars).",
          `Broadcast about: ${title}\nUnder 200 chars, include spectaeducation.com/blog`,
          `📚 ${title}\nBaca: spectaeducation.com/blog`
        );

        const twRaw = await generateContent(
          "Twitter/X writer for SpecTa Education. Bahasa Indonesia threads, max 280 chars/tweet.",
          `3-tweet thread: ${title}\n${summary}\nTweet 1: Hook\nTweet 2: Insight\nTweet 3: CTA`,
          `🧵 ${title}\n\nBaca di spectaeducation.com\n\n#StudyAbroad`
        );
        const twitterThread = twRaw.split(/\n\n|tweet \d+:?/i).filter(t => t.trim().length > 10).slice(0, 3);

        const linkedinPost = await generateContent(
          "LinkedIn writer for SpecTa Education. Professional English posts.",
          `Post (max 500 chars): ${title}\n${summary}`,
          `New from SpecTa Education: ${title}\nspectaeducation.com/blog`
        );

        results.push({
          blogId: article.id, blogTitle: title,
          instagramCaption: (igParts[0] || "").trim(),
          instagramHashtags: (igParts[1] || "#StudyAbroad #SpecTaEducation").trim(),
          tiktokScript, whatsappMessage, twitterThread, linkedinPost,
        });
        articlesProcessed++;
        contentGenerated += 5;
        await db.execute(sql`UPDATE blog_posts SET amplified = 1 WHERE id = ${article.id}`);
      } catch (err) { console.error(`[Content Amplifier] Error:`, err); errors++; }
    }

    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: "success", completedAt: new Date(),
        summary: `Amplified ${articlesProcessed} articles into ${contentGenerated} content pieces`,
        itemsProcessed: articlesProcessed,
        details: JSON.stringify(results.map(r => ({ blogId: r.blogId, title: r.blogTitle }))),
      });
    }
  } catch (err) {
    console.error("[Content Amplifier] Fatal:", err);
    if (runLog) { await updateAgentRunLog(runLog.id, { status: "failed", completedAt: new Date(), summary: String(err) }); }
    errors++;
  }

  return { articlesProcessed, contentGenerated, results, errors };
}
