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
- **AI Tutor launch:** the global free bypass `TUTOR_FREE_TESTING` is now
  HARD-DISABLED in production (FREE_TESTING() returns false when
  NODE_ENV=production), so the paywall is always live; the 1-try free taster
  (FREE_LIMIT=1 Writing + 1 Speaking) is kept as the freemium funnel. Still
  delete the `TUTOR_FREE_TESTING` Railway var to avoid confusion. Confirm the
  Xendit webhook covers `TUTOR-` invoices; verify one real purchase end-to-end.
