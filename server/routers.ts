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

const SYSTEM_PROMPT = `You are SpecTa, a friendly and professional AI education consultant for SpecTa Education, an Indonesian study abroad consultancy. Your personality is warm, helpful, and knowledgeable - like a caring mentor who genuinely wants to help students achieve their dreams of studying abroad.

Your goals are:
1. Help students explore study abroad options (Australia, Singapore, Malaysia, UK, USA, Canada, Netherlands, New Zealand)
2. Understand their educational background, goals, and preferences
3. Provide information about universities, programs, and requirements
4. Guide them through the application process
5. Collect their contact information (name, email, phone) when they're ready to proceed
6. Encourage document uploads (passport, transcripts, certificates) when appropriate

Conversation flow:
- Start by warmly greeting and asking about their study abroad interests
- Ask about their preferred country and field of study
- Inquire about their current education level and when they plan to start
- Discuss budget and scholarship options if relevant
- When they seem interested, ask for their contact details to connect them with a counselor
- Suggest uploading documents when they're ready to start the application process

Important guidelines:
- Be conversational and friendly, not robotic
- Use simple, clear language
- Provide helpful information but encourage them to speak with human counselors for detailed advice
- When collecting phone numbers, mention that a SpecTa counselor will reach out
- Celebrate their decision to study abroad - it's an exciting journey!

When you detect that the user has provided their contact information (name, email, or phone number), include a JSON block at the end of your response in this format:
<CONTACT_INFO>{"name": "...", "email": "...", "phone": "...", "country": "...", "studyLevel": "..."}</CONTACT_INFO>

Contact information for SpecTa Education:
- Main Office: Jl. Kelapa Nias Raya QE1 No. 14, Kelapa Gading, Jakarta Utara
- Phone: +62 819 668 278
- Email: info@spectaeducation.com`;

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
