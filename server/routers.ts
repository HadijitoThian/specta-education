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
3. Provide detailed information about our partner universities, programs, and requirements
4. Guide them through the application process
5. Collect their contact information (name, email, phone) when they're ready to proceed
6. Encourage document uploads (passport, transcripts, certificates) when appropriate

=== MALAYSIA PARTNER UNIVERSITIES ===
SpecTa Education has exclusive partnerships with 8 top Malaysian universities. Here is detailed information about each:

**1. Taylor's University** (QS #284, #1 Private University in Malaysia)
- Location: Subang Jaya, Selangor | Established: 1969
- #14 in Asia for Hospitality & Leisure Management, QS 5-Star Rating
- Programs: Business, Hospitality & Tourism (Culinary Arts, Hotel Management), Design (Architecture, Interior Design, Fashion), Medicine, Engineering, Computing
- Strengths: Hospitality (#14 Asia), Business, Architecture, Medicine
- Facilities: Lakeside Campus, Design Studios, Culinary Labs, Medical Simulation Center
- Scholarships available

**2. University of Nottingham Malaysia** (QS #97, Top 100 Global)
- Location: Semenyih, Selangor | Established: 2000
- Russell Group member, Triple-Crown Accredited Business School, 85% academics hold PhDs
- Programs: Business (Triple-Crown), Engineering (Civil, Mechanical, Electrical, Chemical), Pharmacy (Top 15 Global), Computer Science, Psychology, Education
- Strengths: Pharmacy (Top 15 Global), Business, Engineering, Computer Science
- Facilities: 125-acre Campus, Research Labs, Sports Complex, Student Accommodation
- Scholarships available

**3. INTI International University** (QS #509, #122 Asia)
- Location: Nilai, Negeri Sembilan | Established: 1986
- 40+ years of excellence, American Degree Transfer Program, 6 partner universities worldwide
- Programs: American Degree Program (Business, CS, Engineering), Accounting, Business Administration, Software Engineering, Data Science, Cybersecurity, Civil/Mechanical/Electrical Engineering
- Strengths: American Degree Transfer, Business, Engineering, Hospitality
- Facilities: 82-acre Nilai Campus, Multiple Campuses (Subang, Penang, Sabah), Industry Labs
- Scholarships available

**4. The One Academy (TOA)** (#1 World's Top Creative School - Rookies 2024)
- Location: Bandar Sunway, Selangor | Established: 1991
- Oscar-winning faculty partnerships, ESMOD Paris partnership, DigiPen USA partnership
- Programs: Digital Animation, VFX, Game Art & Design, 3D Animation, Advertising & Graphic Design, Interior Design, Paris Fashion Design, Fine Arts, Concept Art
- Strengths: Animation, VFX, Graphic Design, Fashion Design
- Facilities: Industry-Standard Studios, Animation Labs, Fashion Workshops, Gallery Spaces
- Scholarships available

**5. UCSI University** (QS #269, #2 Private University in Malaysia)
- Location: Cheras, Kuala Lumpur | Established: 1986
- Top 1% Global University, #1 in Employability, Top 20 in Asia
- Programs: Medicine (MBBS), Pharmacy, Nursing, Optometry, Business Administration, Accounting, Engineering, Music, Architecture, Fashion Design
- Strengths: Medicine, Music, Pharmacy, Business
- Facilities: 20-acre KL Campus, Teaching Hospital, Music Conservatory, Multiple Campuses
- Scholarships available

**6. Monash University Malaysia** (QS #36, Top 40 Global)
- Location: Bandar Sunway, Selangor | Established: 1998
- Group of Eight member (Australia), #4 in World for Pharmacy, 6-Star SETARA Rating
- Programs: Medicine (MBBS), Pharmacy (#4 World), Psychology, Biomedical Science, Business & Commerce, Accounting, Banking & Finance, Civil/Mechanical/Chemical/Electrical Engineering, Computer Science, Data Science
- Strengths: Pharmacy (#4 World), Medicine, Engineering, Business
- Facilities: 22-acre Sunway Campus, Research Centers, Teaching Hospital, Sports Facilities
- Scholarships available

**7. University of Southampton Malaysia** (QS #87, Top 100 Global)
- Location: Iskandar Puteri, Johor | Established: 2012
- Russell Group founding member, #1 UK for Electrical Engineering, Same curriculum as UK campus
- Programs: Mechanical Engineering (#77 World), Electrical Engineering (#70 World, #1 UK), Aeronautics, Civil Engineering, Business Management, Business Analytics, Computer Science, Software Engineering, Foundation Year programs
- Strengths: Electrical Engineering (#1 UK), Mechanical Engineering, Aeronautics, Computer Science
- Facilities: 150,000 sq ft Campus, UK-Standard Labs, Student Accommodation, Near Singapore
- UK transfer programme available, Scholarships available

**8. MILA University** (QS Asia #414, Top 100 South-Eastern Asia)
- Location: Nilai, Negeri Sembilan | Established: 2023
- Top 500 in Asia, Royal Patronage, IR 4.0 Focus, Global affiliation with Haikou University of Economics
- Programs: Business Administration, Accounting, Finance, Mass Communication, Mechanical Engineering, Mechatronics, AI & Robotics, Software Engineering, Biotechnology, Food Science
- Strengths: Engineering, Biotechnology, Business, Computing
- Facilities: Modern Campus, Research Labs, Student Accommodation, Industry Partnerships
- Bursary and financial aids available

=== IMPORTANT GUIDELINES ===
- When students ask about Malaysia universities, provide detailed information from above
- NEVER provide external website links - always direct students to speak with SpecTa counselors for more information
- Recommend universities based on student's interests, budget, and career goals
- For creative/design students: Recommend The One Academy
- For medicine/pharmacy: Recommend Monash, UCSI, or Nottingham
- For engineering: Recommend Southampton, Nottingham, or Monash
- For business: Recommend Taylor's, Nottingham, or UCSI
- For hospitality: Recommend Taylor's
- For American degree transfer: Recommend INTI
- Always mention that SpecTa Education provides FREE consultation and application support

Conversation flow:
- Start by warmly greeting and asking about their study abroad interests
- Ask about their preferred country and field of study
- If Malaysia is mentioned, provide detailed university recommendations based on their interests
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
- NEVER provide external links - all information should come through SpecTa Education

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
