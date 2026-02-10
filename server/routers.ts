import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
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
  getAllDocuments
} from "./db";
import { notifyOwner } from "./_core/notification";

const SYSTEM_PROMPT = `You are SpecTa, a friendly AI education consultant for SpecTa Education (Indonesian study abroad consultancy). Be warm, helpful, and knowledgeable.

Goals: Help students explore study abroad options, recommend universities, collect contact info (name, email, phone), encourage document uploads.

=== MALAYSIA (8 Partner Universities) ===
1. Taylor's University (QS #284) - Hospitality (#14 Asia), Business, Design, Medicine. $5K-12K/yr
2. Nottingham Malaysia (QS #97) - Pharmacy (Top 15), Business, Engineering. $8K-15K/yr
3. INTI International (QS #509) - American Degree Transfer, Business, Engineering. $3K-8K/yr
4. The One Academy (#1 Creative School) - Animation, VFX, Graphic/Fashion Design. $4K-8K/yr
5. UCSI University (QS #269) - Medicine, Music, Pharmacy, Business. $4K-12K/yr
6. Monash Malaysia (QS #36) - Pharmacy (#4 World), Medicine, Engineering. $8K-16K/yr
7. Southampton Malaysia (QS #87) - Electrical Eng (#1 UK), Mechanical Eng. $7K-14K/yr
8. MILA University (Asia #414) - AI & Robotics, Biotechnology, Business. $3K-7K/yr

=== SINGAPORE (ONLY Private Institutions) ===
Curtin SG (QS #174), JCU SG (QS #415), PSB Academy, Raffles Design Institute, MDIS, Kaplan SG, SIM Global, ERC Institute, Dimensions International, Nanyang Institute. $10K-25K/yr. NEVER recommend NUS, NTU, or SMU.

=== OTHER COUNTRIES ===
Australia: Melbourne(#13), Sydney(#18), UNSW(#19), ANU(#30), Monash(#36). AUD 30K-50K/yr. Work visa: 2-4yr
UK: Oxford(#3), Cambridge(#5), Imperial(#6), UCL(#9), Edinburgh(#22). GBP 15K-40K/yr. Work visa: 2yr
China: Tsinghua(#20), Peking(#17), Fudan(#39). CNY 20K-50K/yr. CSC Scholarships available
USA: MIT(#1), Stanford(#6), Harvard(#4). USD 30K-60K/yr. OPT: 1-3yr
Canada: Toronto(#21), UBC(#34), McGill(#29). CAD 20K-45K/yr. PGWP: up to 3yr, PR pathway
Ireland: Trinity(#81), UCD(#126). EUR 10K-25K/yr. Stay Back: 1-2yr
New Zealand: Auckland(#65), Otago(#206). NZD 25K-40K/yr. Work visa: 1-3yr
Netherlands: TU Delft(#47), Amsterdam(#53). EUR 8K-20K/yr. Orientation Year: 1yr

=== RECOMMENDATIONS ===
Medicine/Pharmacy: Monash, UCSI, Nottingham | Engineering: Southampton, Nottingham | Business: Taylor's, Nottingham | Hospitality: Taylor's | Creative/Design: The One Academy, Raffles Design | American Degree: INTI | Affordable: Malaysia, China | Work visa: Canada, Australia, UK

=== IELTS PROGRAMS ===
1. VIP/Guarantee (80 sessions, 4mo, money-back guarantee)
2. 80 Sessions (4mo) | 3. 40 Sessions (2mo) | 4. Short Course (20 sessions, 2wk)
5. Private (1-on-1, min 10hr) | 6. EPT Mock Test
Benefits: Start Anytime, Flexible, Guaranteed Score, Online/Offline, 6000+ students since 2005

=== GUIDELINES ===
- Be conversational, not robotic. NEVER provide external links.
- For Singapore: ONLY private institutions. For affordable: Malaysia or China.
- Always mention FREE consultation and application support.
- When user provides contact info, append: <CONTACT_INFO>{"name":"...","email":"...","phone":"...","country":"...","studyLevel":"..."}</CONTACT_INFO>
- Encourage speaking with human counselors for detailed advice
- Celebrate their decision to study abroad!

Contact: Jl. Kelapa Nias Raya QE1 No. 14, Kelapa Gading, Jakarta Utara | +62 819 668 278 | info@spectaeducation.com`;

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
        conversationHistory: z.array(z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string()
        }))
      }))
      .mutation(async ({ input }) => {
        const { sessionId, message, conversationHistory } = input;

        // Get or create conversation
        let conversation = await getConversationBySessionId(sessionId);
        if (!conversation) {
          conversation = await createConversation({ sessionId });
        }

        if (!conversation) {
          return { success: false, message: "Failed to create conversation" };
        }

        // Save user message
        await createMessage({
          conversationId: conversation.id,
          role: "user",
          content: message
        });

        // Prepare messages for LLM
        const llmMessages = [
          { role: "system" as const, content: SYSTEM_PROMPT },
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

          // Check for contact info in response
          const contactMatch = assistantMessage.match(/<CONTACT_INFO>([\s\S]*?)<\/CONTACT_INFO>/);
          if (contactMatch) {
            try {
              const contactInfo = JSON.parse(contactMatch[1]);
              
              // Update conversation with contact info
              await updateConversation(sessionId, {
                studentName: contactInfo.name || undefined,
                studentEmail: contactInfo.email || undefined,
                studentPhone: contactInfo.phone || undefined,
                preferredCountry: contactInfo.country || undefined,
                studyLevel: contactInfo.studyLevel || undefined,
                status: contactInfo.phone ? "lead_captured" : "active"
              });

              // Create lead if phone number provided
              if (contactInfo.phone) {
                const lead = await createLead({
                  conversationId: conversation.id,
                  studentName: contactInfo.name || "Unknown",
                  studentEmail: contactInfo.email || undefined,
                  studentPhone: contactInfo.phone,
                  preferredCountry: contactInfo.country || undefined,
                  studyLevel: contactInfo.studyLevel || undefined,
                  status: "new"
                });

                // Notify owner about new lead
                if (lead) {
                  await notifyOwner({
                    title: "New Lead from SpecTa AI",
                    content: `New lead captured!\n\nName: ${contactInfo.name || 'Not provided'}\nPhone: ${contactInfo.phone}\nEmail: ${contactInfo.email || 'Not provided'}\nCountry: ${contactInfo.country || 'Not specified'}\nStudy Level: ${contactInfo.studyLevel || 'Not specified'}`
                  });
                }
              }

              // Remove the contact info block from the message
              assistantMessage = assistantMessage.replace(/<CONTACT_INFO>[\s\S]*?<\/CONTACT_INFO>/, '').trim();
            } catch (e) {
              console.error("Failed to parse contact info:", e);
            }
          }

          // Save assistant message
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
            message: "I apologize, but I'm having trouble connecting right now. Please try again or contact us directly at +62 819 668 278." 
          };
        }
      }),

    uploadDocument: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // base64
        documentType: z.enum(["passport", "transcript", "certificate", "other"])
      }))
      .mutation(async ({ input }) => {
        const { sessionId, fileName, fileType, fileData, documentType } = input;

        // Get conversation
        let conversation = await getConversationBySessionId(sessionId);
        if (!conversation) {
          conversation = await createConversation({ sessionId });
        }

        if (!conversation) {
          return { success: false, error: "Failed to create conversation" };
        }

        try {
          // Convert base64 to buffer
          const buffer = Buffer.from(fileData, 'base64');
          
          // Generate unique file key
          const fileKey = `documents/${sessionId}/${nanoid()}-${fileName}`;
          
          // Upload to S3
          const { url } = await storagePut(fileKey, buffer, fileType);

          // Save document record
          const document = await createDocument({
            conversationId: conversation.id,
            fileName,
            fileType,
            fileUrl: url,
            fileKey,
            documentType
          });

          // Update conversation status
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
          return { messages: [] };
        }

        const messages = await getMessagesByConversationId(conversation.id);
        return { 
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt
          }))
        };
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
        }))
      }))
      .mutation(async ({ input }) => {
        const { universities } = input;

        const uniList = universities.map(u => 
          `- ${u.name} (${u.country}, QS ${u.ranking}, ${u.type}, Tuition: ${u.tuition}, Programs: ${u.programs.join(', ')})`
        ).join('\n');

        const comparisonPrompt = `You are an expert education consultant. Compare these universities for a prospective student:\n\n${uniList}\n\nProvide a detailed comparison covering:\n1. **Rankings & Reputation** - Compare global standings and academic reputation\n2. **Cost Analysis** - Tuition fees, living costs, and value for money\n3. **Programs & Strengths** - Key academic strengths and unique programs\n4. **Career Prospects** - Graduate employability and industry connections\n5. **Student Life** - Campus experience, location, and culture\n6. **Recommendation** - Who each university is best suited for\n\nFormat your response with clear headings and be specific with data. Keep it concise but informative.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system" as const, content: "You are SpecTa, an expert education consultant for SpecTa Education. Provide helpful, detailed university comparisons to help students make informed decisions. Be specific and data-driven." },
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

  admin: router({
    getLeads: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        return { leads: [] };
      }
      const leads = await getAllLeads();
      return { leads };
    }),

    getLead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
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
        if (ctx.user.role !== 'admin') {
          return { success: false };
        }
        const { id, ...data } = input;
        await updateLead(id, data);
        return { success: true };
      }),

    getConversations: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        return { conversations: [] };
      }
      const conversations = await getAllConversations();
      return { conversations };
    }),

    getConversationMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          return { messages: [] };
        }
        const messages = await getMessagesByConversationId(input.conversationId);
        return { messages };
      }),

    getDocuments: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        return { documents: [] };
      }
      const documents = await getAllDocuments();
      return { documents };
    }),

    getLeadDocuments: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          return { documents: [] };
        }
        const documents = await getDocumentsByLeadId(input.leadId);
        return { documents };
      }),

    getConversationDocuments: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          return { documents: [] };
        }
        const documents = await getDocumentsByConversationId(input.conversationId);
        return { documents };
      })
  })
});

export type AppRouter = typeof appRouter;
