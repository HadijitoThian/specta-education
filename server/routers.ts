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
  getStaffAccountByName
} from "./db";
import { notifyOwner } from "./_core/notification";
import { sendEmail, sendDocumentNotificationEmail, sendStaffWelcomeEmail, sendPasswordResetEmail, sendCounselorAssignmentEmail, sendStudentNotificationEmail } from "./email";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

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
Step 5: Gently collect their info (name, phone, email) so a human counselor can follow up.
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
Don't ask for all info at once. Collect naturally during conversation.

=== OTHER RULES ===
- NEVER provide external links.
- For Singapore: ONLY private institutions.
- For affordable options: suggest Malaysia or China.
- Always mention FREE consultation and application support when appropriate.
- If they seem stressed about costs, reassure them — scholarships exist!
- Encourage booking a consultation or trying Quick Apply when the time feels right.
- NEVER be pushy. Be their friend first, counselor second.

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
                  status: "new"
                });

                if (lead) {
                  await notifyOwner({
                    title: "New Lead from SpecTa AI",
                    content: `New lead captured!\n\nName: ${contactInfo.name || 'Not provided'}\nPhone: ${contactInfo.phone}\nEmail: ${contactInfo.email || 'Not provided'}\nCountry: ${contactInfo.country || 'Not specified'}\nStudy Level: ${contactInfo.studyLevel || 'Not specified'}`
                  });
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
            message: "I apologize, but I'm having trouble connecting right now. Please try again or contact us directly at +62 819 668 278." 
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

            return { success: true, data: parsed, resultId: result?.id };
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
        const token = await new SignJWT({ staffId: staff.id, email: staff.email, role: staff.role, name: staff.name })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("7d")
          .sign(secretKey);
        ctx.res.cookie("staff_token", token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
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
      ctx.res.clearCookie("staff_token", { path: "/" });
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
  }),
});

export type AppRouter = typeof appRouter;
