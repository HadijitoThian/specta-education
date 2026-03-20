/**
 * Agent 7 — Aptitude Lead Nurture Agent
 * 
 * Sends personalised follow-up emails to students who completed the aptitude test
 * based on their Holland Code results. Recommends specific programs, countries,
 * and universities that match their profile.
 * 
 * Schedule: Daily at 10:00 AM
 */

import { createAgentRunLog, updateAgentRunLog, getDb, withDbRetry } from "./db";
import { sendEmail } from "./email";
import { invokeLLM } from "./_core/llm";
import { aptitudeResults } from "../drizzle/schema";
import { eq, and, sql, isNull, or } from "drizzle-orm";

const HOLLAND_CODE_MAP: Record<string, { name: string; careers: string[]; programs: string[] }> = {
  R: { name: "Realistic", careers: ["Engineer", "Architect", "Mechanic", "Pilot"], programs: ["Engineering", "Architecture", "Aviation", "Construction Management"] },
  I: { name: "Investigative", careers: ["Scientist", "Doctor", "Researcher", "Data Analyst"], programs: ["Medicine", "Biomedical Science", "Data Science", "Research"] },
  A: { name: "Artistic", careers: ["Designer", "Artist", "Writer", "Musician"], programs: ["Design", "Fine Arts", "Media & Communications", "Film Production"] },
  S: { name: "Social", careers: ["Teacher", "Counselor", "Nurse", "Social Worker"], programs: ["Education", "Psychology", "Nursing", "Social Work"] },
  E: { name: "Enterprising", careers: ["Manager", "Entrepreneur", "Lawyer", "Marketer"], programs: ["Business", "Law", "Marketing", "Entrepreneurship"] },
  C: { name: "Conventional", careers: ["Accountant", "Banker", "Admin", "Auditor"], programs: ["Accounting", "Finance", "Information Systems", "Business Administration"] },
};

const COUNTRY_RECOMMENDATIONS: Record<string, string[]> = {
  R: ["Australia (Engineering at UTS, RMIT)", "Germany (TU Munich)", "Singapore (NUS Engineering)"],
  I: ["Australia (University of Melbourne)", "UK (Imperial College)", "USA (MIT, Stanford)"],
  A: ["Australia (RMIT Design)", "UK (UAL London)", "USA (Parsons, RISD)"],
  S: ["Australia (Monash Education)", "UK (University of Edinburgh)", "Canada (UBC)"],
  E: ["Australia (UNSW Business)", "UK (LSE, Warwick)", "Singapore (NUS Business)"],
  C: ["Australia (Deakin, Macquarie)", "UK (University of Manchester)", "Singapore (SMU)"],
};

export async function runAptitudeNurtureAgent(): Promise<{
  processed: number;
  emailsSent: number;
  errors: number;
}> {
  const runLog = await createAgentRunLog({
    agentName: "aptitude_nurture",
    status: "running",
    startedAt: new Date(),
  });

  let processed = 0;
  let emailsSent = 0;
  let errors = 0;

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find aptitude results from last 30 days that haven't been nurtured
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const results = await withDbRetry(() => db.select().from(aptitudeResults)
      .where(
        and(
          sql`${aptitudeResults.createdAt} > ${thirtyDaysAgo}`,
          or(
            isNull(aptitudeResults.nurtureEmailSent),
            eq(aptitudeResults.nurtureEmailSent, 0)
          )
        )
      )
      .limit(20), "aptitude_nurture select");

    console.log(`[Aptitude Nurture] Found ${results.length} students to nurture`);

    for (const result of results) {
      if (!result.studentEmail) continue;
      
      try {
        const hollandCode = result.hollandCode || "SEC";
        const primaryType = hollandCode.charAt(0);
        const secondaryType = hollandCode.charAt(1);

        const primary = HOLLAND_CODE_MAP[primaryType] || HOLLAND_CODE_MAP["S"];
        const secondary = HOLLAND_CODE_MAP[secondaryType] || HOLLAND_CODE_MAP["E"];
        const countries = COUNTRY_RECOMMENDATIONS[primaryType] || COUNTRY_RECOMMENDATIONS["S"];

        // Generate personalised recommendation using AI
        let aiRecommendation = "";
        try {
          const llmResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are an education counselor at SpecTa Education, Indonesia's leading AI-powered study abroad consultancy. Write in Bahasa Indonesia, friendly and encouraging tone. Keep it under 150 words." },
              { role: "user", content: `Write a personalised study recommendation for ${result.studentName || "Student"} with Holland Code ${hollandCode}. Primary type: ${primary.name} (careers: ${primary.careers.join(", ")}). Recommend 2-3 specific programs. Mention SpecTa Education can help find the perfect university and scholarship.` }
            ],
          });
          const content = llmResponse.choices?.[0]?.message?.content;
          aiRecommendation = typeof content === "string" ? content : "";
        } catch (llmErr) {
          console.error("[Aptitude Nurture] LLM error:", llmErr);
          aiRecommendation = `Berdasarkan hasil tes bakat kamu dengan kode Holland ${hollandCode}, kamu memiliki bakat kuat di bidang ${primary.name}. Program studi yang cocok: ${primary.programs.slice(0, 3).join(", ")}. SpecTa Education siap membantu kamu menemukan universitas dan beasiswa yang tepat!`;
        }

        const emailHtml = buildNurtureEmail({ studentName: result.studentName || "Student", hollandCode, primaryType: primary, secondaryType: secondary, countries, aiRecommendation });

        await sendEmail({
          to: result.studentEmail,
          subject: `🎯 ${result.studentName || "Hi"}, Rekomendasi Jurusan Berdasarkan Hasil Tes Bakat Kamu!`,
          html: emailHtml,
        });

        // Mark as nurtured
        await withDbRetry(() => db.update(aptitudeResults)
          .set({ nurtureEmailSent: 1 })
          .where(eq(aptitudeResults.id, result.id)), "aptitude_nurture update");

        emailsSent++;
        processed++;
        console.log(`[Aptitude Nurture] Sent nurture email to ${result.studentEmail}`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`[Aptitude Nurture] Error processing ${result.studentEmail}:`, err);
        errors++;
      }
    }

    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: "success",
        completedAt: new Date(),
        summary: `Processed ${processed}, sent ${emailsSent} nurture emails, ${errors} errors`,
        itemsProcessed: processed,
      });
    }
  } catch (err) {
    console.error("[Aptitude Nurture] Fatal error:", err);
    if (runLog) {
      await updateAgentRunLog(runLog.id, {
        status: "failed",
        completedAt: new Date(),
        summary: `Fatal error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    errors++;
  }

  return { processed, emailsSent, errors };
}

function buildNurtureEmail(params: {
  studentName: string; hollandCode: string;
  primaryType: { name: string; careers: string[]; programs: string[] };
  secondaryType: { name: string; careers: string[]; programs: string[] };
  countries: string[]; aiRecommendation: string;
}): string {
  const { studentName, hollandCode, primaryType, secondaryType, countries, aiRecommendation } = params;
  return `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#e53e3e,#c53030);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">🎯 Hasil Tes Bakat Kamu</h1>
        <p style="color:#fed7d7;margin:8px 0 0;">Rekomendasi Personal dari SpecTa Education</p>
      </div>
      <div style="padding:30px;background:#fff;">
        <p style="font-size:16px;color:#2d3748;">Hai <strong>${studentName}</strong>! 👋</p>
        <p style="color:#4a5568;line-height:1.6;">Terima kasih sudah menyelesaikan Tes Bakat AI SpecTa! Berikut profil bakat kamu:</p>
        <div style="background:#f7fafc;border:2px solid #e53e3e;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
          <p style="color:#718096;margin:0 0 8px;font-size:14px;">Kode Holland Kamu</p>
          <div style="font-size:36px;font-weight:bold;color:#e53e3e;letter-spacing:8px;">${hollandCode}</div>
          <p style="color:#4a5568;margin:8px 0 0;font-size:14px;">${primaryType.name} • ${secondaryType.name}</p>
        </div>
        <div style="background:#fffaf0;border-left:4px solid #ed8936;padding:16px;border-radius:0 8px 8px 0;margin:20px 0;">
          <p style="font-weight:600;color:#c05621;margin:0 0 8px;">💡 Rekomendasi AI untuk Kamu:</p>
          <p style="color:#4a5568;line-height:1.6;margin:0;">${aiRecommendation}</p>
        </div>
        <h3 style="color:#2d3748;margin:24px 0 12px;">📚 Program Studi yang Cocok:</h3>
        <div style="margin-bottom:20px;">
          ${primaryType.programs.map(p => `<span style="background:#fed7d7;color:#c53030;padding:6px 14px;border-radius:20px;font-size:13px;display:inline-block;margin:2px;">${p}</span>`).join("")}
          ${secondaryType.programs.slice(0, 2).map(p => `<span style="background:#fefcbf;color:#975a16;padding:6px 14px;border-radius:20px;font-size:13px;display:inline-block;margin:2px;">${p}</span>`).join("")}
        </div>
        <h3 style="color:#2d3748;margin:24px 0 12px;">🌍 Negara & Universitas Rekomendasi:</h3>
        ${countries.map(c => `<div style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#4a5568;">✈️ ${c}</div>`).join("")}
        <div style="text-align:center;margin:30px 0 20px;">
          <p style="color:#4a5568;margin-bottom:16px;">Mau tau lebih detail? Konsultasi GRATIS dengan counselor SpecTa!</p>
          <a href="https://www.spectaeducation.com/contact" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">📞 Konsultasi Gratis Sekarang</a>
        </div>
        <div style="text-align:center;margin:20px 0;">
          <a href="https://wa.me/62818668277?text=Halo%20SpecTa%2C%20saya%20${encodeURIComponent(studentName)}%20ingin%20konsultasi%20tentang%20hasil%20tes%20bakat%20saya%20(${hollandCode})" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">💬 Chat via WhatsApp</a>
        </div>
      </div>
      <div style="background:#f7fafc;padding:20px;text-align:center;border-radius:0 0 12px 12px;">
        <p style="color:#a0aec0;font-size:12px;margin:0;">SpecTa Education — Indonesia's First AI-Powered Study Abroad Platform</p>
        <p style="color:#a0aec0;font-size:12px;margin:4px 0 0;">Jl. Pluit Karang Ayu Blok B5 Utara No.3, Jakarta Utara</p>
      </div>
    </div>`;
}
