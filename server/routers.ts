import { COOKIE_NAME } from "@shared/const";
import {
  getTasksByStaff, getTodayTasksByStaff, createCrmTask, updateCrmTask, deleteCrmTask,
  getPipelineByStaff, getAllPipelineLeads, upsertLeadPipelineStage, ensurePipelineStagesForCounselor,
  getConsultationNotesByLead, getConsultationNotesByApplication, createConsultationNote,
  getCounselorPerformanceByStaff, getAllCounselorPerformanceLatest, upsertCounselorPerformanceSnapshot,
  getLeadPipelineStage, getNotesByLeadId,
} from "./crmDb";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { generatePdfReport, generateAndUploadPdfReport } from "./pdfGenerator";
import { nanoid } from "nanoid";
import { 
  createConversation, 
  getConversationBySessionId, 
  updateConversation,
  createMessage,
  getMessagesByConversationId,
  createLead,
  createDocument,
  getAllLeads,
  getLeadById,
  updateLead,
  getAllConversations,
  getDocumentsByConversationId,
  getDocumentsByLeadId,
  getAllDocuments,
  createApplication,
  getAllApplications,
  getApplicationById,
  getApplicationByReference,
  getApplicationsByEmail,
  updateApplication,
  generateReferenceNumber,
  createApplicationNote,
  getNotesByApplicationId,
  createApplicationDocument,
  getDocumentsByApplicationId,
  createTrackingToken,
  getTrackingTokenByToken,
  deleteExpiredTokens,
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  getAppointmentsByDate,
  updateAppointment,
  createIeltsPracticeResult,
  getAllIeltsPracticeResults,
  claimPracticeFollowup,
  getIeltsPracticeResultById,
  getIeltsPracticeResultsByEmail,
  createCounselor,
  getAllCounselors,
  getCounselorById,
  updateCounselor,
  deleteCounselor,
  updateCounselorWorkload,
  createQuizResult,
  getAllQuizResults,
  createPersonaResult,
  getAllPersonaResults,
  createScholarshipLead,
  getAllScholarshipLeads,
  updateScholarshipLead,
  getAllApplicationDocuments,
  createStaffAccount,
  getAllStaffAccounts,
  getStaffAccountByEmail,
  getStaffAccountById,
  updateStaffAccount,
  deleteStaffAccount,
  deleteApplication,
  deleteDocument,
  deleteApplicationDocument,
  deleteLead,
  deleteAppointment,
  deleteScholarshipLead,
  deleteConversation,
  getApplicationsByCounselorName,
  getApplicationDocumentsByApplicationId,
  getApplicationNotesByApplicationId,
  getStaffAccountByName,
  createAptitudeResult,
  getAptitudeResultById,
  getAptitudeResultsByEmail,
  getAllAptitudeResults,
  createAccessTokens,
  getAccessTokenByToken,
  markTokenInProgress,
  markTokenCompleted,
  listAccessTokens,
  deleteAccessToken,
  createMatchUniversity,
  getAllMatchUniversities,
  getMatchUniversityById,
  updateMatchUniversity,
  deleteMatchUniversity,
  createMatchProgram,
  getMatchProgramsByUniversityId,
  getAllMatchPrograms,
  getMatchProgramById,
  updateMatchProgram,
  deleteMatchProgram,
  getActiveUniversitiesWithPrograms,
  getCostOfLivingByCountry,
  getCostOfLivingCities,
  getAllCostOfLivingData,
  createCostOfLivingEntry,
  updateCostOfLivingEntry,
  deleteCostOfLivingEntry,
  getAllChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  getUserChecklistProgress,
  toggleChecklistProgress,
  updateChecklistNotes,
  createAptitudeProOrder,
  getAptitudeProOrderByExternalId,
  updateAptitudeProOrderStatus,
  listAptitudeProOrders,
  getAnalyticsKPIs,
  getLeadsOverTime,
  getApplicationPipeline,
  getRevenueOverTime,
  getLeadsBySource,
  getTopCountries,
  getCounselorPerformance,
  getScholarshipLeadsOverTime,
  createDripCampaign,
  getAllDripCampaigns,
  getDripCampaignById,
  updateDripCampaign,
  deleteDripCampaign,
  createDripEmailStep,
  getDripEmailStepsByCampaignId,
  getDripEmailStepById,
  updateDripEmailStep,
  deleteDripEmailStep,
  getDripEnrollmentsByCampaignId,
  getDripEnrollmentByEmailAndCampaign,
  updateDripEnrollment,
  getDripEnrollmentByUnsubscribeToken,
  getDripEmailLogsByEnrollmentId,
  getDripCampaignAnalytics,
  getDripCampaignsWithStats,
  createDripEnrollment,
  getHotLeads,
  getCampaignPerformanceMetrics,
  createSimulatorSession,
  getSimulatorSessionBySessionId,
  updateSimulatorSession,
  getAllSimulatorSessions,
  createSimulatorChoice,
  getChoicesBySessionId,
  createSimulatorResult,
  getSimulatorResultBySessionId,
  updateSimulatorResult,
  getAllSimulatorResults,
  getSimulatorCompletionStats,
  createBlogCategory,
  listBlogCategories,
  updateBlogCategory,
  deleteBlogCategory,
  createBlogTag,
  listBlogTags,
  deleteBlogTag,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogPostBySlug,
  getBlogPostById,
  listBlogPosts,
  listPublishedBlogPosts,
  setPostTags,
  getPostTags,
  createBlogComment,
  getCommentsByPostId,
  getAllBlogComments,
  updateBlogCommentStatus,
  deleteBlogComment,
  getPostRatingSummary,
  getMultiplePostRatings,
  countCommentsByPostId,
  getCrmChatHistory,
  saveCrmChatMessage,
  clearCrmChatHistory,
  getCrmDocsByLead,
  upsertCrmDoc,
  initDefaultDocChecklist,
  updateCrmDocFile,
  updateCrmDocStatus,
  deleteCrmDoc,
  getCrmAppointmentsByLead,
  getCrmAppointmentsByStaff,
  getAllCrmAppointments,
  createCrmAppointment,
  updateCrmAppointment,
  getActivityTimeline,
  logActivity,
  getNotificationsForStaff,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  getApplicationsByLead,
  createStudentApplication,
  updateStudentApplication,
  deleteStudentApplication,
  getLeadSourceAnalytics,
  getTeamChatMessages,
  sendTeamChatMessage,
  deleteTeamChatMessage,
  getUniversities,
  seedUniversitiesIfEmpty,
  getVisaTracking,
  upsertVisaTracking,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { socialMediaRouter } from "./socialMedia";
import { adsAgentRouter } from "./adsAgent";
import { ieltsAdminRouter } from "./ieltsAdminRouter";
import { ieltsRouter } from "./ieltsRouter";
import { crmTeamRouter } from "./crmTeamRouter";
import { crmStudentsRouter } from "./crmStudentsRouter";
import { crmReportsRouter } from "./crmReportsRouter";
import { crmCockpitRouter } from "./crmCockpitRouter";
import { crmIntakeRouter } from "./crmIntakeRouter";
import { marketingRouter } from "./marketingRouter";
import { tutorRouter } from "./tutorRouter";
import { igcseRouter } from "./igcseRouter";
import { seedIgcseTopicsIfEmpty } from "./igcseTopicSeed";
import { seedIgcseExamplesIfEmpty } from "./igcseExamplesSeed";
import { seedIgcsePhysicsTopicsIfEmpty } from "./igcsePhysicsTopicSeed";
import { seedIgcsePhysicsExamplesIfEmpty } from "./igcsePhysicsExamplesSeed";
import { seedIgcseEconomicsTopicsIfEmpty } from "./igcseEconomicsTopicSeed";
import { seedIgcseEconomicsExamplesIfEmpty } from "./igcseEconomicsExamplesSeed";
import { seedIgcseBusinessTopicsIfEmpty } from "./igcseBusinessTopicSeed";
import { seedIgcseBusinessExamplesIfEmpty } from "./igcseBusinessExamplesSeed";
import { startTutorImages } from "./tutorImages";
import { crmJourneyRouter } from "./crmJourneyRouter";
import { sosmedRouter } from "./sosmedRouter";
import { startCrmReportScheduler } from "./crmReportScheduler";
import { startTutorReminderScheduler } from "./tutorReminderScheduler";
import { startPracticeFollowupScheduler } from "./practiceFollowupScheduler";
import { startArticleProducerScheduler } from "./articleProducer";
import { startGrowthInsightsScheduler } from "./growthInsights";
import { startGoogleAdsScheduler, startGoogleAdsOptimizer } from "./googleAdsApi";
import { parseAttribution } from "./attribution";
import { sendEmail, sendDocumentNotificationEmail, sendStaffWelcomeEmail, sendPasswordResetEmail, sendCounselorAssignmentEmail, sendStudentNotificationEmail, sendAptitudeResultsEmail, sendLeadNotificationEmail, sendParentProgressEmail } from "./email";
import crypto from "crypto";
import { createProTestInvoice, verifyWebhookToken, generateExternalId, getProTestPrice, getProTestDiscountPrice } from "./xenditService";
import { sendProAccessLinkEmail, sendPaymentConfirmationEmail, sendPracticeFollowupEmail, sendIeltsPracticeResultEmail } from "./resendService";
import { ENV } from "./_core/env";
import { autoEnrollContact, processDripEmails, bulkEnrollAllLeads } from "./dripCampaignService";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { triggerAgent, initializeAgents, startAgentScheduler } from "./agentScheduler";
import { getLatestGmReport, getGmReports, getGmRecommendations, updateGmRecommendationStatus, getGmHealthHistory, runGeneralManagerCycle, generateAndSendExecutiveReport } from "./agentGeneralManager";
import { runGeoMonitor, getLatestGeoReport } from "./agentGeoMonitor";
import {
  createStudentPortalAccount, getStudentPortalByEmail, getStudentPortalByLeadId,
  verifyStudentPortalToken, validateStudentPortalLogin, getStudentPortalDashboard,
  setStudentPortalResetToken, resetStudentPortalPassword,
  getAiSuggestionsForCounselor, markSuggestionActioned, clearOldSuggestions,
  insertAiSuggestion, deleteExistingSuggestions,
  getStudentProfile, upsertStudentProfile,
  createStudentAppointment, getStudentAppointments, getAllStudentPortalAppointments, updateStudentAppointmentStatus,
  getStudentWishlist, addToStudentWishlist, removeFromStudentWishlist,
  getStudentAiChatHistory, addStudentAiMessage, clearStudentAiChatHistory,
  getOrCreateReferralCode, getReferralCodeByCode, getMyReferrals, getMyRewards,
  createReferral, markReferralSignedUp, completeReferralAndGrantReward, claimReward, getReferralStats,
  createStudentNotification, getStudentNotifications, getStudentUnreadCount,
  markStudentNotificationRead, markAllStudentNotificationsRead,
} from "./studentPortalDb";
import {
  getAllAgentConfigs,
  updateAgentConfig,
  getAgentRunLogs,
  getAllRecentAgentRuns,
  getAllLeadAssignments,
  getLeadAssignmentsByCounselor,
  updateLeadAssignment,
  getAllSeoContentEntries,
  updateSeoContentEntry,
  getAllDailyReports,
  getAgentDashboardStats,
  getFollowUpActionsByAssignment,
} from "./db";

/**
 * Send an aptitude result email reliably: retry a few times with backoff, and
 * if it still fails, alert the owner so the result can be re-sent manually
 * (via the admin "Resend result" tool) instead of silently vanishing. Runs in
 * the background — callers fire-and-forget so the test-submit response is fast.
 */
function sendAptitudeResultReliable(params: Parameters<typeof sendAptitudeResultsEmail>[0]): void {
  void (async () => {
    const attempts = 3;
    for (let i = 1; i <= attempts; i++) {
      try {
        await sendAptitudeResultsEmail(params);
        if (i > 1) console.log(`[Aptitude] result email to ${params.to} sent on attempt ${i}`);
        return;
      } catch (err) {
        console.error(`[Aptitude] result email attempt ${i}/${attempts} failed for ${params.to}:`, err);
        if (i < attempts) await new Promise(r => setTimeout(r, i * 5000));
      }
    }
    notifyOwner({
      title: "⚠️ Aptitude result email FAILED to send",
      content: `Could not email the result to ${params.studentName} (${params.to}) after ${attempts} tries. Their result IS saved — resend it from /admin/legacy → Pro Orders → "Resend result".`,
    }).catch(() => {});
  })();
}

/**
 * Send the IELTS Practice result email reliably (the result is email-only now,
 * so a dropped email = the student gets nothing). 3 background retries, then
 * alert the owner so it can be re-sent.
 */
function sendIeltsPracticeResultReliable(params: Parameters<typeof sendIeltsPracticeResultEmail>[0]): void {
  void (async () => {
    for (let i = 1; i <= 3; i++) {
      try {
        const ok = await sendIeltsPracticeResultEmail(params);
        if (ok) return;
      } catch (err) {
        console.error(`[IeltsPractice] result email attempt ${i}/3 failed for ${params.to}:`, err);
      }
      if (i < 3) await new Promise(r => setTimeout(r, i * 5000));
    }
    notifyOwner({
      title: "⚠️ IELTS Practice result email FAILED",
      content: `Could not email the ${params.section} practice result to ${params.studentName || ""} (${params.to}) after 3 tries. Their result IS saved in the DB.`,
    }).catch(() => {});
  })();
}

const SYSTEM_PROMPT = `You are SpecTa, the friendly AI counselor for SpecTa Education — an Indonesian study abroad consultancy. You genuinely care about each student and want the best for them. You chat like a supportive older sibling, not a search engine.

=== CONVERSATION RULES (CRITICAL — FOLLOW STRICTLY) ===
1. KEEP REPLIES SHORT: 2-3 sentences max per message. Never write paragraphs or walls of text.
2. ASK BEFORE YOU RECOMMEND: Always learn about the student first. Ask ONE question at a time.
3. NEVER dump all info at once. Drip-feed information naturally through conversation.
4. Show you CARE: React to what they say. "That's awesome!", "I totally get that", "Don't worry, we got you"
5. University lists: Only when you understand their needs. Max 3 unis at a time. Ask "Want to see more?" if needed.
6. Be casual and warm — use emojis sparingly (1-2 per message max), keep it natural, not forced.
7. Guide them step by step like a real counselor would.

=== CONVERSATION FLOW ===
Step 1: Greet warmly. Ask what they're interested in studying or what brought them here.
Step 2: Learn about them — what subject? Any country preference? Budget concerns? Taken IELTS?
Step 3: Only AFTER understanding their needs, suggest 2-3 universities that fit. Keep it brief.
Step 4: If they're interested, share a bit more detail about ONE university at a time.
Step 5: Gently collect their info so a human counselor can follow up. ORDER MATTERS:
  5a. FIRST ask for their NAME — never start with phone or email. "By the way, what's your name? I'd love to know who I'm chatting with 😊"
  5b. THEN, AFTER they share a name, ask for their phone (WhatsApp) number. "Nice to meet you, [name]! What's the best WhatsApp number to reach you on?"
  5c. Email comes last and is optional. Only ask if it fits naturally in the conversation.
  NEVER ask for phone or email before knowing their name. Treat them as a person, not a lead form.
Step 6: Encourage them to book a FREE consultation or use Quick Apply.

=== EXAMPLE GOOD RESPONSES ===
Student: "I want to study abroad"
You: "That's exciting! 🎉 What subject are you most passionate about?"

Student: "Engineering"
You: "Nice! Engineering is such a solid choice. Do you have a country in mind, or want me to help figure out what fits you best?"

Student: "Maybe Australia, budget around $20k"
You: "Australia's great for engineering! A few unis that could work for your budget — UNSW, Monash, and University of Melbourne are all top-tier. Want me to break down any of these?"

=== EXAMPLE BAD RESPONSES (NEVER DO THIS) ===
- Listing 10+ universities in one message
- Writing 5+ sentences in a single reply
- Giving tuition, visa info, living costs, work permits all at once
- Answering questions the student didn't ask
- Starting with "Here's everything you need to know about..."

=== KNOWLEDGE BASE (use only when relevant to the conversation) ===
Malaysia: Taylor's, Nottingham MY, INTI, The One Academy, UCSI, Monash MY, Southampton MY, MILA. $3K-16K/yr
Singapore (ONLY private): Curtin SG, JCU SG, PSB, Raffles Design, MDIS, Kaplan, SIM, ERC, Dimensions, Nanyang. $10K-25K/yr. NEVER recommend NUS/NTU/SMU.
Australia: Melbourne, Sydney, UNSW, ANU, Monash. AUD 30K-50K/yr
UK: Oxford, Cambridge, Imperial, UCL, Edinburgh, Manchester. GBP 15K-40K/yr
China: Tsinghua, Peking, Fudan. CNY 20K-50K/yr. CSC Scholarships.
USA: MIT, Stanford, Harvard. USD 30K-60K/yr
Canada: Toronto, UBC, McGill. CAD 20K-45K/yr. PR pathway.
Ireland: Trinity, UCD. EUR 10K-25K/yr
New Zealand: Auckland, Otago. NZD 25K-40K/yr
Netherlands: TU Delft, Amsterdam. EUR 8K-20K/yr

IELTS Programs: VIP/Guarantee (80 sessions), 80 Sessions, 40 Sessions, Short Course (20), Private (1-on-1), EPT Mock Test. 6000+ students since 2005.

=== CONTACT CAPTURE ===
When user shares contact info, silently append: <CONTACT_INFO>{"name":"...","email":"...","phone":"...","country":"...","studyLevel":"..."}</CONTACT_INFO>
ORDER OF CAPTURE (strict): NAME first, then phone (WhatsApp), then email if natural.
Never ask for phone or email before knowing the student's name.
Don't ask for all info at once. Collect naturally during conversation.

=== OTHER RULES ===
- NEVER provide external links.
- For Singapore: ONLY private institutions.
- For affordable options: suggest Malaysia or China.
- Always mention FREE consultation and application support when appropriate.
- If they seem stressed about costs, reassure them — scholarships exist!
- Encourage booking a consultation or trying Quick Apply when the time feels right.
- NEVER be pushy. Be their friend first, counselor second.

Contact: Jl. Kelapa Nias Raya QE1 No. 14, Kelapa Gading, Jakarta Utara | +62 818 218 388 | info@spectaeducation.com`;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chat: router({
    sendMessage: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        message: z.string(),
        language: z.enum(["en", "id"]).optional(),
        conversationHistory: z.array(z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string()
        }))
      }))
      .mutation(async ({ input, ctx }) => {
        const { sessionId, message, conversationHistory, language } = input;

        let conversation = await getConversationBySessionId(sessionId);
        if (!conversation) {
          conversation = await createConversation({ sessionId });
        }

        if (!conversation) {
          return { success: false, message: "Failed to create conversation" };
        }

        await createMessage({
          conversationId: conversation.id,
          role: "user",
          content: message
        });

        // Append a strict language directive to the system prompt when the
        // student has chosen a language. Defaults to "respond in the same
        // language the student writes in" when unset (backward-compatible).
        const languageDirective =
          language === "id"
            ? "\n\n=== LANGUAGE ===\nThe student has chosen BAHASA INDONESIA. Respond ENTIRELY in casual, warm Bahasa Indonesia. Do not switch to English unless the student does first. Use natural Indonesian student lingo (kamu, aku, sip, banget, dll)."
            : language === "en"
              ? "\n\n=== LANGUAGE ===\nThe student has chosen ENGLISH. Respond ENTIRELY in friendly, warm English. Do not switch to Bahasa Indonesia unless the student does first."
              : "\n\n=== LANGUAGE ===\nMatch the language the student writes in. If they write Bahasa Indonesia, respond in Bahasa Indonesia. If they write English, respond in English.";

        const llmMessages = [
          { role: "system" as const, content: SYSTEM_PROMPT + languageDirective },
          ...conversationHistory.filter(m => m.role !== "system").map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content
          }))
        ];

        try {
          const response = await invokeLLM({
            messages: llmMessages
          });

          const rawContent = response.choices[0]?.message?.content;
          let assistantMessage = typeof rawContent === 'string' ? rawContent : "I apologize, I'm having trouble responding. Please try again.";

          const contactMatch = assistantMessage.match(/<CONTACT_INFO>([\s\S]*?)<\/CONTACT_INFO>/);
          if (contactMatch) {
            try {
              const contactInfo = JSON.parse(contactMatch[1]);
              
              await updateConversation(sessionId, {
                studentName: contactInfo.name || undefined,
                studentEmail: contactInfo.email || undefined,
                studentPhone: contactInfo.phone || undefined,
                preferredCountry: contactInfo.country || undefined,
                studyLevel: contactInfo.studyLevel || undefined,
                status: contactInfo.phone ? "lead_captured" : "active"
              });

              if (contactInfo.phone) {
                const lead = await createLead({
                  conversationId: conversation.id,
                  studentName: contactInfo.name || "Unknown",
                  studentEmail: contactInfo.email || undefined,
                  studentPhone: contactInfo.phone,
                  preferredCountry: contactInfo.country || undefined,
                  studyLevel: contactInfo.studyLevel || undefined,
                  status: "new",
                  ...parseAttribution(ctx),
                });

                if (lead) {
                  await notifyOwner({
                    title: "New Lead from SpecTa AI",
                    content: `New lead captured!\n\nName: ${contactInfo.name || 'Not provided'}\nPhone: ${contactInfo.phone}\nEmail: ${contactInfo.email || 'Not provided'}\nCountry: ${contactInfo.country || 'Not specified'}\nStudy Level: ${contactInfo.studyLevel || 'Not specified'}`
                  });

                  // Auto-enroll in drip campaign
                  if (contactInfo.email) {
                    try {
                      await autoEnrollContact({
                        email: contactInfo.email,
                        name: contactInfo.name || "Student",
                        phone: contactInfo.phone,
                        triggerSource: "contact_form",
                      });
                    } catch (e) {
                      console.error("[DripCampaign] Auto-enroll from chat failed:", e);
                    }
                  }
                }
              }

              assistantMessage = assistantMessage.replace(/<CONTACT_INFO>[\s\S]*?<\/CONTACT_INFO>/, '').trim();
            } catch (e) {
              console.error("Failed to parse contact info:", e);
            }
          }

          await createMessage({
            conversationId: conversation.id,
            role: "assistant",
            content: assistantMessage
          });

          return { success: true, message: assistantMessage };
        } catch (error) {
          console.error("LLM error:", error);
          return { 
            success: false, 
            message: "I apologize, but I'm having trouble connecting right now. Please try again or contact us directly at +62 818 218 388." 
          };
        }
      }),

    uploadDocument: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(),
        documentType: z.enum(["passport", "transcript", "certificate", "other"])
      }))
      .mutation(async ({ input }) => {
        const { sessionId, fileName, fileType, fileData, documentType } = input;

        let conversation = await getConversationBySessionId(sessionId);
        if (!conversation) {
          conversation = await createConversation({ sessionId });
        }

        if (!conversation) {
          return { success: false, error: "Failed to create conversation" };
        }

        try {
          const buffer = Buffer.from(fileData, 'base64');
          const fileKey = `documents/${sessionId}/${nanoid()}-${fileName}`;
          const { url } = await storagePut(fileKey, buffer, fileType);

          const document = await createDocument({
            conversationId: conversation.id,
            fileName,
            fileType,
            fileUrl: url,
            fileKey,
            documentType
          });

          await updateConversation(sessionId, {
            status: "documents_uploaded"
          });

          return { 
            success: true, 
            document: document ? {
              id: document.id,
              fileName: document.fileName,
              fileType: document.fileType,
              fileUrl: document.fileUrl
            } : null
          };
        } catch (error) {
          console.error("Upload error:", error);
          return { success: false, error: "Failed to upload document" };
        }
      }),

    getHistory: publicProcedure
      .input(z.object({
        sessionId: z.string()
      }))
      .query(async ({ input }) => {
        const conversation = await getConversationBySessionId(input.sessionId);
        if (!conversation) {
          return { messages: [], leadState: null };
        }

        const messages = await getMessagesByConversationId(conversation.id);
        return { 
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt
          })),
          leadState: conversation.studentName ? {
            name: conversation.studentName,
            phone: conversation.studentPhone
          } : null
        };
      }),

    captureLead: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        name: z.string().min(1),
        phone: z.string().optional(),
        isAnonymous: z.boolean().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const { sessionId, name, phone, isAnonymous } = input;

        // Get or create conversation
        let conversation = await getConversationBySessionId(sessionId);
        if (!conversation) {
          conversation = await createConversation({
            sessionId,
            studentName: name,
            studentPhone: phone || null,
            status: "lead_captured"
          });
        } else {
          await updateConversation(conversation.sessionId, {
            studentName: name,
            studentPhone: phone || null,
            status: "lead_captured"
          });
          // Refresh conversation after update
          conversation = await getConversationBySessionId(sessionId) || conversation;
        }

        if (!conversation) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create conversation' });
        }

        // Create lead record
        const lead = await createLead({
          conversationId: conversation.id,
          studentName: name,
          studentPhone: phone || null,
          isAnonymous: isAnonymous || false,
          source: "chatbot",
          status: "new",
          ...parseAttribution(ctx),
        });

        // Send email notification (non-blocking)
        sendLeadNotificationEmail({
          leadName: name,
          leadPhone: phone,
          isAnonymous: isAnonymous || false
        }).catch((err: unknown) => console.error("Lead notification email failed:", err));

        // Notify owner (non-blocking)
        notifyOwner({
          title: `New Chatbot Lead: ${name}`,
          content: `A visitor named ${name}${phone ? ` (${phone})` : ''} just started chatting with the AI assistant.`
        }).catch((err: unknown) => console.error("Owner notification failed:", err));

        // Auto-enroll in drip campaign (non-blocking) - needs email
        // Skip drip enrollment since we only have phone, not email

        return { success: true, leadId: lead?.id };
      }),

    summarizeIntent: publicProcedure
      .input(z.object({
        sessionId: z.string()
      }))
      .mutation(async ({ input }) => {
        const conversation = await getConversationBySessionId(input.sessionId);
        if (!conversation) {
          return { success: false, error: "No conversation found" };
        }

        const messages = await getMessagesByConversationId(conversation.id);
        const userMessages = messages.filter(m => m.role === "user");
        if (userMessages.length < 3) {
          return { success: false, error: "Not enough messages to summarize" };
        }

        // Build transcript
        const transcript = messages.map(m => `${m.role === 'user' ? 'Student' : 'SpecTa'}: ${m.content}`).join('\n');

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system" as const, content: `You are an intent analyzer for SpecTa Education, a study abroad consultancy. Analyze the chat transcript and return a JSON object with:
- "summary": A 1-2 sentence summary of what the student is looking for
- "tags": An array of relevant tags from this list: ["IELTS", "Australia", "UK", "USA", "Canada", "Singapore", "Malaysia", "China", "Ireland", "Netherlands", "New Zealand", "Scholarship", "Undergraduate", "Postgraduate", "Budget Conscious", "Quick Apply", "Consultation", "General Inquiry"]
Only include tags that are clearly relevant. Return ONLY valid JSON, no markdown.` },
              { role: "user" as const, content: transcript }
            ]
          });

          const content = response.choices[0]?.message?.content;
          if (typeof content !== 'string') {
            return { success: false, error: "No response from LLM" };
          }

          let parsed: { summary: string; tags: string[] };
          try {
            parsed = JSON.parse(content);
          } catch {
            parsed = { summary: content.substring(0, 200), tags: [] };
          }

          // Update lead with intent summary
          const allLeads = await getAllLeads();
          const lead = allLeads.find(l => l.conversationId === conversation.id);
          if (lead) {
            await updateLead(lead.id, {
              intentSummary: parsed.summary,
              tags: JSON.stringify(parsed.tags),
              chatTranscript: transcript
            });

            // Send enriched email notification
            sendLeadNotificationEmail({
              leadName: conversation.studentName || 'Anonymous',
              leadPhone: conversation.studentPhone || undefined,
              intentSummary: parsed.summary,
              tags: parsed.tags,
              isAnonymous: !conversation.studentPhone
            }).catch(err => console.error("Enriched lead email failed:", err));
          }

          return { success: true, summary: parsed.summary, tags: parsed.tags };
        } catch (error) {
          console.error("Intent summarization failed:", error);
          return { success: false, error: "Failed to summarize intent" };
        }
      })
  }),

  compare: router({
    analyzeUniversities: publicProcedure
      .input(z.object({
        universities: z.array(z.object({
          name: z.string(),
          country: z.string(),
          ranking: z.string(),
          type: z.string(),
          tuition: z.string(),
          programs: z.array(z.string())
        })),
        selectedProgram: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const { universities, selectedProgram } = input;

        const uniList = universities.map(u => 
          `- ${u.name} (${u.country}, QS ${u.ranking}, ${u.type}, Tuition: ${u.tuition}, Programs: ${u.programs.join(', ')})`
        ).join('\n');

        const programContext = selectedProgram 
          ? `\n\nThe student is specifically interested in: **${selectedProgram}**. Focus the comparison on this program/major across the universities, including program rankings, curriculum quality, research opportunities, and career outcomes specific to this field.`
          : '';

        const comparisonPrompt = `You are an expert education consultant. Compare these universities for a prospective student:\n\n${uniList}${programContext}\n\nProvide a detailed comparison covering:\n1. **Rankings & Reputation** - Compare global standings and academic reputation${selectedProgram ? ` (especially for ${selectedProgram})` : ''}\n2. **Cost Analysis** - Tuition fees, living costs, and value for money\n3. **Programs & Strengths** - Key academic strengths and unique programs${selectedProgram ? ` with focus on ${selectedProgram}` : ''}\n4. **Career Prospects** - Graduate employability and industry connections${selectedProgram ? ` for ${selectedProgram} graduates` : ''}\n5. **Student Life** - Campus experience, location, and culture\n6. **Recommendation** - Who each university is best suited for\n\nFormat your response with clear headings and be specific with data. Keep it concise but informative.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system" as const, content: "You are SpecTa, the super chill education bestie for SpecTa Education. Give helpful, detailed university comparisons but keep it fun and Gen Z friendly. Use casual language, emojis, and slang naturally. Still be accurate and data-driven — just deliver it in a way that's easy to vibe with. Make it feel like a friend breaking down the options, not a boring report." },
              { role: "user" as const, content: comparisonPrompt }
            ]
          });

          const content = response.choices[0]?.message?.content;
          const message = typeof content === 'string' ? content : "Sorry, I couldn't generate a comparison right now.";
          return { success: true, message };
        } catch (error) {
          console.error("Compare LLM error:", error);
          return { success: false, message: "Sorry, there was an error generating the comparison. Please try again." };
        }
      })
  }),

  // ==========================================
  // APPOINTMENT BOOKING SYSTEM
  // ==========================================
  appointment: router({
    getAvailableSlots: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        const { date } = input;
        const dayOfWeek = new Date(date).getDay();
        
        // Define available time slots
        // Mon-Fri: 10:00 - 18:00, Sat: 10:00 - 14:00, Sun: closed
        let allSlots: string[] = [];
        if (dayOfWeek === 0) {
          return { slots: [], closed: true };
        } else if (dayOfWeek === 6) {
          allSlots = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"];
        } else {
          allSlots = [
            "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
            "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
            "16:00", "16:30", "17:00", "17:30"
          ];
        }

        // Get booked slots for this date
        const bookedAppointments = await getAppointmentsByDate(date);
        const bookedSlots = bookedAppointments.map(a => a.timeSlot);
        
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
        return { slots: availableSlots, closed: false };
      }),

    book: publicProcedure
      .input(z.object({
        fullName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
        date: z.string(),
        timeSlot: z.string(),
        consultationType: z.enum(["general", "ielts", "university", "visa", "scholarship"]),
        preferredCountry: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const appointment = await createAppointment(input);
        
        if (appointment) {
          await notifyOwner({
            title: `New Booking: ${input.fullName}`,
            content: `Consultation Booking\n\nName: ${input.fullName}\nEmail: ${input.email}\nPhone: ${input.phone}\nDate: ${input.date}\nTime: ${input.timeSlot}\nType: ${input.consultationType}\nCountry: ${input.preferredCountry || 'Not specified'}\nNotes: ${input.notes || 'None'}`
          });
        }

        return { success: true, appointment };
      }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { appointments: [] };
      const apps = await getAllAppointments();
      return { appointments: apps };
    }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled", "rescheduled"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { success: false };
        const { id, ...data } = input;
        await updateAppointment(id, data);
        return { success: true };
      }),
  }),

  // ==========================================
  // IELTS AI PRACTICE TEST
  // ==========================================
  ieltsPractice: router({
    generateQuestions: publicProcedure
      .input(z.object({
        section: z.enum(["reading", "writing", "listening", "speaking"]),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { section, difficulty = "intermediate" } = input;

        const prompts: Record<string, string> = {
          reading: `Generate an IELTS Academic Reading practice test passage and questions. Difficulty: ${difficulty}.

Create a passage of about 300-400 words on an academic topic (science, history, technology, or social studies). Then create exactly 8 questions in this format:

1. Questions 1-4: Multiple choice (A, B, C, D) - test comprehension
2. Questions 5-6: True/False/Not Given
3. Questions 7-8: Short answer (1-3 words)

IMPORTANT: The passage must be PLAIN TEXT ONLY. Do NOT include any HTML tags like <p>, <h2>, </p>, <br>, etc. Use \n\n (double newline) to separate paragraphs. The passage should have 3-4 clear paragraphs separated by double newlines.

Return as JSON:
{
  "passage": "First paragraph text.\n\nSecond paragraph text.\n\nThird paragraph text.",
  "title": "passage title",
  "questions": [
    { "id": 1, "type": "multiple_choice", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A" },
    { "id": 5, "type": "true_false_notgiven", "question": "...", "correctAnswer": "True" },
    { "id": 7, "type": "short_answer", "question": "...", "correctAnswer": "answer text" }
  ]
}`,
          writing: `Generate an IELTS Academic Writing Task 2 practice question. Difficulty: ${difficulty}.

Create a thought-provoking essay question on a common IELTS topic (education, technology, environment, health, society). Include clear instructions.

Return as JSON:
{
  "taskType": "Task 2 - Essay",
  "question": "the essay question/prompt",
  "topic": "topic category",
  "instructions": "You should write at least 250 words. Give reasons for your answer and include relevant examples from your own knowledge or experience.",
  "tips": ["tip 1", "tip 2", "tip 3"],
  "sampleOutline": {
    "introduction": "brief outline",
    "body1": "brief outline",
    "body2": "brief outline",
    "conclusion": "brief outline"
  }
}`,
          listening: `Generate a realistic IELTS Listening Section 1 practice exercise. Difficulty: ${difficulty}.

Create a natural-sounding conversation (like a real IELTS recording) between two people. This will be read aloud by text-to-speech, so write it as natural flowing dialogue WITHOUT any speaker labels (no "Speaker A:", "Speaker B:", "Man:", "Woman:" etc.). Instead, write it as a continuous natural conversation where the speakers alternate naturally. Include realistic details like names, dates, phone numbers, addresses, and prices that students must catch.

IMPORTANT: The transcript must be pure dialogue text only — no labels, no stage directions, no brackets. Just the words that would be spoken aloud, alternating between the two speakers naturally. Keep it concise (150-200 words) so the audio plays quickly.

Return as JSON:
{
  "scenario": "Brief description of the scenario (e.g., 'A student calling to enquire about a language course')",
  "transcript": "Pure dialogue text without any speaker labels. Just natural flowing conversation.",
  "questions": [
    { "id": 1, "type": "fill_blank", "question": "The caller's surname is ___", "correctAnswer": "answer" },
    { "id": 2, "type": "multiple_choice", "question": "...", "options": ["A) ...", "B) ...", "C) ..."], "correctAnswer": "B" }
  ],
  "tips": ["listening tip 1", "listening tip 2", "listening tip 3"]
}

Create exactly 6 questions mixing fill-in-the-blank and multiple choice. Questions should test specific details from the conversation (names, numbers, dates, times, prices).`,
          speaking: `Generate IELTS Speaking practice questions for all 3 parts. Difficulty: ${difficulty}.

Return as JSON:
{
  "part1": {
    "topic": "topic name",
    "questions": ["question 1", "question 2", "question 3", "question 4"]
  },
  "part2": {
    "topic": "Describe...",
    "cueCard": "Describe [topic]. You should say:\\n- point 1\\n- point 2\\n- point 3\\nand explain why/how...",
    "followUp": ["follow up question 1", "follow up question 2"]
  },
  "part3": {
    "topic": "discussion topic related to Part 2",
    "questions": ["abstract question 1", "abstract question 2", "abstract question 3"]
  },
  "tips": ["speaking tip 1", "speaking tip 2", "speaking tip 3"],
  "sampleAnswer": "A brief sample answer for the Part 2 cue card (about 150 words)"
}`
        };

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system" as const, content: "You are an expert IELTS instructor. Generate practice test content that closely mimics real IELTS exam difficulty and format. Always return valid JSON." },
              { role: "user" as const, content: prompts[section] }
            ],
            response_format: { type: "json_object" as const }
          });

          const content = response.choices[0]?.message?.content;
          if (typeof content === 'string') {
            const parsed = JSON.parse(content);
            return { success: true, data: parsed, section };
          }
          return { success: false, error: "Failed to generate questions" };
        } catch (error) {
          console.error("IELTS practice error:", error);
          return { success: false, error: "Failed to generate practice questions. Please try again." };
        }
      }),

    scoreAnswers: publicProcedure
      .input(z.object({
        section: z.enum(["reading", "writing", "listening", "speaking"]),
        questions: z.string(), // JSON
        answers: z.string(), // JSON
        studentName: z.string(),
        studentEmail: z.string().email(),
        studentPhone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { section, questions, answers, studentName, studentEmail, studentPhone } = input;

        let scoringPrompt = "";
        if (section === "reading" || section === "listening") {
          scoringPrompt = `Score these IELTS ${section} answers. Questions and correct answers:\n${questions}\n\nStudent answers:\n${answers}\n\nReturn JSON: { "correctCount": number, "totalQuestions": number, "bandScore": "estimated band", "feedback": "detailed feedback on performance", "questionResults": [{ "id": number, "correct": boolean, "studentAnswer": "...", "correctAnswer": "...", "explanation": "..." }] }`;
        } else if (section === "writing") {
          scoringPrompt = `Score this IELTS Writing Task 2 response.\n\nQuestion: ${questions}\n\nStudent's essay:\n${answers}\n\nScore using IELTS Writing criteria and return JSON: { "bandScore": "overall band", "criteria": { "taskResponse": { "band": "x.x", "feedback": "..." }, "coherenceCohesion": { "band": "x.x", "feedback": "..." }, "lexicalResource": { "band": "x.x", "feedback": "..." }, "grammaticalRange": { "band": "x.x", "feedback": "..." } }, "overallFeedback": "detailed improvement suggestions", "strengths": ["strength 1", "strength 2"], "improvements": ["area 1", "area 2"] }`;
        } else {
          scoringPrompt = `Evaluate these IELTS Speaking responses.\n\nQuestions: ${questions}\n\nStudent's responses:\n${answers}\n\nScore using IELTS Speaking criteria and return JSON: { "bandScore": "overall band", "criteria": { "fluencyCoherence": { "band": "x.x", "feedback": "..." }, "lexicalResource": { "band": "x.x", "feedback": "..." }, "grammaticalRange": { "band": "x.x", "feedback": "..." }, "pronunciation": { "band": "x.x", "feedback": "..." } }, "overallFeedback": "detailed improvement suggestions", "strengths": ["strength 1"], "improvements": ["area 1"] }`;
        }

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system" as const, content: "You are an expert IELTS examiner. Score accurately and provide constructive feedback. Always return valid JSON." },
              { role: "user" as const, content: scoringPrompt }
            ],
            response_format: { type: "json_object" as const }
          });

          const content = response.choices[0]?.message?.content;
          if (typeof content === 'string') {
            const parsed = JSON.parse(content);
            
            // Save result to database
            const result = await createIeltsPracticeResult({
              studentName,
              studentEmail,
              studentPhone: studentPhone || null,
              section,
              questions,
              answers,
              score: parsed.bandScore || null,
              aiFeedback: content,
              timeTaken: null,
            });

            // Notify admin
            await notifyOwner({
              title: `IELTS Practice Completed: ${studentName}`,
              content: `Student: ${studentName}\nEmail: ${studentEmail}\nPhone: ${studentPhone || 'N/A'}\nSection: ${section}\nEstimated Band: ${parsed.bandScore || 'N/A'}`
            });

            // Results are EMAIL-ONLY (not shown on screen) — send the result
            // reliably. This email also carries the Mock Test + AI Tutor promo,
            // so we mark the lead "claimed" to stop the follow-up scheduler from
            // sending a duplicate promo email (one email, not two).
            sendIeltsPracticeResultReliable({ to: studentEmail, studentName, section, result: parsed, appUrl: ENV.appUrl });
            if (process.env.PRACTICE_FOLLOWUP_ENABLED !== "false") {
              claimPracticeFollowup(studentEmail).catch(() => {});
            }

            return { success: true, resultId: result?.id };
          }
          return { success: false, error: "Failed to score answers" };
        } catch (error) {
          console.error("IELTS scoring error:", error);
          return { success: false, error: "Failed to score your answers. Please try again." };
        }
      }),

    getResults: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { results: [] };
      const results = await getAllIeltsPracticeResults();
      return { results };
    }),

    getResultById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await getIeltsPracticeResultById(input.id);
        return { result };
      }),
  }),

  // ==========================================
  // APPLICATION TRACKER PORTAL
  // ==========================================
  tracker: router({
    requestMagicLink: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { email } = input;
        
        // Find applications by email
        const apps = await getApplicationsByEmail(email);
        if (apps.length === 0) {
          return { success: false, error: "No applications found for this email address." };
        }

        // Clean up expired tokens
        await deleteExpiredTokens();

        // Generate tokens for each application
        const tokens: { applicationId: number; token: string; referenceNumber: string | null }[] = [];
        for (const app of apps) {
          const token = crypto.randomBytes(48).toString('hex');
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          
          await createTrackingToken({
            applicationId: app.id,
            token,
            email,
            expiresAt,
          });

          tokens.push({
            applicationId: app.id,
            token,
            referenceNumber: app.referenceNumber,
          });
        }

        return { 
          success: true, 
          message: `We found ${apps.length} application(s). Your tracking links are ready.`,
          applications: tokens.map(t => ({
            referenceNumber: t.referenceNumber,
            trackingToken: t.token,
          }))
        };
      }),

    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const tokenRecord = await getTrackingTokenByToken(input.token);
        if (!tokenRecord) {
          return { success: false, error: "Invalid or expired tracking link." };
        }

        if (new Date() > tokenRecord.expiresAt) {
          return { success: false, error: "This tracking link has expired. Please request a new one." };
        }

        const application = await getApplicationById(tokenRecord.applicationId);
        if (!application) {
          return { success: false, error: "Application not found." };
        }

        const notes = await getNotesByApplicationId(application.id, true); // public only
        const documents = await getDocumentsByApplicationId(application.id);

        return { 
          success: true, 
          application: {
            id: application.id,
            referenceNumber: application.referenceNumber,
            fullName: application.fullName,
            email: application.email,
            selectedUniversities: application.selectedUniversities,
            status: application.status,
            statusHistory: application.statusHistory,
            assignedCounselor: application.assignedCounselor,
            createdAt: application.createdAt,
            updatedAt: application.updatedAt,
          },
          notes: notes.map(n => ({
            id: n.id,
            authorName: n.authorName,
            content: n.content,
            createdAt: n.createdAt,
          })),
          documents: documents.map(d => ({
            id: d.id,
            fileName: d.fileName,
            documentType: d.documentType,
            uploadedBy: d.uploadedBy,
            createdAt: d.createdAt,
          })),
        };
      }),

    addStudentNote: publicProcedure
      .input(z.object({
        token: z.string(),
        content: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const tokenRecord = await getTrackingTokenByToken(input.token);
        if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
          return { success: false, error: "Invalid or expired tracking link." };
        }

        const application = await getApplicationById(tokenRecord.applicationId);
        if (!application) {
          return { success: false, error: "Application not found." };
        }

        const note = await createApplicationNote({
          applicationId: application.id,
          authorName: application.fullName,
          content: input.content,
          isPublic: true,
        });

        return { success: true, note };
      }),

    uploadStudentDocument: publicProcedure
      .input(z.object({
        token: z.string(),
        fileName: z.string(),
        fileData: z.string(),
        fileType: z.string(),
        documentType: z.enum(["transcript", "passport", "ielts", "certificate", "offer_letter", "visa", "other"]),
      }))
      .mutation(async ({ input }) => {
        const tokenRecord = await getTrackingTokenByToken(input.token);
        if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
          return { success: false, error: "Invalid or expired tracking link." };
        }

        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `app-docs/${tokenRecord.applicationId}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);

        const doc = await createApplicationDocument({
          applicationId: tokenRecord.applicationId,
          fileName: input.fileName,
          fileType: input.fileType,
          fileUrl: url,
          fileKey,
          documentType: input.documentType,
          uploadedBy: "student",
        });

        // Send email notification about the upload
        try {
          const application = await getApplicationById(tokenRecord.applicationId);
          if (application) {
            await notifyOwner({
              title: `Document Uploaded: ${input.documentType}`,
              content: `Student: ${application.fullName}\nEmail: ${application.email}\nRef: ${application.referenceNumber}\nDocument: ${input.fileName}\nType: ${input.documentType}\nSource: Track My Application`
            });
            await sendDocumentNotificationEmail({
              to: "hadi@spectaeducation.com",
              studentName: application.fullName,
              studentEmail: application.email,
              documentType: input.documentType,
              fileName: input.fileName,
              source: "tracker",
              referenceNumber: application.referenceNumber || undefined,
              dashboardUrl: "https://spectaeducation.com/admin",
            });
          }
        } catch (e) {
          console.error("[Email] Failed to send tracker document notification:", e);
        }

        return { success: true, document: doc };
      }),
  }),

  admin: router({
    ielts: ieltsAdminRouter,

    /** Send the IELTS-practice follow-up DRAFT to yourself (or a given email) for review. */
    previewPracticeFollowup: protectedProcedure
      .input(z.object({ to: z.string().email().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admins only." });
        }
        const to = input.to || ctx.user.email;
        if (!to) throw new TRPCError({ code: "BAD_REQUEST", message: "No email on your account — pass one explicitly." });
        const ok = await sendPracticeFollowupEmail({ to, name: ctx.user.name || "there", appUrl: ENV.appUrl });
        if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Send failed — check Resend configuration." });
        return { sent: true, to };
      }),

    getLeads: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') {
        return { leads: [] };
      }
      const leads = await getAllLeads();
      return { leads };
    }),

    getLead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') {
          return { lead: null };
        }
        const lead = await getLeadById(input.id);
        return { lead };
      }),

    updateLead: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "qualified", "converted", "closed"]).optional(),
        assignedTo: z.string().optional(),
        notes: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') {
          return { success: false };
        }
        const { id, ...data } = input;
        await updateLead(id, data);
        return { success: true };
      }),

    getConversations: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') {
        return { conversations: [] };
      }
      const conversations = await getAllConversations();
      return { conversations };
    }),

    getConversationMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') {
          return { messages: [] };
        }
        const messages = await getMessagesByConversationId(input.conversationId);
        return { messages };
      }),

    getDocuments: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') {
        return { documents: [], applicationDocuments: [] };
      }
      // Get chatbot-uploaded documents
      const chatbotDocs = await getAllDocuments();
      // Get application documents (from Quick Apply + Track My Application)
      const appDocs = await getAllApplicationDocuments();
      return { documents: chatbotDocs, applicationDocuments: appDocs };
    }),

    getLeadDocuments: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') {
          return { documents: [] };
        }
        const documents = await getDocumentsByLeadId(input.leadId);
        return { documents };
      }),

    getConversationDocuments: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') {
          return { documents: [] };
        }
        const documents = await getDocumentsByConversationId(input.conversationId);
        return { documents };
      }),

    // Admin appointment management
    getAppointments: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { appointments: [] };
      const apps = await getAllAppointments();
      return { appointments: apps };
    }),

    updateAppointmentStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled", "rescheduled"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { success: false };
        const { id, ...data } = input;
        await updateAppointment(id, data);
        return { success: true };
      }),

    // Admin IELTS practice results
    getIeltsPracticeResults: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { results: [] };
      const results = await getAllIeltsPracticeResults();
      return { results };
    }),

    // Admin application management (enhanced)
    getApplicationNotes: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { notes: [] };
        const notes = await getNotesByApplicationId(input.applicationId, false); // all notes
        return { notes };
      }),

    addApplicationNote: protectedProcedure
      .input(z.object({
        applicationId: z.number(),
        content: z.string().min(1),
        isPublic: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { success: false };
        const note = await createApplicationNote({
          applicationId: input.applicationId,
          authorName: ctx.user.name || 'Admin',
          content: input.content,
          isPublic: input.isPublic,
        });
        return { success: true, note };
      }),

    getApplicationDocuments: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { documents: [] };
        const docs = await getDocumentsByApplicationId(input.applicationId);
        return { documents: docs };
      }),

    // Admin monitoring: get counselor detail with all assigned students, activity, and progress
    getCounselorDetail: protectedProcedure
      .input(z.object({ counselorName: z.string() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return null;
        // Get staff account
        const staffAccount = await getStaffAccountByName(input.counselorName);
        // Get all applications assigned to this counselor
        const apps = await getApplicationsByCounselorName(input.counselorName);
        // For each application, get documents and notes
        const appsWithDetails = await Promise.all(apps.map(async (app) => {
          const docs = await getApplicationDocumentsByApplicationId(app.id);
          const notes = await getApplicationNotesByApplicationId(app.id);
          return { ...app, documents: docs, notes: notes };
        }));
        return {
          counselor: staffAccount ? {
            id: staffAccount.id,
            name: staffAccount.name,
            email: staffAccount.email,
            role: staffAccount.role,
            isActive: staffAccount.isActive,
            lastLoginAt: staffAccount.lastLoginAt,
            createdAt: staffAccount.createdAt,
          } : { name: input.counselorName, email: '', role: 'counselor' as const, isActive: true },
          applications: appsWithDetails,
          stats: {
            totalStudents: appsWithDetails.length,
            byStatus: appsWithDetails.reduce((acc, app) => {
              acc[app.status] = (acc[app.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            totalDocuments: appsWithDetails.reduce((sum, app) => sum + app.documents.length, 0),
            totalNotes: appsWithDetails.reduce((sum, app) => sum + app.notes.length, 0),
          },
        };
      }),

    // Admin monitoring: get student detail with all applications, documents, notes, and conversations
    getStudentDetail: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return null;
        const app = await getApplicationById(input.applicationId);
        if (!app) return null;
        const docs = await getApplicationDocumentsByApplicationId(app.id);
        const notes = await getApplicationNotesByApplicationId(app.id);
        // Get conversation if student has one (match by email)
        let conversation = null;
        let conversationMessages: any[] = [];
        if (app.email) {
          const allConversations = await getAllConversations();
          conversation = allConversations.find(c => c.studentEmail?.toLowerCase() === app.email.toLowerCase()) || null;
          if (conversation) {
            conversationMessages = await getMessagesByConversationId(conversation.id);
          }
        }
        // Parse status history
        const statusHistory = app.statusHistory ? JSON.parse(app.statusHistory) : [];
        return {
          application: app,
          documents: docs,
          notes: notes,
          statusHistory,
          conversation,
          conversationMessages,
        };
      }),

    updateApplicationFull: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["submitted", "reviewing", "processing", "on_hold", "offer_received", "accepted", "enrolled", "rejected"]).optional(),
        assignedCounselor: z.string().optional(),
        universityResponse: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { success: false };
        const { id, ...data } = input;
        
        // If status is changing, update status history
        if (data.status) {
          const app = await getApplicationById(id);
          if (app) {
            const history = app.statusHistory ? JSON.parse(app.statusHistory) : [];
            history.push({
              status: data.status,
              timestamp: new Date().toISOString(),
              updatedBy: ctx.user.name || 'Admin',
            });
            (data as any).statusHistory = JSON.stringify(history);
          }
        }

        await updateApplication(id, data);

        // Send email notification when counselor is assigned
        if (data.assignedCounselor) {
          const app = await getApplicationById(id);
          if (app) {
            // Find the counselor's staff account to get their email
            const staffAccount = await getStaffAccountByName(data.assignedCounselor);
            if (staffAccount) {
              sendCounselorAssignmentEmail({
                to: staffAccount.email,
                counselorName: staffAccount.name,
                studentName: app.fullName,
                studentEmail: app.email,
                referenceNumber: app.referenceNumber || '',
                universities: app.selectedUniversities ? JSON.parse(app.selectedUniversities).map((u: any) => u.name || u.university).join(", ") : "N/A",
                dashboardUrl: "https://spectaeducation.com/staff-dashboard",
              }).catch(err => console.error("[Email] Counselor assignment email failed:", err));
            }
          }
        }

        return { success: true };
      }),
  }),

  application: router({
    submit: publicProcedure
      .input(z.object({
        fullName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
        currentSchool: z.string().optional(),
        educationLevel: z.string().optional(),
        selectedUniversities: z.string(),
        ieltsScore: z.string().optional(),
        transcriptUrl: z.string().optional(),
        transcriptKey: z.string().optional(),
        passportUrl: z.string().optional(),
        passportKey: z.string().optional(),
        ieltsDocUrl: z.string().optional(),
        ieltsDocKey: z.string().optional(),
        certificateUrl: z.string().optional(),
        certificateKey: z.string().optional(),
        additionalNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Generate reference number
        const referenceNumber = await generateReferenceNumber();
        
        const applicationData = {
          ...input,
          referenceNumber,
          statusHistory: JSON.stringify([{
            status: "submitted",
            timestamp: new Date().toISOString(),
            updatedBy: "System",
          }]),
        };

        const application = await createApplication(applicationData);
        if (application) {
          const unis = JSON.parse(input.selectedUniversities);
          const uniNames = unis.map((u: any) => `${u.university} (${u.country})`).join(", ");
          await notifyOwner({
            title: `New Application: ${input.fullName}`,
            content: `Reference: ${referenceNumber}\nStudent: ${input.fullName}\nEmail: ${input.email}\nPhone: ${input.phone}\nSchool: ${input.currentSchool || 'N/A'}\nApplying to: ${uniNames}\nIELTS: ${input.ieltsScore || 'N/A'}`
          });

          // Create applicationDocuments entries for uploaded files so they appear in unified Documents tab
          const appId = application.id;
          const docEntries: Array<{type: "transcript" | "passport" | "ielts" | "certificate" | "other"; label: string; url?: string; key?: string}> = [
            { type: "transcript", label: "Transcript", url: input.transcriptUrl, key: input.transcriptKey },
            { type: "passport", label: "Passport", url: input.passportUrl, key: input.passportKey },
            { type: "ielts", label: "IELTS Certificate", url: input.ieltsDocUrl, key: input.ieltsDocKey },
            { type: "certificate", label: "Certificate", url: input.certificateUrl, key: input.certificateKey },
          ];

          let docCount = 0;
          for (const doc of docEntries) {
            if (doc.url) {
              const fileName = doc.key ? doc.key.split('/').pop() || `${doc.type}.pdf` : `${doc.type}.pdf`;
              await createApplicationDocument({
                applicationId: appId,
                documentType: doc.type,
                fileName,
                fileType: "application/pdf",
                fileUrl: doc.url,
                fileKey: doc.key || fileName,
                uploadedBy: "student",
              });
              docCount++;
            }
          }

          // Send email notification about document uploads
          if (docCount > 0) {
            try {
              await sendDocumentNotificationEmail({
                to: "hadi@spectaeducation.com",
                studentName: input.fullName,
                studentEmail: input.email,
                documentType: `${docCount} document(s) via Quick Apply`,
                fileName: docEntries.filter(d => d.url).map(d => d.type).join(", "),
                source: "application",
                referenceNumber,
                dashboardUrl: "https://spectaeducation.com/admin",
              });
            } catch (e) {
              console.error("[Email] Failed to send document notification:", e);
            }
          }
        }
        return { success: true, application, referenceNumber };
      }),

    uploadDocument: publicProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(),
        fileType: z.string(),
        documentType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `applications/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        return { success: true, url, fileKey };
      }),

    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { applications: [] };
        const apps = await getAllApplications();
        return { applications: apps };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { application: null };
        const app = await getApplicationById(input.id);
        return { application: app };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["submitted", "reviewing", "processing", "on_hold", "offer_received", "accepted", "enrolled", "rejected"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { success: false };
        await updateApplication(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // Counselor management router
  counselor: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { counselors: [] };
      const allCounselors = await getAllCounselors();
      return { counselors: allCounselors };
    }),

    getActive: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { counselors: [] };
      const activeCounselors = await getAllCounselors(true);
      return { counselors: activeCounselors };
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        specialization: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { success: false, counselor: null };
        const counselor = await createCounselor(input);
        return { success: true, counselor };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        specialization: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { success: false };
        const { id, ...data } = input;
        await updateCounselor(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { success: false };
        await deleteCounselor(input.id);
        return { success: true };
      }),
  }),

  // "Which Country Fits You?" Quiz
  quiz: router({
    analyze: publicProcedure
      .input(z.object({
        answers: z.array(z.object({
          questionId: z.number(),
          questionText: z.string(),
          answer: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        try {
          const answersText = input.answers.map(a => `${a.questionText}: ${a.answer}`).join('\n');

          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `You are an expert education consultant for SpecTa Education, an Indonesian study abroad consultancy. Based on a student's quiz answers, analyze their preferences and match them with the best study abroad destinations.

You MUST respond with valid JSON matching this exact structure:
{
  "countries": [
    {
      "country": "Country Name",
      "flag": "emoji flag",
      "matchPercentage": 92,
      "tagline": "Short catchy reason why this country fits",
      "reasons": ["Reason 1", "Reason 2", "Reason 3"],
      "universities": [
        { "name": "University Name", "program": "Recommended program", "tuitionRange": "$X-$Y/year" }
      ],
      "monthlyCost": "$X-$Y",
      "popularMajors": ["Major 1", "Major 2"],
      "funFact": "An interesting or fun fact about studying in this country"
    }
  ]
}

Available countries: Australia, United Kingdom, USA, Canada, China, Malaysia, Singapore, Ireland, Netherlands, New Zealand.

Rules:
- Return exactly 5 countries ranked by match percentage (highest first)
- Match percentages should range from 60-98 (never 100)
- Consider budget, lifestyle, weather, career goals, IELTS readiness, and cultural preferences
- Recommend 2-3 universities per country that are realistic for Indonesian students
- Include a mix of top-ranked and accessible universities
- Make taglines fun and engaging
- Fun facts should be relatable to students`
              },
              {
                role: 'user',
                content: `Here are the student's quiz answers:\n\n${answersText}\n\nAnalyze these preferences and return the top 5 matching countries with details.`
              }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'quiz_results',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    countries: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          country: { type: 'string' },
                          flag: { type: 'string' },
                          matchPercentage: { type: 'integer' },
                          tagline: { type: 'string' },
                          reasons: { type: 'array', items: { type: 'string' } },
                          universities: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                name: { type: 'string' },
                                program: { type: 'string' },
                                tuitionRange: { type: 'string' }
                              },
                              required: ['name', 'program', 'tuitionRange'],
                              additionalProperties: false
                            }
                          },
                          monthlyCost: { type: 'string' },
                          popularMajors: { type: 'array', items: { type: 'string' } },
                          funFact: { type: 'string' }
                        },
                        required: ['country', 'flag', 'matchPercentage', 'tagline', 'reasons', 'universities', 'monthlyCost', 'popularMajors', 'funFact'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['countries'],
                  additionalProperties: false
                }
              }
            }
          });

          const content = response.choices?.[0]?.message?.content;
          if (!content) throw new Error('No response from AI');

          const parsed = JSON.parse(content as string);
          return { success: true, results: parsed.countries };
        } catch (error) {
          console.error('Quiz analysis error:', error);
          return { success: false, results: [] };
        }
      }),

    saveResult: publicProcedure
      .input(z.object({
        studentName: z.string().optional(),
        studentEmail: z.string().email().optional(),
        studentPhone: z.string().optional(),
        answers: z.string(), // JSON string
        matchedCountries: z.string(), // JSON string
        topMatch: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await createQuizResult(input);
          if (input.studentEmail) {
            await notifyOwner({
              title: '🎯 New Quiz Completed',
              content: `${input.studentName || 'A student'} (${input.studentEmail}) completed the Country Quiz. Top match: ${input.topMatch}.`,
            });

            // Auto-enroll in drip campaign
            try {
              await autoEnrollContact({
                email: input.studentEmail,
                name: input.studentName || "Student",
                phone: input.studentPhone,
                triggerSource: "quiz",
              });
            } catch (e) {
              console.error("[DripCampaign] Auto-enroll from quiz failed:", e);
            }
          }
          return { success: true, result };
        } catch (error) {
          console.error('Save quiz result error:', error);
          return { success: false, result: null };
        }
      }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { results: [] };
      const results = await getAllQuizResults();
      return { results };
    }),
  }),

  // "My Study Abroad Persona" Generator
  persona: router({
    generate: publicProcedure
      .input(z.object({
        answers: z.array(z.object({
          questionId: z.number(),
          questionText: z.string(),
          answer: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        try {
          const answersText = input.answers.map(a => `${a.questionText}: ${a.answer}`).join('\n');

          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `You are a creative personality analyst for SpecTa Education, an Indonesian study abroad consultancy. Based on a student's quick personality answers, generate a fun and shareable "Study Abroad Persona" card.

You MUST respond with valid JSON matching this exact structure:
{
  "personaName": "The Adventurous Foodie Scholar",
  "emoji": "single emoji that represents the persona",
  "tagline": "A fun one-liner about this persona (max 15 words)",
  "traits": ["Curious", "Food-driven", "Social", "Adaptable"],
  "idealCountry": "Australia",
  "idealCountryFlag": "emoji flag",
  "idealCountryReason": "Why this country matches their persona (1-2 sentences, fun tone)",
  "spiritUniversity": "University of Melbourne",
  "spiritUniReason": "Why this university matches (1 sentence, fun tone)",
  "studyStyle": "A fun description of how they study (1 sentence)",
  "socialStyle": "A fun description of their social life abroad (1 sentence)",
  "survivalTip": "A funny/useful survival tip for them abroad (1 sentence)",
  "bestBuddy": "The Library Ninja",
  "worstEnemy": "The Homesick Procrastinator",
  "packingEssential": "One quirky item they must pack (e.g., 'A rice cooker and 5kg of Indomie')",
  "futureHeadline": "A fun fake newspaper headline about them in 5 years (e.g., 'Indonesian Student Opens Best Nasi Goreng Restaurant in Melbourne')",
  "colorTheme": "one of: rose, amber, emerald, blue, violet, orange, cyan, fuchsia, indigo, teal"
}

Rules:
- Make persona names creative, fun, and memorable (like RPG character classes)
- Traits should be 4 personality adjectives
- Keep everything fun, positive, and relatable to Indonesian students
- The ideal country should genuinely match their answers
- Spirit university should be a real university in the ideal country
- Make the future headline funny and aspirational
- The packing essential should be culturally relevant and humorous
- Best buddy and worst enemy should be other fun persona names`
              },
              {
                role: 'user',
                content: `Here are the student's answers:\n\n${answersText}\n\nGenerate their Study Abroad Persona card.`
              }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'persona_result',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    personaName: { type: 'string' },
                    emoji: { type: 'string' },
                    tagline: { type: 'string' },
                    traits: { type: 'array', items: { type: 'string' } },
                    idealCountry: { type: 'string' },
                    idealCountryFlag: { type: 'string' },
                    idealCountryReason: { type: 'string' },
                    spiritUniversity: { type: 'string' },
                    spiritUniReason: { type: 'string' },
                    studyStyle: { type: 'string' },
                    socialStyle: { type: 'string' },
                    survivalTip: { type: 'string' },
                    bestBuddy: { type: 'string' },
                    worstEnemy: { type: 'string' },
                    packingEssential: { type: 'string' },
                    futureHeadline: { type: 'string' },
                    colorTheme: { type: 'string' }
                  },
                  required: ['personaName', 'emoji', 'tagline', 'traits', 'idealCountry', 'idealCountryFlag', 'idealCountryReason', 'spiritUniversity', 'spiritUniReason', 'studyStyle', 'socialStyle', 'survivalTip', 'bestBuddy', 'worstEnemy', 'packingEssential', 'futureHeadline', 'colorTheme'],
                  additionalProperties: false
                }
              }
            }
          });

          const content = response.choices?.[0]?.message?.content;
          if (!content) throw new Error('No response from AI');

          const parsed = JSON.parse(content as string);
          return { success: true, persona: parsed };
        } catch (error) {
          console.error('Persona generation error:', error);
          return { success: false, persona: null };
        }
      }),

    saveResult: publicProcedure
      .input(z.object({
        studentName: z.string().optional(),
        studentEmail: z.string().email().optional(),
        answers: z.string(),
        personaName: z.string(),
        personaData: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await createPersonaResult(input);
          if (input.studentEmail) {
            await notifyOwner({
              title: '🎭 New Persona Generated',
              content: `${input.studentName || 'A student'} (${input.studentEmail}) generated their Study Abroad Persona: "${input.personaName}".`,
            });
          }
          return { success: true, result };
        } catch (error) {
          console.error('Save persona result error:', error);
          return { success: false, result: null };
        }
      }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'general_manager') return { results: [] };
      const results = await getAllPersonaResults();
      return { results };
    }),
  }),

  // User role management (admin only)
  userManagement: router({
    getUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') return { users: [] };
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return { users: [] };
      const { users: usersTable } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const allUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
      return { users: allUsers };
    }),

    updateRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "general_manager"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') return { success: false };
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { success: false };
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(usersTable).set({ role: input.role }).where(eq(usersTable.id, input.userId));
        return { success: true };
      }),
  }),

  // Scholarship procedures
  scholarship: router({
    submitLead: publicProcedure
      .input(z.object({
        studentName: z.string().min(1),
        studentEmail: z.string().email(),
        studentPhone: z.string().min(1),
        educationLevel: z.string().min(1),
        gpa: z.string().min(1),
        scholarshipInterest: z.string().min(1),
        ieltsStatus: z.string().min(1),
        ieltsScore: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const lead = await createScholarshipLead({
          studentName: input.studentName,
          studentEmail: input.studentEmail,
          studentPhone: input.studentPhone,
          educationLevel: input.educationLevel,
          gpa: input.gpa,
          scholarshipInterest: input.scholarshipInterest,
          ieltsStatus: input.ieltsStatus,
          ieltsScore: input.ieltsScore || null,
        });

        // Notify owner about new scholarship lead
        const interestMap: Record<string, string> = {
          china: "China 100% Scholarship",
          mila_malaysia: "Mila University Malaysia",
          lpdp: "LPDP Scholarship",
          not_sure: "Not Sure Yet",
        };
        const scholarshipName = interestMap[input.scholarshipInterest] || input.scholarshipInterest;
        await notifyOwner({
          title: `New Scholarship Lead: ${input.studentName}`,
          content: `A new scholarship lead has been captured!\n\nName: ${input.studentName}\nEmail: ${input.studentEmail}\nPhone: ${input.studentPhone}\nEducation: ${input.educationLevel}\nGPA: ${input.gpa}\nInterested in: ${scholarshipName}\nIELTS: ${input.ieltsStatus}${input.ieltsScore ? ` (Score: ${input.ieltsScore})` : ""}`,
        });

        // Auto-enroll in drip campaign
        try {
          await autoEnrollContact({
            email: input.studentEmail,
            name: input.studentName,
            phone: input.studentPhone,
            triggerSource: "scholarship_form",
          });
        } catch (e) {
          console.error("[DripCampaign] Auto-enroll from scholarship failed:", e);
        }

        return { success: true, lead };
      }),

    getLeads: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
        return [];
      }
      return getAllScholarshipLeads();
    }),

    updateLead: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "contacted", "qualified", "converted", "closed"]).optional(),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          return { success: false };
        }
        const updateData: Record<string, unknown> = {};
        if (input.status) updateData.status = input.status;
        if (input.adminNotes !== undefined) updateData.adminNotes = input.adminNotes;
        await updateScholarshipLead(input.id, updateData as any);
        return { success: true };
      }),
  }),

  // ==========================================
  // STAFF ACCOUNT MANAGEMENT
  // ==========================================
  staffAuth: router({
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
        rememberMe: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const staff = await getStaffAccountByEmail(input.email);
        if (!staff || !staff.isActive) {
          return { success: false, error: "Invalid email or password" };
        }
        const valid = await bcrypt.compare(input.password, staff.passwordHash);
        if (!valid) {
          return { success: false, error: "Invalid email or password" };
        }
        // Update last login
        await updateStaffAccount(staff.id, { lastLoginAt: new Date() } as any);
        // Set session cookie using JWT (jose)
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const sessionDays = input.rememberMe ? 30 : 7;
        const token = await new SignJWT({ staffId: staff.id, email: staff.email, role: staff.role, name: staff.name })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime(`${sessionDays}d`)
          .sign(secretKey);
        ctx.res.cookie("staff_token", token, { ...getSessionCookieOptions(ctx.req), maxAge: sessionDays * 24 * 60 * 60 * 1000 });
        return {
          success: true,
          staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, mustChangePassword: staff.mustChangePassword },
        };
      }),

    me: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { staff: null };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload: decoded } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staff = await getStaffAccountById(decoded.staffId as number);
        if (!staff || !staff.isActive) return { staff: null };
        return {
          staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, mustChangePassword: staff.mustChangePassword },
        };
      } catch {
        return { staff: null };
      }
    }),

    changePassword: publicProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload: decoded } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          const staff = await getStaffAccountById(decoded.staffId as number);
          if (!staff) return { success: false, error: "Account not found" };
          const valid = await bcrypt.compare(input.currentPassword, staff.passwordHash);
          if (!valid) return { success: false, error: "Current password is incorrect" };
          const newHash = await bcrypt.hash(input.newPassword, 10);
          await updateStaffAccount(staff.id, { passwordHash: newHash, mustChangePassword: false } as any);
          return { success: true };
        } catch {
          return { success: false, error: "Authentication error" };
        }
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      ctx.res.clearCookie("staff_token", { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true };
    }),

    getMyApplications: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { applications: [] };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload: decoded } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staff = await getStaffAccountById(decoded.staffId as number);
        if (!staff || !staff.isActive) return { applications: [] };
        // Get applications assigned to this staff member by name
        const apps = await getApplicationsByCounselorName(staff.name);
        // For each application, get its documents and notes
        const appsWithDetails = await Promise.all(apps.map(async (app) => {
          const docs = await getApplicationDocumentsByApplicationId(app.id);
          const notes = await getApplicationNotesByApplicationId(app.id);
          return { ...app, documents: docs, notes: notes };
        }));
        return { applications: appsWithDetails };
      } catch {
        return { applications: [] };
      }
    }),

    uploadDocumentForStudent: publicProcedure
      .input(z.object({
        applicationId: z.number(),
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // base64
        documentType: z.enum(["transcript", "passport", "ielts", "certificate", "offer_letter", "visa", "other"]).default("other"),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload: decoded } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          const staff = await getStaffAccountById(decoded.staffId as number);
          if (!staff || !staff.isActive) return { success: false, error: "Not authenticated" };
          // Upload file to S3
          const buffer = Buffer.from(input.fileData, "base64");
          const fileKey = `counselor-uploads/${staff.id}/${Date.now()}-${input.fileName}`;
          const { url } = await storagePut(fileKey, buffer, input.fileType);
          // Create document record
          await createApplicationDocument({
            applicationId: input.applicationId,
            fileName: input.fileName,
            fileType: input.fileType,
            fileUrl: url,
            fileKey: fileKey,
            documentType: input.documentType,
            uploadedBy: "counselor",
          });
          // Notify student via email
          const appForNotif = await getApplicationById(input.applicationId);
          if (appForNotif?.email) {
            sendStudentNotificationEmail({
              to: appForNotif.email,
              studentName: appForNotif.fullName,
              counselorName: staff.name,
              actionType: "document_uploaded",
              actionDetails: `Document "${input.fileName}" (${input.documentType}) has been uploaded to your application.`,
              referenceNumber: appForNotif.referenceNumber || '',
              trackUrl: `https://spectaeducation.com/track/${appForNotif.referenceNumber}`,
            }).catch(err => console.error("[Email] Student notification failed:", err));
          }
          return { success: true, url };
        } catch (err: any) {
          return { success: false, error: err.message || "Upload failed" };
        }
      }),

    updateApplicationStatus: publicProcedure
      .input(z.object({
        applicationId: z.number(),
        status: z.enum(["submitted", "reviewing", "processing", "on_hold", "offer_received", "accepted", "enrolled", "rejected"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload: decoded } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          const staff = await getStaffAccountById(decoded.staffId as number);
          if (!staff || !staff.isActive) return { success: false, error: "Not authenticated" };
          // Verify this application is assigned to this counselor
          const app = await getApplicationById(input.applicationId);
          if (!app || app.assignedCounselor?.toLowerCase() !== staff.name.toLowerCase()) {
            return { success: false, error: "Application not assigned to you" };
          }
          // Update status with history
          const history = app.statusHistory ? JSON.parse(app.statusHistory) : [];
          history.push({
            status: input.status,
            timestamp: new Date().toISOString(),
            updatedBy: staff.name + " (Counselor)",
          });
          await updateApplication(input.applicationId, {
            status: input.status,
            statusHistory: JSON.stringify(history),
          });
          // Notify student via email about status change
          if (app?.email) {
            sendStudentNotificationEmail({
              to: app.email,
              studentName: app.fullName,
              counselorName: staff.name,
              actionType: "status_updated",
              actionDetails: `Your application status has been changed to "${input.status.replace(/_/g, " ").toUpperCase()}".`,
              referenceNumber: app.referenceNumber || '',
              trackUrl: `https://spectaeducation.com/track/${app.referenceNumber}`,
            }).catch(err => console.error("[Email] Student notification failed:", err));
          }
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || "Failed to update status" };
        }
      }),

    addNoteForStudent: publicProcedure
      .input(z.object({
        applicationId: z.number(),
        content: z.string().min(1),
        isPublic: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload: decoded } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          const staff = await getStaffAccountById(decoded.staffId as number);
          if (!staff || !staff.isActive) return { success: false, error: "Not authenticated" };
          await createApplicationNote({
            applicationId: input.applicationId,
            authorName: staff.name + " (Counselor)",
            content: input.content,
            isPublic: input.isPublic,
          });
          // Notify student via email (only for public notes)
          if (input.isPublic) {
            const appForNote = await getApplicationById(input.applicationId);
            if (appForNote?.email) {
              sendStudentNotificationEmail({
                to: appForNote.email,
                studentName: appForNote.fullName,
                counselorName: staff.name,
                actionType: "note_added",
                actionDetails: input.content.substring(0, 200) + (input.content.length > 200 ? "..." : ""),
                referenceNumber: appForNote.referenceNumber || '',
                trackUrl: `https://spectaeducation.com/track/${appForNote.referenceNumber}`,
              }).catch(err => console.error("[Email] Student notification failed:", err));
            }
          }
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || "Failed to add note" };
        }
      }),
  }),

  // ==========================================
  // STAFF MANAGEMENT (Admin only)
  // ==========================================
  staffManagement: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") return { staff: [] };
      const allStaff = await getAllStaffAccounts();
      return {
        staff: allStaff.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role,
          isActive: s.isActive,
          mustChangePassword: s.mustChangePassword,
          lastLoginAt: s.lastLoginAt,
          createdAt: s.createdAt,
        })),
      };
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["admin", "counselor", "staff"]),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        // Check if email already exists
        const existing = await getStaffAccountByEmail(input.email);
        if (existing) return { success: false, error: "Email already registered" };
        const passwordHash = await bcrypt.hash(input.password, 10);
        const staff = await createStaffAccount({
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          mustChangePassword: true,
          isActive: true,
        });
        // Send welcome email
        const loginUrl = `https://spectaeducation.com/staff-login`;
        sendStaffWelcomeEmail({
          to: input.email,
          name: input.name,
          role: input.role,
          password: input.password,
          loginUrl,
        }).catch(err => console.error("[StaffMgmt] Welcome email failed:", err));
        return { success: true, staff };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(["admin", "counselor", "staff"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        const { id, ...data } = input;
        await updateStaffAccount(id, data as any);
        return { success: true };
      }),

    resetPassword: protectedProcedure
      .input(z.object({
        id: z.number(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        const staff = await getStaffAccountById(input.id);
        if (!staff) return { success: false, error: "Staff not found" };
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await updateStaffAccount(input.id, { passwordHash, mustChangePassword: true } as any);
        // Send password reset email
        const loginUrl = `https://spectaeducation.com/staff-login`;
        sendPasswordResetEmail({
          to: staff.email,
          name: staff.name,
          newPassword: input.newPassword,
          loginUrl,
        }).catch(err => console.error("[StaffMgmt] Password reset email failed:", err));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        await deleteStaffAccount(input.id);
        return { success: true };
      }),
  }),

  // ==========================================
  // ADMIN DELETE OPERATIONS
  // ==========================================
  adminDelete: router({
    deleteApplication: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        await deleteApplication(input.id);
        return { success: true };
      }),

    deleteDocument: protectedProcedure
      .input(z.object({ id: z.number(), type: z.enum(["chatbot", "application"]) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        if (input.type === "chatbot") {
          await deleteDocument(input.id);
        } else {
          await deleteApplicationDocument(input.id);
        }
        return { success: true };
      }),

    deleteLead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        await deleteLead(input.id);
        return { success: true };
      }),

    deleteAppointment: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        await deleteAppointment(input.id);
        return { success: true };
      }),

    deleteCounselor: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        await deleteCounselor(input.id);
        return { success: true };
      }),

    deleteScholarshipLead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        await deleteScholarshipLead(input.id);
        return { success: true };
      }),

     deleteConversation: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized" };
        await deleteConversation(input.id);
        return { success: true };
      }),

    getDataCounts: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") return { counts: {} };
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) return { counts: {} };
      const { sql } = await import("drizzle-orm");
      const schema = await import("../drizzle/schema");
      const count = async (table: any): Promise<number> => {
        try {
          const [r] = await db.select({ n: sql<number>`COUNT(*)` }).from(table);
          return Number((r as any).n);
        } catch { return 0; }
      };
      return {
        counts: {
          crmLeads: await count(schema.leads),
          applications: await count(schema.applications),
          appointments: await count(schema.appointments),
          conversations: await count(schema.conversations),
          dripEnrollments: await count(schema.dripEnrollments),
          dripEmailLogs: await count(schema.dripEmailLogs),
          agentRunLogs: await count(schema.agentRunLogs),
          dailyReports: await count(schema.dailyReports),
          gmReports: await count(schema.gmExecutiveReports),
          studentAccounts: await count(schema.studentPortalAccounts),
          studentChats: await count(schema.studentAiChatHistory),
          visitorTracking: await count(schema.visitorTracking),
          aptitudeResults: await count(schema.aptitudeResults),
          ieltsPracticeResults: await count(schema.ieltsPracticeResults),
          simulatorSessions: await count(schema.simulatorSessions),
          crmDocuments: await count(schema.crmStudentDocuments),
          followUpActions: await count(schema.followUpActions),
        }
      };
    }),

    bulkClear: protectedProcedure
      .input(z.object({
        category: z.enum([
          "drip_enrollments",
          "crm_leads",
          "student_portal",
          "agent_logs",
          "visitor_tracking",
          "conversations",
          "aptitude_results",
          "all_student_data",
        ])
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") return { success: false, error: "Unauthorized", deleted: 0 };
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { success: false, error: "DB unavailable", deleted: 0 };
        const schema = await import("../drizzle/schema");
        let deleted = 0;
        const del = async (table: any) => {
          try { const r = await db.delete(table); deleted += (r as any).rowsAffected || 0; }
          catch (e) { console.error("[BulkClear] error:", e); }
        };
        switch (input.category) {
          case "drip_enrollments":
            await del(schema.dripEmailLogs); await del(schema.dripEnrollments); break;
          case "crm_leads":
            await del(schema.followUpActions); await del(schema.leadAssignments);
            await del(schema.crmTasks); await del(schema.crmActivityTimeline);
            await del(schema.crmNotifications); await del(schema.crmStudentDocuments);
            await del(schema.crmAppointments); await del(schema.consultationNotes);
            await del(schema.aiFollowupSuggestions); await del(schema.leadPipelineStages);
            await del(schema.counselorPerformance); await del(schema.applications);
            await del(schema.appointments); await del(schema.leads); break;
          case "student_portal":
            await del(schema.studentNotifications); await del(schema.studentRewards);
            await del(schema.studentReferrals); await del(schema.studentReferralCodes);
            await del(schema.studentAiChatHistory); await del(schema.studentUniversityWishlist);
            await del(schema.studentPortalAppointments); await del(schema.studentPortalProfiles);
            await del(schema.studentApplications); await del(schema.studentVisaTracking);
            await del(schema.studentPortalAccounts); break;
          case "agent_logs":
            await del(schema.agentRunLogs); await del(schema.dailyReports);
            await del(schema.gmExecutiveReports); await del(schema.gmHealthChecks);
            await del(schema.gmRecommendations); break;
          case "visitor_tracking":
            await del(schema.visitorTracking); break;
          case "conversations":
            await del(schema.messages); await del(schema.conversations); break;
          case "aptitude_results":
            await del(schema.aptitudeResults); await del(schema.ieltsPracticeResults);
            await del(schema.simulatorChoices); await del(schema.simulatorResults);
            await del(schema.simulatorSessions); break;
          case "all_student_data":
            await del(schema.studentNotifications); await del(schema.studentRewards);
            await del(schema.studentReferrals); await del(schema.studentReferralCodes);
            await del(schema.studentAiChatHistory); await del(schema.studentUniversityWishlist);
            await del(schema.studentPortalAppointments); await del(schema.studentPortalProfiles);
            await del(schema.studentApplications); await del(schema.studentVisaTracking);
            await del(schema.studentPortalAccounts); await del(schema.crmNotifications);
            await del(schema.crmActivityTimeline); await del(schema.crmAppointments);
            await del(schema.crmStudentDocuments); await del(schema.aiFollowupSuggestions);
            await del(schema.consultationNotes); await del(schema.followUpActions);
            await del(schema.leadAssignments); await del(schema.leadPipelineStages);
            await del(schema.crmTasks); await del(schema.counselorPerformance);
            await del(schema.applications); await del(schema.appointments);
            await del(schema.leads); await del(schema.dripEmailLogs);
            await del(schema.dripEnrollments); await del(schema.aptitudeResults);
            await del(schema.ieltsPracticeResults); await del(schema.simulatorChoices);
            await del(schema.simulatorResults); await del(schema.simulatorSessions);
            await del(schema.messages); await del(schema.conversations);
            await del(schema.visitorTracking); break;
        }
        return { success: true, deleted };
      }),
  }),
  // ==========================================
  // APTITUDE TEST ROUTER
  // ==========================================
  aptitude: router({
    analyzeResults: publicProcedure
      .input(z.object({
        language: z.enum(["id", "en"]),
        riasecAnswers: z.record(z.string(), z.number()),
        miAnswers: z.record(z.string(), z.number()),
        personalAnswers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
        studentName: z.string().min(1),
        studentEmail: z.string().email(),
        studentPhone: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        // 1. Calculate RIASEC scores
        const riasecDimensions = ["R", "I", "A", "S", "E", "C"];
        const riasecScores: Record<string, number> = {};
        for (const dim of riasecDimensions) {
          const keys = Object.keys(input.riasecAnswers).filter(k => k.startsWith(dim));
          const total = keys.reduce((sum, k) => sum + (input.riasecAnswers[k] || 3), 0);
          riasecScores[dim] = Math.round((total / (keys.length || 1)) * 20); // Normalize to 0-100
        }

        // 2. Calculate MI scores
        const miDimensions = ["linguistic", "logical", "spatial", "musical", "kinesthetic", "interpersonal", "intrapersonal", "naturalistic"];
        const miScores: Record<string, number> = {};
        for (const dim of miDimensions) {
          const keys = Object.keys(input.miAnswers).filter(k => k.startsWith("MI_" + dim.substring(0, 2).toUpperCase()));
          const total = keys.reduce((sum, k) => sum + (input.miAnswers[k] || 3), 0);
          miScores[dim] = Math.round((total / (keys.length || 1)) * 20); // Normalize to 0-100
        }

        // 3. Determine Holland Code (top 3)
        const sortedRiasec = Object.entries(riasecScores).sort((a, b) => b[1] - a[1]);
        const hollandCode = sortedRiasec.slice(0, 3).map(([k]) => k).join("");

        // 4. Determine top intelligences (top 3)
        const sortedMI = Object.entries(miScores).sort((a, b) => b[1] - a[1]);
        const topIntelligences = sortedMI.slice(0, 3).map(([k]) => k);

        // 5. AI Analysis
        const lang = input.language === "id" ? "Bahasa Indonesia" : "English";
        const personalContext = JSON.stringify(input.personalAnswers);

        const aiPrompt = `You are a professional career psychologist analyzing an aptitude test result. Respond ENTIRELY in ${lang}.

Student: ${input.studentName}
Holland Code: ${hollandCode}
RIASEC Scores: ${JSON.stringify(riasecScores)}
Top 3 RIASEC: ${sortedRiasec.slice(0, 3).map(([k, v]) => `${k}=${v}`).join(", ")}
Multiple Intelligence Scores: ${JSON.stringify(miScores)}
Top 3 Intelligences: ${topIntelligences.join(", ")}
Personal Context: ${personalContext}

Provide a comprehensive analysis in the following JSON format:
{
  "personalitySnapshot": {
    "title": "A catchy 3-5 word title for their personality type (e.g., 'Si Pemikir Kreatif' or 'The Creative Thinker')",
    "emoji": "2-3 relevant emojis",
    "description": "A warm, encouraging 2-3 sentence description of who they are based on their RIASEC + MI combination. Make it feel personal, not generic."
  },
  "riasecAnalysis": "A 2-3 sentence analysis of their RIASEC profile. Explain what their Holland Code means for them specifically. Be warm and encouraging.",
  "miAnalysis": "A 2-3 sentence analysis of their top intelligences. Explain how these strengths can be applied. Be encouraging.",
  "crossAnalysis": "A 2-3 sentence analysis of how their RIASEC profile and MI profile work TOGETHER. This is the unique insight that simple tests don't provide.",
  "recommendedMajors": [
    {
      "name": "Major name",
      "compatibilityScore": 85-98,
      "reason": "2-3 sentences explaining WHY this major fits them specifically based on their unique combination of interests and intelligences.",
      "careers": ["Career 1", "Career 2", "Career 3"]
    }
  ],
  "careerOutlook": "A 3-4 sentence overview of career prospects for their recommended majors. Include salary range expectations and job market outlook. Be realistic but encouraging.",
  "parentSummary": "A 3-4 sentence professional summary written FOR PARENTS. Explain why these majors are a good fit for their child, mention career prospects, and reassure them. Use respectful, formal tone ${input.language === "id" ? "(use 'Bapak/Ibu' and formal Indonesian)" : ""}.",
  "studyTips": "2-3 practical tips for the student on how to prepare for their recommended majors."
}

IMPORTANT:
- Recommend exactly 3 majors, ordered by compatibility score (highest first)
- Compatibility scores should be realistic (75-98 range), not all the same
- Make the analysis feel PERSONAL to this specific student, not generic
- Cross-reference RIASEC with MI for unique insights
- Be warm, encouraging, and supportive throughout`;

        const aiResponse = await invokeLLM({ model: "deepseek-v4-pro",
          messages: [
            { role: "system", content: "You are a professional career psychologist. Always respond with valid JSON only, no markdown formatting." },
            { role: "user", content: aiPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "aptitude_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  personalitySnapshot: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      emoji: { type: "string" },
                      description: { type: "string" }
                    },
                    required: ["title", "emoji", "description"],
                    additionalProperties: false
                  },
                  riasecAnalysis: { type: "string" },
                  miAnalysis: { type: "string" },
                  crossAnalysis: { type: "string" },
                  recommendedMajors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        compatibilityScore: { type: "number" },
                        reason: { type: "string" },
                        careers: { type: "array", items: { type: "string" } }
                      },
                      required: ["name", "compatibilityScore", "reason", "careers"],
                      additionalProperties: false
                    }
                  },
                  careerOutlook: { type: "string" },
                  parentSummary: { type: "string" },
                  studyTips: { type: "string" }
                },
                required: ["personalitySnapshot", "riasecAnalysis", "miAnalysis", "crossAnalysis", "recommendedMajors", "careerOutlook", "parentSummary", "studyTips"],
                additionalProperties: false
              }
            }
          }
        });

        let aiAnalysis;
        try {
          const rawContent = aiResponse.choices?.[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : "{}";
          aiAnalysis = JSON.parse(content);
        } catch {
          aiAnalysis = { error: "Failed to parse AI analysis" };
        }

        // 6. Save to database
        const saved = await createAptitudeResult({
          studentName: input.studentName,
          studentEmail: input.studentEmail,
          studentPhone: input.studentPhone,
          language: input.language,
          riasecAnswers: JSON.stringify(input.riasecAnswers),
          miAnswers: JSON.stringify(input.miAnswers),
          personalAnswers: JSON.stringify(input.personalAnswers),
          riasecScores: JSON.stringify(riasecScores),
          miScores: JSON.stringify(miScores),
          hollandCode,
          topIntelligences: JSON.stringify(topIntelligences),
          aiAnalysis: JSON.stringify(aiAnalysis),
          personalitySnapshot: aiAnalysis.personalitySnapshot ? JSON.stringify(aiAnalysis.personalitySnapshot) : null,
          recommendedMajors: JSON.stringify(aiAnalysis.recommendedMajors || []),
          careerOutlook: aiAnalysis.careerOutlook || null,
          parentSummary: aiAnalysis.parentSummary || null,
        });

        // 7. Notify owner about new lead
        notifyOwner({
          title: "New Aptitude Test Completed",
          content: `${input.studentName} (${input.studentEmail}) completed the aptitude test.\nPhone: ${input.studentPhone}\nHolland Code: ${hollandCode}\nTop majors: ${(aiAnalysis.recommendedMajors || []).map((m: any) => m.name).join(", ")}.`,
        }).catch(() => {});

        // Auto-enroll in drip campaign (aptitude test upsell)
        try {
          await autoEnrollContact({
            email: input.studentEmail,
            name: input.studentName,
            phone: input.studentPhone,
            triggerSource: "aptitude_test",
          });
        } catch (e) {
          console.error("[DripCampaign] Auto-enroll from aptitude test failed:", e);
        }

        // 8. Generate PDF and send results email with attachment
        let freePdfBuffer: Buffer | undefined;
        try {
          freePdfBuffer = await generatePdfReport({
            studentName: input.studentName,
            language: input.language,
            hollandCode,
            riasecScores,
            miScores,
            aiAnalysis,
          });
          console.log(`[Aptitude] PDF generated for ${input.studentName} (${freePdfBuffer.length} bytes)`);
        } catch (pdfErr) {
          console.error("[Aptitude] PDF generation failed:", pdfErr);
        }

        sendAptitudeResultReliable({
          to: input.studentEmail,
          studentName: input.studentName,
          language: input.language,
          hollandCode,
          riasecScores,
          miScores,
          aiAnalysis,
          pdfBuffer: freePdfBuffer,
        });

        return {
          success: true,
          resultId: saved?.id,
          riasecScores,
          miScores,
          hollandCode,
          topIntelligences,
          aiAnalysis,
        };
      }),

    analyzeProResults: publicProcedure
      .input(z.object({
        studentName: z.string().min(1),
        studentEmail: z.string().email(),
        studentPhone: z.string(),
        profilDiri: z.record(z.string(), z.string()),
        riasecScores: z.record(z.string(), z.number()),
        riasecAnswers: z.record(z.string(), z.number()),
        miScores: z.record(z.string(), z.number()),
        miAnswers: z.record(z.string(), z.string()),
        personalityProfile: z.record(z.string(), z.array(z.string())),
        personalityAnswers: z.record(z.string(), z.string()),
        sjtProfile: z.record(z.string(), z.number()),
        sjtAnswers: z.record(z.string(), z.string()),
        creativeAnswers: z.record(z.string(), z.string()),
        rankingAnswers: z.record(z.string(), z.array(z.string())),
        language: z.enum(["id", "en"]),
      }))
      .mutation(async ({ input }) => {
        const lang = input.language === "id" ? "Bahasa Indonesia" : "English";

        // Build comprehensive data summary for AI
        const sortedRiasec = Object.entries(input.riasecScores).sort((a, b) => b[1] - a[1]);
        const hollandCode = sortedRiasec.slice(0, 3).map(([k]) => k).join("");
        const sortedMI = Object.entries(input.miScores).sort((a, b) => b[1] - a[1]);
        const topIntelligences = sortedMI.slice(0, 3).map(([k]) => k);

        // Personality traits summary
        const personalityTraits = Object.entries(input.personalityProfile)
          .map(([dim, traits]) => `${dim}: ${traits.join(", ")}`)
          .join("; ");

        // SJT traits summary
        const sjtTraits = Object.entries(input.sjtProfile)
          .sort((a, b) => b[1] - a[1])
          .map(([trait, count]) => `${trait} (${count})`)
          .join(", ");

        // Creative answers summary
        const creativeResponses = Object.entries(input.creativeAnswers)
          .map(([id, answer]) => `[${id}]: ${answer}`)
          .join("\n");

        // Ranking priorities
        const rankingPriorities = Object.entries(input.rankingAnswers)
          .map(([id, order]) => `[${id}]: ${order.join(" > ")}`)
          .join("\n");

        // Profil diri context
        const profilContext = Object.entries(input.profilDiri)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");

        const aiPrompt = `You are a world-class career psychologist and educational counselor conducting a PREMIUM comprehensive aptitude assessment. This is a paid professional assessment — your analysis must be thorough, deeply personalized, and worth the investment. Respond ENTIRELY in ${lang}.

=== STUDENT PROFILE ===
Name: ${input.studentName}
Profile: ${profilContext}

=== DIMENSION 1: CAREER INTERESTS (RIASEC) ===
Holland Code: ${hollandCode}
Scores: ${JSON.stringify(input.riasecScores)}
Top 3: ${sortedRiasec.slice(0, 3).map(([k, v]) => `${k}=${v}`).join(", ")}

=== DIMENSION 2: MULTIPLE INTELLIGENCES ===
Scores: ${JSON.stringify(input.miScores)}
Top 3: ${topIntelligences.join(", ")}

=== DIMENSION 3: PERSONALITY & VALUES (Big Five) ===
Traits: ${personalityTraits}

=== DIMENSION 4: SITUATIONAL JUDGMENT ===
Soft Skills Profile: ${sjtTraits}

=== DIMENSION 5: CREATIVE THINKING (Open-Ended Responses) ===
${creativeResponses}

=== DIMENSION 6: LIFE PRIORITIES (Rankings) ===
${rankingPriorities}

Provide an extremely comprehensive, deeply personalized analysis in the following JSON format. This is a PREMIUM report — make every section substantial and insightful:
{
  "personalitySnapshot": {
    "title": "A catchy, memorable 3-5 word title for their unique personality archetype",
    "emoji": "3-4 relevant emojis",
    "description": "A warm, deeply personal 4-5 sentence description synthesizing ALL 7 dimensions. This should feel like the student is truly SEEN and understood. Reference specific answers they gave."
  },
  "bigFiveProfile": {
    "openness": { "level": "high/medium/low", "description": "2 sentences about their openness to experience" },
    "conscientiousness": { "level": "high/medium/low", "description": "2 sentences" },
    "extraversion": { "level": "high/medium/low", "description": "2 sentences" },
    "agreeableness": { "level": "high/medium/low", "description": "2 sentences" },
    "neuroticism": { "level": "high/medium/low", "description": "2 sentences" }
  },
  "riasecAnalysis": "3-4 sentences analyzing their RIASEC profile in depth. Explain what their Holland Code means specifically for their career path.",
  "miAnalysis": "3-4 sentences analyzing their intelligence profile. Explain how their top intelligences create unique advantages.",
  "softSkillsAnalysis": "3-4 sentences analyzing their situational judgment responses. What leadership style do they have? How do they handle conflict? What team role suits them?",
  "creativeThinkingAnalysis": "3-4 sentences analyzing their open-ended responses. What does their writing reveal about their thinking style, values, and aspirations? Be specific — quote or reference their actual answers.",
  "valuesAnalysis": "3-4 sentences analyzing their ranking priorities. What drives them? What do they value most in life and career?",
  "crossDimensionalInsight": "4-5 sentences providing a UNIQUE insight that only emerges when you cross-reference ALL 7 dimensions together. This is the premium value — the insight they can't get from any single test.",
  "recommendedMajors": [
    {
      "name": "Major name",
      "compatibilityScore": 85-98,
      "reason": "3-4 sentences explaining WHY this major fits based on their unique multi-dimensional profile. Reference specific dimensions.",
      "careers": ["Career 1", "Career 2", "Career 3", "Career 4"],
      "salaryRange": "Expected salary range in IDR",
      "growthOutlook": "1 sentence about job market growth"
    }
  ],
  "strengthsAndWeaknesses": {
    "strengths": ["Strength 1 with explanation", "Strength 2", "Strength 3", "Strength 4", "Strength 5"],
    "areasForGrowth": ["Area 1 with constructive advice", "Area 2", "Area 3"]
  },
  "learningStyle": "2-3 sentences about their optimal learning environment and study approach based on their MI and personality profile.",
  "careerOutlook": "4-5 sentences providing a comprehensive career outlook. Include salary expectations, industry trends, and how their unique combination of skills positions them in the job market.",
  "parentSummary": "5-6 sentences written FOR PARENTS in formal, respectful tone ${input.language === "id" ? "(use 'Bapak/Ibu' and formal Indonesian)" : ""}. Explain the child's unique strengths across all dimensions, why the recommended majors fit, career prospects, and reassurance about their future. This should be substantial enough to convince a skeptical parent.",
  "actionPlan": [
    "Specific action step 1 the student should take now",
    "Action step 2",
    "Action step 3",
    "Action step 4",
    "Action step 5"
  ]
}

IMPORTANT:
- Recommend exactly 5 majors, ordered by compatibility (highest first)
- Compatibility scores should be realistic (75-98), varied, not all the same
- Make EVERY section deeply personal — reference their specific answers and profile
- The cross-dimensional insight must be genuinely unique and valuable
- Be warm, encouraging, professional, and thorough throughout
- This is a PREMIUM paid assessment — quality must exceed free online tests`;

        const aiResponse = await invokeLLM({ model: "deepseek-v4-pro",
          messages: [
            { role: "system", content: "You are a world-class career psychologist providing premium aptitude assessments. Always respond with valid JSON only, no markdown formatting." },
            { role: "user", content: aiPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "pro_aptitude_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  personalitySnapshot: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      emoji: { type: "string" },
                      description: { type: "string" }
                    },
                    required: ["title", "emoji", "description"],
                    additionalProperties: false
                  },
                  bigFiveProfile: {
                    type: "object",
                    properties: {
                      openness: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false },
                      conscientiousness: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false },
                      extraversion: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false },
                      agreeableness: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false },
                      neuroticism: { type: "object", properties: { level: { type: "string" }, description: { type: "string" } }, required: ["level", "description"], additionalProperties: false }
                    },
                    required: ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"],
                    additionalProperties: false
                  },
                  riasecAnalysis: { type: "string" },
                  miAnalysis: { type: "string" },
                  softSkillsAnalysis: { type: "string" },
                  creativeThinkingAnalysis: { type: "string" },
                  valuesAnalysis: { type: "string" },
                  crossDimensionalInsight: { type: "string" },
                  recommendedMajors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        compatibilityScore: { type: "number" },
                        reason: { type: "string" },
                        careers: { type: "array", items: { type: "string" } },
                        salaryRange: { type: "string" },
                        growthOutlook: { type: "string" }
                      },
                      required: ["name", "compatibilityScore", "reason", "careers", "salaryRange", "growthOutlook"],
                      additionalProperties: false
                    }
                  },
                  strengthsAndWeaknesses: {
                    type: "object",
                    properties: {
                      strengths: { type: "array", items: { type: "string" } },
                      areasForGrowth: { type: "array", items: { type: "string" } }
                    },
                    required: ["strengths", "areasForGrowth"],
                    additionalProperties: false
                  },
                  learningStyle: { type: "string" },
                  careerOutlook: { type: "string" },
                  parentSummary: { type: "string" },
                  actionPlan: { type: "array", items: { type: "string" } }
                },
                required: ["personalitySnapshot", "bigFiveProfile", "riasecAnalysis", "miAnalysis", "softSkillsAnalysis", "creativeThinkingAnalysis", "valuesAnalysis", "crossDimensionalInsight", "recommendedMajors", "strengthsAndWeaknesses", "learningStyle", "careerOutlook", "parentSummary", "actionPlan"],
                additionalProperties: false
              }
            }
          }
        });

        let aiAnalysis;
        try {
          const rawContent = aiResponse.choices?.[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : "{}";
          aiAnalysis = JSON.parse(content);
        } catch {
          aiAnalysis = { error: "Failed to parse AI analysis" };
        }

        // Save to database (reuse existing table)
        const saved = await createAptitudeResult({
          studentName: input.studentName,
          studentEmail: input.studentEmail,
          studentPhone: input.studentPhone,
          language: input.language,
          riasecAnswers: JSON.stringify(input.riasecAnswers),
          miAnswers: JSON.stringify(input.miAnswers),
          personalAnswers: JSON.stringify({
            profil: input.profilDiri,
            personality: input.personalityAnswers,
            sjt: input.sjtAnswers,
            creative: input.creativeAnswers,
            ranking: input.rankingAnswers,
          }),
          riasecScores: JSON.stringify(input.riasecScores),
          miScores: JSON.stringify(input.miScores),
          hollandCode,
          topIntelligences: JSON.stringify(topIntelligences),
          aiAnalysis: JSON.stringify(aiAnalysis),
          personalitySnapshot: aiAnalysis.personalitySnapshot ? JSON.stringify(aiAnalysis.personalitySnapshot) : null,
          recommendedMajors: JSON.stringify(aiAnalysis.recommendedMajors || []),
          careerOutlook: aiAnalysis.careerOutlook || null,
          parentSummary: aiAnalysis.parentSummary || null,
        });

        // Notify owner
        notifyOwner({
          title: "🌟 New PRO Aptitude Test Completed",
          content: `${input.studentName} (${input.studentEmail}) completed the PRO aptitude test. Holland Code: ${hollandCode}. Top majors: ${(aiAnalysis.recommendedMajors || []).slice(0, 3).map((m: any) => m.name).join(", ")}.`,
        }).catch(() => {});

        // Generate PDF report server-side
        let pdfBuffer: Buffer | undefined;
        let pdfUrl: string | undefined;
        try {
          pdfBuffer = await generatePdfReport({
            studentName: input.studentName,
            language: input.language,
            hollandCode,
            riasecScores: input.riasecScores,
            miScores: input.miScores,
            aiAnalysis,
            isPro: true,
          });
          console.log(`[AptitudePro] PDF generated for ${input.studentName} (${pdfBuffer.length} bytes)`);

          // Upload PDF to S3 for download link
          pdfUrl = await generateAndUploadPdfReport({
            studentName: input.studentName,
            language: input.language,
            hollandCode,
            riasecScores: input.riasecScores,
            miScores: input.miScores,
            aiAnalysis,
          });
          console.log(`[AptitudePro] PDF uploaded to S3: ${pdfUrl}`);
        } catch (pdfErr) {
          console.error("[AptitudePro] PDF generation failed (email will be sent without attachment):", pdfErr);
        }

        // Send premium results email with PDF attachment (isPro = true, no upsell)
        sendAptitudeResultReliable({
          to: input.studentEmail,
          studentName: input.studentName,
          language: input.language,
          hollandCode,
          riasecScores: input.riasecScores,
          miScores: input.miScores,
          aiAnalysis,
          pdfBuffer,
          isPro: true,
        });

        return {
          success: true,
          resultId: saved?.id,
          pdfUrl,
        };
      }),

    getResult: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const result = await getAptitudeResultById(input.id);
        if (!result) return null;
        return {
          ...result,
          riasecScores: JSON.parse(result.riasecScores || "{}"),
          miScores: JSON.parse(result.miScores || "{}"),
          topIntelligences: JSON.parse(result.topIntelligences || "[]"),
          aiAnalysis: JSON.parse(result.aiAnalysis || "{}"),
          personalitySnapshot: result.personalitySnapshot ? JSON.parse(result.personalitySnapshot) : null,
          recommendedMajors: JSON.parse(result.recommendedMajors || "[]"),
        };
      }),

    downloadPdf: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const result = await getAptitudeResultById(input.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Result not found" });

        const riasecScores = JSON.parse(result.riasecScores || "{}");
        const miScores = JSON.parse(result.miScores || "{}");
        const aiAnalysis = JSON.parse(result.aiAnalysis || "{}");

        const pdfUrl = await generateAndUploadPdfReport({
          studentName: result.studentName,
          language: (result.language as "id" | "en") || "id",
          hollandCode: result.hollandCode || "---",
          riasecScores,
          miScores,
          aiAnalysis,
        });

        return { pdfUrl };
      }),

    getAllResults: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") return [];
        const results = await getAllAptitudeResults();
        return results.map(r => ({
          id: r.id,
          studentName: r.studentName,
          studentEmail: r.studentEmail,
          studentPhone: r.studentPhone,
          hollandCode: r.hollandCode,
          language: r.language,
          createdAt: r.createdAt,
          recommendedMajors: JSON.parse(r.recommendedMajors || "[]"),
          personalitySnapshot: r.personalitySnapshot ? JSON.parse(r.personalitySnapshot) : null,
        }));
      }),

    // ---- Access Token Management (Admin Only) ----
    generateLinks: protectedProcedure
      .input(z.object({
        count: z.number().min(1).max(100),
        expiresAt: z.string(), // ISO date string
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const tokens = Array.from({ length: input.count }, () => ({
          token: crypto.randomBytes(16).toString("hex"),
          expiresAt: new Date(input.expiresAt),
        }));
        const created = await createAccessTokens(tokens);
        return created;
      }),

    listLinks: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") return [];
        return await listAccessTokens();
      }),

    deleteLink: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const deleted = await deleteAccessToken(input.id);
        if (!deleted) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Token not found or already used" });
        }
        return { success: true };
      }),

    // ---- Public Token Validation ----
    validateToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const tokenRow = await getAccessTokenByToken(input.token);
        if (!tokenRow) {
          return { valid: false, reason: "not_found" as const };
        }
        if (tokenRow.status === "completed") {
          return { valid: false, reason: "already_used" as const };
        }
        if (tokenRow.status === "expired" || new Date(tokenRow.expiresAt) < new Date()) {
          return { valid: false, reason: "expired" as const };
        }
        if (tokenRow.status === "in_progress") {
          // Allow continuing if in progress (same session)
          return { valid: true, reason: "in_progress" as const, usedByName: tokenRow.usedByName, usedByEmail: tokenRow.usedByEmail, usedByPhone: tokenRow.usedByPhone };
        }
        return { valid: true, reason: "unused" as const };
      }),

    // ---- Mark Token as In Progress (when student starts test) ----
    useToken: publicProcedure
      .input(z.object({
        token: z.string(),
        name: z.string(),
        email: z.string(),
        phone: z.string(),
      }))
      .mutation(async ({ input }) => {
        const tokenRow = await getAccessTokenByToken(input.token);
        if (!tokenRow) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid token" });
        }
        if (tokenRow.status === "completed") {
          throw new TRPCError({ code: "FORBIDDEN", message: "This link has already been used" });
        }
        if (tokenRow.status === "expired" || new Date(tokenRow.expiresAt) < new Date()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This link has expired" });
        }
        if (tokenRow.status === "in_progress") {
          // Already in progress, allow continuing
          return { success: true };
        }
        const marked = await markTokenInProgress(input.token, input.name, input.email, input.phone);
        if (!marked) {
          throw new TRPCError({ code: "CONFLICT", message: "Token could not be claimed" });
        }
        return { success: true };
      }),

    // ---- Mark Token as Completed ----
    completeToken: publicProcedure
      .input(z.object({
        token: z.string(),
        resultId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await markTokenCompleted(input.token, input.resultId);
        return { success: true };
      }),

    // ---- Get Pro Test Price ----
    getProPrice: publicProcedure.query(() => {
      return { price: getProTestPrice(), discountPrice: getProTestDiscountPrice(), currency: "IDR" };
    }),

    // ---- Create Xendit Invoice for Pro Test Purchase ----
    createProOrder: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        source: z.enum(["landing", "upsell"]).default("landing"),
        useDiscountPrice: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const externalId = generateExternalId();
        const baseUrl = process.env.VITE_APP_URL || (process.env.NODE_ENV === "production" ? "https://spectaeducation.com" : "http://localhost:3000");
        const price = input.useDiscountPrice ? getProTestDiscountPrice() : getProTestPrice();

        // Create Xendit invoice
        const invoice = await createProTestInvoice({
          externalId,
          customerName: input.name,
          customerEmail: input.email,
          customerPhone: input.phone,
          successRedirectUrl: `${baseUrl}/test/pro/payment-success?order=${externalId}`,
          failureRedirectUrl: `${baseUrl}/test/pro?payment=failed`,
          useDiscountPrice: input.useDiscountPrice,
        });

        // Save order to DB
        await createAptitudeProOrder({
          externalId,
          xenditInvoiceId: invoice.id,
          xenditInvoiceUrl: invoice.invoice_url,
          customerName: input.name,
          customerEmail: input.email,
          customerPhone: input.phone || null,
          amount: price,
          status: "pending",
          source: input.source,
        });

        return {
          invoiceUrl: invoice.invoice_url,
          externalId,
        };
      }),

    // ---- Check Order Status ----
    checkOrderStatus: publicProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ input }) => {
        const order = await getAptitudeProOrderByExternalId(input.externalId);
        if (!order) return { found: false, status: null, accessTokenId: null };
        return { found: true, status: order.status, accessTokenId: order.accessTokenId };
      }),

    // ---- Admin: List Pro Orders ----
    listProOrders: protectedProcedure.query(async () => {
      return await listAptitudeProOrders();
    }),
    // ---- Admin: Manually resend Pro access link ----
    resendProAccessLink: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        const order = await getAptitudeProOrderByExternalId(input.externalId);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        if (order.status !== 'paid') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order is not paid yet. Mark as paid first.' });
        // Generate a fresh token valid for 7 days
        const tokenValue = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const [createdToken] = await createAccessTokens([{ token: tokenValue, status: 'unused', expiresAt }]);
        await updateAptitudeProOrderStatus(input.externalId, 'paid', { accessTokenId: createdToken?.id });
        const baseUrl = process.env.VITE_APP_URL || 'https://spectaeducation.com';
        const sent = await sendProAccessLinkEmail({ to: order.customerEmail, customerName: order.customerName, token: tokenValue, baseUrl });
        return { success: sent, email: order.customerEmail };
      }),
    // ---- Admin: Manually mark order as paid and send link ----
    markOrderPaidAndSendLink: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        const order = await getAptitudeProOrderByExternalId(input.externalId);
        if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
        const tokenValue = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const [createdToken] = await createAccessTokens([{ token: tokenValue, status: 'unused', expiresAt }]);
        await updateAptitudeProOrderStatus(input.externalId, 'paid', { xenditInvoiceId: 'manual', paidAt: new Date(), accessTokenId: createdToken?.id });
        const baseUrl = process.env.VITE_APP_URL || 'https://spectaeducation.com';
        const sent = await sendProAccessLinkEmail({ to: order.customerEmail, customerName: order.customerName, token: tokenValue, baseUrl });
        return { success: sent, email: order.customerEmail };
      }),
    // ---- Admin: issue Pro access by EMAIL (no existing order needed) ----
    // For customers who paid before the migration, whose order row isn't in the
    // current DB. Mints a fresh single-use token and emails the access link.
    issueProAccessToEmail: protectedProcedure
      .input(z.object({ email: z.string().email(), name: z.string().max(120).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        const tokenValue = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await createAccessTokens([{ token: tokenValue, status: 'unused', expiresAt }]);
        const baseUrl = ENV.appUrl?.replace(/\/+$/, '') || 'https://www.spectaeducation.com';
        const sent = await sendProAccessLinkEmail({ to: input.email, customerName: input.name || 'there', token: tokenValue, baseUrl });
        if (!sent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Email failed to send — check Resend config.' });
        return { sent: true as const, email: input.email, url: `${baseUrl}/test/pro?token=${tokenValue}` };
      }),
    // ---- Admin: check whether a student completed the test (read-only) ----
    lookupAptitudeResult: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        const rows = await getAptitudeResultsByEmail(input.email.trim());
        return {
          found: rows.length > 0,
          count: rows.length,
          results: rows.map(r => ({
            id: r.id,
            name: r.studentName,
            hollandCode: r.hollandCode || null,
            completedAt: r.createdAt,
          })),
        };
      }),

    // ---- Admin: resend a completed aptitude RESULT (the report email) ----
    // For students who finished the test but never received their result email
    // (the result is saved; the email is sent fire-and-forget and may have
    // failed or gone to spam). Regenerates the PDF and re-emails it.
    resendAptitudeResult: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin only' });
        const rows = await getAptitudeResultsByEmail(input.email.trim());
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'No completed aptitude result found for that email.' });
        const r = rows[0]; // most recent
        const parse = (v: any, fallback: any) => { try { return typeof v === 'string' ? JSON.parse(v) : (v ?? fallback); } catch { return fallback; } };
        const riasecScores = parse(r.riasecScores, {});
        const miScores = parse(r.miScores, {});
        const aiAnalysis = parse(r.aiAnalysis, {});
        const language = (r.language as any) || 'id';
        const hollandCode = r.hollandCode || '';
        let pdfBuffer: Buffer | undefined;
        try {
          pdfBuffer = await generatePdfReport({ studentName: r.studentName, language, hollandCode, riasecScores, miScores, aiAnalysis, isPro: true });
        } catch (e) { console.error('[AptitudeResend] PDF generation failed:', e); }
        try {
          await sendAptitudeResultsEmail({ to: r.studentEmail, studentName: r.studentName, language, hollandCode, riasecScores, miScores, aiAnalysis, pdfBuffer, isPro: true });
        } catch (e) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Email failed to send: ${(e as Error).message}` });
        }
        return { sent: true as const, email: r.studentEmail, name: r.studentName, completedAt: r.createdAt };
      }),
  }),

  // ==========================================
  // UNIVERSITY MATCHING ENGINE ROUTER
  // ==========================================
  universityMatch: router({
    // --- Admin CRUD: Universities ---
    createUniversity: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        nameId: z.string().optional(),
        country: z.string().min(1),
        city: z.string().min(1),
        description: z.string().optional(),
        descriptionId: z.string().optional(),
        logoUrl: z.string().optional(),
        website: z.string().optional(),
        tuitionMinUsd: z.number().optional(),
        tuitionMaxUsd: z.number().optional(),
        ieltsMin: z.string().optional(),
        gpaMin: z.string().optional(),
        scholarshipAvailable: z.boolean().default(false),
        ranking: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const uni = await createMatchUniversity(input);
        return uni;
      }),

    updateUniversity: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        nameId: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        description: z.string().optional(),
        descriptionId: z.string().optional(),
        logoUrl: z.string().optional(),
        website: z.string().optional(),
        tuitionMinUsd: z.number().optional(),
        tuitionMaxUsd: z.number().optional(),
        ieltsMin: z.string().optional(),
        gpaMin: z.string().optional(),
        scholarshipAvailable: z.boolean().optional(),
        ranking: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { id, ...data } = input;
        await updateMatchUniversity(id, data);
        return { success: true };
      }),

    deleteUniversity: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        await deleteMatchUniversity(input.id);
        return { success: true };
      }),

    getAllUniversities: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") return [];
        return await getAllMatchUniversities();
      }),

    getUniversity: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") return null;
        return await getMatchUniversityById(input.id);
      }),

    // --- Admin CRUD: Programs ---
    createProgram: protectedProcedure
      .input(z.object({
        universityId: z.number(),
        programName: z.string().min(1),
        programNameId: z.string().optional(),
        degreeLevel: z.enum(["bachelor", "master", "doctorate", "diploma"]).default("bachelor"),
        fieldOfStudy: z.string().min(1),
        fieldOfStudyId: z.string().optional(),
        riasecCodes: z.string().min(1).max(6), // e.g. "RIA"
        miTypes: z.string().min(1), // comma-separated e.g. "logical,spatial"
        description: z.string().optional(),
        descriptionId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const program = await createMatchProgram(input);
        return program;
      }),

    updateProgram: protectedProcedure
      .input(z.object({
        id: z.number(),
        programName: z.string().optional(),
        programNameId: z.string().optional(),
        degreeLevel: z.enum(["bachelor", "master", "doctorate", "diploma"]).optional(),
        fieldOfStudy: z.string().optional(),
        fieldOfStudyId: z.string().optional(),
        riasecCodes: z.string().optional(),
        miTypes: z.string().optional(),
        description: z.string().optional(),
        descriptionId: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        const { id, ...data } = input;
        await updateMatchProgram(id, data);
        return { success: true };
      }),

    deleteProgram: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }
        await deleteMatchProgram(input.id);
        return { success: true };
      }),

    getProgramsByUniversity: protectedProcedure
      .input(z.object({ universityId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") return [];
        return await getMatchProgramsByUniversityId(input.universityId);
      }),

    // --- Public: Get Recommendations based on aptitude test result ---
    getRecommendations: publicProcedure
      .input(z.object({
        riasecScores: z.record(z.string(), z.number()),
        miScores: z.record(z.string(), z.number()),
        countryPreference: z.string().optional(), // filter by country if provided
        budgetMaxUsd: z.number().optional(), // max annual tuition
        degreeLevel: z.enum(["bachelor", "master", "doctorate", "diploma"]).optional(),
      }))
      .query(async ({ input }) => {
        const allData = await getActiveUniversitiesWithPrograms();
        if (!allData.length) return [];

        // RIASEC: sort by score descending, take top 3 as student's Holland code
        const sortedRiasec = Object.entries(input.riasecScores)
          .sort((a, b) => b[1] - a[1]);
        const studentHollandCode = sortedRiasec.slice(0, 3).map(([k]) => k).join("");
        const studentTopRiasec = sortedRiasec.slice(0, 3).map(([k]) => k);

        // MI: sort by score descending, take top 3
        const sortedMi = Object.entries(input.miScores)
          .sort((a, b) => b[1] - a[1]);
        const studentTopMi = sortedMi.slice(0, 3).map(([k]) => k.toLowerCase());

        // Elite universities to exclude
        const ELITE_EXCLUSIONS = [
          "oxford", "cambridge", "mit", "harvard", "stanford",
          "massachusetts institute of technology", "university of oxford",
          "university of cambridge", "harvard university", "stanford university",
          "caltech", "california institute of technology",
          "princeton", "yale", "columbia university"
        ];

        type ScoredRecommendation = {
          university: Omit<typeof allData[0], "programs">;
          program: typeof allData[0]["programs"][0];
          matchScore: number;
          riasecMatch: number;
          miMatch: number;
        };

        const recommendations: ScoredRecommendation[] = [];

        for (const uni of allData) {
          // Exclude elite universities
          if (ELITE_EXCLUSIONS.some(e => uni.name.toLowerCase().includes(e))) continue;

          // Filter by country preference
          if (input.countryPreference && uni.country.toLowerCase() !== input.countryPreference.toLowerCase()) continue;

          // Filter by budget
          if (input.budgetMaxUsd && uni.tuitionMinUsd && uni.tuitionMinUsd > input.budgetMaxUsd) continue;

          for (const program of uni.programs) {
            // Filter by degree level
            if (input.degreeLevel && program.degreeLevel !== input.degreeLevel) continue;

            // Calculate RIASEC match score (0-100)
            const programRiasec = program.riasecCodes.toUpperCase().split("");
            let riasecMatch = 0;
            for (let i = 0; i < studentTopRiasec.length; i++) {
              const code = studentTopRiasec[i];
              const posInProgram = programRiasec.indexOf(code);
              if (posInProgram !== -1) {
                // Weight: first match = 40, second = 30, third = 20
                const weight = i === 0 ? 40 : i === 1 ? 30 : 20;
                // Bonus if position matches (primary matches primary)
                const posBonus = posInProgram === i ? 10 : 0;
                riasecMatch += weight + posBonus;
              }
            }

            // Calculate MI match score (0-100)
            const programMi = program.miTypes.toLowerCase().split(",").map(s => s.trim());
            let miMatch = 0;
            for (let i = 0; i < studentTopMi.length; i++) {
              if (programMi.includes(studentTopMi[i])) {
                const weight = i === 0 ? 40 : i === 1 ? 30 : 20;
                miMatch += weight;
              }
            }

            // Combined score: 60% RIASEC + 40% MI
            const matchScore = Math.round(riasecMatch * 0.6 + miMatch * 0.4);

            if (matchScore > 20) { // Minimum threshold
              const { programs: _, ...uniWithoutPrograms } = uni;
              recommendations.push({
                university: uniWithoutPrograms,
                program,
                matchScore,
                riasecMatch,
                miMatch,
              });
            }
          }
        }

        // Sort by match score descending, take top 10
        recommendations.sort((a, b) => b.matchScore - a.matchScore);
        return recommendations.slice(0, 10);
      }),
  }),

  // =============================================
  // Cost of Living Calculator
  // =============================================
  costOfLiving: router({
    getByCountry: publicProcedure
      .input(z.object({ countrySlug: z.string() }))
      .query(async ({ input }) => {
        const data = await getCostOfLivingByCountry(input.countrySlug);
        const cities = Array.from(new Set(data.map(d => d.city)));
        const byCity: Record<string, typeof data> = {};
        for (const row of data) {
          if (!byCity[row.city]) byCity[row.city] = [];
          byCity[row.city].push(row);
        }
        return { cities, byCity, country: data[0]?.country ?? '', localCurrency: data[0]?.localCurrency ?? 'USD' };
      }),

    getCities: publicProcedure
      .input(z.object({ countrySlug: z.string() }))
      .query(async ({ input }) => {
        return getCostOfLivingCities(input.countrySlug);
      }),

    getAll: protectedProcedure.query(async () => {
      return getAllCostOfLivingData();
    }),

    create: protectedProcedure
      .input(z.object({
        country: z.string(),
        countrySlug: z.string(),
        city: z.string(),
        category: z.enum(["rent", "food", "transport", "utilities", "entertainment", "tuition"]),
        amountMinUsd: z.number(),
        amountMaxUsd: z.number(),
        localCurrency: z.string(),
        amountMinLocal: z.number(),
        amountMaxLocal: z.number(),
        notes: z.string().optional(),
        notesId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createCostOfLivingEntry(input);
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          amountMinUsd: z.number().optional(),
          amountMaxUsd: z.number().optional(),
          amountMinLocal: z.number().optional(),
          amountMaxLocal: z.number().optional(),
          notes: z.string().optional(),
          notesId: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await updateCostOfLivingEntry(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCostOfLivingEntry(input.id);
        return { success: true };
      }),
  }),

  // =============================================
  // Study Abroad Checklist
  // =============================================
  checklist: router({
    getItems: publicProcedure.query(async () => {
      return getAllChecklistItems();
    }),

    getUserProgress: protectedProcedure.query(async ({ ctx }) => {
      const progress = await getUserChecklistProgress(ctx.user.id);
      return progress;
    }),

    toggleItem: protectedProcedure
      .input(z.object({
        checklistItemId: z.number(),
        isCompleted: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await toggleChecklistProgress(ctx.user.id, input.checklistItemId, input.isCompleted);
        return { id, success: true };
      }),

    updateNotes: protectedProcedure
      .input(z.object({
        checklistItemId: z.number(),
        notes: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateChecklistNotes(ctx.user.id, input.checklistItemId, input.notes);
        return { success: true };
      }),

    // Admin: manage checklist items
    createItem: protectedProcedure
      .input(z.object({
        phase: z.enum(["12_months", "9_months", "6_months", "3_months", "1_month", "2_weeks", "departure"]),
        category: z.enum(["documents", "tests", "applications", "visa", "accommodation", "finances", "travel", "health"]),
        title: z.string(),
        titleId: z.string().optional(),
        description: z.string().optional(),
        descriptionId: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createChecklistItem(input);
        return { id };
      }),

    updateItem: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          title: z.string().optional(),
          titleId: z.string().optional(),
          description: z.string().optional(),
          descriptionId: z.string().optional(),
          sortOrder: z.number().optional(),
          phase: z.enum(["12_months", "9_months", "6_months", "3_months", "1_month", "2_weeks", "departure"]).optional(),
          category: z.enum(["documents", "tests", "applications", "visa", "accommodation", "finances", "travel", "health"]).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await updateChecklistItem(input.id, input.data);
        return { success: true };
      }),

    deleteItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteChecklistItem(input.id);
         return { success: true };
      }),
  }),

  // ==================== ANALYTICS ====================
  analytics: router({
    kpis: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return getAnalyticsKPIs({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),

    leadsOverTime: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return getLeadsOverTime({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),

    applicationPipeline: protectedProcedure
      .query(async () => {
        return getApplicationPipeline();
      }),

    revenueOverTime: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return getRevenueOverTime({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),

    leadsBySource: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return getLeadsBySource({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),

    topCountries: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return getTopCountries({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),

    counselorPerformance: protectedProcedure
      .query(async () => {
        return getCounselorPerformance();
      }),

    scholarshipLeadsOverTime: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return getScholarshipLeadsOverTime({
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        });
      }),
  }),

  // ==========================================
  // DRIP CAMPAIGN ROUTES
  // ==========================================
  dripCampaign: router({
    // List all campaigns with stats
    listCampaigns: protectedProcedure
      .query(async () => {
        return getDripCampaignsWithStats();
      }),

    // Get single campaign by ID
    getCampaign: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getDripCampaignById(input.id);
      }),

    // Create a new campaign
    createCampaign: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        triggerSource: z.enum(["aptitude_test", "contact_form", "scholarship_form", "quiz", "manual", "pro_purchase"]),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        return createDripCampaign(input);
      }),

    // Update a campaign
    updateCampaign: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        triggerSource: z.enum(["aptitude_test", "contact_form", "scholarship_form", "quiz", "manual", "pro_purchase"]).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateDripCampaign(id, data);
        return getDripCampaignById(id);
      }),

    // Delete a campaign
    deleteCampaign: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDripCampaign(input.id);
        return { success: true };
      }),

    // List email steps for a campaign
    listSteps: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return getDripEmailStepsByCampaignId(input.campaignId);
      }),

    // Create a new email step
    createStep: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        stepOrder: z.number().min(1),
        subject: z.string().min(1),
        htmlContent: z.string().min(1),
        delayDays: z.number().min(0),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        return createDripEmailStep(input);
      }),

    // Update an email step
    updateStep: protectedProcedure
      .input(z.object({
        id: z.number(),
        subject: z.string().min(1).optional(),
        htmlContent: z.string().min(1).optional(),
        delayDays: z.number().min(0).optional(),
        stepOrder: z.number().min(1).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateDripEmailStep(id, data);
        return getDripEmailStepById(id);
      }),

    // Delete an email step
    deleteStep: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDripEmailStep(input.id);
        return { success: true };
      }),

    // List enrollments for a campaign
    listEnrollments: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return getDripEnrollmentsByCampaignId(input.campaignId);
      }),

    // Manually enroll a contact
    enrollContact: protectedProcedure
      .input(z.object({
        campaignId: z.number(),
        contactEmail: z.string().email(),
        contactName: z.string().min(1),
        contactPhone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getDripEnrollmentByEmailAndCampaign(input.contactEmail, input.campaignId);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Contact is already enrolled in this campaign" });
        }
        const steps = await getDripEmailStepsByCampaignId(input.campaignId);
        const firstStep = steps.find(s => s.isActive && s.stepOrder === 1);
        let nextSendAt: Date | null = null;
        if (firstStep) {
          nextSendAt = new Date();
          nextSendAt.setDate(nextSendAt.getDate() + firstStep.delayDays);
        }
        const unsubscribeToken = crypto.randomBytes(32).toString("hex");
        return createDripEnrollment({
          campaignId: input.campaignId,
          contactEmail: input.contactEmail,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          source: "manual",
          currentStepOrder: 0,
          status: "active",
          nextSendAt,
          unsubscribeToken,
        });
      }),

    // Pause/resume an enrollment
    updateEnrollmentStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "paused", "unsubscribed"]),
      }))
      .mutation(async ({ input }) => {
        const updates: any = { status: input.status };
        if (input.status === "unsubscribed") {
          updates.unsubscribedAt = new Date();
        }
        await updateDripEnrollment(input.id, updates);
        return { success: true };
      }),

    // Get campaign analytics
    getCampaignAnalytics: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return getDripCampaignAnalytics(input.campaignId);
      }),

    // Get email logs for an enrollment
    getEmailLogs: protectedProcedure
      .input(z.object({ enrollmentId: z.number() }))
      .query(async ({ input }) => {
        return getDripEmailLogsByEnrollmentId(input.enrollmentId);
      }),

    // Manually trigger drip email processing (admin)
    triggerProcessing: protectedProcedure
      .mutation(async () => {
        const result = await processDripEmails();
        return result;
      }),

    // AI-generate email step content from a prompt
    generateEmailContent: protectedProcedure
      .input(z.object({
        prompt: z.string().min(5),
        campaignName: z.string().optional(),
        stepNumber: z.number().optional(),
        totalSteps: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const systemPrompt = `You are an expert email marketing copywriter for SpecTa Education, an Indonesian study abroad consultancy. Generate professional, engaging email content in Bahasa Indonesia (with some English terms where natural for education context).

Rules:
- Write warm, friendly, professional emails
- Include a clear call-to-action
- Use {{name}} for the recipient's name
- Include {{unsubscribe_url}} at the bottom
- Generate clean HTML with inline styles for email compatibility
- Use SpecTa Education branding (red #E53E3E accent color)
- Keep emails concise but compelling (150-300 words)
- Do NOT use external images or links that don't exist`;

        const userPrompt = `Generate an email for the following:
${input.campaignName ? `Campaign: ${input.campaignName}` : ""}
${input.stepNumber ? `This is email #${input.stepNumber}${input.totalSteps ? ` of ${input.totalSteps}` : ""}` : ""}

User's request: ${input.prompt}

Return a JSON object with "subject" (email subject line) and "htmlContent" (full HTML email body with inline styles).`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "email_content",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  subject: { type: "string", description: "Email subject line" },
                  htmlContent: { type: "string", description: "Full HTML email body with inline styles" },
                },
                required: ["subject", "htmlContent"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });
        }

        try {
          const parsed = JSON.parse(content);
          return { subject: parsed.subject, htmlContent: parsed.htmlContent };
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
        }
      }),

    // Generate a full campaign (multiple steps) from a single prompt
    generateFullCampaign: protectedProcedure
      .input(z.object({
        prompt: z.string().min(5),
        numberOfEmails: z.number().min(1).max(10).default(5),
      }))
      .mutation(async ({ input }) => {
        const systemPrompt = `You are an expert email marketing strategist for SpecTa Education, an Indonesian study abroad consultancy. Generate a complete email drip campaign in Bahasa Indonesia (with some English terms where natural).

Rules:
- Create a cohesive campaign with a clear progression
- Each email should build on the previous one
- Use {{name}} for recipient's name, {{unsubscribe_url}} for unsubscribe link
- Generate clean HTML with inline styles for email compatibility
- Use SpecTa Education branding (red #E53E3E accent color)
- Keep each email concise (150-300 words)
- Include clear CTAs that progress from soft (learn more) to hard (book now, buy now)
- Suggest appropriate delay days between emails (typically 2-4 days)`;

        const userPrompt = `Generate a complete ${input.numberOfEmails}-email drip campaign for:

${input.prompt}

Return a JSON object with:
- "campaignName": suggested campaign name
- "description": campaign description
- "steps": array of email steps, each with "subject", "htmlContent", "delayDays" (number), and "stepOrder" (number starting from 1)`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "full_campaign",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  campaignName: { type: "string" },
                  description: { type: "string" },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        htmlContent: { type: "string" },
                        delayDays: { type: "number" },
                        stepOrder: { type: "number" },
                      },
                      required: ["subject", "htmlContent", "delayDays", "stepOrder"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["campaignName", "description", "steps"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });
        }

        try {
          return JSON.parse(content);
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
        }
      }),

    // AI-refine existing email content based on feedback
    refineEmailContent: protectedProcedure
      .input(z.object({
        currentHtml: z.string(),
        currentSubject: z.string(),
        feedback: z.string().min(3),
        campaignName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const systemPrompt = `You are an expert email marketing copywriter for SpecTa Education. You will refine an existing email based on the user's feedback. Keep the same overall structure but apply the requested changes.

Rules:
- Maintain SpecTa Education branding (red #E53E3E accent color)
- Keep {{name}} and {{unsubscribe_url}} placeholders
- Generate clean HTML with inline styles for email compatibility
- Apply the user's feedback precisely
- Keep the email professional and engaging`;

        const userPrompt = `Current subject: ${input.currentSubject}

Current email HTML:
${input.currentHtml}

${input.campaignName ? `Campaign: ${input.campaignName}` : ""}

User's feedback: ${input.feedback}

Return a JSON object with "subject" (updated subject line) and "htmlContent" (updated HTML email body).`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "refined_email",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  subject: { type: "string", description: "Updated email subject line" },
                  htmlContent: { type: "string", description: "Updated HTML email body" },
                },
                required: ["subject", "htmlContent"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI refinement failed" });
        }

        try {
          const parsed = JSON.parse(content);
          return { subject: parsed.subject, htmlContent: parsed.htmlContent };
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
        }
      }),

    // Get hot leads across all campaigns (sorted by engagement score)
    getHotLeads: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
      .query(async ({ input }) => {
        return getHotLeads(input.limit);
      }),

    // Bulk enroll all leads into a campaign
    bulkEnrollAllLeads: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await bulkEnrollAllLeads(input.campaignId);
        return result;
      }),

    // Unsubscribe endpoint (public)
    unsubscribe: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const enrollment = await getDripEnrollmentByUnsubscribeToken(input.token);
        if (!enrollment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid unsubscribe token" });
        }
        if (enrollment.status === "unsubscribed") {
          return { success: true, alreadyUnsubscribed: true };
        }
        await updateDripEnrollment(enrollment.id, {
          status: "unsubscribed",
          unsubscribedAt: new Date(),
          nextSendAt: null,
        });
        return { success: true, alreadyUnsubscribed: false };
      }),
  }),

  // ==========================================
  // Blog System Router
  // ==========================================
  blog: router({
    // --- Categories (Admin) ---
    listCategories: publicProcedure.query(async () => {
      return listBlogCategories();
    }),

    createCategory: protectedProcedure
      .input(z.object({ name: z.string().min(1), slug: z.string().min(1), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createBlogCategory(input);
      }),

    updateCategory: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), slug: z.string().optional(), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateBlogCategory(id, data);
        return { success: true };
      }),

    deleteCategory: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteBlogCategory(input.id);
        return { success: true };
      }),

    // --- Tags (Admin) ---
    listTags: publicProcedure.query(async () => {
      return listBlogTags();
    }),

    createTag: protectedProcedure
      .input(z.object({ name: z.string().min(1), slug: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createBlogTag(input);
      }),

    deleteTag: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteBlogTag(input.id);
        return { success: true };
      }),

    // --- Posts (Admin CRUD) ---
    listPosts: protectedProcedure
      .input(z.object({
        status: z.enum(["draft", "published", "archived"]).optional(),
        categoryId: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return listBlogPosts(input);
      }),

    getPost: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const post = await getBlogPostById(input.id);
        if (!post) throw new TRPCError({ code: "NOT_FOUND" });
        const tags = await getPostTags(post.id);
        return { ...post, tags };
      }),

    createPost: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        excerpt: z.string().optional(),
        content: z.string().min(1),
        featuredImage: z.string().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        targetKeyword: z.string().optional(),
        categoryId: z.number().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { tagIds, ...postData } = input;
        const post = await createBlogPost({
          ...postData,
          authorId: ctx.user.id,
          publishedAt: input.status === "published" ? new Date() : undefined,
        });
        if (post && tagIds && tagIds.length > 0) {
          await setPostTags(post.id, tagIds);
        }
        return post;
      }),

    updatePost: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        slug: z.string().optional(),
        excerpt: z.string().optional(),
        content: z.string().optional(),
        featuredImage: z.string().optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        targetKeyword: z.string().optional(),
        categoryId: z.number().nullable().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, tagIds, ...data } = input;
        // If publishing for the first time, set publishedAt
        if (data.status === "published") {
          const existing = await getBlogPostById(id);
          if (existing && !existing.publishedAt) {
            (data as any).publishedAt = new Date();
          }
        }
        await updateBlogPost(id, data);
        if (tagIds !== undefined) {
          await setPostTags(id, tagIds);
        }
        return { success: true };
      }),

    deletePost: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteBlogPost(input.id);
        return { success: true };
      }),

    // --- Public Blog Endpoints ---
    getPublishedPosts: publicProcedure
      .input(z.object({
        categorySlug: z.string().optional(),
        tagSlug: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return listPublishedBlogPosts(input);
      }),

    getPublishedPost: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const post = await getBlogPostBySlug(input.slug);
        if (!post || post.status !== "published") throw new TRPCError({ code: "NOT_FOUND" });
        const tags = await getPostTags(post.id);
        let categoryName: string | undefined;
        if (post.categoryId) {
          const cats = await listBlogCategories();
          categoryName = cats.find(c => c.id === post.categoryId)?.name;
        }
        return { ...post, tags, categoryName };
      }),

    // --- AI Article Generation ---
    generateArticle: protectedProcedure
      .input(z.object({
        topic: z.string().min(1),
        targetKeyword: z.string().optional(),
        tone: z.string().optional(),
        language: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

        const lang = input.language || "bilingual (Indonesian primary, English secondary)";
        const tone = input.tone || "professional, informative, and engaging";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert SEO content writer for SpecTa Education, an education consultancy helping Indonesian students study abroad. Write blog articles that are ${tone}. The content should be ${lang}. Always include practical information, tips, and a call-to-action to consult with SpecTa Education. Output must be valid JSON.`
            },
            {
              role: "user",
              content: `Write a comprehensive blog article about: "${input.topic}"
${input.targetKeyword ? `Target SEO keyword: "${input.targetKeyword}"` : ""}

Return JSON with this structure:
{
  "title": "SEO-optimized article title (include target keyword)",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence summary for preview cards",
  "metaTitle": "SEO meta title (max 60 chars)",
  "metaDescription": "SEO meta description (max 155 chars)",
  "content": "Full article in HTML format with proper h2, h3, p, ul, ol tags. Include at least 1500 words. Use the target keyword naturally 3-5 times. Include a FAQ section at the end with 4-5 questions.",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "blog_article",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  slug: { type: "string" },
                  excerpt: { type: "string" },
                  metaTitle: { type: "string" },
                  metaDescription: { type: "string" },
                  content: { type: "string" },
                  suggestedTags: { type: "array", items: { type: "string" } }
                },
                required: ["title", "slug", "excerpt", "metaTitle", "metaDescription", "content", "suggestedTags"],
                additionalProperties: false
              }
            }
          }
        });

        const text = response.choices?.[0]?.message?.content as string | undefined;
        if (!text) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });
        return JSON.parse(text);
      }),

    // --- AI Article Refinement ---
    refineArticle: protectedProcedure
      .input(z.object({
        currentContent: z.string(),
        currentTitle: z.string(),
        feedback: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert SEO content editor for SpecTa Education. Refine the given article based on the feedback. Maintain SEO best practices. Output must be valid JSON."
            },
            {
              role: "user",
              content: `Current title: "${input.currentTitle}"
Current content (HTML):
${input.currentContent.substring(0, 8000)}

Feedback: ${input.feedback}

Return JSON with the refined article:
{
  "title": "Updated title if needed",
  "content": "Full refined article in HTML format",
  "metaTitle": "Updated SEO meta title",
  "metaDescription": "Updated SEO meta description"
}`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "refined_article",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  metaTitle: { type: "string" },
                  metaDescription: { type: "string" }
                },
                required: ["title", "content", "metaTitle", "metaDescription"],
                additionalProperties: false
              }
            }
          }
        });

        const text = response.choices?.[0]?.message?.content as string | undefined;
        if (!text) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI refinement failed" });
        return JSON.parse(text);
      }),

    // --- Article Producer (GEO-optimized, generate + save in one step) ---
    // Suggests topics from the producer's curated bank (next-up first).
    suggestTopics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { ARTICLE_TOPIC_BANK, pickNextTopic } = await import("./articleProducer");
      const next = await pickNextTopic();
      return { next, all: ARTICLE_TOPIC_BANK };
    }),

    // One-click "Produce now": generates a GEO-optimized article AND saves it
    // (default as a review-ready draft). Returns the created post.
    produceArticle: protectedProcedure
      .input(z.object({
        topic: z.string().min(1),
        targetKeyword: z.string().optional(),
        tone: z.string().optional(),
        language: z.string().optional(),
        status: z.enum(["draft", "published"]).optional(),
        categoryId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { produceArticle } = await import("./articleProducer");
        try {
          return await produceArticle({ ...input, authorId: ctx.user.id });
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
        }
      }),
  }),

  // Blog Comments & Ratings
  blogComments: router({
    // Public: submit a comment with optional rating
    submit: publicProcedure
      .input(z.object({
        postId: z.number(),
        name: z.string().min(1, "Name is required").max(255),
        email: z.string().email("Valid email is required"),
        content: z.string().min(1, "Comment is required").max(5000),
        rating: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ input }) => {
        const comment = await createBlogComment({
          postId: input.postId,
          name: input.name,
          email: input.email,
          content: input.content,
          rating: input.rating ?? null,
          status: "approved", // auto-approve for now
        });
        if (!comment) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to submit comment" });
        return comment;
      }),

    // Public: get approved comments for a post
    getByPost: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        return await getCommentsByPostId(input.postId, "approved");
      }),

    // Public: get rating summary for a post
    getRating: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        return await getPostRatingSummary(input.postId);
      }),

    // Public: get ratings for multiple posts (for blog listing)
    getMultipleRatings: publicProcedure
      .input(z.object({ postIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        if (input.postIds.length === 0) return {};
        return await getMultiplePostRatings(input.postIds);
      }),

    // Admin: list all comments with moderation
    listAll: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await getAllBlogComments(input.limit, input.offset);
      }),

    // Admin: get all comments for a post (including pending/rejected)
    getByPostAdmin: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        return await getCommentsByPostId(input.postId);
      }),

    // Admin: update comment status (approve/reject)
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "rejected"]),
      }))
      .mutation(async ({ input }) => {
        await updateBlogCommentStatus(input.id, input.status);
        return { success: true };
      }),

    // Admin: delete a comment
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBlogComment(input.id);
        return { success: true };
      }),

    // Admin: get comment count for a post
    countByPost: protectedProcedure
      .input(z.object({ postId: z.number(), status: z.string().optional() }))
      .query(async ({ input }) => {
        return await countCommentsByPostId(input.postId, input.status);
      }),
  }),

  // ==================== SIMULATOR ====================
  simulator: router({
    // Start new simulation session
    start: publicProcedure
      .input(z.object({
        studentName: z.string().min(1),
        studentEmail: z.string().email(),
        studentPhone: z.string().optional(),
        country: z.string(),
        universityTier: z.string(),
        intendedMajor: z.string(),
        budgetLevel: z.string(),
        personalityType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const sessionId = nanoid();
        const session = await createSimulatorSession({
          sessionId,
          ...input,
          currentDay: 1,
          status: "in_progress",
        });
        if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create session" });

        // Generate first scenario (Day 1: Arrival)
        const firstScenario = await generateScenario({
          day: 1,
          country: input.country,
          universityTier: input.universityTier,
          intendedMajor: input.intendedMajor,
          budgetLevel: input.budgetLevel,
          personalityType: input.personalityType,
          previousChoices: [],
        });

        return {
          sessionId,
          scenario: firstScenario,
          currentDay: 1,
          stats: {
            budget: input.budgetLevel === "tight" ? 400 : input.budgetLevel === "moderate" ? 500 : 600,
            mood: 50,
            connections: 0,
            academic: 50,
          },
        };
      }),

    // Submit choice and get next scenario
    submitChoice: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        day: z.number(),
        scenarioType: z.string(),
        scenarioText: z.string(),
        choiceOptions: z.array(z.object({
          label: z.string(),
          text: z.string(),
        })),
        selectedChoice: z.string(),
        choiceText: z.string(),
      }))
      .mutation(async ({ input }) => {
        const session = await getSimulatorSessionBySessionId(input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });

        // Get all previous choices
        const previousChoices = await getChoicesBySessionId(input.sessionId);

        // Generate AI response and impacts
        const aiAnalysis = await analyzeChoice({
          day: input.day,
          scenarioType: input.scenarioType,
          selectedChoice: input.selectedChoice,
          choiceText: input.choiceText,
          country: session.country,
          budgetLevel: session.budgetLevel,
          previousChoices: previousChoices.map(c => ({
            day: c.day,
            scenario: c.scenarioType,
            choice: c.selectedChoice,
          })),
        });

        // Save choice
        await createSimulatorChoice({
          sessionId: input.sessionId,
          day: input.day,
          scenarioType: input.scenarioType,
          scenarioText: input.scenarioText,
          choiceOptions: JSON.stringify(input.choiceOptions),
          selectedChoice: input.selectedChoice,
          choiceText: input.choiceText,
          aiResponse: aiAnalysis.response,
          impactBudget: aiAnalysis.impacts.budget,
          impactMood: aiAnalysis.impacts.mood,
          impactConnections: aiAnalysis.impacts.connections,
          impactAcademic: aiAnalysis.impacts.academic,
        });

        // Check if simulation is complete (Day 3 for prototype)
        const isComplete = input.day >= 3;

        if (isComplete) {
          // Generate final report
          const allChoices = await getChoicesBySessionId(input.sessionId);
          const report = await generateReadinessReport({
            session,
            choices: allChoices,
          });

          // Save result
          await createSimulatorResult({
            sessionId: input.sessionId,
            readinessScore: report.readinessScore,
            socialScore: report.socialScore,
            financialScore: report.financialScore,
            academicScore: report.academicScore,
            emotionalScore: report.emotionalScore,
            strengths: JSON.stringify(report.strengths),
            weaknesses: JSON.stringify(report.weaknesses),
            recommendations: JSON.stringify(report.recommendations),
            reportSent: false,
            bookedConsultation: false,
          });

          // Update session status
          await updateSimulatorSession(input.sessionId, {
            status: "completed",
            completedAt: new Date(),
          });

          return {
            complete: true,
            report,
            aiResponse: aiAnalysis.response,
            impacts: aiAnalysis.impacts,
          };
        }

        // Generate next scenario
        const nextScenario = await generateScenario({
          day: input.day + 1,
          country: session.country,
          universityTier: session.universityTier,
          intendedMajor: session.intendedMajor,
          budgetLevel: session.budgetLevel,
          personalityType: session.personalityType,
          previousChoices: [...previousChoices, {
            day: input.day,
            scenarioType: input.scenarioType,
            selectedChoice: input.selectedChoice,
            choiceText: input.choiceText,
            aiResponse: aiAnalysis.response,
            impactBudget: aiAnalysis.impacts.budget,
            impactMood: aiAnalysis.impacts.mood,
            impactConnections: aiAnalysis.impacts.connections,
            impactAcademic: aiAnalysis.impacts.academic,
          }],
        });

        // Update session day
        await updateSimulatorSession(input.sessionId, {
          currentDay: input.day + 1,
        });

        return {
          complete: false,
          nextScenario,
          aiResponse: aiAnalysis.response,
          impacts: aiAnalysis.impacts,
        };
      }),

    // Get session status
    getSession: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const session = await getSimulatorSessionBySessionId(input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND" });

        const choices = await getChoicesBySessionId(input.sessionId);
        const result = await getSimulatorResultBySessionId(input.sessionId);

        return { session, choices, result };
      }),

    // Get final report
    getReport: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const result = await getSimulatorResultBySessionId(input.sessionId);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });

        return {
          readinessScore: result.readinessScore,
          socialScore: result.socialScore,
          financialScore: result.financialScore,
          academicScore: result.academicScore,
          emotionalScore: result.emotionalScore,
          strengths: JSON.parse(result.strengths),
          weaknesses: JSON.parse(result.weaknesses),
          recommendations: JSON.parse(result.recommendations),
        };
      }),

    // Admin: Get all sessions
    listSessions: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await getAllSimulatorSessions(input.limit, input.offset);
      }),

    // Admin: Get completion stats
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await getSimulatorCompletionStats();
      }),
  }),

  // ==========================================
  // AI Agent Command Center
  // ==========================================
  agents: router({
    // Get dashboard stats
    getDashboardStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await getAgentDashboardStats();
      }),

    // Get all agent configs
    getConfigs: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await getAllAgentConfigs();
      }),

    // Toggle agent active/inactive
    toggleAgent: protectedProcedure
      .input(z.object({ agentName: z.string(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateAgentConfig(input.agentName, { isActive: input.isActive });
        return { success: true };
      }),

    // Manually trigger an agent
    triggerAgent: protectedProcedure
      .input(z.object({ agentName: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await triggerAgent(input.agentName);
        return { success: true, result };
      }),

    // Get agent run logs
    getRunLogs: protectedProcedure
      .input(z.object({ agentName: z.string().optional(), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.agentName) {
          return await getAgentRunLogs(input.agentName, input.limit);
        }
        return await getAllRecentAgentRuns(input.limit);
      }),

    // Get lead assignments
    getLeadAssignments: protectedProcedure
      .input(z.object({ counselorEmail: z.string().optional(), status: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (input.counselorEmail) {
          return await getLeadAssignmentsByCounselor(input.counselorEmail);
        }
        return await getAllLeadAssignments(input.status);
      }),

    // Update lead assignment status
    updateAssignment: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["assigned", "contacted", "follow_up", "qualified", "converted", "closed", "escalated"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateLeadAssignment(input.id, {
          status: input.status,
          notes: input.notes,
          ...(input.status === "contacted" ? { firstContactAt: new Date() } : {}),
        });
        return { success: true };
      }),

    // Get follow-up actions for an assignment
    getFollowUps: protectedProcedure
      .input(z.object({ assignmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await getFollowUpActionsByAssignment(input.assignmentId);
      }),

    // Get SEO content calendar
    getSeoContent: protectedProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await getAllSeoContentEntries(input.status);
      }),

    // Get daily reports
    getDailyReports: protectedProcedure
      .input(z.object({ limit: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await getAllDailyReports(input.limit);
      }),

    // Send test daily report
    sendTestReport: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await triggerAgent("central_reporter");
        return { success: true, result };
      }),

    // ---- Phase 2 Agent Routes ----

    // Get visitor analytics (Lead Hunter)
    getVisitorAnalytics: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getVisitorAnalytics } = await import("./agentLeadHunter");
        return await getVisitorAnalytics();
      }),

    // Get competitor dashboard
    getCompetitorDashboard: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getCompetitorDashboard } = await import("./agentCompetitorMonitor");
        return await getCompetitorDashboard();
      }),

    // Get partnership pipeline
    getPartnershipPipeline: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getPartnershipPipeline } = await import("./agentUniversityScout");
        return await getPartnershipPipeline();
      }),

    // Update partnership status
    updatePartnershipStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["identified", "researching", "draft_ready", "email_sent", "follow_up_sent", "responded", "meeting_scheduled", "agreement_pending", "partnered", "rejected", "no_response"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { universityPartnerships } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        await db.update(universityPartnerships)
          .set({ outreachStatus: input.status, ...(input.status === "email_sent" ? { outreachSentAt: new Date() } : {}) })
          .where(eq(universityPartnerships.id, input.id));
        return { success: true };
      }),

    // Dismiss competitor intelligence
    dismissCompetitorAlert: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { competitorIntelligence } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        await db.update(competitorIntelligence)
          .set({ status: "reviewed", reviewedAt: new Date(), reviewedBy: ctx.user.name || ctx.user.openId })
          .where(eq(competitorIntelligence.id, input.id));
        return { success: true };
      }),

    // ---- Real Data Feature Endpoints (Phase 2) ----

    // Run real Google ranking check
    runRankingCheck: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { runRankingCheck } = await import("./googleRankingTracker");
        return await runRankingCheck();
      }),

    // Get latest ranking data
    getRankingData: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getLatestRankingData } = await import("./googleRankingTracker");
        return await getLatestRankingData();
      }),

    // Run real competitor website scan
    runCompetitorScan: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { runCompetitorScan } = await import("./competitorScraper");
        return await runCompetitorScan();
      }),

    // Get competitor scan data
    getCompetitorScanData: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getCompetitorScanData } = await import("./competitorScraper");
        return await getCompetitorScanData();
      }),

    // Run real social media scan
    runSocialMediaScan: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { runSocialMediaScan } = await import("./socialMediaScraper");
        return await runSocialMediaScan();
      }),

    // Get social media data
    getSocialMediaData: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { getSocialMediaData } = await import("./socialMediaScraper");
        return await getSocialMediaData();
      }),

    // ---- Partnership Outreach Approval Workflow ----

    // Get pending approval drafts
    getPendingApprovals: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { universityPartnerships } = await import("../drizzle/schema");
        const { eq, desc, or } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        return await db.select().from(universityPartnerships)
          .where(or(
            eq(universityPartnerships.approvalStatus, "pending_approval"),
            eq(universityPartnerships.approvalStatus, "approved"),
            eq(universityPartnerships.approvalStatus, "rejected"),
            eq(universityPartnerships.approvalStatus, "sent"),
          ))
          .orderBy(desc(universityPartnerships.approvalRequestedAt));
      }),

    // Submit draft for approval (sends email to admin)
    submitForApproval: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { submitDraftForApproval } = await import("./agentUniversityScout");
        await submitDraftForApproval(input.id);
        return { success: true };
      }),

    // Submit all pending drafts for approval
    submitAllForApproval: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { submitAllDraftsForApproval } = await import("./agentUniversityScout");
        const count = await submitAllDraftsForApproval();
        return { success: true, count };
      }),

    // Approve and send outreach email
    approveOutreach: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { approveAndSendOutreach } = await import("./agentUniversityScout");
        await approveAndSendOutreach(input.id);
        return { success: true };
      }),

    // Reject outreach
    rejectOutreach: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { rejectOutreach } = await import("./agentUniversityScout");
        await rejectOutreach(input.id, input.reason);
        return { success: true };
      }),

    // Update outreach email draft (edit before sending)
    updateOutreachDraft: protectedProcedure
      .input(z.object({
        id: z.number(),
        subject: z.string().optional(),
        body: z.string().optional(),
        recipientEmail: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { universityPartnerships } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        const updateData: Record<string, any> = {};
        if (input.subject) updateData.outreachEmailSubject = input.subject;
        if (input.body) updateData.outreachEmailDraft = input.body;
        if (input.recipientEmail) updateData.outreachRecipientEmail = input.recipientEmail;
        await db.update(universityPartnerships)
          .set(updateData)
          .where(eq(universityPartnerships.id, input.id));
        return { success: true };
      }),

    // Process existing universities (research emails, generate drafts, submit for approval)
    processExistingUniversities: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { processExistingUniversities } = await import("./agentUniversityScout");
        return await processExistingUniversities();
      }),

    // ---- Phase 3 Agent Routes (New Agents) ----

    // Trigger Aptitude Nurture Agent
    triggerAptitudeNurture: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await triggerAgent("aptitude_nurture");
        return { success: true, result };
      }),

    // Trigger Re-Engagement Agent
    triggerReEngagement: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await triggerAgent("re_engagement");
        return { success: true, result };
      }),

    // Trigger WhatsApp Broadcast Agent
    triggerWhatsAppBroadcast: protectedProcedure
      .input(z.object({
        campaignType: z.enum(["aptitude_followup", "promotion", "event_reminder", "custom"]).default("promotion"),
        customMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await triggerAgent("whatsapp_broadcast", {
          campaignType: input.campaignType,
          customMessage: input.customMessage,
        });
        return { success: true, result };
      }),

    // Trigger Content Amplifier Agent
    triggerContentAmplifier: protectedProcedure
      .input(z.object({ blogId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await triggerAgent("content_amplifier", { blogId: input.blogId });
        return { success: true, result };
      }),

    // Get amplified content for a blog post
    getAmplifiedContent: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { agentRunLogs } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        const runs = await db.select().from(agentRunLogs)
          .where(eq(agentRunLogs.agentName, "content_amplifier"))
          .orderBy(desc(agentRunLogs.startedAt))
          .limit(5);
        return runs.map(r => ({
          id: r.id,
          status: r.status,
          summary: r.summary,
          details: r.details ? JSON.parse(r.details) : null,
          startedAt: r.startedAt,
        }));
      }),

    // Get aptitude nurture stats
    getAptitudeNurtureStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { aptitudeResults, agentRunLogs } = await import("../drizzle/schema");
        const { eq, desc, sql } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        const total = await db.select({ count: sql<number>`count(*)` }).from(aptitudeResults);
        const nurtured = await db.select({ count: sql<number>`count(*)` }).from(aptitudeResults).where(eq(aptitudeResults.nurtureEmailSent, 1));
        const runs = await db.select().from(agentRunLogs)
          .where(eq(agentRunLogs.agentName, "aptitude_nurture"))
          .orderBy(desc(agentRunLogs.startedAt))
          .limit(5);
        return {
          totalAptitudeLeads: total[0]?.count || 0,
          nurturedLeads: nurtured[0]?.count || 0,
          pendingNurture: (total[0]?.count || 0) - (nurtured[0]?.count || 0),
          recentRuns: runs.map(r => ({ id: r.id, status: r.status, summary: r.summary, startedAt: r.startedAt })),
        };
      }),

    // Get re-engagement stats
    getReEngagementStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { agentRunLogs } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        const runs = await db.select().from(agentRunLogs)
          .where(eq(agentRunLogs.agentName, "re_engagement"))
          .orderBy(desc(agentRunLogs.startedAt))
          .limit(5);
        return {
          recentRuns: runs.map(r => ({ id: r.id, status: r.status, summary: r.summary, startedAt: r.startedAt, itemsProcessed: r.itemsProcessed })),
        };
      }),

    // ==================== SEO OPTIMIZER AGENT ====================

    // Trigger SEO Optimizer agent
    triggerSeoOptimizer: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await triggerAgent("seo_optimizer");
        return { success: true, result };
      }),

    // Get SEO dashboard stats
    getSeoStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { seoPageAudits, seoRecommendations, seoScoreHistory, agentRunLogs } = await import("../drizzle/schema");
        const { eq, desc, sql } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);

        // Latest score history
        const latestScore = await db.select().from(seoScoreHistory)
          .orderBy(desc(seoScoreHistory.createdAt))
          .limit(1);

        // Score trend (last 10)
        const scoreTrend = await db.select({
          overallScore: seoScoreHistory.overallScore,
          metaScore: seoScoreHistory.metaScore,
          contentScore: seoScoreHistory.contentScore,
          technicalScore: seoScoreHistory.technicalScore,
          createdAt: seoScoreHistory.createdAt,
        }).from(seoScoreHistory)
          .orderBy(desc(seoScoreHistory.createdAt))
          .limit(10);

        // Latest page audits (most recent per page)
        const latestAudits = await db.select().from(seoPageAudits)
          .orderBy(desc(seoPageAudits.auditedAt))
          .limit(50);

        // Deduplicate by pageUrl (keep latest)
        const seenPages = new Set<string>();
        const uniqueAudits = latestAudits.filter(a => {
          if (seenPages.has(a.pageUrl)) return false;
          seenPages.add(a.pageUrl);
          return true;
        });

        // Open recommendations
        const openRecs = await db.select().from(seoRecommendations)
          .where(eq(seoRecommendations.status, "open"))
          .orderBy(desc(seoRecommendations.createdAt))
          .limit(30);

        // Recent runs
        const runs = await db.select().from(agentRunLogs)
          .where(eq(agentRunLogs.agentName, "seo_optimizer"))
          .orderBy(desc(agentRunLogs.startedAt))
          .limit(5);

        // Count by severity
        const criticalCount = openRecs.filter(r => r.severity === "critical").length;
        const warningCount = openRecs.filter(r => r.severity === "warning").length;
        const infoCount = openRecs.filter(r => r.severity === "info").length;

        return {
          currentScore: latestScore[0] || null,
          scoreTrend: scoreTrend.reverse(),
          pageAudits: uniqueAudits.map(a => ({
            id: a.id,
            pageUrl: a.pageUrl,
            pageTitle: a.pageTitle,
            overallScore: a.overallScore,
            metaTitleScore: a.metaTitleScore,
            metaDescriptionScore: a.metaDescriptionScore,
            hasOgTitle: a.hasOgTitle,
            hasOgDescription: a.hasOgDescription,
            hasOgImage: a.hasOgImage,
            h1Count: a.h1Count,
            hasCanonical: a.hasCanonical,
            hasStructuredData: a.hasStructuredData,
            loadTimeMs: a.loadTimeMs,
            wordCount: a.wordCount,
            issues: a.issues ? JSON.parse(a.issues) : [],
            auditedAt: a.auditedAt,
          })),
          recommendations: openRecs.map(r => ({
            id: r.id,
            pageUrl: r.pageUrl,
            type: r.type,
            severity: r.severity,
            title: r.title,
            description: r.description,
            currentValue: r.currentValue,
            suggestedValue: r.suggestedValue,
            status: r.status,
          })),
          issueCounts: { critical: criticalCount, warning: warningCount, info: infoCount },
          recentRuns: runs.map(r => ({
            id: r.id,
            status: r.status,
            summary: r.summary,
            startedAt: r.startedAt,
            details: r.details ? JSON.parse(r.details) : null,
          })),
        };
      }),

    // ==================== UNIVERSITY REPLY HANDLER ====================

    // Get pending university replies awaiting approval
    getUniversityReplyQueue: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { universityReplyQueue } = await import("../drizzle/schema");
        const { desc } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        const items = await db.select().from(universityReplyQueue)
          .orderBy(desc(universityReplyQueue.receivedAt))
          .limit(50);
        return items.map(item => ({
          ...item,
          keyPoints: item.keyPoints ? JSON.parse(item.keyPoints) : [],
        }));
      }),

    // Approve a reply and send the drafted response
    approveUniversityReply: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { universityReplyQueue } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        // Mark as approved first
        await db.update(universityReplyQueue)
          .set({ approvalStatus: "approved", approvedAt: new Date() })
          .where(eq(universityReplyQueue.id, input.id));
        // Send the response
        const { sendApprovedResponse } = await import("./agentUniversityReplyHandler");
        return await sendApprovedResponse(input.id, false);
      }),

    // Edit the draft and then approve
    editAndApproveUniversityReply: protectedProcedure
      .input(z.object({
        id: z.number(),
        editedResponse: z.string().min(10),
        editedSubject: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { universityReplyQueue } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        // Save edited response and mark as edited_and_approved
        await db.update(universityReplyQueue)
          .set({
            editedResponse: input.editedResponse,
            ...(input.editedSubject ? { draftedSubject: input.editedSubject } : {}),
            approvalStatus: "edited_and_approved",
            approvedAt: new Date(),
          })
          .where(eq(universityReplyQueue.id, input.id));
        // Send the edited response
        const { sendApprovedResponse } = await import("./agentUniversityReplyHandler");
        return await sendApprovedResponse(input.id, true);
      }),

    // Decline a reply (don't respond)
    declineUniversityReply: protectedProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { universityReplyQueue } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        await db.update(universityReplyQueue)
          .set({
            approvalStatus: "declined",
            declinedAt: new Date(),
            declineReason: input.reason || null,
          })
          .where(eq(universityReplyQueue.id, input.id));
        return { success: true };
      }),

    // Manually submit a university reply (paste from Gmail — works without Resend MX records)
    submitUniversityReplyManually: protectedProcedure
      .input(z.object({
        universityPartnershipId: z.number().optional().nullable(),
        fromEmail: z.string().email(),
        fromName: z.string().optional().nullable(),
        subject: z.string().min(1),
        emailBody: z.string().min(10, "Please paste the full email body (at least 10 characters)"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { handleManualUniversityReply } = await import("./agentUniversityReplyHandler");
        return await handleManualUniversityReply({
          fromEmail: input.fromEmail,
          fromName: input.fromName,
          subject: input.subject,
          emailBody: input.emailBody,
          universityPartnershipId: input.universityPartnershipId,
        });
      }),

    // Dismiss or apply a recommendation
    updateSeoRecommendation: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["applied", "dismissed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { seoRecommendations } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = drizzle(process.env.DATABASE_URL!);
        await db.update(seoRecommendations)
          .set({ status: input.status, appliedAt: input.status === "applied" ? new Date() : null })
          .where(eq(seoRecommendations.id, input.id));
        return { success: true };
      }),
  }),

  // ============================================================
  // AI General Manager Router
  // ============================================================
  gm: router({
    getLatestReport: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getLatestGmReport();
      }),

    getReports: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(30).default(7) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getGmReports(input.limit);
      }),

    getRecommendations: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getGmRecommendations();
      }),

    updateRecommendation: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["acknowledged", "in_progress", "done", "dismissed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateGmRecommendationStatus(input.id, input.status);
        return { success: true };
      }),

    getHealthHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getGmHealthHistory(input.limit);
      }),

    triggerCycle: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const result = await runGeneralManagerCycle();
        return { success: true, cycleLabel: result.cycleLabel, agentCount: result.agentStatuses.length, recommendations: result.recommendations.length };
      }),

    sendReport: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const cycleResult = await runGeneralManagerCycle();
        await generateAndSendExecutiveReport(cycleResult);
        return { success: true };
      }),
    runGeoMonitor: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const report = await runGeoMonitor();
        return {
          success: true,
          mentionRate: report.mentionRate,
          mentionCount: report.mentionCount,
          queriesRun: report.queriesRun,
          topCompetitors: report.topCompetitors,
          recommendations: report.recommendations,
        };
      }),
     getLatestGeoReport: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "general_manager") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return getLatestGeoReport();
      }),
  }),

  // ─── CRM Router — Counselor Workspace ────────────────────────────────────────
  crm: router({

    // ── Tasks ────────────────────────────────────────────────────────────────
    getTodayTasks: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { tasks: [] };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const tasks = await getTodayTasksByStaff(payload.staffId as number);
        return { tasks };
      } catch { return { tasks: [] }; }
    }),

    getAllTasks: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { tasks: [] };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const tasks = await getTasksByStaff(payload.staffId as number);
        return { tasks };
      } catch { return { tasks: [] }; }
    }),

    createTask: publicProcedure
      .input(z.object({
        relatedType: z.enum(["lead", "application", "general"]).default("lead"),
        relatedId: z.number().optional(),
        relatedName: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        taskType: z.enum(["call", "whatsapp", "email", "document_request", "follow_up", "consultation", "other"]).default("follow_up"),
        priority: z.enum(["urgent", "high", "medium", "low"]).default("medium"),
        dueDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          const staffId = payload.staffId as number;
          const staffEmail = payload.email as string;
          const id = await createCrmTask({
            staffId, staffEmail,
            relatedType: input.relatedType,
            relatedId: input.relatedId ?? null,
            relatedName: input.relatedName ?? null,
            title: input.title,
            description: input.description ?? null,
            taskType: input.taskType,
            priority: input.priority,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            isAiGenerated: false,
          });
          return { success: true, id };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    updateTask: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "done", "skipped"]).optional(),
        priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const update: Record<string, any> = { ...rest };
        if (rest.dueDate) update.dueDate = new Date(rest.dueDate);
        if (rest.status === "done") update.completedAt = new Date();
        await updateCrmTask(id, update);
        return { success: true };
      }),

    deleteTask: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCrmTask(input.id);
        return { success: true };
      }),

    // ── Pipeline ─────────────────────────────────────────────────────────────
    getLeadWithPipeline: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        const lead = await getLeadById(input.leadId);
        const pipeline = await getLeadPipelineStage(input.leadId);
        return { lead, pipeline };
      }),
    getMyPipeline: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { pipeline: [] };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staffEmail = payload.email as string;
        await ensurePipelineStagesForCounselor(staffEmail);
        const pipeline = await getPipelineByStaff(staffEmail);
        return { pipeline };
      } catch { return { pipeline: [] }; }
    }),

    getAllPipeline: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { pipeline: [] };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staff = await getStaffAccountById(payload.staffId as number);
        if (!staff || staff.role !== "admin") return { pipeline: [] };
        return { pipeline: await getAllPipelineLeads() };
      } catch { return { pipeline: [] }; }
    }),

    updatePipelineStage: publicProcedure
      .input(z.object({
        leadId: z.number(),
        stage: z.enum(["new", "contacted", "qualified", "enrolled", "in_progress", "completed", "lost"]),
        note: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          await upsertLeadPipelineStage(input.leadId, input.stage, payload.email as string, input.note);
          return { success: true };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    // ── Consultation Notes ────────────────────────────────────────────────────
    getNotesByLead: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => ({ notes: await getConsultationNotesByLead(input.leadId) })),

    getNotesByApplication: publicProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ input }) => ({ notes: await getConsultationNotesByApplication(input.applicationId) })),

    addConsultationNote: publicProcedure
      .input(z.object({
        relatedType: z.enum(["lead", "application"]),
        relatedId: z.number(),
        studentName: z.string(),
        rawNote: z.string().min(1),
        consultationType: z.enum(["call", "whatsapp", "in_person", "email", "online_meeting"]).default("call"),
        durationMinutes: z.number().optional(),
        outcome: z.enum(["positive", "neutral", "negative", "no_answer"]).default("neutral"),
        nextStepAction: z.string().optional(),
        nextStepDueDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          const staffId = payload.staffId as number;
          const staffEmail = payload.email as string;
          // AI expand the note
          let expandedNote = input.rawNote;
          try {
            const aiResp = await invokeLLM({
              messages: [
                { role: "system", content: "You are a professional education consultant note-taker. Expand the counselor's brief note into a structured, professional consultation record. Include: Summary, Student Situation, Key Discussion Points, Concerns Raised, Next Steps. Keep it concise and factual. Output in Indonesian or English based on the note language." },
                { role: "user", content: `Counselor note: ${input.rawNote}\nStudent: ${input.studentName}\nType: ${input.consultationType}\nOutcome: ${input.outcome}` },
              ],
            });
            expandedNote = (aiResp.choices?.[0]?.message?.content as string) || input.rawNote;
          } catch { /* use raw note if AI fails */ }
          const id = await createConsultationNote({
            staffId, staffName: staffEmail,
            relatedType: input.relatedType, relatedId: input.relatedId,
            studentName: input.studentName,
            rawNote: input.rawNote, expandedNote,
            consultationType: input.consultationType,
            durationMinutes: input.durationMinutes ?? null,
            outcome: input.outcome,
            nextStepAction: input.nextStepAction ?? null,
            nextStepDueDate: input.nextStepDueDate ? new Date(input.nextStepDueDate) : null,
          });
          // Auto-create follow-up task if next step defined
          if (input.nextStepAction) {
            await createCrmTask({
              staffId, staffEmail,
              relatedType: input.relatedType, relatedId: input.relatedId,
              relatedName: input.studentName,
              title: input.nextStepAction,
              taskType: "follow_up", priority: "medium",
              dueDate: input.nextStepDueDate ? new Date(input.nextStepDueDate) : null,
              isAiGenerated: true,
              aiReason: "Auto-created from consultation note next step",
            });
          }
          return { success: true, id };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    // ── Performance ───────────────────────────────────────────────────────────
    getMyPerformance: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { performance: [] };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staffId = payload.staffId as number;
        const staffEmail = payload.email as string;
        await upsertCounselorPerformanceSnapshot(staffId, staffEmail);
        return { performance: await getCounselorPerformanceByStaff(staffId, 30) };
      } catch { return { performance: [] }; }
    }),

    getAllPerformance: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { performance: [] };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staff = await getStaffAccountById(payload.staffId as number);
        if (!staff || staff.role !== "admin") return { performance: [] };
         return { performance: await getAllCounselorPerformanceLatest() };
      } catch { return { performance: [] }; }
    }),

    // ── AI Counselor Assistant ────────────────────────────────────────────────
    aiConsultationPrep: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const lead = await getLeadById(input.leadId);
          if (!lead) throw new Error("Lead not found");
          const notes = await getNotesByLeadId(input.leadId);
          const notesText = notes.length > 0
            ? notes.slice(0, 5).map((n: any) => `[${new Date(n.createdAt).toLocaleDateString()}] ${n.rawNote || n.expandedNote || ''}`).join("\n")
            : "No previous consultation notes.";
          const response = await invokeLLM({
            messages: [
              { role: "system", content: `You are an expert education counselor assistant at SpecTa Education, a study abroad consultancy in Indonesia. Your job is to help counselors prepare for student consultations. Be specific, actionable, and professional.` },
              { role: "user", content: `Prepare a consultation briefing for this student:\n\nName: ${lead.studentName}\nEmail: ${lead.studentEmail || 'N/A'}\nPhone: ${lead.studentPhone || 'N/A'}\nPreferred Country: ${lead.preferredCountry || 'Not specified'}\nStudy Level: ${lead.studyLevel || 'Not specified'}\nIntake Date: ${lead.intakeDate || 'Not specified'}\nCurrent Status: ${lead.status}\nIntent Summary: ${lead.intentSummary || 'N/A'}\nOriginal Notes: ${lead.notes || 'N/A'}\n\nPrevious Consultation Notes:\n${notesText}\n\nPlease provide:\n1. **Student Summary** - Key facts in 2-3 sentences\n2. **Key Discussion Points** - 3-5 specific topics to cover\n3. **Recommended Universities** - 3 specific universities matching their profile\n4. **Potential Concerns** - Any red flags or challenges\n5. **Next Steps** - Concrete actions after this consultation\n\nBe specific and tailored to this student.` }
            ]
          });
          const content = response.choices?.[0]?.message?.content || "Unable to generate briefing.";
          return { success: true, briefing: content };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    aiDraftMessage: publicProcedure
      .input(z.object({
        leadId: z.number(),
        messageType: z.enum(["whatsapp_followup", "whatsapp_welcome", "email_followup", "email_offer", "email_reminder"]),
        customContext: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const lead = await getLeadById(input.leadId);
          if (!lead) throw new Error("Lead not found");
          const notes = await getNotesByLeadId(input.leadId);
          const lastNote = notes[0]?.rawNote || notes[0]?.expandedNote || "No recent notes.";
          const typeDescriptions: Record<string, string> = {
            whatsapp_followup: "a WhatsApp follow-up message (casual, friendly, max 3 sentences)",
            whatsapp_welcome: "a WhatsApp welcome message for a new lead (warm, inviting, introduce SpecTa Education briefly)",
            email_followup: "a professional follow-up email (formal, with subject line, body, and sign-off)",
            email_offer: "an email presenting study abroad options (include 2-3 university suggestions)",
            email_reminder: "a gentle reminder email for a pending action or document submission",
          };
          const response = await invokeLLM({
            messages: [
              { role: "system", content: `You are a communication specialist at SpecTa Education. Write messages that are warm, professional, and persuasive. Write in Bahasa Indonesia unless the context suggests English. For WhatsApp, keep it conversational and brief. For emails, be more formal.` },
              { role: "user", content: `Write ${typeDescriptions[input.messageType]} for this student:\n\nStudent Name: ${lead.studentName}\nPreferred Country: ${lead.preferredCountry || 'Not specified'}\nStudy Level: ${lead.studyLevel || 'Not specified'}\nCurrent Status: ${lead.status}\nLast Consultation Note: ${lastNote}\n${input.customContext ? `Additional Context: ${input.customContext}` : ""}\n\nMake it personal and specific. Sign off as the SpecTa Education counselor team.` }
            ]
          });
          const content = response.choices?.[0]?.message?.content || "Unable to generate message.";
          return { success: true, message: content, messageType: input.messageType };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    aiNextAction: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const lead = await getLeadById(input.leadId);
          if (!lead) throw new Error("Lead not found");
          const notes = await getNotesByLeadId(input.leadId);
          const pipeline = await getLeadPipelineStage(input.leadId);
          const notesText = notes.slice(0, 3).map((n: any) => `[${new Date(n.createdAt).toLocaleDateString()}] ${n.rawNote || n.expandedNote || ''}`).join("\n") || "No notes yet.";
          const response = await invokeLLM({
            messages: [
              { role: "system", content: `You are an AI sales and counseling strategist for SpecTa Education. Analyze student data and recommend the single most impactful next action a counselor should take RIGHT NOW. Respond ONLY with valid JSON.` },
              { role: "user", content: `Analyze this student and recommend the best next action:\n\nStudent: ${lead.studentName}\nStatus: ${lead.status}\nPipeline Stage: ${pipeline?.stage || 'new'}\nPreferred Country: ${lead.preferredCountry || 'Not specified'}\nStudy Level: ${lead.studyLevel || 'Not specified'}\nIntake Date: ${lead.intakeDate || 'Not specified'}\nDays Since Created: ${Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000)}\nLast Updated: ${Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86400000)} days ago\n\nRecent Notes:\n${notesText}\n\nRespond with this JSON structure: {"urgency":"high|medium|low","action":"single clear action","reason":"why in 1-2 sentences","script":"exact opening line to say/write","dueIn":"today|tomorrow|this week|next week"}` }
            ],
            response_format: { type: "json_schema", json_schema: { name: "next_action", strict: true, schema: { type: "object", properties: { urgency: { type: "string", enum: ["high", "medium", "low"] }, action: { type: "string" }, reason: { type: "string" }, script: { type: "string" }, dueIn: { type: "string" } }, required: ["urgency", "action", "reason", "script", "dueIn"], additionalProperties: false } } },
          });
          const raw = String(response.choices?.[0]?.message?.content || "{}");
          const parsed = JSON.parse(raw);
          return { success: true, recommendation: parsed };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    aiUniversityFit: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const lead = await getLeadById(input.leadId);
          if (!lead) throw new Error("Lead not found");
          const response = await invokeLLM({
            messages: [
              { role: "system", content: `You are a university admissions expert for Indonesian students. You have deep knowledge of universities in Australia, UK, USA, Canada, Malaysia, Singapore, Japan, South Korea, Netherlands, and Germany. Provide honest, specific recommendations. Respond ONLY with valid JSON.` },
              { role: "user", content: `Recommend universities for:\n\nStudent: ${lead.studentName}\nPreferred Country: ${lead.preferredCountry || 'Open to suggestions'}\nStudy Level: ${lead.studyLevel || 'Not specified'}\nProgram / Major Interest: ${(lead as any).programInterest || lead.intentSummary || 'Not specified'}\nTarget Intake: ${lead.intakeDate || 'Flexible'}\nAdditional Notes: ${lead.notes || 'N/A'}\n\nIMPORTANT: Recommend universities that specifically offer strong programs in the student's major (${(lead as any).programInterest || lead.intentSummary || 'general'}). Prioritize universities in ${lead.preferredCountry || 'any country'}. For specialized fields like Culinary Arts, recommend culinary schools (Le Cordon Bleu, SHATEC, William Angliss, etc.) not generic universities.\n\nRespond with JSON: {"topPick":{"university":"name","country":"country","program":"program","fitScore":95,"reason":"why","deadline":"date"},"alternatives":[{"university":"name","country":"country","program":"program","fitScore":80,"reason":"brief reason"},{"university":"name","country":"country","program":"program","fitScore":75,"reason":"brief reason"}],"safetyOption":{"university":"name","country":"country","program":"program","fitScore":65,"reason":"why safe"},"scholarshipOpportunities":["scholarship 1","scholarship 2"],"counselorTip":"one specific tip"}` }
            ],
            response_format: { type: "json_schema", json_schema: { name: "university_fit", strict: true, schema: { type: "object", properties: { topPick: { type: "object", properties: { university: { type: "string" }, country: { type: "string" }, program: { type: "string" }, fitScore: { type: "number" }, reason: { type: "string" }, deadline: { type: "string" } }, required: ["university","country","program","fitScore","reason","deadline"], additionalProperties: false }, alternatives: { type: "array", items: { type: "object", properties: { university: { type: "string" }, country: { type: "string" }, program: { type: "string" }, fitScore: { type: "number" }, reason: { type: "string" } }, required: ["university","country","program","fitScore","reason"], additionalProperties: false } }, safetyOption: { type: "object", properties: { university: { type: "string" }, country: { type: "string" }, program: { type: "string" }, fitScore: { type: "number" }, reason: { type: "string" } }, required: ["university","country","program","fitScore","reason"], additionalProperties: false }, scholarshipOpportunities: { type: "array", items: { type: "string" } }, counselorTip: { type: "string" } }, required: ["topPick","alternatives","safetyOption","scholarshipOpportunities","counselorTip"], additionalProperties: false } } },
          });
          const raw = String(response.choices?.[0]?.message?.content || "{}");
          const parsed = JSON.parse(raw);
          return { success: true, analysis: parsed };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    aiChat: publicProcedure
      .input(z.object({
        leadId: z.number(),
        message: z.string(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const lead = await getLeadById(input.leadId);
          if (!lead) throw new Error("Lead not found");
          const notes = await getNotesByLeadId(input.leadId);
          const notesText = notes.slice(0, 3).map((n: any) => `[${new Date(n.createdAt).toLocaleDateString()}] ${n.rawNote || n.expandedNote || ''}`).join("\n") || "No notes yet.";
          const programInterest = (lead as any).programInterest || lead.intentSummary || 'Not specified';
          const preferredCountry = lead.preferredCountry || 'Not specified';
          const systemPrompt = `You are an AI Counselor Assistant at SpecTa Education, a study abroad consultancy in Indonesia. You are helping a human counselor manage a specific student case.

STUDENT PROFILE (READ ALL FIELDS CAREFULLY BEFORE RESPONDING):
- Name: ${lead.studentName}
- Email: ${lead.studentEmail || 'N/A'}
- Phone: ${lead.studentPhone || 'N/A'}
- Preferred Country: ${preferredCountry}
- Study Level: ${lead.studyLevel || 'Not specified'}
- Program / Major Interest: ${programInterest}
- Target Intake: ${lead.intakeDate || 'Not specified'}
- Current Status: ${lead.status}
- Source: ${(lead as any).source || 'N/A'}
- Assigned Counselor: ${(lead as any).assignedCounselor || (lead as any).assignedTo || 'N/A'}
- Notes: ${lead.notes || 'N/A'}
- Intent Summary: ${lead.intentSummary || 'N/A'}

RECENT CONSULTATION NOTES:
${notesText}

CRITICAL RULES — FOLLOW STRICTLY:
1. ALWAYS use the student's specific Program/Major (${programInterest}) when recommending universities. NEVER ignore this field.
2. ALWAYS prioritize universities in the student's Preferred Country (${preferredCountry}) first.
3. If the student has a specific major (e.g., Culinary Arts, Hospitality, Engineering, Business, Design), ONLY recommend universities known for that specific field — do NOT recommend generic universities.
4. For Culinary Arts: recommend institutions like Le Cordon Bleu, SHATEC, William Angliss, Monash (Hospitality), Taylor's (Hospitality & Tourism), etc.
5. Never give generic answers — always tie recommendations back to the student's specific major and country preference.
6. Be concise and practical. Respond in Bahasa Indonesia unless the counselor writes in English.

Help the counselor with: answering questions about this student, drafting messages, suggesting universities, recommending next steps, explaining visa/deadlines/scholarships.`;
          const messages: any[] = [
            { role: "system", content: systemPrompt },
            ...(input.history || []).slice(-6),
            { role: "user", content: input.message },
          ];
          const response = await invokeLLM({ messages });
          const content = response.choices?.[0]?.message?.content || "Maaf, saya tidak bisa memproses permintaan ini.";
          // Persist to DB for AI memory
          try {
            await saveCrmChatMessage(input.leadId, "user", input.message);
            await saveCrmChatMessage(input.leadId, "assistant", typeof content === "string" ? content : String(content));
          } catch (_) { /* non-fatal */ }
          return { success: true, reply: content };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    // ── Student Management ────────────────────────────────────────────────────
    getMyStudents: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { students: [], isAdmin: false };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staffEmail = payload.email as string;
        const role = payload.role as string;
        const allLeads = await getAllLeads();
        const students = role === "admin"
          ? allLeads
          : allLeads.filter((l: any) => l.assignedTo === staffEmail || l.assignedCounselor === staffEmail);
        return { students, isAdmin: role === "admin" };
      } catch { return { students: [], isAdmin: false }; }
    }),

    addStudent: publicProcedure
      .input(z.object({
        studentName: z.string().min(1),
        studentEmail: z.string().optional(),
        studentPhone: z.string().optional(),
        preferredCountry: z.string().optional(),
        studyLevel: z.string().optional(),
        intakeDate: z.string().optional(),
        programInterest: z.string().optional(),
        notes: z.string().optional(),
        assignedCounselor: z.string().optional(),
        parentName: z.string().optional(),
        parentEmail: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          const staffEmail = payload.email as string;
          const assignedTo = input.assignedCounselor || staffEmail;
          const lead = await createLead({
            conversationId: null as any,
            studentName: input.studentName,
            studentEmail: input.studentEmail || undefined,
            studentPhone: input.studentPhone || undefined,
            preferredCountry: input.preferredCountry || undefined,
            studyLevel: input.studyLevel || undefined,
            intakeDate: input.intakeDate || undefined,
            notes: input.notes || undefined,
            assignedTo: assignedTo,
            assignedCounselor: assignedTo,
            programInterest: input.programInterest || undefined,
            parentName: input.parentName || undefined,
            parentEmail: input.parentEmail || undefined,
            status: "new",
            source: "crm_manual",
          } as any);
          if (!lead) return { success: false, error: "Failed to create student" };
          await upsertLeadPipelineStage(lead.id, "new", staffEmail, "Student added manually via CRM");
          return { success: true, leadId: lead.id };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    // ── Edit Student Profile ─────────────────────────────────────────────────
    editStudent: publicProcedure
      .input(z.object({
        leadId: z.number(),
        studentName: z.string().min(1).optional(),
        studentEmail: z.string().optional(),
        studentPhone: z.string().optional(),
        preferredCountry: z.string().optional(),
        studyLevel: z.string().optional(),
        intakeDate: z.string().optional(),
        programInterest: z.string().optional(),
        notes: z.string().optional(),
        assignedCounselor: z.string().optional(),
        status: z.enum(["new", "contacted", "qualified", "converted", "closed"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          const { leadId, ...updates } = input;
          await updateLead(leadId, updates as any);
          return { success: true };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    // ── AI Chat Memory ───────────────────────────────────────────────────────
    getChatHistory: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { history: [] };
        try {
          await jwtVerify(match[1], new TextEncoder().encode(process.env.JWT_SECRET || "secret"), { algorithms: ["HS256"] });
          const history = await getCrmChatHistory(input.leadId);
          return { history };
        } catch { return { history: [] }; }
      }),

    clearChatHistory: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          await jwtVerify(match[1], new TextEncoder().encode(process.env.JWT_SECRET || "secret"), { algorithms: ["HS256"] });
          await clearCrmChatHistory(input.leadId);
          return { success: true };
        } catch (e: any) { return { success: false, error: e.message }; }
      }),

    // ── Bulk CSV Import ──────────────────────────────────────────────────────
    bulkImportStudents: publicProcedure
      .input(z.object({
        students: z.array(z.object({
          studentName: z.string().min(1),
          studentEmail: z.string().optional(),
          studentPhone: z.string().optional(),
          preferredCountry: z.string().optional(),
          studyLevel: z.string().optional(),
          intakeDate: z.string().optional(),
          programInterest: z.string().optional(),
          notes: z.string().optional(),
          assignedCounselor: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated", imported: 0, errors: [] };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          const staffEmail = payload.email as string;
          let imported = 0;
          const errors: string[] = [];
          for (const s of input.students) {
            try {
              const assignedTo = s.assignedCounselor || staffEmail;
              const lead = await createLead({
                conversationId: null as any,
                studentName: s.studentName,
                studentEmail: s.studentEmail || undefined,
                studentPhone: s.studentPhone || undefined,
                preferredCountry: s.preferredCountry || undefined,
                studyLevel: s.studyLevel || undefined,
                intakeDate: s.intakeDate || undefined,
                notes: s.notes || undefined,
                assignedTo,
                assignedCounselor: assignedTo,
                programInterest: s.programInterest || undefined,
                status: "new",
                source: "csv_import",
              } as any);
              if (lead) {
                await upsertLeadPipelineStage(lead.id, "new", staffEmail, "Imported via CSV");
                imported++;
              }
            } catch (e: any) {
              errors.push(`${s.studentName}: ${e.message}`);
            }
          }
          return { success: true, imported, errors };
        } catch (e: any) { return { success: false, error: e.message, imported: 0, errors: [] }; }
      }),

    // Sprint 4: Document Checklist
    getDocChecklist: publicProcedure.input(z.object({ leadId: z.number() })).query(async ({ input, ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { docs: [] };
      try {
        const docs = await getCrmDocsByLead(input.leadId);
        return { docs };
      } catch (e: any) { return { docs: [] }; }
    }),
    initDocChecklist: publicProcedure.input(z.object({ leadId: z.number() })).mutation(async ({ input, ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { success: false, error: "Not authenticated" };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        await initDefaultDocChecklist(input.leadId, payload.email as string);
        return { success: true };
      } catch (e: any) { return { success: false, error: e.message }; }
    }),
    updateDocStatus: publicProcedure.input(z.object({
      leadId: z.number(),
      docType: z.string(),
      docLabel: z.string(),
      status: z.enum(["pending", "submitted", "verified", "rejected"]),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { success: false, error: "Not authenticated" };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        await upsertCrmDoc({ leadId: input.leadId, docType: input.docType, docLabel: input.docLabel, status: input.status, notes: input.notes, staffEmail: payload.email as string });
        await logActivity({ leadId: input.leadId, activityType: "doc_updated", title: `Document "${input.docLabel}" marked as ${input.status}`, staffEmail: payload.email as string });
        return { success: true };
      } catch (e: any) { return { success: false, error: e.message }; }
    }),

    // Sprint 5: Appointments
    getMyAppointments: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { appointments: [] };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const role = payload.role as string;
        const staffEmail = payload.email as string;
        const appts = role === "admin" ? await getAllCrmAppointments() : await getCrmAppointmentsByStaff(staffEmail);
        return { appointments: appts };
      } catch (e: any) { return { appointments: [] }; }
    }),
    getAppointmentsByLead: publicProcedure.input(z.object({ leadId: z.number() })).query(async ({ input, ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { appointments: [] };
      try {
        const appts = await getCrmAppointmentsByLead(input.leadId);
        return { appointments: appts };
      } catch (e: any) { return { appointments: [] }; }
    }),
    createAppointmentCrm: publicProcedure.input(z.object({
      leadId: z.number(),
      studentName: z.string(),
      studentEmail: z.string().optional(),
      studentPhone: z.string().optional(),
      appointmentType: z.enum(["initial_consultation", "follow_up", "document_review", "offer_discussion", "visa_prep", "other"]),
      scheduledAt: z.string(),
      durationMinutes: z.number().default(30),
      location: z.string().optional(),
      meetingLink: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { success: false, error: "Not authenticated" };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staffEmail = payload.email as string;
        const staffName = (payload.name as string) || staffEmail;
        const apptId = await createCrmAppointment({
          leadId: input.leadId, studentName: input.studentName,
          studentEmail: input.studentEmail, studentPhone: input.studentPhone,
          staffEmail, staffName, appointmentType: input.appointmentType,
          scheduledAt: new Date(input.scheduledAt), durationMinutes: input.durationMinutes,
          location: input.location, meetingLink: input.meetingLink, notes: input.notes, status: "scheduled",
        });
        await logActivity({ leadId: input.leadId, activityType: "appointment_booked", title: `Appointment booked: ${input.appointmentType.replace(/_/g, " ")} on ${new Date(input.scheduledAt).toLocaleDateString()}`, staffEmail });
        return { success: true, id: apptId };
      } catch (e: any) { return { success: false, error: e.message }; }
    }),
    updateAppointmentStatus: publicProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
    })).mutation(async ({ input }) => {
      try { await updateCrmAppointment(input.id, { status: input.status }); return { success: true }; }
      catch (e: any) { return { success: false, error: e.message }; }
    }),

    // Sprint 5: Parent Email Report
    sendParentReport: publicProcedure.input(z.object({
      leadId: z.number(),
      parentEmail: z.string().email(),
      parentName: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { success: false, error: "Not authenticated" };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staffEmail = payload.email as string;
        const lead = await getLeadById(input.leadId);
        if (!lead) return { success: false, error: "Student not found" };
        // Save parent info to lead if provided
        if (input.parentEmail || input.parentName) {
          await updateLead(input.leadId, {
            ...(input.parentEmail ? { parentEmail: input.parentEmail } : {}),
            ...(input.parentName ? { parentName: input.parentName } : {}),
          });
        }
        const docs = await getCrmDocsByLead(input.leadId);
        const verifiedDocs = docs.filter((d: any) => d.status === "verified").length;
        const pendingDocs = docs.filter((d: any) => d.status === "pending" || d.status === "submitted").length;
        const totalDocs = docs.length;
        const appointments = await getStudentAppointments(input.leadId);
        const now = Date.now();
        const upcomingSessions = appointments
          .filter((a: any) => a.status === "confirmed" && new Date(a.scheduledAt).getTime() > now)
          .slice(0, 3)
          .map((a: any) => ({ sessionType: a.sessionType, scheduledAt: a.scheduledAt }));
        const counselorName = lead.assignedCounselor || undefined;
        await sendParentProgressEmail({
          parentEmail: input.parentEmail,
          parentName: input.parentName || "Parent/Guardian",
          studentName: lead.studentName,
          journeyStage: lead.status || "new_lead",
          preferredCountry: lead.preferredCountry || undefined,
          preferredDegree: lead.studyLevel || undefined,
          preferredProgram: lead.programInterest || undefined,
          verifiedDocs,
          pendingDocs,
          totalDocs,
          upcomingSessions,
          counselorName,
          portalUrl: "https://spectaeducation.com/student/login",
        });
        await logActivity({ leadId: input.leadId, activityType: "email_sent", title: `Weekly progress report sent to parent: ${input.parentEmail}`, staffEmail });
        return { success: true };
      } catch (e: any) { return { success: false, error: e.message }; }
    }),
    // Update parent info for a lead
    updateParentInfo: publicProcedure.input(z.object({
      leadId: z.number(),
      parentEmail: z.string().email().optional(),
      parentName: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { success: false, error: "Not authenticated" };
      try {
        await updateLead(input.leadId, {
          ...(input.parentEmail !== undefined ? { parentEmail: input.parentEmail } : {}),
          ...(input.parentName !== undefined ? { parentName: input.parentName } : {}),
        });
        return { success: true };
      } catch (e: any) { return { success: false, error: e.message }; }
    }),

    // Sprint 6: Activity Timeline
    getActivityTimeline: publicProcedure.input(z.object({ leadId: z.number() })).query(async ({ input, ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { timeline: [] };
      try {
        const timeline = await getActivityTimeline(input.leadId);
        return { timeline };
      } catch (e: any) { return { timeline: [] }; }
    }),

    // Sprint 6: Notifications
    getNotifications: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { notifications: [], unread: 0 };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const staffEmail = payload.email as string;
        const notifications = await getNotificationsForStaff(staffEmail);
        const unread = notifications.filter((n: any) => !n.isRead).length;
        return { notifications, unread };
      } catch (e: any) { return { notifications: [], unread: 0 }; }
    }),
    markNotificationRead: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      try { await markNotificationRead(input.id); return { success: true }; }
      catch (e: any) { return { success: false }; }
    }),
    markAllNotificationsRead: publicProcedure.mutation(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return { success: false };
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        await markAllNotificationsRead(payload.email as string);
        return { success: true };
      } catch (e: any) { return { success: false }; }
    }),

    // ── Explain Lead Score (AI) ──────────────────────────────────────────────
    explainScore: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const lead = await getLeadById(input.leadId);
          if (!lead) return { success: false, explanation: "Student not found." };
          const docs = await getCrmDocsByLead(input.leadId);
          const timeline = await getActivityTimeline(input.leadId);
          const score = (lead as any).leadScore ?? 50;
          const stage = (lead as any).pipelineStage || (lead as any).status || "new";
          const docsSubmitted = (docs as any[]).filter((d: any) => d.status === "submitted" || d.status === "verified").length;
          const totalDocs = (docs as any[]).length;
          const activityCount = (timeline as any[]).length;
          const hasEmail = !!(lead as any).studentEmail;
          const hasPhone = !!(lead as any).studentPhone;
          const hasProgram = !!(lead as any).programInterest;
          const hasCountry = !!(lead as any).preferredCountry;
          const hasIntake = !!(lead as any).intakeDate;

          const prompt = `You are an expert education counselor CRM analyst. Analyze this student's lead score and provide a clear, actionable explanation.

Student: ${(lead as any).studentName}
Current Score: ${score}/100
Pipeline Stage: ${stage}
Country Interest: ${(lead as any).preferredCountry || "Not set"}
Program/Major: ${(lead as any).programInterest || "Not set"}
Study Level: ${(lead as any).studyLevel || "Not set"}
Target Intake: ${(lead as any).intakeDate || "Not set"}
Has Email: ${hasEmail ? "Yes" : "No"}
Has Phone: ${hasPhone ? "Yes" : "No"}
Documents Submitted: ${docsSubmitted}/${totalDocs || 0}
Total Activities Logged: ${activityCount}

Based on this data, provide:
1. WHY the student has this score (2-3 specific reasons based on the data above)
2. TOP 3 ACTIONS the counselor should take RIGHT NOW to improve this score
3. What the score would likely be after completing those actions

Be specific, practical, and concise. Format as clear paragraphs, not bullet points. Keep it under 200 words.`;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are a CRM analyst for an education consultancy. Give specific, data-driven insights about student lead scores." },
              { role: "user", content: prompt },
            ],
          });
          const explanation = response?.choices?.[0]?.message?.content || "Unable to generate explanation.";
          return { success: true, explanation, score };
        } catch (e: any) {
          return { success: false, explanation: "Error generating explanation: " + e.message };
        }
      }),

// ─── Sprint 8: Student Applications ──────────────────────────────────────
    getApplications: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { applications: [] };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        } catch { return { applications: [] }; }
        const apps = await getApplicationsByLead(input.leadId);
        return { applications: apps };
      }),
    addApplication: publicProcedure
      .input(z.object({
        leadId: z.number(),
        universityName: z.string().min(1),
        programName: z.string().min(1),
        country: z.string().optional(),
        intakePeriod: z.string().optional(),
        applicationStatus: z.string().optional(),
        tuitionFee: z.string().optional(),
        scholarshipInfo: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        let staffEmail = "";
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          staffEmail = payload.email as string || "";
        } catch { return { success: false, error: "Not authenticated" }; }
        try {
          await createStudentApplication({ ...input, staffEmail });

          // ── CONNECTED CRM: Auto-advance pipeline to "in_progress" ──────────
          const currentPipeline = await getLeadPipelineStage(input.leadId);
          const currentStage = currentPipeline?.stage || "new";
          const stageOrder = ["new","contacted","qualified","in_progress","enrolled","completed","lost"];
          const currentIdx = stageOrder.indexOf(currentStage);
          const inProgressIdx = stageOrder.indexOf("in_progress");
          // Only advance forward (not if already in_progress, enrolled, or completed)
          if (currentIdx < inProgressIdx) {
            await upsertLeadPipelineStage(input.leadId, "in_progress", staffEmail,
              `Auto-advanced: application added for ${input.universityName}`);
          }

          // ── CONNECTED CRM: Log timeline event ────────────────────────────
          await logActivity({
            leadId: input.leadId,
            activityType: "application_added",
            title: `Application added: ${input.universityName}`,
            description: `Program: ${input.programName}${input.country ? ` | Country: ${input.country}` : ""}${input.intakePeriod ? ` | Intake: ${input.intakePeriod}` : ""}`,
            staffEmail,
          });

          // ── CONNECTED CRM: Auto-create follow-up task ─────────────────────
          const lead = await getLeadById(input.leadId);
          const staffAcct = await getStaffAccountByEmail(staffEmail);
          if (staffAcct) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            await createCrmTask({
              staffId: staffAcct.id,
              staffEmail,
              relatedType: "lead",
              relatedId: input.leadId,
              relatedName: lead?.studentName || "Student",
              title: `Follow up on ${input.universityName} application`,
              description: `Check application status for ${input.programName} at ${input.universityName}`,
              taskType: "follow_up",
              priority: "medium",
              dueDate,
              isAiGenerated: true,
              aiReason: "Auto-created when application was added",
            });
          }

          // ── CONNECTED CRM: Notify counselor ───────────────────────────────
          await createNotification({
            staffEmail,
            type: "application",
            title: `Application added for ${lead?.studentName || "student"}`,
            message: `${input.universityName} — ${input.programName}. Pipeline advanced to In Progress.`,
            leadId: input.leadId,
            actionUrl: `/crm/lead/${input.leadId}`,
          });

          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }),
    updateStudentApp: publicProcedure
      .input(z.object({
        id: z.number(),
        universityName: z.string().optional(),
        programName: z.string().optional(),
        country: z.string().optional(),
        intakePeriod: z.string().optional(),
        applicationStatus: z.string().optional(),
        tuitionFee: z.string().optional(),
        scholarshipInfo: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        } catch { return { success: false, error: "Not authenticated" }; }
        const { id, ...data } = input;
        let staffEmail = "";
        try {
          const secretKey2 = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey2, { algorithms: ["HS256"] });
          staffEmail = payload.email as string || "";
        } catch {}
        try {
          // Fetch current app state before update
          const { studentApplications } = await import("../drizzle/schema");
          const db2 = await (await import("./db")).getDb();
          const [currentApp] = db2 ? await db2.select().from(studentApplications).where((await import("drizzle-orm")).eq(studentApplications.id, id)) : [];
          const oldStatus = currentApp?.applicationStatus || "";
          const newStatus = data.applicationStatus || oldStatus;

          await updateStudentApplication(id, data as any);

          // ── CONNECTED CRM: Status change triggers ────────────────────────
          if (newStatus !== oldStatus && currentApp && staffEmail) {
            const lead = await getLeadById(currentApp.leadId);
            const studentName = lead?.studentName || "Student";
            const uniName = data.universityName || currentApp.universityName;

            // Log timeline
            await logActivity({
              leadId: currentApp.leadId,
              activityType: "application_status_changed",
              title: `Application status: ${oldStatus} → ${newStatus}`,
              description: `${uniName} — ${data.programName || currentApp.programName}`,
              staffEmail,
            });

            const staffAcct = await getStaffAccountByEmail(staffEmail);

            // Status-specific actions
            if (newStatus === "submitted") {
              // Auto-task: check status in 14 days
              if (staffAcct) {
                const due = new Date(); due.setDate(due.getDate() + 14);
                await createCrmTask({
                  staffId: staffAcct.id, staffEmail,
                  relatedType: "lead", relatedId: currentApp.leadId, relatedName: studentName,
                  title: `Check ${uniName} application status`,
                  description: `Application was submitted. Follow up with university for update.`,
                  taskType: "follow_up", priority: "medium", dueDate: due,
                  isAiGenerated: true, aiReason: "Auto-created on application submission",
                });
              }
              await createNotification({ staffEmail, type: "application",
                title: `${studentName}: ${uniName} submitted`,
                message: `Check back in 14 days for a response.`,
                leadId: currentApp.leadId, actionUrl: `/crm/lead/${currentApp.leadId}` });
            }

            if (newStatus === "conditional_offer") {
              // Auto-task: send acceptance docs in 3 days
              if (staffAcct) {
                const due = new Date(); due.setDate(due.getDate() + 3);
                await createCrmTask({
                  staffId: staffAcct.id, staffEmail,
                  relatedType: "lead", relatedId: currentApp.leadId, relatedName: studentName,
                  title: `Send acceptance documents to ${studentName} for ${uniName}`,
                  description: `Conditional offer received. Student needs to fulfill conditions.`,
                  taskType: "document_request", priority: "high", dueDate: due,
                  isAiGenerated: true, aiReason: "Auto-created on conditional offer",
                });
              }
              await createNotification({ staffEmail, type: "application",
                title: `🎉 Conditional Offer: ${studentName} — ${uniName}`,
                message: `Conditional offer received! Send acceptance documents within 3 days.`,
                leadId: currentApp.leadId, actionUrl: `/crm/lead/${currentApp.leadId}` });
            }

            if (newStatus === "unconditional_offer" || newStatus === "enrolled") {
              // Auto-advance pipeline to enrolled
              await upsertLeadPipelineStage(currentApp.leadId, "enrolled", staffEmail,
                `Auto-advanced: ${uniName} offer accepted`);
              // Auto-task: start visa process
              if (staffAcct) {
                const due = new Date(); due.setDate(due.getDate() + 2);
                await createCrmTask({
                  staffId: staffAcct.id, staffEmail,
                  relatedType: "lead", relatedId: currentApp.leadId, relatedName: studentName,
                  title: `Start visa process for ${studentName} — ${uniName}`,
                  description: `Unconditional offer received. Begin visa application immediately.`,
                  taskType: "other", priority: "urgent", dueDate: due,
                  isAiGenerated: true, aiReason: "Auto-created on unconditional offer/enrollment",
                });
              }
              // Team chat celebration
              const chatClients = (global as any).__chatSSEClients as Map<string, Set<any>> | undefined;
              const celebMsg = await sendTeamChatMessage({
                senderEmail: "system@spectaeducation.com",
                senderName: "🎉 SpecTa CRM",
                message: `🎉 ${staffEmail.split("@")[0]} just enrolled **${studentName}** to **${uniName}**! Congratulations! 🎓`,
                channel: "general",
              });
              if (chatClients?.has("general")) {
                const payload2 = JSON.stringify({ type: "new_message", message: celebMsg });
                chatClients.get("general")!.forEach((c: any) => {
                  try { c.write(`event: new_message\ndata: ${payload2}\n\n`); } catch {}
                });
              }
              await createNotification({ staffEmail, type: "application",
                title: `🎉 ${studentName} ENROLLED at ${uniName}!`,
                message: `Unconditional offer confirmed. Pipeline moved to Enrolled. Start visa process now!`,
                leadId: currentApp.leadId, actionUrl: `/crm/lead/${currentApp.leadId}` });
            }
          }

          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }),
    deleteStudentApp: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        } catch { return { success: false, error: "Not authenticated" }; }
        try {
          await deleteStudentApplication(input.id);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }),
    // ─── Sprint 8: Team Chat ──────────────────────────────────────────────────
    getTeamChat: publicProcedure
      .input(z.object({ channel: z.string().default("general"), limit: z.number().default(50) }))
      .query(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { messages: [] };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        } catch { return { messages: [] }; }
        const messages = await getTeamChatMessages(input.channel, input.limit);
        return { messages };
      }),
    sendTeamChat: publicProcedure
      .input(z.object({
        message: z.string().min(1).max(2000),
        channel: z.string().default("general"),
        replyToId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        let senderName = "Staff", senderEmail = "";
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          senderName = payload.name as string || "Staff";
          senderEmail = payload.email as string || "";
        } catch { return { success: false, error: "Not authenticated" }; }
        try {
          const newMsg = await sendTeamChatMessage({ senderEmail, senderName, message: input.message, channel: input.channel, replyToId: input.replyToId });
          // Broadcast via SSE to all subscribers of this channel
          const clients: Set<any> | undefined = (global as any).__chatSSEClients?.get(input.channel);
          if (clients && clients.size > 0) {
            const payload = JSON.stringify({ type: "message", data: newMsg });
            clients.forEach((res: any) => {
              try { res.write(`event: message\ndata: ${payload}\n\n`); } catch {}
            });
          }
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }),
    deleteTeamChat: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        } catch { return { success: false, error: "Not authenticated" }; }
        try {
          await deleteTeamChatMessage(input.id);
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }),
    // ─── Sprint 8: Lead Source Analytics ─────────────────────────────────────
    getLeadSourceAnalytics: publicProcedure
      .query(async ({ ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { data: [] };
        let isAdmin = false;
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          isAdmin = payload.role === "admin" || payload.role === "ceo";
        } catch { return { data: [] }; }
        if (!isAdmin) return { data: [] };
        const data = await getLeadSourceAnalytics();
        return { data };
      }),

    // ─── Sprint 9: University Database ───────────────────────────────────────
    getUniversities: publicProcedure
      .input(z.object({
        country: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(100),
      }))
      .query(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { universities: [] };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        } catch { return { universities: [] }; }
        // Auto-seed on first call
        await seedUniversitiesIfEmpty();
        const unis = await getUniversities(input.country, input.search, input.limit);
        return { universities: unis };
      }),

    seedUniversities: publicProcedure
      .mutation(async ({ ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          if (payload.role !== "admin" && payload.role !== "ceo") return { success: false, error: "Admin only" };
        } catch { return { success: false, error: "Not authenticated" }; }
        const result = await seedUniversitiesIfEmpty();
        return { success: true, ...result };
      }),

    // ─── Sprint 11: CRM Document File Upload ─────────────────────────────────
    uploadCrmDocument: publicProcedure
      .input(z.object({
        docId: z.number(),
        leadId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64
        fileMimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        let staffEmail = "";
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          staffEmail = payload.email as string || "";
        } catch { return { success: false, error: "Not authenticated" }; }
        try {
          const buffer = Buffer.from(input.fileData, "base64");
          const fileKey = `crm-docs/${input.leadId}/${nanoid()}-${input.fileName}`;
          const { url } = await storagePut(fileKey, buffer, input.fileMimeType);
          await updateCrmDocFile(input.docId, {
            fileUrl: url,
            fileKey,
            fileName: input.fileName,
            fileMimeType: input.fileMimeType,
            staffEmail,
          });
          // Log timeline
          await logActivity({
            leadId: input.leadId,
            activityType: "document_upload",
            title: `Document uploaded: ${input.fileName}`,
            description: `Document uploaded for checklist item`,
            staffEmail,
          });
          return { success: true, fileUrl: url };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }),

    updateCrmDocumentStatus: publicProcedure
      .input(z.object({
        docId: z.number(),
        leadId: z.number(),
        status: z.enum(["pending", "submitted", "verified", "rejected"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        let staffEmail = "";
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          staffEmail = payload.email as string || "";
        } catch { return { success: false, error: "Not authenticated" }; }
        await updateCrmDocStatus(input.docId, input.status, staffEmail);
        await logActivity({
          leadId: input.leadId,
          activityType: "document_upload",
          title: `Document status updated to: ${input.status}`,
          description: `Document status changed`,
          staffEmail,
        });
        return { success: true };
      }),

    deleteCrmDocument: publicProcedure
      .input(z.object({ docId: z.number(), leadId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        } catch { return { success: false, error: "Not authenticated" }; }
        await deleteCrmDoc(input.docId);
        return { success: true };
      }),

    // ─── Document Request (Counselor → Student) ────────────────────────────────
    requestDocument: publicProcedure
      .input(z.object({
        leadId: z.number(),
        docType: z.string(),
        docLabel: z.string(),
        notes: z.string().optional(), // counselor's note/instruction to student
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify counselor auth
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        let staffEmail = "";
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          staffEmail = payload.email as string || "";
        } catch { return { success: false, error: "Not authenticated" }; }

        // Create the document request (pending status)
        const docId = await upsertCrmDoc({
          leadId: input.leadId,
          docType: input.docType,
          docLabel: input.docLabel,
          status: "pending",
          notes: input.notes || "",
          staffEmail,
        });

        // Log timeline activity
        await logActivity({
          leadId: input.leadId,
          activityType: "document_request",
          title: `Document requested: ${input.docLabel}`,
          description: input.notes || `Counselor requested ${input.docLabel}`,
          staffEmail,
        });

        // Get student email to send notification
        const lead = await getLeadById(input.leadId);
        const studentEmail = lead?.studentEmail;
        const studentName = lead?.studentName || "Student";

        if (studentEmail) {
          // Get all pending documents for this student to list them all in one email
          const allDocs = await getCrmDocsByLead(input.leadId);
          const pendingDocs = allDocs.filter((d: any) => d.status === "pending");

          const docListHtml = pendingDocs.map((d: any) => `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #2d3748;">
                <strong style="color:#e2e8f0;">${d.docLabel || d.docType}</strong>
                ${d.notes ? `<br/><span style="color:#94a3b8;font-size:13px;">${d.notes}</span>` : ""}
              </td>
            </tr>
          `).join("");

          // Create in-app notification for student
          try {
            await createStudentNotification({
              leadId: input.leadId,
              type: "document_request",
              title: `📄 Document Requested: ${input.docLabel}`,
              message: input.notes ? `Your counselor says: "${input.notes}"` : `Your counselor has requested your ${input.docLabel}. Please upload it as soon as possible.`,
              actionTab: "documents",
            });
          } catch (e) { /* non-fatal */ }
          await sendEmail({
            to: studentEmail,
            subject: `Action Required: Document Requested by Your Counselor`,
            html: `
              <div style="font-family:Inter,Arial,sans-serif;background:#0f172a;padding:32px;border-radius:12px;max-width:600px;margin:0 auto;">
                <div style="text-align:center;margin-bottom:24px;">
                  <img src="https://spectaeducation.com/logo.png" alt="SpecTa Education" style="height:40px;" />
                </div>
                <h2 style="color:#a78bfa;font-size:22px;margin-bottom:8px;">📄 Documents Needed</h2>
                <p style="color:#cbd5e1;font-size:15px;margin-bottom:20px;">Hi <strong style="color:#e2e8f0;">${studentName}</strong>,</p>
                <p style="color:#94a3b8;font-size:14px;margin-bottom:20px;">
                  Your counselor has requested the following document(s) to continue processing your application:
                </p>
                <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                  ${docListHtml}
                </table>
                <p style="color:#94a3b8;font-size:13px;margin-bottom:24px;">
                  Please log in to your student portal and upload these documents as soon as possible to avoid delays in your application.
                </p>
                <div style="text-align:center;margin-bottom:24px;">
                  <a href="https://spectaeducation.com/student/dashboard" style="background:linear-gradient(135deg,#7c3aed,#3b82f6);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Upload Documents Now →</a>
                </div>
                <hr style="border:none;border-top:1px solid #1e293b;margin:20px 0;" />
                <p style="color:#475569;font-size:12px;text-align:center;">SpecTa Education | Your Study Abroad Partner<br/>Need help? WhatsApp us at +62 818 218 388</p>
              </div>
            `,
          });
        }

        return { success: true, docId };
      }),

    // ─── Sprint 9: Visa Tracking ──────────────────────────────────────────────
    getVisaTracking: publicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { visa: null };
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        } catch { return { visa: null }; }
        const visa = await getVisaTracking(input.leadId);
        return { visa };
      }),

    upsertVisaTracking: publicProcedure
      .input(z.object({
        leadId: z.number(),
        visaType: z.string().optional(),
        visaStatus: z.string().optional(),
        embassy: z.string().optional(),
        applicationDate: z.string().optional(),
        biometricsDate: z.string().optional(),
        decisionDate: z.string().optional(),
        visaExpiryDate: z.string().optional(),
        requiredDocs: z.string().optional(),
        completedDocs: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req?.headers?.cookie || "";
        const match = cookieHeader.match(/staff_token=([^;]+)/);
        if (!match) return { success: false, error: "Not authenticated" };
        let staffEmail = "";
        try {
          const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
          const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
          staffEmail = payload.email as string || "";
        } catch { return { success: false, error: "Not authenticated" }; }
        try {
          const { leadId, applicationDate, biometricsDate, decisionDate, visaExpiryDate, ...rest } = input;
          const result = await upsertVisaTracking(leadId, {
            ...rest,
            applicationDate: applicationDate ? new Date(applicationDate) : undefined,
            biometricsDate: biometricsDate ? new Date(biometricsDate) : undefined,
            decisionDate: decisionDate ? new Date(decisionDate) : undefined,
            visaExpiryDate: visaExpiryDate ? new Date(visaExpiryDate) : undefined,
            staffEmail,
          });
          return { success: true, visa: result };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }),

  }),

  // ─── Student Portal ──────────────────────────────────────────────────────────
  studentPortal: router({

    // Register student portal account (counselor creates it for student)
    register: protectedProcedure
      .input(z.object({ leadId: z.number(), email: z.string().email(), password: z.string().min(8), sendWelcomeEmail: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const existing = await getStudentPortalByLeadId(input.leadId);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Student portal account already exists" });
        const { id, verifyToken } = await createStudentPortalAccount(input.leadId, input.email, input.password);
        return { success: true, id, verifyToken };
      }),

    // Student self-login (public)
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const account = await validateStudentPortalLogin(input.email, input.password);
        if (!account) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        // Sign a JWT for the student
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const token = await new SignJWT({ sub: String(account.id), leadId: account.leadId, role: "student" })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("30d")
          .sign(secret);
        // Detect if request is secure (handles reverse proxy with x-forwarded-proto)
        const forwardedProto = ctx.req.headers["x-forwarded-proto"];
        const isSecure = ctx.req.protocol === "https" || 
          (Array.isArray(forwardedProto) ? forwardedProto : (forwardedProto || "").split(","))
            .some((p: string) => p.trim().toLowerCase() === "https");
        ctx.res.cookie("student_portal_token", token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? "none" : "lax",
          maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days in ms — stay logged in unless explicitly logged out
          path: "/",
        });
        return { success: true, leadId: account.leadId };
      }),

    // Student logout
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie("student_portal_token", { path: "/" });
      return { success: true };
    }),

    // Get student dashboard data (authenticated via JWT cookie)
    getDashboard: publicProcedure.query(async ({ ctx }) => {
      // Parse cookie from raw header using the 'cookie' package
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        const data = await getStudentPortalDashboard(leadId);
        if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Student data not found" });
        return data;
      } catch (e: any) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired" });
      }
    }),

    // Check if student is logged in
    me: publicProcedure.query(async ({ ctx }) => {
      // Parse cookie from raw header using the 'cookie' package
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) return null;
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        return { leadId: Number(payload.leadId), role: "student" };
      } catch {
        return null;
      }
    }),

    // Request password reset
    requestReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const account = await getStudentPortalByEmail(input.email);
        if (!account) return { success: true }; // Don't reveal if email exists
        await setStudentPortalResetToken(input.email);
        return { success: true };
      }),

    // Send welcome emails to all CRM students (bulk onboarding)
    sendWelcomeEmailsToAll: protectedProcedure
      .input(z.object({ specificLeadId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { getDb: getDbLocal } = await import("./db");
        const { leads: leadsTable } = await import("../drizzle/schema");
        const { isNotNull: isNotNullOp, eq: eqOp } = await import("drizzle-orm");
        const db = await getDbLocal();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

        // Get all leads with email addresses
        let crmLeads;
        if (input.specificLeadId) {
          crmLeads = await db.select().from(leadsTable).where(eqOp(leadsTable.id, input.specificLeadId));
        } else {
          crmLeads = await db.select().from(leadsTable)
            .where(isNotNullOp(leadsTable.studentEmail));
        }

        let sent = 0;
        let created = 0;
        const errors: string[] = [];
        const portalUrl = "https://spectaeducation.com/student/login";

        for (const lead of crmLeads) {
          if (!lead.studentEmail) continue;
          try {
            // Check if account already exists
            let existing = await getStudentPortalByLeadId(lead.id);
            let tempPassword = "";
            if (!existing) {
              // Generate a readable temp password
              const words = ["Study", "Learn", "Grow", "Excel", "Dream"];
              const word = words[Math.floor(Math.random() * words.length)];
              tempPassword = `${word}${Math.floor(1000 + Math.random() * 9000)}`;
              await createStudentPortalAccount(lead.id, lead.studentEmail, tempPassword);
              created++;
            } else {
              tempPassword = "(your existing password)";
            }

            // Send welcome email
            const firstName = lead.studentName?.split(" ")[0] ?? "there";
            const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎓 SpecTa Education</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Your Student Portal is Ready!</p>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1e293b; margin-top: 0;">Hi ${firstName}! 👋</h2>
      <p style="color: #475569; line-height: 1.6;">Great news! Your personal student portal on SpecTa Education is now ready. You can use it to:</p>
      <ul style="color: #475569; line-height: 2;">
        <li>📋 Track your university application status in real-time</li>
        <li>📁 Upload your documents directly (passport, transcripts, etc.)</li>
        <li>✅ See which documents have been verified by your counselor</li>
        <li>📊 View your study abroad journey progress</li>
      </ul>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Your login details:</p>
        <p style="margin: 4px 0; color: #1e293b;"><strong>Email:</strong> ${lead.studentEmail}</p>
        <p style="margin: 4px 0; color: #1e293b;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
        <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px;">Please change your password after your first login.</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}" style="background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">Access My Portal →</a>
      </div>
      <p style="color: #94a3b8; font-size: 13px; text-align: center;">If you have any questions, WhatsApp us at <strong>+62 818 218 388</strong></p>
    </div>
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} SpecTa Education. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

            await sendEmail({
              to: lead.studentEmail,
              subject: `🎓 Your SpecTa Education Student Portal is Ready, ${firstName}!`,
              html: emailHtml,
              text: `Hi ${firstName}! Your student portal is ready. Login at ${portalUrl} with email: ${lead.studentEmail} and password: ${tempPassword}`,
            });
            sent++;
          } catch (err: any) {
            errors.push(`${lead.studentEmail}: ${err.message}`);
          }
        }

        return { sent, created, errors, total: crmLeads.length };
      }),

    // Check if a lead already has a portal account
    checkAccount: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        const account = await getStudentPortalByLeadId(input.leadId);
        return { hasAccount: !!account, email: account?.email ?? null };
      }),

    // Get student profile (avatar, bio, etc.)
    getProfile: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        return await getStudentProfile(leadId);
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired" });
      }
    }),

    // Update student profile
    updateProfile: publicProcedure
      .input(z.object({
        bio: z.string().optional(),
        intakeMonth: z.string().optional(),
        intakeYear: z.string().optional(),
        dreamCountry: z.string().optional(),
        dreamProgram: z.string().optional(),
        motivationNote: z.string().optional(),
        avatarBase64: z.string().optional(),
        avatarMimeType: z.string().optional(),
        avatarFileName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        let avatarUrl: string | undefined;
        let avatarKey: string | undefined;
        if (input.avatarBase64 && input.avatarMimeType) {
          const buffer = Buffer.from(input.avatarBase64, "base64");
          const ext = input.avatarMimeType.split("/")[1] || "jpg";
          const key = `student-avatars/${leadId}-${Date.now()}.${ext}`;
          const uploaded = await storagePut(key, buffer, input.avatarMimeType);
          avatarUrl = uploaded.url;
          avatarKey = key;
        }
        const profile = await upsertStudentProfile(leadId, {
          ...(avatarUrl ? { avatarUrl, avatarKey } : {}),
          ...(input.bio !== undefined ? { bio: input.bio } : {}),
          ...(input.intakeMonth !== undefined ? { intakeMonth: input.intakeMonth } : {}),
          ...(input.intakeYear !== undefined ? { intakeYear: input.intakeYear } : {}),
          ...(input.dreamCountry !== undefined ? { dreamCountry: input.dreamCountry } : {}),
          ...(input.dreamProgram !== undefined ? { dreamProgram: input.dreamProgram } : {}),
          ...(input.motivationNote !== undefined ? { motivationNote: input.motivationNote } : {}),
        });
        return { success: true, profile };
      }),

    // Book a counselling appointment
    bookAppointment: publicProcedure
      .input(z.object({
        appointmentDate: z.string(),
        appointmentTime: z.string(),
        sessionType: z.enum(["initial_consultation", "application_review", "visa_guidance", "scholarship_advice", "general_inquiry"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        const dashboard = await getStudentPortalDashboard(leadId);
        if (!dashboard) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        const result = await createStudentAppointment({
          leadId,
          studentName: dashboard.lead.studentName || "Student",
          studentEmail: dashboard.lead.studentEmail || "",
          ...input,
        });
        // Notify assigned counselor via CRM notification
        try {
          const assignedCounselor = dashboard.lead.assignedCounselor || dashboard.lead.assignedTo;
          if (assignedCounselor) {
            const sessionLabels: Record<string, string> = {
              initial_consultation: "Initial Consultation",
              application_review: "Application Review",
              visa_guidance: "Visa Guidance",
              scholarship_advice: "Scholarship Advice",
              general_inquiry: "General Inquiry",
            };
            await createNotification({
              staffEmail: assignedCounselor,
              type: "appointment_request",
              title: `📅 New Session Request from ${dashboard.lead.studentName || "Student"}`,
              message: `${sessionLabels[input.sessionType] || input.sessionType} on ${input.appointmentDate} at ${input.appointmentTime}${input.notes ? ` — Note: "${input.notes}"` : ""}`,
              leadId,
              actionUrl: `/crm/lead/${leadId}`,
            });
          }
        } catch (e) { /* non-fatal */ }
        return { success: true, id: result.id };
      }),

    // Get my appointments
    getAppointments: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const { payload } = await jwtVerify(token, secret);
      const leadId = Number(payload.leadId);
      return getStudentAppointments(leadId);
    }),

    // Get wishlist
    getWishlist: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const { payload } = await jwtVerify(token, secret);
      const leadId = Number(payload.leadId);
      return getStudentWishlist(leadId);
    }),

    // Add to wishlist
    addToWishlist: publicProcedure
      .input(z.object({
        universityName: z.string(),
        country: z.string(),
        program: z.string().optional(),
        notes: z.string().optional(),
        ranking: z.string().optional(),
        tuitionFee: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        return addToStudentWishlist(leadId, input);
      }),

    // Remove from wishlist
    removeFromWishlist: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        await removeFromStudentWishlist(input.id, leadId);
        return { success: true };
      }),

    // AI Study Advisor chat
    aiAdvisorChat: publicProcedure
      .input(z.object({ message: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        // Get student context
        const dashboard = await getStudentPortalDashboard(leadId);
        const profile = await getStudentProfile(leadId);
        const history = await getStudentAiChatHistory(leadId);
        const recentHistory = [...history].reverse().slice(-10);
        // Save user message
        await addStudentAiMessage(leadId, "user", input.message);
        // Build context
        const studentContext = `Student: ${dashboard?.lead?.studentName || "Student"}, interested in studying in ${dashboard?.lead?.preferredCountry || profile?.dreamCountry || "abroad"}, level: ${dashboard?.lead?.studyLevel || "not specified"}, program: ${dashboard?.lead?.programInterest || profile?.dreamProgram || "not specified"}.`;
        const messages: any[] = [
          { role: "system", content: `You are SpecTa AI, a friendly and knowledgeable study abroad advisor for SpecTa Education. You help students with university selection, application processes, visa requirements, scholarships, and life abroad. Be warm, encouraging, and specific. Always reference SpecTa Education's counselors as a resource for personalized guidance. ${studentContext}` },
          ...recentHistory.map((h: any) => ({ role: h.role, content: h.content })),
          { role: "user", content: input.message },
        ];
        const response = await invokeLLM({ messages });
        const aiReply = response.choices?.[0]?.message?.content || "I'm here to help! Could you tell me more about what you'd like to know?";
        await addStudentAiMessage(leadId, "assistant", typeof aiReply === "string" ? aiReply : JSON.stringify(aiReply));
        return { reply: typeof aiReply === "string" ? aiReply : JSON.stringify(aiReply) };
      }),

    // Get AI chat history
    getAiChatHistory: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) return [];
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        const history = await getStudentAiChatHistory(leadId);
        return [...history].reverse();
      } catch { return []; }
    }),

    // Clear AI chat history
    clearAiChat: publicProcedure.mutation(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const { payload } = await jwtVerify(token, secret);
      const leadId = Number(payload.leadId);
      await clearStudentAiChatHistory(leadId);
      return { success: true };
    }),

    // Admin: get all student portal appointments
    getAllAppointments: protectedProcedure.query(async () => {
      return getAllStudentPortalAppointments();
    }),

    // Admin: update appointment status
    updateAppointmentStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
        counselorNotes: z.string().optional(),
        meetingLink: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await updateStudentAppointmentStatus(input.id, input.status, input.counselorNotes, input.meetingLink);
        return { success: true };
      }),

    // ── Referral: get my referral code & stats ──
    getReferralStats: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const { payload } = await jwtVerify(token, secret);
      const leadId = Number(payload.leadId);
      const codeRow = await getOrCreateReferralCode(leadId);
      const stats = await getReferralStats(leadId);
      return { ...stats, code: codeRow };
    }),

    // ── Referral: invite a friend ──
    inviteFriend: publicProcedure
      .input(z.object({
        friendEmail: z.string().email(),
        friendName: z.string().optional(),
        friendPhone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        const codeRow = await getOrCreateReferralCode(leadId);
        const dashboard = await getStudentPortalDashboard(leadId);
        const result = await createReferral(leadId, codeRow.code, input.friendEmail, input.friendName, input.friendPhone);
        if (result.alreadyExists) return { success: true, alreadyExists: true };
        // Send invitation email via Resend
        try {
          const referrerName = dashboard?.lead?.studentName || "A friend";
          const portalUrl = `https://spectaeducation.com/student/register?ref=${codeRow.code}`;
          const emailHtml = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎓 SpecTa Education</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">You've been invited to study abroad!</p>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #1e293b; margin-top: 0;">Hi ${input.friendName || "there"}! 👋</h2>
      <p style="color: #475569; line-height: 1.6;"><strong>${referrerName}</strong> thinks you'd love studying abroad and has invited you to join SpecTa Education — the leading study abroad consultancy!</p>
      <p style="color: #475569; line-height: 1.6;">SpecTa Education helps students like you get into top universities in Australia, UK, Canada, Singapore, and more.</p>
      <div style="background: #f8fafc; border: 2px dashed #7c3aed; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Your exclusive referral code:</p>
        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #7c3aed; letter-spacing: 4px;">${codeRow.code}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}" style="background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Create My Free Account 🚀</a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">SpecTa Education | spectaeducation.com</p>
    </div>
  </div>
</body></html>`;
          await sendEmail({
            to: input.friendEmail,
            subject: `${referrerName} invited you to study abroad with SpecTa Education! 🎓`,
            html: emailHtml,
          });
        } catch (e) {
          console.error("[Referral] Email send failed:", e);
        }
        return { success: true, alreadyExists: false };
      }),

    // ── Referral: claim a reward ──
    claimReward: publicProcedure
      .input(z.object({ rewardId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        return claimReward(input.rewardId, leadId);
      }),

    // ── Admin: complete a referral and grant reward ──
    completeReferral: protectedProcedure
      .input(z.object({ referralId: z.number() }))
      .mutation(async ({ input }) => {
        return completeReferralAndGrantReward(input.referralId);
      }),

    // ── Public: validate referral code (used on signup page) ──
    validateReferralCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const row = await getReferralCodeByCode(input.code);
        return { valid: !!row, leadId: row?.leadId ?? null };
      }),

    // ── Public: student self-registration (via referral link or direct) ──
    selfRegister: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        password: z.string().min(8),
        referralCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if account already exists
        const existing = await getStudentPortalByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists. Please sign in." });
        // Create a lead record for this self-registered student
        const lead = await createLead({
          studentName: input.name,
          studentEmail: input.email,
          studentPhone: input.phone,
          source: input.referralCode ? `referral:${input.referralCode}` : "self_register",
          status: "new",
          ...parseAttribution(ctx),
        });
        if (!lead) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });
        // Create student portal account
        await createStudentPortalAccount(lead.id, input.email, input.password);
        // Mark referral as signed up if referral code provided
        if (input.referralCode) {
          try { await markReferralSignedUp(input.email); } catch (e) { /* non-fatal */ }
        }
        // Log the new student in immediately (set the session cookie) so the
        // tutor / portal treats them as authenticated right after sign-up.
        // Without this, "Sign up" appears to do nothing (the form re-renders).
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const token = await new SignJWT({ sub: String(lead.id), leadId: lead.id, role: "student" })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("30d")
          .sign(secret);
        const forwardedProto = ctx.req.headers["x-forwarded-proto"];
        const isSecure = ctx.req.protocol === "https" ||
          (Array.isArray(forwardedProto) ? forwardedProto : (forwardedProto || "").split(","))
            .some((p: string) => p.trim().toLowerCase() === "https");
        ctx.res.cookie("student_portal_token", token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? "none" : "lax",
          maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days (milliseconds)
          path: "/",
        });
        return { success: true, leadId: lead.id };
      }),

    // ── Student: list own documents ──
    listDocuments: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const { payload } = await jwtVerify(token, secret);
      const leadId = Number(payload.leadId);
      return getCrmDocsByLead(leadId);
    }),

    // ── Student: upload a document to S3 ──
    uploadDocument: publicProcedure
      .input(z.object({
        docType: z.string(),
        docLabel: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        fileBase64: z.string(), // base64-encoded file content
      }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        // Decode base64 to buffer
        const buffer = Buffer.from(input.fileBase64, "base64");
        if (buffer.length > 16 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File too large (max 16MB)" });
        // Upload to S3
        const suffix = Math.random().toString(36).slice(2, 8);
        const fileKey = `student-docs/${leadId}/${input.docType}-${suffix}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        // Upsert doc record in DB
        const docId = await upsertCrmDoc({
          leadId,
          docType: input.docType,
          docLabel: input.docLabel,
          status: "submitted",
        });
        // Update with file info
        await updateCrmDocFile(docId, {
          fileUrl: url,
          fileKey,
          fileName: input.fileName,
          fileMimeType: input.fileType,
        });
        // Notify assigned counselor
        try {
          const dashboard = await getStudentPortalDashboard(leadId);
          const assignedCounselor = dashboard?.lead?.assignedCounselor || dashboard?.lead?.assignedTo;
          if (assignedCounselor) {
            await createNotification({
              staffEmail: assignedCounselor,
              type: "document_uploaded",
              title: `📄 Document Uploaded by ${dashboard?.lead?.studentName || "Student"}`,
              message: `${input.docLabel} has been uploaded and is ready for review.`,
              leadId,
              actionUrl: `/crm/lead/${leadId}`,
            });
          }
        } catch (e) { /* non-fatal */ }
        return { success: true, fileUrl: url, docId };
      }),

    // ── Student: delete own document ──
    deleteDocument: publicProcedure
      .input(z.object({ docId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        // Verify doc belongs to this student
        const docs = await getCrmDocsByLead(leadId);
        const doc = docs.find((d: any) => d.id === input.docId);
        if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        if (doc.status === "verified") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete a verified document" });
        await deleteCrmDoc(input.docId);
        return { success: true };
      }),

    // ── Student: get notifications ──
    getNotifications: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) return [];
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        return getStudentNotifications(leadId);
      } catch { return []; }
    }),

    // ── Student: get unread notification count ──
    getUnreadCount: publicProcedure.query(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) return 0;
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        return getStudentUnreadCount(leadId);
      } catch { return 0; }
    }),

    // ── Student: mark one notification read ──
    markRead: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const cookieHeader = ctx.req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const token = cookies["student_portal_token"];
        if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        await markStudentNotificationRead(input.id, leadId);
        return { success: true };
      }),

    // ── Student: mark all notifications read ──
    markAllRead: publicProcedure.mutation(async ({ ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const { payload } = await jwtVerify(token, secret);
      const leadId = Number(payload.leadId);
      await markAllStudentNotificationsRead(leadId);
      return { success: true };
    }),

    // ── Student: update parent/guardian info ──
    updateParentInfo: publicProcedure.input(z.object({
      parentName: z.string().optional(),
      parentEmail: z.string().email().optional(),
    })).mutation(async ({ input, ctx }) => {
      const cookieHeader = ctx.req.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies["student_portal_token"];
      if (!token) return { success: false, error: "Not authenticated" };
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
        const { payload } = await jwtVerify(token, secret);
        const leadId = Number(payload.leadId);
        await updateLead(leadId, {
          ...(input.parentName !== undefined ? { parentName: input.parentName } : {}),
          ...(input.parentEmail !== undefined ? { parentEmail: input.parentEmail } : {}),
        });
        return { success: true };
      } catch (e: any) { return { success: false, error: e.message }; }
    }),
  }),
  // ─── AI Follow-up Assistantt ──────────────────────────────────────────────────
  socialMedia: socialMediaRouter,
  adsAgent: adsAgentRouter,

  aiAssistant: router({

    // Get all suggestions for the current counselor
    getSuggestions: publicProcedure.query(async ({ ctx }) => {
      // Use staff_token cookie (email/password login) instead of Manus OAuth
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) return [];
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        const counselorEmail = (payload.email as string) ?? "";
        if (!counselorEmail) return [];
        return getAiSuggestionsForCounselor(counselorEmail);
      } catch { return []; }
    }),

    // Mark a suggestion as actioned
    actionSuggestion: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await markSuggestionActioned(input.id);
        return { success: true };
      }),

    // Generate fresh AI suggestions for the current counselor
    generateSuggestions: publicProcedure.mutation(async ({ ctx }) => {
      const cookieHeader = ctx.req?.headers?.cookie || "";
      const match = cookieHeader.match(/staff_token=([^;]+)/);
      if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Not authenticated" });
      let counselorEmail = "";
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "secret");
        const { payload } = await jwtVerify(match[1], secretKey, { algorithms: ["HS256"] });
        counselorEmail = (payload.email as string) ?? "";
      } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid token" }); }
      if (!counselorEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "No counselor email" });

      // Clear old suggestions first
      await clearOldSuggestions(counselorEmail);

      // Get all leads assigned to this counselor
      const allLeads = await getAllLeads();
      const myLeads = allLeads.filter((l: any) => l.assignedCounselor === counselorEmail || l.assignedTo === counselorEmail);

      if (myLeads.length === 0) return { generated: 0 };

      const now = Date.now();
      let generated = 0;

      for (const lead of myLeads.slice(0, 20)) { // Process up to 20 leads at a time
        const daysSinceUpdate = Math.floor((now - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        const studentName = lead.studentName;

        // 1. Overdue follow-up (no update in 3+ days)
        if (daysSinceUpdate >= 3) {
          await deleteExistingSuggestions(counselorEmail, lead.id, "overdue_followup");
          const priority = daysSinceUpdate >= 7 ? "urgent" : daysSinceUpdate >= 5 ? "high" : "medium";
          const aiResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are an AI assistant helping education counselors. Generate a short, warm WhatsApp message (max 3 sentences) and a brief advice tip for the counselor. Respond in JSON: {\"message\": \"...\", \"advice\": \"...\"}" },
              { role: "user", content: `Student: ${studentName}, last contact: ${daysSinceUpdate} days ago, study interest: ${lead.preferredCountry || "not specified"}, level: ${lead.studyLevel || "not specified"}. Generate a friendly follow-up WhatsApp message and counselor advice.` },
            ],
            response_format: { type: "json_schema", json_schema: { name: "followup", strict: true, schema: { type: "object", properties: { message: { type: "string" }, advice: { type: "string" } }, required: ["message", "advice"], additionalProperties: false } } },
          });
          const rawContent = aiResponse.choices?.[0]?.message?.content;
          const parsed = JSON.parse((typeof rawContent === "string" ? rawContent : null) || "{}");
          await insertAiSuggestion({
            counselorEmail, leadId: lead.id,
            suggestionType: "overdue_followup", priority,
            title: `Follow up with ${studentName} — ${daysSinceUpdate} days since last contact`,
            aiMessage: parsed.message || `Hi ${studentName}! Just checking in — how are things going? 😊`,
            aiAdvice: parsed.advice || "Re-engage with a warm, personal message. Ask about their current situation.",
            expiresAt: new Date(now + 1000 * 60 * 60 * 24),
          });
          generated++;
        }

        // 2. Rapport check-in (every 2-3 days for active leads)
        const activeStages = ["new", "contacted", "qualified", "in_progress"];
        if (daysSinceUpdate >= 2 && daysSinceUpdate < 3 && activeStages.includes(lead.status)) {
          await deleteExistingSuggestions(counselorEmail, lead.id, "rapport_checkin");
          await insertAiSuggestion({
            counselorEmail, leadId: lead.id,
            suggestionType: "rapport_checkin", priority: "low",
            title: `Say hi to ${studentName} — build rapport`,
            aiMessage: `Hey ${studentName}! Hope you're having a great day! 😊 Just wanted to check in — any questions about your study abroad journey?`,
            aiAdvice: "Regular check-ins build trust. A simple 'how are you' message keeps the relationship warm without being pushy.",
            expiresAt: new Date(now + 1000 * 60 * 60 * 24),
          });
          generated++;
        }
      }

      return { generated };
    }),

  }),

  ielts: ieltsRouter,
  team: crmTeamRouter,
  students: crmStudentsRouter,
  reports: crmReportsRouter,
  cockpit: crmCockpitRouter,
  intake: crmIntakeRouter,
  marketing: marketingRouter,
  tutor: tutorRouter,
  igcse: igcseRouter,
  journey: crmJourneyRouter,
  sosmed: sosmedRouter,
});
export type AppRouter = typeof appRouter;
// Agents disabled — the background scheduler (lead/CRM/SEO/social/GM agents)
// is turned off to stop all automated runs + third-party API spend. The agent
// code remains for reference until fresh agents are built. Re-enable by
// uncommenting the call below.
// startAgentScheduler();
void startAgentScheduler; // keep the import referenced (no-op)

// CRM parent-report scheduler (NEW, separate from the disabled agents):
// auto-drafts Sunday evening + auto-sends Monday 09:00 WIB.
startCrmReportScheduler();

// AI Tutor free-trial nurture: email reminders at +1d / +3d to students who
// tried the taster but haven't subscribed (dedup via tutor_reminders table).
startTutorReminderScheduler();

// IELTS Practice → product follow-up: one email to free-practice takers
// inviting them to the Mock Test + AI Tutor (dedup via practice_followups).
startPracticeFollowupScheduler();

// Article Producer scheduler (SEO/GEO): weekly review-ready blog drafts.
// OFF unless ARTICLE_PRODUCER_ENABLED=true (no token spend until opted in).
startArticleProducerScheduler();

// Growth Intelligence scheduler: weekly performance digest + GEO monitor.
// OFF unless GROWTH_INSIGHTS_ENABLED=true.
startGrowthInsightsScheduler();

// Google Ads live API: daily performance auto-sync. Dormant unless the
// GOOGLE_ADS_* credentials are set.
startGoogleAdsScheduler();

// Google Ads AI optimizer (Advisor): daily suggestions emailed for approval.
// OFF unless GOOGLE_ADS_OPTIMIZER_ENABLED=true.
startGoogleAdsOptimizer();

// AI Tutor landing imagery — generate once via DeepInfra (idempotent).
startTutorImages();

// Auto-seed universities on startup
seedUniversitiesIfEmpty().then(r => {
  if (r.seeded) console.log(`[Universities] Seeded ${r.count} universities`);
}).catch(e => console.error('[Universities] Seed error:', e));

// IGCSE AI Teacher: seed the Cambridge 0580 Extended topic tree + curated
// exam-style exemplars (used as RAG grounding in the AI's pedagogy prompt).
// Growth Phase A: ensure attribution columns + marketing_spend table exist
// (idempotent) so a deploy never outruns the migration and breaks lead capture.
// IGCSE seeds chain AFTER this so igcse_examples table exists before insert.
import("./db").then(async m => {
  await m.ensureMarketingSchema();
  try {
    const r1 = await seedIgcseTopicsIfEmpty();
    if (r1.seeded) console.log(`[IGCSE] Seeded ${r1.seeded} Math topics`);
  } catch (e) { console.error('[IGCSE] Math topic seed error:', e); }
  try {
    const r2 = await seedIgcseExamplesIfEmpty();
    if (r2.seeded) console.log(`[IGCSE] Seeded ${r2.seeded} Math exam exemplars`);
  } catch (e) { console.error('[IGCSE] Math example seed error:', e); }
  try {
    const r3 = await seedIgcsePhysicsTopicsIfEmpty();
    if (r3.seeded) console.log(`[IGCSE] Seeded ${r3.seeded} Physics topics`);
  } catch (e) { console.error('[IGCSE] Physics topic seed error:', e); }
  try {
    const r4 = await seedIgcsePhysicsExamplesIfEmpty();
    if (r4.seeded) console.log(`[IGCSE] Seeded ${r4.seeded} Physics exam exemplars`);
  } catch (e) { console.error('[IGCSE] Physics example seed error:', e); }
  try {
    const r5 = await seedIgcseEconomicsTopicsIfEmpty();
    if (r5.seeded) console.log(`[IGCSE] Seeded ${r5.seeded} Economics topics`);
  } catch (e) { console.error('[IGCSE] Economics topic seed error:', e); }
  try {
    const r6 = await seedIgcseEconomicsExamplesIfEmpty();
    if (r6.seeded) console.log(`[IGCSE] Seeded ${r6.seeded} Economics exam exemplars`);
  } catch (e) { console.error('[IGCSE] Economics example seed error:', e); }
  try {
    const r7 = await seedIgcseBusinessTopicsIfEmpty();
    if (r7.seeded) console.log(`[IGCSE] Seeded ${r7.seeded} Business Studies topics`);
  } catch (e) { console.error('[IGCSE] Business topic seed error:', e); }
  try {
    const r8 = await seedIgcseBusinessExamplesIfEmpty();
    if (r8.seeded) console.log(`[IGCSE] Seeded ${r8.seeded} Business Studies exam exemplars`);
  } catch (e) { console.error('[IGCSE] Business example seed error:', e); }
}).catch(e => console.error('[Growth] schema ensure error:', e));

// Ensure the office enum includes all branches (adds Singkawang) before use.
import("./db").then(m => m.ensureOfficeEnum()).catch(e => console.error('[CRM] office enum ensure error:', e));

// ==================== SIMULATOR AI HELPERS ====================

interface GenerateScenarioParams {
  day: number;
  country: string;
  universityTier: string;
  intendedMajor: string;
  budgetLevel: string;
  personalityType?: string | null;
  previousChoices: any[];
}

async function generateScenario(params: GenerateScenarioParams) {
  const { day, country, universityTier, intendedMajor, budgetLevel, personalityType, previousChoices } = params;

  const scenarioTypes = [
    { day: 1, type: "arrival", title: "Arrival & Orientation" },
    { day: 2, type: "social", title: "Making Friends" },
    { day: 3, type: "academic", title: "Academic Pressure" },
  ];

  const currentScenario = scenarioTypes.find(s => s.day === day);
  if (!currentScenario) throw new Error("Invalid day");

  const prompt = `You are creating a realistic study abroad simulation for an Indonesian student going to ${country}.

Student Profile:
- University tier: ${universityTier}
- Intended major: ${intendedMajor}
- Budget level: ${budgetLevel}
- Personality: ${personalityType || "balanced"}

Day ${day}: ${currentScenario.title}

${previousChoices.length > 0 ? `Previous choices:\n${previousChoices.map(c => `Day ${c.day}: ${c.scenarioType} - chose ${c.selectedChoice}`).join("\n")}` : "This is the first day."}

Generate a realistic scenario for Day ${day} with:
1. A vivid scenario description (2-3 sentences) that reflects the ${currentScenario.type} theme
2. Three distinct choice options (A, B, C) that represent different approaches
3. Each choice should have realistic consequences

Return JSON with this structure:
{
  "scenarioText": "The scenario description",
  "choices": [
    { "label": "A", "text": "First option" },
    { "label": "B", "text": "Second option" },
    { "label": "C", "text": "Third option" }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a study abroad simulation expert. Create realistic, engaging scenarios." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scenario",
        strict: true,
        schema: {
          type: "object",
          properties: {
            scenarioText: { type: "string" },
            choices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  text: { type: "string" },
                },
                required: ["label", "text"],
                additionalProperties: false,
              },
            },
          },
          required: ["scenarioText", "choices"],
          additionalProperties: false,
        },
      },
    },
  });

  const text = response.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });

  const scenario = JSON.parse(text);
  return {
    day,
    type: currentScenario.type,
    title: currentScenario.title,
    ...scenario,
  };
}

interface AnalyzeChoiceParams {
  day: number;
  scenarioType: string;
  selectedChoice: string;
  choiceText: string;
  country: string;
  budgetLevel: string;
  previousChoices: any[];
}

async function analyzeChoice(params: AnalyzeChoiceParams) {
  const { day, scenarioType, selectedChoice, choiceText, country, budgetLevel, previousChoices } = params;

  const prompt = `Analyze this choice made by an Indonesian student studying in ${country}:

Day ${day} - ${scenarioType}
Choice ${selectedChoice}: ${choiceText}
Budget level: ${budgetLevel}

Provide:
1. A realistic 2-3 sentence response describing the immediate outcome
2. Impact scores (-20 to +20) for: budget, mood, connections, academic

Return JSON:
{
  "response": "What happens as a result of this choice",
  "impacts": {
    "budget": 0,
    "mood": 0,
    "connections": 0,
    "academic": 0
  }
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are analyzing student choices in a study abroad simulation. Be realistic about consequences." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "choice_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            response: { type: "string" },
            impacts: {
              type: "object",
              properties: {
                budget: { type: "number" },
                mood: { type: "number" },
                connections: { type: "number" },
                academic: { type: "number" },
              },
              required: ["budget", "mood", "connections", "academic"],
              additionalProperties: false,
            },
          },
          required: ["response", "impacts"],
          additionalProperties: false,
        },
      },
    },
  });

  const text = response.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI analysis failed" });

  return JSON.parse(text);
}

interface GenerateReportParams {
  session: any;
  choices: any[];
}

async function generateReadinessReport(params: GenerateReportParams) {
  const { session, choices } = params;

  // Calculate scores from choices
  const totalBudgetImpact = choices.reduce((sum, c) => sum + c.impactBudget, 0);
  const totalMoodImpact = choices.reduce((sum, c) => sum + c.impactMood, 0);
  const totalConnectionsImpact = choices.reduce((sum, c) => sum + c.impactConnections, 0);
  const totalAcademicImpact = choices.reduce((sum, c) => sum + c.impactAcademic, 0);

  const financialScore = Math.max(0, Math.min(100, 70 + totalBudgetImpact));
  const emotionalScore = Math.max(0, Math.min(100, 70 + totalMoodImpact));
  const socialScore = Math.max(0, Math.min(100, 70 + totalConnectionsImpact));
  const academicScore = Math.max(0, Math.min(100, 70 + totalAcademicImpact));

  const readinessScore = Math.round((financialScore + emotionalScore + socialScore + academicScore) / 4);

  const prompt = `Generate a personalized study abroad readiness report for this student:

Country: ${session.country}
Major: ${session.intendedMajor}
Scores:
- Financial: ${financialScore}/100
- Emotional: ${emotionalScore}/100
- Social: ${socialScore}/100
- Academic: ${academicScore}/100
- Overall Readiness: ${readinessScore}/100

Choices made:
${choices.map(c => `Day ${c.day}: ${c.scenarioType} - ${c.selectedChoice} → ${c.aiResponse}`).join("\n")}

Provide:
1. 3-4 specific strengths based on their choices
2. 2-3 areas to develop
3. 4-5 actionable recommendations

Return JSON:
{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["area 1", "area 2", ...],
  "recommendations": ["rec 1", "rec 2", ...]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a study abroad counselor providing personalized feedback." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "readiness_report",
        strict: true,
        schema: {
          type: "object",
          properties: {
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
          },
          required: ["strengths", "weaknesses", "recommendations"],
          additionalProperties: false,
        },
      },
    },
  });

  const text = response.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI report generation failed" });

  const analysis = JSON.parse(text);

  return {
    readinessScore,
    socialScore,
    financialScore,
    academicScore,
    emotionalScore,
    ...analysis,
  };
}
