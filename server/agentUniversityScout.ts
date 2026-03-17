/**
 * Agent 4 — University Partner Scout
 * 
 * Responsibilities:
 * 1. Search for new university partnership opportunities across 5 countries
 * 2. Identify universities without Indonesian agents/partners
 * 3. Find partnership contact emails and key decision makers
 * 4. Draft outreach email templates for each university
 * 5. Track partnership pipeline (identified → contacted → negotiating → signed)
 * 6. Report new opportunities to admin
 */

import { invokeLLM } from "./_core/llm";
import {
  createAgentRunLog,
  updateAgentRunLog,
  updateAgentConfig,
} from "./db";
import { sendEmail } from "./email";
import {
  universityPartnerships,
} from "../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  try { return drizzle(process.env.DATABASE_URL); } catch { return null; }
}

// ==========================================
// Target Countries and University Types
// ==========================================
const TARGET_COUNTRIES = [
  {
    country: "Australia",
    regions: ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "ACT", "Northern Territory"],
    universityTypes: ["Group of Eight", "Australian Technology Network", "Innovative Research Universities", "Regional Universities Network", "Private Universities", "TAFE Institutes"],
    existingPartners: ["University of Melbourne", "UNSW", "Monash University", "University of Sydney"],
  },
  {
    country: "United Kingdom",
    regions: ["England", "Scotland", "Wales", "Northern Ireland"],
    universityTypes: ["Russell Group", "Red Brick Universities", "Plate Glass Universities", "Post-1992 Universities", "Specialist Institutions"],
    existingPartners: [],
  },
  {
    country: "Ireland",
    regions: ["Dublin", "Cork", "Galway", "Limerick"],
    universityTypes: ["National Universities", "Technological Universities", "Institutes of Technology"],
    existingPartners: [],
  },
  {
    country: "Canada",
    regions: ["Ontario", "British Columbia", "Alberta", "Quebec", "Manitoba", "Saskatchewan", "Nova Scotia"],
    universityTypes: ["U15 Group", "Comprehensive Universities", "Primarily Undergraduate", "Colleges"],
    existingPartners: [],
  },
  {
    country: "New Zealand",
    regions: ["Auckland", "Wellington", "Canterbury", "Otago", "Waikato"],
    universityTypes: ["Universities", "Polytechnics", "Private Training Establishments"],
    existingPartners: [],
  },
];

// ==========================================
// Main Agent Runner
// ==========================================
export async function runUniversityScoutAgent(): Promise<{
  universitiesScanned: number;
  newOpportunities: number;
  outreachDrafted: number;
  errors: number;
}> {
  const runLog = await createAgentRunLog({
    agentName: "university_scout",
    status: "running",
    startedAt: new Date(),
  });

  let universitiesScanned = 0;
  let newOpportunities = 0;
  let outreachDrafted = 0;
  let errors = 0;

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Rotate through countries — do one country per run to spread API calls
    const runCount = await db.select({ count: sql<number>`count(*)` })
      .from(universityPartnerships);
    const countryIndex = (runCount[0]?.count || 0) % TARGET_COUNTRIES.length;
    const targetCountry = TARGET_COUNTRIES[countryIndex];

    // Task 1: Scout universities in the target country
    const opportunities = await scoutUniversities(targetCountry, db);
    universitiesScanned = opportunities.length;

    // Task 2: For new opportunities, research email + draft outreach emails
    for (const opp of opportunities) {
      try {
        if (opp.isNew) {
          newOpportunities++;
          
          // Step 2a: Research the agent recruitment email
          const emailResult = await researchAgentRecruitmentEmail(opp);
          if (emailResult) {
            await db.update(universityPartnerships)
              .set({ 
                agentRecruitmentEmail: emailResult.email,
                outreachRecipientEmail: emailResult.email,
              })
              .where(eq(universityPartnerships.id, opp.dbId));
            console.log(`[University Scout] Found email for ${opp.name}: ${emailResult.email} (${emailResult.source})`);
          } else {
            console.warn(`[University Scout] No email found for ${opp.name} — will skip approval`);
          }
          
          // Step 2b: Draft the outreach email
          const draft = await draftOutreachEmail(opp);
          if (draft) {
            // Also generate a subject line
            const subject = `Partnership Inquiry — SpecTa Education, Indonesia's First AI-Powered Study Abroad Platform | ${opp.name}`;
            await db.update(universityPartnerships)
              .set({ 
                outreachEmailDraft: draft,
                outreachEmailSubject: subject,
                outreachStatus: "draft_ready",
              })
              .where(eq(universityPartnerships.id, opp.dbId));
            outreachDrafted++;

            // Step 2c: Immediately submit for approval — no manual button needed
            try {
              await submitDraftForApproval(opp.dbId);
              console.log(`[University Scout] Sent approval email for ${opp.name}`);
            } catch (approvalErr) {
              console.warn(`[University Scout] Could not send approval for ${opp.name}:`, approvalErr);
            }
          }
        }
      } catch (err) {
        console.error(`[University Scout] Error processing ${opp.name}:`, err);
        errors++;
      }
    }

    // Task 3: approvalsSent = outreachDrafted (each draft immediately submitted above)
    const approvalsSent = outreachDrafted;

    // Task 5: Send opportunity report to admin
    if (newOpportunities > 0) {
      await sendOpportunityReport(targetCountry.country, opportunities, newOpportunities, outreachDrafted);
    }

    const summary = `Scanned ${universitiesScanned} universities in ${targetCountry.country}, found ${newOpportunities} new opportunities, drafted ${outreachDrafted} outreach emails, ${approvalsSent} sent for approval`;

    await updateAgentRunLog(runLog!.id, {
      status: "success",
      completedAt: new Date(),
      summary,
      itemsProcessed: universitiesScanned,
      itemsSucceeded: newOpportunities,
      itemsFailed: errors,
    });

    await updateAgentConfig("university_scout", {
      lastRunAt: new Date(),
    });

    console.log(`[University Scout] ${summary}`);
  } catch (err) {
    console.error("[University Scout] Fatal error:", err);
    errors++;
    await updateAgentRunLog(runLog!.id, {
      status: "failed",
      completedAt: new Date(),
      summary: `Fatal error: ${err instanceof Error ? err.message : String(err)}`,
      itemsFailed: errors,
    });
    await updateAgentConfig("university_scout", {
      lastRunAt: new Date(),
    });
  }

  return { universitiesScanned, newOpportunities, outreachDrafted, errors };
}

// ==========================================
// Scout Universities in a Country
// ==========================================
async function scoutUniversities(
  targetCountry: typeof TARGET_COUNTRIES[0],
  db: any
): Promise<Array<{
  name: string;
  website: string;
  country: string;
  region: string;
  type: string;
  ranking: number;
  programs: string[];
  contactEmail: string;
  contactName: string;
  contactRole: string;
  partnershipPotential: string;
  notes: string;
  isNew: boolean;
  dbId: number;
}>> {
  const results: any[] = [];

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a university partnership scout for SpecTa Education, an Indonesian education consultancy. Your job is to identify universities in ${targetCountry.country} that would be good partnership targets.

Focus on:
- Universities that actively recruit international students, especially from Southeast Asia
- Universities with strong programs in business, engineering, IT, health sciences, and hospitality
- Universities that offer scholarships for international students
- Universities with reasonable tuition fees for Indonesian students
- Universities that may not yet have strong Indonesian agent representation

Existing partners to EXCLUDE: ${targetCountry.existingPartners.join(", ") || "None yet"}

Return JSON with an array of 5-8 university opportunities. Each should have:
- name: university name
- website: university website URL
- region: state/region within the country
- type: university type/category
- ranking: approximate national ranking (number)
- popularPrograms: array of 3-5 popular programs for Indonesian students
- internationalOfficeEmail: likely international office email
- contactName: likely key contact person name
- contactRole: their role
- partnershipPotential: "high"|"medium"|"low"
- reasonForRecommendation: why this university is a good target
- estimatedIndonesianStudents: approximate number of current Indonesian students`
        },
        {
          role: "user",
          content: `Scout universities in ${targetCountry.country} for partnership opportunities.
Country: ${targetCountry.country}
Regions to cover: ${targetCountry.regions.join(", ")}
University types: ${targetCountry.universityTypes.join(", ")}
Existing partners to exclude: ${targetCountry.existingPartners.join(", ") || "None"}
Date: ${new Date().toLocaleDateString("en-US")}

Find 5-8 universities that would be good partnership targets for SpecTa Education.`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "university_opportunities",
          strict: true,
          schema: {
            type: "object",
            properties: {
              universities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    website: { type: "string" },
                    region: { type: "string" },
                    type: { type: "string" },
                    ranking: { type: "number" },
                    popularPrograms: { type: "array", items: { type: "string" } },
                    internationalOfficeEmail: { type: "string" },
                    contactName: { type: "string" },
                    contactRole: { type: "string" },
                    partnershipPotential: { type: "string" },
                    reasonForRecommendation: { type: "string" },
                    estimatedIndonesianStudents: { type: "number" },
                  },
                  required: ["name", "website", "region", "type", "ranking", "popularPrograms", "internationalOfficeEmail", "contactName", "contactRole", "partnershipPotential", "reasonForRecommendation", "estimatedIndonesianStudents"],
                  additionalProperties: false,
                },
              },
            },
            required: ["universities"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content as string | undefined;
    if (!content) return results;

    const parsed = JSON.parse(content);
    const universities = parsed.universities || [];

    for (const uni of universities) {
      try {
        // Check if already in database
        const existing = await db.select()
          .from(universityPartnerships)
          .where(eq(universityPartnerships.universityName, uni.name))
          .limit(1);

        const isNew = existing.length === 0;
        const validPotential = ["high", "medium", "low"].includes(uni.partnershipPotential)
          ? uni.partnershipPotential : "medium";

        if (isNew) {
          const [inserted] = await db.insert(universityPartnerships).values({
            universityName: uni.name,
            universityWebsite: uni.website,
            country: targetCountry.country,
            region: uni.region,
            universityType: uni.type,
            ranking: uni.ranking,
            popularPrograms: JSON.stringify(uni.popularPrograms),
            contactEmail: uni.internationalOfficeEmail,
            contactName: uni.contactName,
            contactRole: uni.contactRole,
            partnershipPotential: validPotential as any,
            reasonForRecommendation: uni.reasonForRecommendation,
            estimatedIndonesianStudents: uni.estimatedIndonesianStudents,
            status: "identified" as any,
            source: "ai_scout",
          });

          results.push({
            name: uni.name,
            website: uni.website,
            country: targetCountry.country,
            region: uni.region,
            type: uni.type,
            ranking: uni.ranking,
            programs: uni.popularPrograms,
            contactEmail: uni.internationalOfficeEmail,
            contactName: uni.contactName,
            contactRole: uni.contactRole,
            partnershipPotential: uni.partnershipPotential,
            notes: uni.reasonForRecommendation,
            isNew: true,
            dbId: inserted.insertId,
          });
        } else {
          results.push({
            name: uni.name,
            website: uni.website,
            country: targetCountry.country,
            region: uni.region,
            type: uni.type,
            ranking: uni.ranking,
            programs: uni.popularPrograms,
            contactEmail: uni.internationalOfficeEmail,
            contactName: uni.contactName,
            contactRole: uni.contactRole,
            partnershipPotential: uni.partnershipPotential,
            notes: uni.reasonForRecommendation,
            isNew: false,
            dbId: existing[0].id,
          });
        }
      } catch (err) {
        console.error(`[University Scout] Error processing ${uni.name}:`, err);
      }
    }
  } catch (err) {
    console.error("[University Scout] Error scouting universities:", err);
  }

  return results;
}

// ==========================================
// Research Agent Recruitment Email
// ==========================================
async function researchAgentRecruitmentEmail(opportunity: any): Promise<{ email: string; source: string } | null> {
  try {
    // Use LLM to determine the most likely agent recruitment email based on university patterns
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert at finding university agent recruitment email addresses.

Most universities have standard email patterns for their international agent recruitment offices:
- agents@university.edu.au (Australia)
- international-agents@university.edu.au
- agentmanagement@university.edu.au
- agent.support@university.edu.au
- internationalagents@university.edu.au
- gi-agent@university.edu.au (Griffith pattern)
- agent.partnerships@university.edu.nz (NZ)
- international@university.ie (Ireland)
- agents@university.ie
- international.office@university.ie

Common patterns by country:
- Australia: Usually agents@, international-agents@, or agentmanagement@ with .edu.au domain
- New Zealand: Usually international@, agents@, or agent.partnerships@ with .ac.nz domain  
- Ireland: Usually international@, agents@, or admissions.international@ with .ie domain
- UK: Usually agents@, international.agents@, or partnerships@ with .ac.uk domain
- Canada: Usually agents@, international.agents@, or recruitment@ with .ca domain

Return a JSON object with:
- "email": the most likely agent recruitment email address
- "source": "pattern_based" (this is an educated guess based on known patterns)
- "confidence": "high", "medium", or "low"
- "alternatives": array of 2-3 alternative email addresses to try

IMPORTANT: Use the actual university domain from their website URL.`
        },
        {
          role: "user",
          content: `Find the agent recruitment email for:
University: ${opportunity.name}
Website: ${opportunity.website}
Country: ${opportunity.country}
Contact person: ${opportunity.contactName || 'Unknown'}
Contact role: ${opportunity.contactRole || 'International Office'}

Return JSON with the most likely agent recruitment email.`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "agent_email",
          strict: true,
          schema: {
            type: "object",
            properties: {
              email: { type: "string", description: "Most likely agent recruitment email" },
              source: { type: "string", description: "How the email was determined" },
              confidence: { type: "string", description: "Confidence level" },
              alternatives: { type: "array", items: { type: "string" }, description: "Alternative emails" }
            },
            required: ["email", "source", "confidence", "alternatives"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices?.[0]?.message?.content as string;
    if (!content) return null;
    
    const parsed = JSON.parse(content);
    if (parsed.email && parsed.email.includes("@")) {
      return { email: parsed.email, source: `${parsed.source} (${parsed.confidence} confidence)` };
    }
    return null;
  } catch (err) {
    console.error(`[University Scout] Error researching email for ${opportunity.name}:`, err);
    return null;
  }
}

// ==========================================
// Draft Outreach Email
// ==========================================
async function draftOutreachEmail(opportunity: any): Promise<string | null> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are drafting a professional partnership outreach email from SpecTa Education to a university's international office.

About SpecTa Education:
- Founded in 2005, one of Indonesia's most established education consultancies with 20+ years of experience
- Recently launched SpecTa 2.0 — Indonesia's FIRST and ONLY AI-powered education consultancy platform
- 3 branches across Jakarta: Kelapa Gading (Head Office), PIK, and Gading Serpong
- 691+ students successfully placed at universities worldwide
- 6,000+ IELTS students trained since 2005
- 4.9/5.0 Google rating with 276+ reviews across all branches
- 50+ existing university partnerships globally
- 10 destination countries: Australia, UK, USA, Canada, NZ, Singapore, Malaysia, China, Ireland, Netherlands

SpecTa 2.0 AI Platform Features (EMPHASIZE THESE — this is what makes us unique):
1. AI Aptitude Test — RIASEC + Multiple Intelligence assessment that matches students to ideal programs and universities
2. AI Chatbot "Ask SpecTa" — 24/7 multilingual AI advisor trained on all university data
3. AI-Powered IELTS Practice Tests — Adaptive mock tests with AI scoring and personalized feedback
4. University Comparison Tool — AI-driven side-by-side comparison of universities
5. Scholarship Finder — AI-matched scholarship recommendations based on student profiles
6. Study Abroad Simulator — Interactive tool showing estimated costs, timelines, and requirements
7. Track My Application — Real-time application status portal for students and parents

Why this matters for universities:
- Our AI platform pre-qualifies students before referral, meaning higher conversion rates
- Students arrive better prepared and better matched to programs
- Our technology provides data-driven insights on Indonesian student demand
- We can provide universities with market intelligence on Indonesian student preferences

The email MUST:
- Be professional, warm, and confident
- Lead with SpecTa 2.0 as the differentiator
- Highlight that we are likely the only Indonesian agency with a full AI platform
- Mention specific mutual benefits
- Reference our track record (20+ years, 691+ placements, 4.9/5.0 rating)
- Include a clear call to action for a meeting or call
- Be concise (under 350 words)

CRITICAL RULES — MUST FOLLOW:
1. NEVER use placeholders like [Your Name], [Your Title], [Your Phone], [Your Website], [Your Email], or any text in square brackets. This is a REAL email being sent.
2. ALWAYS end with this EXACT signature block (copy it verbatim):

Best regards,
Hadi Jito Thian
Founder & CEO, SpecTa Education
hadi@spectaeducation.com | WhatsApp: +62 818 668 277
www.spectaeducation.com

Return just the email body text (no subject line, no HTML). Use proper line breaks.`
        },
        {
          role: "user",
          content: `Draft an outreach email to:
University: ${opportunity.name}
Contact: ${opportunity.contactName} (${opportunity.contactRole})
Country: ${opportunity.country}
Region: ${opportunity.region}
Programs of interest: ${opportunity.programs?.join(", ")}
Why we're interested: ${opportunity.notes}

Draft the partnership outreach email emphasizing SpecTa 2.0 AI platform.`
        }
      ],
    });

    return (response.choices?.[0]?.message?.content as string) || null;
  } catch (err) {
    console.error("[University Scout] Error drafting outreach:", err);
    return null;
  }
}

// ==========================================
// Send Opportunity Report Email
// ==========================================
async function sendOpportunityReport(
  country: string,
  opportunities: any[],
  newCount: number,
  draftedCount: number
): Promise<void> {
  try {
    const newOpps = opportunities.filter(o => o.isNew);

    const oppRows = newOpps.map(opp => `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:10px;font-size:13px;font-weight:600;">${opp.name}</td>
        <td style="padding:10px;font-size:13px;">${opp.region}</td>
        <td style="padding:10px;font-size:13px;">#${opp.ranking}</td>
        <td style="padding:10px;font-size:13px;">
          <span style="background:${opp.partnershipPotential === "high" ? "#16a34a" : opp.partnershipPotential === "medium" ? "#dd6b20" : "#999"};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">${opp.partnershipPotential}</span>
        </td>
        <td style="padding:10px;font-size:13px;">${opp.programs?.slice(0, 3).join(", ")}</td>
        <td style="padding:10px;font-size:13px;">${opp.contactEmail}</td>
      </tr>`
    ).join("");

    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "short" });

    await sendEmail({
      to: "hadi@spectaeducation.com",
      subject: `🎓 University Scout: ${newCount} new partnership opportunities in ${country}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#e53e3e;margin:0;">SpecTa Education</h2>
        <p style="color:#666;margin:4px 0 0;">🎓 University Partner Scout — ${country}</p>
        <p style="color:#999;font-size:12px;">${now}</p>
      </div>

      <div style="display:flex;gap:16px;margin:20px 0;">
        <div style="flex:1;background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#2563eb;">${opportunities.length}</div>
          <div style="font-size:12px;color:#666;">Universities Scanned</div>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#16a34a;">${newCount}</div>
          <div style="font-size:12px;color:#666;">New Opportunities</div>
        </div>
        <div style="flex:1;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#e53e3e;">${draftedCount}</div>
          <div style="font-size:12px;color:#666;">Outreach Drafts Ready</div>
        </div>
      </div>

      <h3 style="color:#1a1a1a;margin:24px 0 12px;">🆕 New Partnership Opportunities</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">University</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">Region</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">Rank</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">Potential</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">Programs</th>
            <th style="padding:10px;text-align:left;font-size:12px;color:#666;">Contact</th>
          </tr>
        </thead>
        <tbody>${oppRows}</tbody>
      </table>

      <p style="font-size:13px;color:#666;margin:16px 0;">
        <strong>Next steps:</strong> Review the opportunities in the Agent Command Center. Outreach email drafts are ready — you can review and send them directly from the dashboard.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="https://www.spectaeducation.com/admin/agents" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">View Opportunities</a>
      </div>
      <div style="text-align:center;color:#999;font-size:12px;margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
        <p>© ${new Date().getFullYear()} SpecTa Education AI Agent System</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    });

    console.log(`[University Scout] Opportunity report sent for ${country}`);
  } catch (err) {
    console.error("[University Scout] Error sending report:", err);
  }
}

// ==========================================
// Process Existing Universities (Manual Trigger)
// Handles universities stuck at "identified" status
// ==========================================
export async function processExistingUniversities(): Promise<{
  processed: number;
  emailsFound: number;
  draftsGenerated: number;
  approvalsSent: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) return { processed: 0, emailsFound: 0, draftsGenerated: 0, approvalsSent: 0, errors: ["Database not available"] };

  const errorList: string[] = [];
  let emailsFound = 0;
  let draftsGenerated = 0;

  // Find all universities that haven't been processed yet
  const pendingUniversities = await db.select().from(universityPartnerships)
    .where(
      and(
        eq(universityPartnerships.approvalStatus, "pending_draft"),
      )
    );

  console.log(`[University Scout] Processing ${pendingUniversities.length} pending universities...`);

  for (const uni of pendingUniversities) {
    const uniName = (uni as any).universityName;
    const uniId = uni.id;

    try {
      // Step 1: Research agent recruitment email if not already found
      if (!(uni as any).agentRecruitmentEmail && !(uni as any).outreachRecipientEmail) {
        const emailResult = await researchAgentRecruitmentEmail({
          name: uniName,
          website: (uni as any).websiteUrl || "",
          country: (uni as any).country,
          contactName: (uni as any).contactPersonName,
          contactRole: (uni as any).contactPersonTitle,
        });

        if (emailResult) {
          await db.update(universityPartnerships)
            .set({
              agentRecruitmentEmail: emailResult.email,
              outreachRecipientEmail: emailResult.email,
            })
            .where(eq(universityPartnerships.id, uniId));
          emailsFound++;
          console.log(`[University Scout] Found email for ${uniName}: ${emailResult.email}`);
        } else {
          errorList.push(`No email found for ${uniName}`);
          continue; // Skip this university — can't send without email
        }
      } else {
        emailsFound++; // Already has email
      }

      // Step 2: Generate outreach email draft if not already done
      if (!(uni as any).outreachEmailDraft) {
        const draft = await draftOutreachEmail({
          name: uniName,
          website: (uni as any).websiteUrl || "",
          country: (uni as any).country,
          region: (uni as any).city || "",
          programs: (uni as any).popularPrograms ? JSON.parse((uni as any).popularPrograms) : [],
          contactName: (uni as any).contactPersonName,
          contactRole: (uni as any).contactPersonTitle,
          notes: (uni as any).notes || "",
        });

        if (draft) {
          const subject = `Partnership Inquiry \u2014 SpecTa Education, Indonesia's First AI-Powered Study Abroad Platform | ${uniName}`;
          await db.update(universityPartnerships)
            .set({
              outreachEmailDraft: draft,
              outreachEmailSubject: subject,
            })
            .where(eq(universityPartnerships.id, uniId));
          draftsGenerated++;
          console.log(`[University Scout] Generated draft for ${uniName}`);
        } else {
          errorList.push(`Failed to generate draft for ${uniName}`);
          continue;
        }
      } else {
        draftsGenerated++; // Already has draft
      }

      // Step 3: Update status to draft_ready
      await db.update(universityPartnerships)
        .set({ outreachStatus: "draft_ready" })
        .where(eq(universityPartnerships.id, uniId));

    } catch (err) {
      const msg = `Error processing ${uniName}: ${err instanceof Error ? err.message : String(err)}`;
      errorList.push(msg);
      console.error(`[University Scout] ${msg}`);
    }
  }

  // Step 4: Submit all draft_ready for approval
  let approvalsSent = 0;
  try {
    approvalsSent = await submitAllDraftsForApproval();
    console.log(`[University Scout] Submitted ${approvalsSent} drafts for admin approval`);
  } catch (err) {
    errorList.push(`Failed to submit approvals: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Send summary report to admin
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta", dateStyle: "full", timeStyle: "short" });
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `\ud83d\udce7 University Scout: ${pendingUniversities.length} universities processed, ${approvalsSent} ready for approval`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <h2 style="color:#e53e3e;text-align:center;">University Scout Report</h2>
      <p style="color:#999;text-align:center;font-size:12px;">${now}</p>
      
      <div style="display:flex;gap:12px;margin:20px 0;">
        <div style="flex:1;background:#eff6ff;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#2563eb;">${pendingUniversities.length}</div>
          <div style="font-size:11px;color:#666;">Processed</div>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#16a34a;">${emailsFound}</div>
          <div style="font-size:11px;color:#666;">Emails Found</div>
        </div>
        <div style="flex:1;background:#fefce8;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#ca8a04;">${draftsGenerated}</div>
          <div style="font-size:11px;color:#666;">Drafts Ready</div>
        </div>
        <div style="flex:1;background:#fef2f2;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:#e53e3e;">${approvalsSent}</div>
          <div style="font-size:11px;color:#666;">Awaiting Approval</div>
        </div>
      </div>

      ${errorList.length > 0 ? `
      <h3 style="color:#dc2626;">Issues (${errorList.length})</h3>
      <ul style="font-size:13px;color:#666;">
        ${errorList.map(e => `<li>${e}</li>`).join("")}
      </ul>` : ""}

      <p style="font-size:13px;color:#666;">Check your inbox for individual approval emails. Click Approve to send the outreach email, or Reject to skip.</p>
      
      <div style="text-align:center;margin:20px 0;">
        <a href="https://www.spectaeducation.com/admin/agents" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;">View in Command Center</a>
      </div>
    </div>
  </div>
</body>
</html>`,
  });

  return {
    processed: pendingUniversities.length,
    emailsFound,
    draftsGenerated,
    approvalsSent,
    errors: errorList,
  };
}

// ==========================================
// Get partnership pipeline for dashboard
// ==========================================
export async function getPartnershipPipeline(): Promise<{
  totalIdentified: number;
  totalContacted: number;
  totalNegotiating: number;
  totalSigned: number;
  byCountry: Record<string, number>;
  recentOpportunities: any[];
}> {
  const db = await getDb();
  if (!db) return { totalIdentified: 0, totalContacted: 0, totalNegotiating: 0, totalSigned: 0, byCountry: {}, recentOpportunities: [] };

  const all = await db.select().from(universityPartnerships).orderBy(desc(universityPartnerships.createdAt));

  const totalIdentified = all.filter((a: any) => a.status === "identified").length;
  const totalContacted = all.filter((a: any) => a.status === "contacted").length;
  const totalNegotiating = all.filter((a: any) => a.status === "negotiating").length;
  const totalSigned = all.filter((a: any) => a.status === "signed").length;

  const byCountry: Record<string, number> = {};
  for (const uni of all) {
    const country = (uni as any).country || "Unknown";
    byCountry[country] = (byCountry[country] || 0) + 1;
  }

  return {
    totalIdentified,
    totalContacted,
    totalNegotiating,
    totalSigned,
    byCountry,
    recentOpportunities: all.slice(0, 20),
  };
}

// ==========================================
// PARTNERSHIP OUTREACH APPROVAL WORKFLOW
// ==========================================

import { sendPartnershipApprovalEmail, sendPartnershipOutreachEmail } from "./email";
import { randomBytes } from "crypto";

const ADMIN_EMAIL = "hadi@spectaeducation.com";
const BASE_URL = "https://www.spectaeducation.com";

/**
 * Submit a single draft for admin approval — sends approval email to Hadi
 */
export async function submitDraftForApproval(partnershipId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the partnership record
  const [partnership] = await db.select().from(universityPartnerships)
    .where(eq(universityPartnerships.id, partnershipId));

  if (!partnership) throw new Error("Partnership not found");

  // Determine recipient email (check all possible fields)
  const recipientEmail = (partnership as any).outreachRecipientEmail
    || (partnership as any).agentRecruitmentEmail 
    || (partnership as any).internationalOfficeEmail;

  if (!recipientEmail) {
    console.warn(`[University Scout] No recipient email for ${(partnership as any).universityName} — skipping approval`);
    return; // Skip silently instead of throwing
  }

  // Parse the draft email
  let emailSubject = (partnership as any).outreachEmailSubject || "";
  let emailBody = (partnership as any).outreachEmailDraft || "";

  // If no subject/body, generate one
  if (!emailSubject || !emailBody) {
    const generated = await generateOutreachEmail(partnership);
    emailSubject = generated.subject;
    emailBody = generated.body;
  }

  // Generate approval token
  const approvalToken = randomBytes(32).toString("hex");

  // Update the record
  await db.update(universityPartnerships)
    .set({
      outreachEmailSubject: emailSubject,
      outreachEmailDraft: emailBody,
      outreachRecipientEmail: recipientEmail,
      approvalStatus: "pending_approval",
      approvalToken,
      approvalRequestedAt: new Date(),
    })
    .where(eq(universityPartnerships.id, partnershipId));

  // Build action URLs
  const approveUrl = `${BASE_URL}/api/partnership-approval?action=approve&id=${partnershipId}&token=${approvalToken}`;
  const rejectUrl = `${BASE_URL}/api/partnership-approval?action=reject&id=${partnershipId}&token=${approvalToken}`;
  const editUrl = `${BASE_URL}/admin/agents?tab=partnerships&edit=${partnershipId}`;

  // Send approval email to admin
  await sendPartnershipApprovalEmail({
    to: ADMIN_EMAIL,
    universityName: (partnership as any).universityName,
    country: (partnership as any).country,
    recipientEmail,
    contactPerson: (partnership as any).contactPersonName || undefined,
    contactTitle: (partnership as any).contactPersonTitle || undefined,
    emailSubject,
    emailBody,
    partnershipScore: (partnership as any).partnershipScore || undefined,
    priority: (partnership as any).priority || undefined,
    worldRanking: (partnership as any).worldRanking || undefined,
    approveUrl,
    rejectUrl,
    editUrl,
  });

  console.log(`[University Scout] Sent approval request for ${(partnership as any).universityName} to ${ADMIN_EMAIL}`);
}

/**
 * Submit all draft_ready partnerships for approval
 */
export async function submitAllDraftsForApproval(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Find all partnerships with draft_ready status that haven't been submitted yet
  const drafts = await db.select().from(universityPartnerships)
    .where(
      and(
        eq(universityPartnerships.outreachStatus, "draft_ready"),
        eq(universityPartnerships.approvalStatus, "pending_draft"),
      )
    );

  let submitted = 0;
  for (const draft of drafts) {
    try {
      await submitDraftForApproval(draft.id);
      submitted++;
    } catch (err) {
      console.error(`[University Scout] Failed to submit draft for ${(draft as any).universityName}:`, err);
    }
  }

  console.log(`[University Scout] Submitted ${submitted} drafts for approval`);
  return submitted;
}

/**
 * Approve and send the outreach email to the university
 */
export async function approveAndSendOutreach(partnershipId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [partnership] = await db.select().from(universityPartnerships)
    .where(eq(universityPartnerships.id, partnershipId));

  if (!partnership) throw new Error("Partnership not found");

  const recipientEmail = (partnership as any).outreachRecipientEmail
    || (partnership as any).agentRecruitmentEmail
    || (partnership as any).internationalOfficeEmail;
  const subject = (partnership as any).outreachEmailSubject;
  const body = (partnership as any).outreachEmailDraft;

  if (!recipientEmail || !subject || !body) {
    throw new Error("Missing email details — recipient, subject, or body is empty");
  }

  // Send the actual outreach email
  const sent = await sendPartnershipOutreachEmail({
    to: recipientEmail,
    subject,
    body,
  });

  if (!sent) {
    await db.update(universityPartnerships)
      .set({ approvalStatus: "failed" })
      .where(eq(universityPartnerships.id, partnershipId));
    throw new Error("Failed to send outreach email");
  }

  // Update status
  await db.update(universityPartnerships)
    .set({
      approvalStatus: "sent",
      approvedAt: new Date(),
      outreachStatus: "email_sent",
      outreachSentAt: new Date(),
    })
    .where(eq(universityPartnerships.id, partnershipId));

  // Notify admin of successful send
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `✅ Outreach Sent: ${(partnership as any).universityName}`,
    html: `<p>The partnership outreach email to <strong>${(partnership as any).universityName}</strong> (${recipientEmail}) has been sent successfully.</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p>You can track the response in the <a href="${BASE_URL}/admin/agents">Agent Command Center</a>.</p>`,
  });

  console.log(`[University Scout] Outreach email sent to ${recipientEmail} for ${(partnership as any).universityName}`);
}

/**
 * Reject an outreach draft
 */
export async function rejectOutreach(partnershipId: number, reason?: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(universityPartnerships)
    .set({
      approvalStatus: "rejected",
      rejectedAt: new Date(),
      rejectionReason: reason || "Rejected by admin",
    })
    .where(eq(universityPartnerships.id, partnershipId));

  console.log(`[University Scout] Outreach rejected for partnership #${partnershipId}: ${reason || "No reason given"}`);
}

/**
 * Handle approval action from email link (token-based)
 */
export async function handleApprovalAction(
  action: "approve" | "reject",
  partnershipId: number,
  token: string,
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  const [partnership] = await db.select().from(universityPartnerships)
    .where(
      and(
        eq(universityPartnerships.id, partnershipId),
        eq(universityPartnerships.approvalToken, token),
      )
    );

  if (!partnership) {
    return { success: false, message: "Invalid or expired approval link" };
  }

  if ((partnership as any).approvalStatus === "sent") {
    return { success: false, message: "This outreach has already been sent" };
  }

  if ((partnership as any).approvalStatus === "rejected") {
    return { success: false, message: "This outreach has already been rejected" };
  }

  if (action === "approve") {
    try {
      await approveAndSendOutreach(partnershipId);
      return { success: true, message: `Outreach email sent to ${(partnership as any).universityName}!` };
    } catch (err: any) {
      return { success: false, message: `Failed to send: ${err.message}` };
    }
  } else {
    await rejectOutreach(partnershipId, "Rejected via email link");
    return { success: true, message: `Outreach to ${(partnership as any).universityName} has been rejected.` };
  }
}

/**
 * Generate outreach email using AI
 */
async function generateOutreachEmail(partnership: any): Promise<{ subject: string; body: string }> {
  const prompt = `Write a professional partnership outreach email from SpecTa Education to ${partnership.universityName} in ${partnership.country}.

About SpecTa Education:
- Founded in 2005, 20+ years as one of Indonesia's most established education consultancies
- Recently launched SpecTa 2.0 — Indonesia's FIRST and ONLY AI-powered education consultancy platform
- 3 branches in Jakarta: Kelapa Gading (Head Office), PIK, Gading Serpong
- 691+ students successfully placed, 6,000+ IELTS students, 4.9/5.0 Google rating (276+ reviews)
- 50+ existing university partnerships, 10 destination countries

SpecTa 2.0 AI Features (EMPHASIZE):
1. AI Aptitude Test (RIASEC + Multiple Intelligence) — matches students to ideal programs
2. AI Chatbot "Ask SpecTa" — 24/7 multilingual advisor
3. AI-Powered IELTS Practice Tests with AI scoring
4. University Comparison Tool — AI-driven side-by-side comparison
5. Scholarship Finder — AI-matched recommendations
6. Study Abroad Simulator — estimated costs, timelines, requirements
7. Track My Application — real-time status portal

Benefits for universities: pre-qualified students, higher conversion, data-driven market intelligence on Indonesian student demand.

${partnership.contactPersonName ? `Contact person: ${partnership.contactPersonName} (${partnership.contactPersonTitle || 'International Office'})` : ''}
${partnership.worldRanking ? `University world ranking: #${partnership.worldRanking}` : ''}
${partnership.popularPrograms ? `Popular programs: ${partnership.popularPrograms}` : ''}

The email MUST:
- Lead with SpecTa 2.0 as the key differentiator
- Be professional, warm, and confident (under 350 words)
- Sign off as: Hadi Jito Thian, Founder & CEO
- Include: hadi@spectaeducation.com | WhatsApp: +62 818 668 277 | www.spectaeducation.com

Return as JSON: { "subject": "...", "body": "..." }
The subject should mention SpecTa Education and AI-Powered Platform.
The body should be plain text (no HTML), with proper line breaks.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a professional business development writer. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "outreach_email",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Email subject line" },
              body: { type: "string", description: "Email body in plain text" },
            },
            required: ["subject", "body"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (content && typeof content === "string") {
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("[University Scout] Failed to generate outreach email:", err);
  }

  // Fallback
  return {
    subject: `Partnership Inquiry — SpecTa Education, Indonesia's First AI-Powered Study Abroad Platform | ${partnership.universityName}`,
    body: `Dear International Partnerships Team,\n\nI am writing from SpecTa Education, Indonesia's first and only AI-powered education consultancy platform. Founded in 2005, we have over 20 years of experience helping Indonesian students pursue their academic goals abroad, with 691+ successful placements and 50+ university partnerships globally.\n\nWe recently launched SpecTa 2.0, our AI-integrated platform featuring an AI Aptitude Test, AI Chatbot advisor, AI-Powered IELTS Practice, University Comparison Tool, Scholarship Finder, and real-time Application Tracker. Our technology pre-qualifies and better prepares students before referral, resulting in higher conversion rates for our partner universities.\n\nWe are very interested in establishing a formal partnership with ${partnership.universityName} to facilitate student recruitment from Indonesia. We believe our AI-driven approach and established track record would be mutually beneficial.\n\nWould you be available for a brief call or virtual meeting to explore partnership opportunities?\n\nBest regards,\nHadi Jito Thian\nFounder & CEO, SpecTa Education\nhadi@spectaeducation.com | WhatsApp: +62 818 668 277\nwww.spectaeducation.com`,
  };
}
