# SpecTa Education — Project Memory (read this first every session)

This file is the single source of truth for what this project is, what we've
built, and where we are. Keep it updated as things change.

> **Owner/admin:** Hadi jito thian — admin login email **`hadijitothian@gmail.com`**
> (role=admin, users.id=1). (System context may show `hjthian@gmail.com`; the
> actual admin account in the DB is `hadijitothian@gmail.com`.)

---

## 1. What this is

SpecTa Education — an Indonesian study-abroad consultancy website **plus** a
paid **IELTS Mock Test** product. Originally hosted on **Manus.im**; we migrated
the whole thing to **Claude Code development + Railway hosting from GitHub**.

- **Repo:** `C:\specta-education-railway` (local). GitHub: `HadijitoThian/specta-education`.
- **Active branch:** `migrate-off-manus` → auto-deploys to **Railway** on push.
- **Live domain:** `https://www.spectaeducation.com` (Railway). Default Railway URL
  (always works, no DNS): `https://specta-education-production.up.railway.app`.

## 2. Stack

React 19 + Vite 7 + Wouter (routing) + tRPC + TanStack Query + Tailwind +
framer-motion + pdfmake. Server: Express + tRPC + Drizzle ORM + **MySQL**
(Railway). Build: `vite build` + esbuild bundle of `server/_core/index.ts`
(ESM, `--packages=external`). Start: `node dist/index.js`.

- Type-check: `pnpm check` (tsc --noEmit). Always run before committing.
- Node ≥ 20.11 required (`import.meta.dirname`). `.nvmrc` + `NIXPACKS_NODE_VERSION=20`.
- DB migrations are NOT auto-run on deploy; `pnpm db:push` runs them manually.
  **Avoid schema changes when possible** (no auto-migrate in prod).

## 3. Services (all migrated OFF Manus — these are the replacements)

| Concern | Service | Env / notes |
|---|---|---|
| LLM | **DeepSeek** (`api.deepseek.com`, OpenAI-compatible) | `DEEPSEEK_API_KEY`; helper `server/_core/llm.ts` (`invokeLLM`) |
| TTS (listening audio + speaking voice) | **ElevenLabs** | `ELEVENLABS_API_KEY`; `server/_core/elevenlabs.ts`. **Per-key credit caps can exhaust** — watch this. |
| Speech-to-text (speaking) | **OpenAI Whisper** | `OPENAI_API_KEY`; `server/_core/voiceTranscription.ts` |
| Images (Writing chart) | **QuickChart** (was DeepInfra FLUX — FLUX can't render real data) | free; chart built from LLM data |
| Object storage | **Cloudflare R2** (S3 API) | `R2_*`; `server/storage.ts`. Served via `/files/*` Express proxy. |
| Email | **Resend** | `RESEND_API_KEY`, `SMTP_FROM`; Resend domain verified in cPanel (DKIM + `send.` MX) |
| Payments | **Xendit** | `XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN`; webhook `/api/xendit/webhook` |
| Auth | **email + password** (bcryptjs + HS256 JWT via jose) | `JWT_SECRET`; NOT Google OAuth |

Other env: `APP_URL` (must include scheme — code force-adds `https://` if missing),
`OWNER_EMAIL` (auto-grants admin on signup), `FREE_TRIAL_TEST_CODES` (now unused).

## 4. THE BIG BUILD — IELTS Mock Test platform

A full, paid, AI-graded IELTS mock test (Academic + General). Price **Rp 79,000**,
pay-per-attempt, all 4 skills, instant AI-graded report emailed as branded PDF.
"International IELTS standard" is the bar the owner holds us to.

**Key files:**
- `server/ieltsTestGenerator.ts` — generates ALL content (4 listening sections +
  audio, 3 reading passages, 2 writing tasks + chart, ~18 speaking prompts).
  `generateAcademicTest()` (full), `regenerateTextContent()` (Reading/Writing/
  Speaking only — **NO ElevenLabs**), `fixReadingResearcherMatching()` (surgical
  Q27-31 fix). Audio is generated ONCE, stored in R2, served forever.
- `server/ieltsRouter.ts` — student tRPC routes (catalog, startCheckout, take
  flows, save/finish each skill, getReport, listeningReview [admin-only],
  redeemFreePass, finishSpeaking → `regradeSpeakingForAttempt`).
- `server/ieltsAdminRouter.ts` (`admin.ielts.*`) — list/get/import/setPublished/
  delete, uploadListeningAudio, createTestAttempt ("Test as student"),
  regenerateTest (full), regenerateText (text-only), fixReadingResearcherMatching,
  createFreePass, generationStatus, speakingDiagnostic, regradeAttempt, answerKey.
- `server/ieltsGrading.ts` — `isAnswerCorrect` (MCQ letter match, hyphen/space
  tolerant) + `gradeObjectiveAnswers` (deterministic + **batched LLM** context
  grading for completion answers). `semanticGradeCompletions`.
- `server/ieltsFinalize.ts` — `finalizeAttempt()`: recompute Listening/Reading
  raw→band (live, with grading helper), Writing (T1+2·T2/3), Speaking (mean),
  Overall; render PDF; email via Resend; status→completed.
- `server/ieltsReportPdf.ts` — branded PDF (NO IELTS trademarks). **pdfmake 0.3.x:
  `createPdfKitDocument` is async — must await.** Contains bands + sub-scores +
  feedback only; NO answer key.
- Client: `client/src/pages/IeltsMockTest.tsx` (sales/landing), `IeltsMockTake.tsx`
  (the take-test UI — Listening/Reading/Writing/Speaking runners), `IeltsMockReport.tsx`
  (result page), `IeltsMockSuccess.tsx` (post-payment), `IeltsFreeRedeem.tsx`
  (`/ielts/redeem/:token`), `AdminIeltsTests.tsx` (`/admin/ielts-tests`).

**Listening authenticity (matches real IELTS):**
- 4 sections, 10 Q each. Difficulty escalates S1→S4. Real audio distractors.
- Narrated instructions (dedicated narrator voice), Section-1 worked example,
  reading-time pauses (real silent MP3 spliced in, frame-format matched to
  ElevenLabs output via `detectMp3Frame`), check pauses.
- **Sections 1-3 split into two halves** at `[[SPLIT]]` marker; narrator announces
  the boundary the LLM reports (`firstBatchEnd`). **Section 4 plays straight
  through** (no mid-break).
- Per-section voices distinct (gender + accent variety); narrator separate.
- Word limits shown on screen via `[LIMIT: …]` tags the LLM emits.
- S1 form completion; S2 MCQ + matching + notes; S3 MCQ + sentence completion
  (no speaker-matching); S4 note/sentence completion.
- Reading Q27-31 = "match statement to researcher A-F" (matching_features),
  rendered with a legend + pickers (ReadingQuestionsArea reuses MatchingTable).

**Grading philosophy (owner overrode strict IELTS toward leniency):** accept
context-equivalent answers (e.g. "through a friend" == "a friend", spacing,
synonyms) via the LLM pass; still reject misspellings + wrong info. MCQ compares
the option letter.

**Payment flow (GUEST CHECKOUT — no account/login):** buyer fills name+email on
form → `startCheckout` (public) → Xendit invoice → pay → Xendit webhook
(`markIeltsAttemptPaid`) marks attempt paid AND **emails buyer a "Start my test"
link** (so a redirect failure doesn't lose them) → success page → take test →
finish → report emailed. Admin can issue **free links** (`createFreePass`) or
"Test as student".

**Guest-checkout architecture (CRITICAL — option B, the intended design):** NO
account or login anywhere in the buyer journey. The secret `attemptToken` in the
emailed take link IS the credential.
- `startCheckout` is a **publicProcedure**; `createIeltsMockInvoice` resolves (or
  creates) a password-less owner user from the form email (`resolveGuestUserId`
  in `ieltsMockService.ts`: lookup by `users.emailLower`, else insert
  `openId:"guest:<nanoid>"`, `loginMethod:"guest"`). The attempt still gets an
  owner row; the buyer never sees a login wall. `userId` is optional in
  `CreateIeltsMockInvoiceParams` (attaches to a logged-in admin if present).
- The WHOLE take/report flow in `ieltsRouter.ts` is **publicProcedure**,
  authorized purely by token (no `ctx.user`, no per-account ownership check):
  getAttempt, getListeningContent, startSkill, save/finish each skill,
  getReport, etc. ONLY `redeemFreePass`, `myAttempts`, `listeningReview`
  (answer-key, admin) stay `protectedProcedure`.
- Client: buy form (`IeltsMockTest.tsx`), take page (`IeltsMockTake.tsx`),
  report page (`IeltsMockReport.tsx`) and success page have **no login gates**;
  queries enabled by `!!token` only. (Was a bug: form bounced logged-out buyers
  to `/login` and the take flow was login-locked — fixed.)
- All three emails (payment link at checkout, "Start my test" on payment, report
  on finish) go to the **form email** (`attempt.customerEmail`), not any account
  email. Verify with `node scripts/simulate-paid-webhook.cjs` (no real money).

**Reliability safeguards in generation:** generate ALL audio before any DB write
(abort cleanly on TTS failure — never ships a half test); atomic replace (old
test kept until new is ready); `normalizeQuestionType` coerces LLM types to the
DB enum; per-skill retries + hard guard; `generationStatus` live banner in admin.

## 4b. SECOND PAID PRODUCT — AI IELTS Tutor (subscription)

A standalone paid **AI IELTS Tutor** at `/ielts/tutor` (`client/src/pages/IeltsTutor.tsx`).
Unlimited **Writing + Speaking** coaching with instant AI feedback, band scores,
model answers, and a guided full Speaking Part-1 test. Distinct from the one-off
Mock Test. **Subscription**, billed via Xendit.

- **Plans (2):** `w2` = 2 Weeks **Rp 149.000** (14 days), `m1` = 1 Month
  **Rp 249.000** (30 days). Defined in `server/xenditService.ts` `TUTOR_PLANS`.
  (Earlier 1/3/6-month idea dropped — "nobody takes 6 months to learn IELTS".)
- **Auth = student portal** (NOT guest): students sign in via `student_portal_token`
  cookie → `leads.id`. The tutor's own AuthGate uses `studentPortal.selfRegister`
  / `studentPortal.login`. Every signup = a CRM lead (attribution funnel).
- **Free taster:** 1 writing + 1 speaking eval, then paywall. Override env
  `TUTOR_FREE_TESTING=true` bypasses the paywall for QA — **REMOVE before launch.**
- **Server:** `server/tutorRouter.ts` (mounted `tutor`), `server/tutorEngine.ts`
  (DeepSeek grading — fair, not strict; don't penalise pronunciation it can't hear),
  `server/db.ts` tutor_subscriptions + tutor_sessions helpers. Schema:
  `drizzle/schema.ts` tutorSubscriptions (plan enum `["w2","m1"]`) + tutorSessions.
- **Speech/voice:** transcription via **DeepInfra Whisper** (`whisper-large-v3-turbo`,
  `DEEPINFRA_API_KEY`) with OpenAI fallback; Whisper-timestamp **fluency metrics**
  (`computeFluency`). Examiner voice = **free browser Web Speech API** TTS (auto-plays
  ~2s after a question; "Dengar penguji" fallback button). Audio recordings stored
  in R2, played back from history via `/files/<key>`.
- **Payments:** `createCheckout` (tutorRouter) → `createTutorInvoice` (xenditService,
  external_id prefix `TUTOR-`) → Xendit hosted invoice → webhook
  (`server/xenditWebhook.ts` TUTOR- branch) activates the subscription:
  `status="active"`, `startsAt=now`, `expiresAt=now+days`. Expiry enforced at read
  time by `getActiveTutorSubscription` (`status=active AND expiresAt>=now`) — no cron.
  Same `XENDIT_SECRET_KEY` + `XENDIT_WEBHOOK_TOKEN` as the Mock Test.
- **Landing images:** `server/tutorImages.ts` (FLUX-1.1-pro, generated once to fixed
  R2 keys `tutor/landing/*.jpg`).
- **Recordings playback:** `RecordingPlayer` in IeltsTutor.tsx fixes MediaRecorder
  WebM blobs (no duration metadata) by seeking-to-end on load so they play/seek.
  Guided-test answers are persisted to R2 (`speakingTestAnswer` returns audioUrl,
  `speakingTestFinish` stores it in feedback.answers) and replayable in the summary
  and History (`SpeakingTestResult`). NOTE: guided-test history sessions store
  `{topic, questions, answers}` — SessionView branches on `feedback.questions`.
- **Payment reminders (2 layers):** (A) Xendit invoice reminders are enabled on
  tutor invoices (`invoice_reminder:["email"]`, 3-day window) for anyone who
  reached a real invoice. (B) Our own free-trial nurture: `tutorReminderScheduler.ts`
  emails students who tried the taster but never created an invoice and have no
  active sub — at +1d and +3d, max 2, stop on subscribe. Per-lead dedupe in the
  `tutor_reminders` table (created in ensureMarketingSchema); candidates via
  `getTutorReminderCandidates()`, send via `sendTutorReminderEmail` (Resend).
- **Practice→product follow-up email:** `practiceFollowupScheduler.ts` sends ONE
  email to free IELTS-practice takers (`ieltsPracticeResults`) ≥1 day after their
  first attempt, inviting them to the Mock Test + AI Tutor. Dedupe per email in
  `practice_followups` table; throttled ~40/hour to protect sender reputation.
  `getPracticeFollowupCandidates` / `recordPracticeFollowupSent` (db) +
  `sendPracticeFollowupEmail` (Resend). First email-marketing use of the lead DB.
- **Conversion tracking:** `client/src/lib/googleAds.ts` `fireConversion`. Tutor fires
  `lead` on signup (selfRegister) and `purchase` on a confirmed paid subscription
  (IeltsTutor polls status after `?paid=1` then fires with the plan value). Dormant
  until `VITE_GOOGLE_ADS_ID` + `VITE_GOOGLE_ADS_LEAD_LABEL`/`_PURCHASE_LABEL` are set.
- Surfaced in the **Ads Co-pilot** landing-page dropdown (`/ielts/tutor`).
- **Admin free links** (mirrors Mock Test free pass): `/admin/ielts-tests` →
  "✨ AI Tutor free link" button (`admin.ielts.createTutorFreePass`, pick days)
  → signed `tutor-free-pass` JWT link `/ielts/tutor/redeem/<token>`. Opening it
  stashes the token, sends the user to `/ielts/tutor` to make a free account,
  then `tutor.redeemFreePass` grants an active free subscription
  (`xenditInvoiceId="FREE-…"`, shown as "Free trial" in the header). Reusable
  until the link expires.

## 5. Site / nav / pages

- **THREE AI-IELTS products** (a deliberate funnel — free → one-off → subscription):
  1. `/ielts/practice` — **free** AI practice (one skill, name+email, no account).
  2. `/ielts/mock-test` — **Rp 79k** one-off full 4-skill mock (guest checkout).
  3. `/ielts/tutor` — **subscription** AI Tutor (student-portal account). See §4b.
- Top-nav "IELTS" is a **dropdown**: Courses (`/ielts`) · AI Practice · Mock Test ·
  AI Tutor (`Navigation.tsx`, desktop + mobile).
- `/ielts` page has a **"Three ways to get exam-ready"** section presenting all
  three products as cards (`IELTS.tsx` — replaced the old Mock-Test-only promo).
- Homepage (`Home.tsx`) has the IELTS Mock Test hero band **plus** an AI Tutor
  promo band below it (links to `/ielts/tutor` + `/ielts`).
- Footer (`Footer.tsx`) Quick Links include Mock Test + AI IELTS Tutor.
- Tutor landing logo + "← Main site" link → `https://www.spectaeducation.com`.
- Removed: old external mock-test banner (linked to deprecated
  `mock-up.spectaeducation.com`), and the "IELTS Breakthrough self-study"
  section from the IELTS page.
- **All images self-hosted on R2** under `/files/migrated/…` (33 assets moved off
  `files.manuscdn.com`; logo included). Scripts: `scripts/migrate-manus-images.cjs`,
  `scripts/scan-manus-db.cjs` (DB is clean of manus URLs). Mapping:
  `files.manuscdn.com/.../session_file/310519663225686644/<NAME>` → R2 key
  `migrated/<NAME>` → served at `/files/migrated/<NAME>`.
- **2026-06: caught a missed Manus dependency** — `client/index.html` (og:image,
  twitter:image, hero `preload`, JSON-LD logo/image, manus preconnect hints) and
  `scripts/add-seo-pages.json` still pointed at `files.manuscdn.com`. Repointed
  to absolute `https://www.spectaeducation.com/files/migrated/<NAME>` (absolute
  is required for social/SEO crawlers) and removed the manus preconnect. Served
  code is now 100% off Manus; remaining "manus" mentions are docs/tests/migration
  scripts + the legacy `manus-runtime-user-info` localStorage key (harmless).

## 6. Admin dashboard + agents

- `/admin` = AdminDashboard (CRM/leads, conversations, applications, IELTS practice
  results, counselors/team/staff, scholarships, campaigns, blog, comments,
  universities, pro orders, data mgmt). Same `role=admin` login as everything.
- `/admin/ielts-tests` = IELTS Mock admin (now also linked from the dashboard header).
- **Agents are DISABLED** (lead/CRM/SEO/social/Ads/GM). Background scheduler call
  in `server/routers.ts` (`startAgentScheduler()`) is commented out; agent UI
  entry points removed from the dashboard. Agent code/routes still exist, dormant,
  for reference. Plan: build fresh agents later, then delete old code. Keep the
  **Blog/Article publisher**.

## 7. Migration / domain status (as of last session)

- ✅ Off Manus: code, DB (no historical users/data to migrate), images→R2, all
  services migrated. Manus is **safe to delete** (do it once www is verified live).
- ✅ DNS cutover done: cPanel (nameservers `ns1/ns2.indoproweb.com`) →
  `www.spectaeducation.com CNAME → uqjwyvyf.up.railway.app` (TTL 300); apex
  `spectaeducation.com A → 172.104.39.172` + cPanel 301 redirect → www.
  Railway SSL issued; site live over HTTPS.
- Gotcha learned: removing/re-adding a Railway custom domain **rotates the CNAME
  target** — re-copy it from Railway's dialog. Apex can't be a CNAME → use A +
  redirect. Old cached records can take up to their TTL (was 14400) to expire.

## 8. Conventions / how we work

- Commit style: imperative subject + body explaining the "why"; trailer
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Always `pnpm check` before commit. Deploy = `git push origin migrate-off-manus`.
- Owner is non-technical for ops: give exact Railway Console / cPanel steps.
  Railway Console runs `node` with prod env (DATABASE_URL, R2_*, etc.) — used for
  DB diagnostics, password resets, image migration, marking attempts paid.
- **Admin password reset** (if lost): Railway Console → bcryptjs hash → UPDATE
  `users.passwordHash WHERE email='hadijitothian@gmail.com'`.
- Owner cares deeply about IELTS authenticity AND about not wasting ElevenLabs
  credits — prefer `regenerateText` (no audio) for Reading/Writing/Speaking fixes.

## 9. Open / pending

- Verify one real end-to-end purchase on the live `www` domain, then delete Manus
  + remove leftover `cname.manus.space` records (`ielts-w`, `trial`, `mock-up`).
- Generate the rest of the test bank (ACAD-002/003, GT-001/002/003).
- Optional: fully embed the Mock admin as a tab inside `/admin` (currently a link).
- Optional cleanup: delete dormant agent code/routes; rename legacy
  `manus-runtime-user-info` localStorage key.
- Build fresh agents (future).

## 10. NEW PRODUCT — IGCSE Math AI Teacher (`/igcse`)

Phase 1 in progress. Interactive AI tutor for Cambridge IGCSE Mathematics 0580
(Extended tier) with a shared digital whiteboard + voice conversation. Lives
at `spectaeducation.com/igcse`. Stack architecture confirmed = "Path A+":

- **Brain:** DeepSeek V4 (Flash for conversation, Pro for hard math reasoning).
  DeepSeek-V3 is fine as fallback if V4 endpoint isn't yet live.
- **Voice in (STT):** streaming — Deepgram or AssemblyAI realtime (~200ms).
- **Voice out (TTS):** ElevenLabs Flash v2.5 streaming (~75ms first byte).
- **VAD:** Silero VAD client-side for tight end-of-utterance.
- **Whiteboard:** tldraw + KaTeX. The LLM emits structured "board commands"
  (title / equation / text / diagram) that we render as tldraw shapes
  step-by-step so it looks like a teacher writing.
- **Target turn-around:** ~500ms (streaming end-to-end pipeline).
- **Cost ceiling:** **$2/hr/student** — measured per session via `costCents`.
- **Auth/sub:** reuse student-portal cookie + Xendit subscription engine.

**Week-1 scaffold (this commit):**
- DB tables: `igcse_topics` (~70 topics seeded), `igcse_sessions`,
  `igcse_progress`. Idempotent via `ensureMarketingSchema`.
- Topic tree authored from Cambridge 0580 Extended syllabus areas C1-C9,
  seeded by `seedIgcseTopicsIfEmpty` on startup (mirrors universities seeder).
- `server/igcseRouter.ts` (`igcse` namespace): listTopics, status,
  createSession, listSessions, getSession, endSession, appendTranscript.
  Phase-1 status returns `hasAccess: true` for all signed-in leads;
  subscription gating wires in when the IGCSE plan is added to
  `tutor_subscriptions` (Week 2).
- `/igcse` landing page (`client/src/pages/Igcse.tsx`) — sales hero +
  live-rendered syllabus areas pulled from the seed + WhatsApp beta CTA.

**Week 2 (shipped):** subscription engine + free trial + gated app shell.
- `igcse_subscriptions` table (`plan='m1'`, `hoursLimit=30`, `status`,
  `xenditInvoiceId`, `startsAt`/`expiresAt`). Mirrors `tutor_subscriptions`
  but kept separate so the monthly hours cap doesn't pollute the tutor row.
- `IGCSE_PLANS.m1` in `xenditService.ts`: Rp 299.000 / 30 days / 30 hrs.
  Plus `igcseExternalId()` / `isIgcseExternalId()` / `createIgcseInvoice()`.
- Xendit webhook: `IGCSE-` branch in `server/xenditWebhook.ts` activates the
  subscription on PAID/SETTLED (mirrors the `TUTOR-` branch), cancels on
  EXPIRED/FAILED, and pings `notifyOwner`.
- `igcseRouter.status`: returns `subscription` (plan/expiresAt/hoursLimit) +
  `freeTrial.{totalSec, usedSec, remainingSec}` (lifetime cap of **30 minutes**
  measured by `getIgcseLifetimeSecondsUsed` summing `durationSec` from
  `igcse_sessions`). `hasAccess = !!sub || freeRemainingSec > 0`.
- `igcseRouter.createCheckout({plan:"m1"})`: writes a pending
  `igcse_subscription` row keyed by external id, hits Xendit, returns the
  hosted invoice URL. Success redirects to `/igcse/app?paid=1`; the app then
  polls status briefly so the new subscription appears as soon as the
  webhook flips it active.
- **Client:** `/igcse/app` gated page (`client/src/pages/IgcseApp.tsx`) =
  AuthGate (reusing the student-portal pattern from the IELTS Tutor) →
  signed-in Dashboard showing free-trial counter, subscription status,
  "Subscribe → Xendit" plan card, "classroom opens soon" placeholder.
- Landing page CTA now points at `/igcse/app` (free trial first) instead of
  WhatsApp-only.

**Week 3 (shipped):** topic picker + session room + working basic chat.
- New endpoint `igcse.sendMessage({sessionId, message, elapsedSec})` —
  calls DeepSeek with a topic-grounded Cambridge IGCSE Math system prompt
  (Socratic, step-by-step, plain-text math notation for now). Persists both
  turns to the session transcript and updates `durationSec` so the
  free-trial counter ticks even if the student closes the tab. Gate:
  active subscription OR free-trial time remaining (FORBIDDEN otherwise).
- `/igcse/app` dashboard now has a real **TopicPicker** (Cambridge areas
  C1–C9, expandable, ~70 topics) and a **RecentLessons** list.
- New page `client/src/pages/IgcseLesson.tsx` at `/igcse/lesson/:id`:
  chat UI with bubble transcript, autoscroll, Enter-to-send, optimistic
  rendering, "End" button → calls `endSession` with final durationSec.
  Header shows topic code/title + free-trial counter / active badge.
- Pedagogy prompt is grounded in `topic.learningOutcomes` and obeys
  `session.language` (en/id).
- LLM: uses the existing `invokeLLM` (DeepSeek). Model is whatever
  `DEEPSEEK_*` env points at; swap to V4 by updating the env when ready.

**Week 4 (shipped):** the whiteboard. The AI now returns BOTH `speech` (chat
bubble) AND an ordered `board` array of structured commands rendered onto
a shared whiteboard panel.
- `igcse.sendMessage` switched to **JSON response** (`response_format:
  json_object`). Defensive JSON parsing (strips ```json fences) so a flaky
  parse falls back to plain speech with empty board.
- Board command schema: `{type:"title"|"step"|"text"|"equation", …}`.
  Equations are valid LaTeX (the system prompt explicitly enforces braces,
  `\frac`, `\sqrt`, etc.); rendered with **KaTeX loaded from CDN**
  (jsdelivr 0.16.11) — **no npm dependency added** to keep bundle lean.
- Each turn's board commands are appended to `igcse_sessions.boardSnapshot`
  (capped at last 200 items) so reopening a past lesson restores the full
  board.
- Client lesson room (`/igcse/lesson/:id`) is now split layout: chat column
  + Board panel column. New board items reveal one-by-one (~600ms each) so
  it feels like a teacher writing. Equations render via the inline
  `KatexEquation` component (CDN loaded once, idempotent).
- The plain-text math notation from Week 3 is gone — the prompt now
  mandates proper LaTeX in board equations.

**Week 5 (shipped):** student drawing + diagram templates.
- New board command types the AI can emit and we render as SVG:
  - `number_line` (signed-number ranges, intervals, inequalities)
  - `triangle` (auto-laid-out from side lengths via law of cosines; side +
    angle labels)
  - `axes` (Cartesian grid with points/lines/function plots; linear and
    quadratic functions plotted by sampling ~120 points)
- System prompt extended with the diagram schemas + "when to use" guidance.
- New `SketchCanvas` overlay inside the `BoardPanel` content area: pointer
  events for pen + eraser, colour picker (purple/red/blue/black), undo,
  clear, and a Sketch toggle (off by default so users can scroll without
  drawing). Persisted client-side in `localStorage` keyed by `sessionId`
  (server-side persistence can be added later — v1 doesn't need it).
- Canvas auto-resizes via `ResizeObserver` as the AI adds new board items,
  so existing strokes stay anchored to their original positions.

**Voice TTS fallback chain** (for cost + resilience): the IGCSE
`synthesizeSpeech` endpoint tries **ElevenLabs Flash v2.5** first (best
quality, premium), falls back to **OpenAI `tts-1` (nova voice)** if
ElevenLabs throws (key missing, credit exhausted, 4xx), and the client
falls back to the **browser's native SpeechSynthesis** if the server can't
return audio at all (free, always works on Chrome/Edge). Helper:
`server/_core/openaiTts.ts`. Voice still works regardless of which keys
are present or whose credit has run out.

**Week 6 (shipped):** voice. The student can talk to the AI; the AI talks back.
- New endpoint `igcse.synthesizeSpeech({sessionId, text})` wraps
  `_core/elevenlabs.synthesize` with **Flash v2.5** (`eleven_flash_v2_5`,
  multilingual, low first-byte) + voice id Sarah (`EXAVITQu4vr4xnSDxMaL`) +
  `mp3_44100_64` for compact transfer. Returns base64 mp3 the client decodes
  and plays via HTMLAudioElement. Owner-scoped to the session so it can't
  be abused as a free TTS endpoint.
- **STT** — for v1 we use the browser's free **Web Speech API**
  (`SpeechRecognition` / `webkitSpeechRecognition`); no Deepgram key needed.
  Falls back gracefully on Safari/Firefox where it isn't supported (mic
  button hidden, voice toggle disabled with tooltip).
- Lesson room UI:
  - **🔊 Voice toggle** in the header — when ON, AI replies are spoken
    aloud and the mic re-arms automatically when the audio ends → real
    back-and-forth conversation, hands-free.
  - **🎙️ Mic button** in the input bar (push-to-talk, always available,
    even with voice toggle off).
  - Live banner when listening (red pulse) or speaking (violet pulse) with
    Stop buttons.
  - Recognition language follows `session.language` (`en-US` or `id-ID`).
- Cost-wise still within the $2/hr ceiling (Flash v2.5 ≈ \$0.30-0.60/hr of
  speech + DeepSeek + free browser STT).

**Week 7 (shipped):** exam-aware pedagogy via curated exemplar bank.
- New `igcse_examples` table (`drizzle/schema.ts` + `server/db.ts`) keyed
  by `topicCode`, with `question` + Cambridge-style `markScheme` using the
  examiner conventions (**M** = method, **A** = accuracy, **B** =
  independent, **FT** = follow-through).
- `server/igcseExamplesSeed.ts` seeds ~25 authored Cambridge-style
  exemplars across high-value 0580 Extended topics (percentages, ratio,
  bounds, surds, sequences, quadratics, simultaneous, inequalities,
  functions, differentiation, lines, circle theorems, sectors, cone
  surface, right-angle trig, cosine rule, vectors, tree diagrams,
  histograms, cumulative frequency). Idempotent — only seeds if empty.
- `sendMessage` (`server/igcseRouter.ts`) pulls up to 3 random exemplars
  for the active topic, injects them into the system prompt with the
  mark-scheme conventions and a new **EXAM-AWARE pedagogy** block telling
  the AI to: talk about mark allocations, flag common student traps,
  mirror exemplar style for practice but vary numbers, never claim items
  are verbatim past papers (so we stay copyright-clean).
- No scraping of copyrighted Cambridge papers — every exemplar in the
  bank is authored to Cambridge style and labelled as such.

**Week 8 (shipped):** Exam Practice — a first-class mode where students
attempt the curated exam-style questions and the AI coaches them through
each step Socratically.
- New tables `igcse_attempts` + `igcse_attempt_steps` (drizzle schema +
  ensureMarketingSchema CREATE TABLE).
- New router endpoints on `igcseRouter`:
  - `listExamples({ topicCode? })` — public list of questions (question +
    marks + topic only; mark scheme withheld until reveal).
  - `startAttempt({ exampleId })` — gated by subscription/free-trial,
    creates an attempt row, seeds the opening tutor turn.
  - `getAttempt({ attemptId })` — full state with steps; mark scheme is
    only returned once `status=completed` or `revealed=1`.
  - `submitStep({ attemptId, text })` — DeepSeek call with a strict
    Socratic system prompt: NEVER reveal numeric answers, NEVER copy the
    mark scheme; verdict ∈ {correct, partial, wrong, hint}; sets
    `complete:true` only when the student has reached the final answer.
  - `requestHint({ attemptId })` — tier-1/2/3 escalating nudges (concept
    → technique → structured walk-through, all without final numbers).
  - `revealMarkScheme({ attemptId })` — student gives up; reveals the
    full Cambridge-style mark scheme and finalises the attempt.
- New routes `/igcse/practice` (list, grouped by topic, with marks +
  difficulty filters + per-question best-score badges) and
  `/igcse/practice/attempt/:id` (split view: question on the left, chat
  with the AI coach on the right, KaTeX rendering of inline `$...$`
  math, colour-coded step bubbles by verdict).
- Dashboard at `/igcse/app` now shows two top-level mode cards: **Learn
  mode** (existing topic chat) vs **Exam Practice** (graded attempts).

**Week 9 (shipped):** content scale-up + Cambridge specimen-paper bridge.
- **Exemplar bank: ~25 → 63 questions across 46 distinct topics.** New
  coverage includes recurring decimals, indices I & II, standard form,
  exponential decay, algebraic manipulation/fractions, quadratics by
  factorisation and formula, graphs/functions/composites/inverses,
  coordinates and perpendicular bisectors, similarity (with the area-k²
  / volume-k³ trap), angles in polygons, cyclic quads, area+volume,
  Pythagoras, bearings, 3D trig, transformations, probability with and
  without replacement, conditional probability, mean from frequency
  tables, scatter diagrams, gradients-of-curves from first principles.
- **Per-topic incremental seeder** — `seedIgcseExamplesIfEmpty` now
  groups by topicCode and only inserts topics with zero existing rows.
  This means future edits to `EXAMPLES` adding *new* topics auto-seed
  on next deploy without duplicating existing rows or breaking
  attempt foreign keys. (Adding extra Qs to an already-seeded topic
  still needs a manual SQL insert — intentional, avoids dupes.)
- **Cambridge specimen-paper panel** (Path B) on `/igcse/practice`:
  curated emerald-card section linking to the official 0580 specimen
  papers on cambridgeinternational.org. We don't host the PDFs (no
  copyright risk) — we signpost. Tip text encourages students to copy
  any specimen-paper question into Learn mode for AI-guided coaching.
- **UX patch:** difficulty dropdown now disables (and labels "— none
  yet") any mark bucket with zero questions in the current topic
  filter, so students never click into a dead filter.

**Week 10 (shipped):** admin oversight + weakness-targeting + paste-your-
own-question custom attempts. The three things from the 10-week plan
that close out v1 of the product.
- **Weakness-targeting** (`igcse.weaknesses`): per-topic accuracy
  aggregation for the signed-in student. The /igcse/practice page now
  shows a rose-coloured "🎯 Focus areas" card listing the top 5 topics
  where the student is under 70% accuracy (or has revealed every
  attempt = given up), ranked by total marks lost. Each row has 1-2
  "Try a 3-mark question →" buttons that start a fresh attempt in that
  topic.
- **Custom-question attempts** (`igcse.startCustomAttempt`): the
  student pastes a question — typically from a Cambridge specimen
  paper — and the AI coaches them through it Socratically. Stored as a
  private igcse_examples row tagged source=`custom-${leadId}` (filtered
  out of listExamples so it doesn't pollute the public bank). The
  Socratic prompt branches: when no official mark scheme is provided,
  the AI uses general 0580 marking principles and is conservative
  about declaring an answer "correct". New page
  `/igcse/practice/custom` with a clean composer (question + marks +
  optional topic).
- **Admin IGCSE tab** on `/admin`: stat cards (active subscriptions,
  revenue, lesson hours, attempts, avg accuracy, bank size), plus a
  table of the most recent 50 attempts across all students with topic,
  score, hints used, status, and student name/email. Backed by two
  new admin-only endpoints `adminStats` + `adminRecentAttempts`.

**v1 complete (Math).** Multi-subject pivot starts here →

**Physics 0625 (shipped):** second subject under the same IGCSE umbrella.
- Schema widened: `igcseTopics.subject` enum now includes `physics`
  (idempotent ALTER for existing prod tables in ensureMarketingSchema).
- New seed `server/igcsePhysicsTopicSeed.ts`: full Cambridge 0625
  Extended topic tree across **6 areas, ~30 topics** (P1 Motion/Forces/
  Energy, P2 Thermal, P3 Waves, P4 Electricity & Magnetism, P5 Nuclear,
  P6 Space). Codes are P-prefixed (e.g. `P1.5`) to avoid collisions with
  Math's `1.5` in the shared `igcse_topics.code` UNIQUE column.
- New seed `server/igcsePhysicsExamplesSeed.ts`: **~28 authored
  Cambridge-style exam questions** with M/A/B/FT mark schemes across
  motion, density, forces, moments, Hooke's law, momentum, energy/power,
  pressure, gas laws, specific heat, latent heat, thermal transfer,
  wave speed, refraction, EM spectrum, sound echoes, electrical
  quantities, parallel circuits, potential divider, transformers,
  nuclear notation, half-life, redshift.
- AI system prompts (sendMessage + submitStep + requestHint) now branch
  on subject. The Physics branch injects Physics-specific conventions:
  SI units mandatory in answers, 2–3 s.f. by default, vector quantities
  need a direction, formula→substitute→evaluate working pattern, key
  formula bank (F=ma, ρ=m/V, P=IV, ΔE=mcΔθ, v=fλ, n=sin i/sin r, etc.).
- API: `listTopics` and `listExamples` now accept `subject?: "math" |
  "physics"`. listExamples uses the topicCode P-prefix to disambiguate
  Physics rows from Math rows.
- UI: Subject toggle (📐 Math / ⚛️ Physics) on both the gated
  `/igcse/app` topic picker AND the `/igcse/practice` exam page. Toggle
  resets accordion + filter state on switch so students see the new
  subject's tree cleanly. Landing page `/igcse` headline updated to
  "An AI Math & Physics teacher" and pill widened.

**Coming next:** pricing pivot to bundles (Standard Rp 799k all-subjects /
Premium Rp 1,290k with voice), TTS default flipped to OpenAI (5× cheaper,
fixes unit economics), and additional subjects (Chemistry, Biology) to
fill out the STEM bundle.

**Pricing (live):** **Rp 299k/month**, 30 hrs/month fair-use cap; free trial
**30 minutes** lifetime.
- **AI Tutor launch:** the global free bypass `TUTOR_FREE_TESTING` is now
  HARD-DISABLED in production (FREE_TESTING() returns false when
  NODE_ENV=production), so the paywall is always live; the 1-try free taster
  (FREE_LIMIT=1 Writing + 1 Speaking) is kept as the freemium funnel. Still
  delete the `TUTOR_FREE_TESTING` Railway var to avoid confusion. Confirm the
  Xendit webhook covers `TUTOR-` invoices; verify one real purchase end-to-end.
