export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Public base URL of the app. Used to build OAuth redirect URIs and
  // absolute links in emails. Local: http://localhost:5173.
  // Always normalised to include a scheme — if APP_URL is set without
  // "https://", external redirects (Xendit) and email links break.
  //
  // Resolution order (first non-empty wins):
  //   1. APP_URL       — canonical server-side env
  //   2. VITE_APP_URL  — historically the only one set on Railway
  //   3. https://www.spectaeducation.com in production, http://localhost:5173 in dev
  //
  // Why the fallback matters: if only VITE_APP_URL is set on Railway (which
  // was the case as of Aug 2026), any code path that read process.env.APP_URL
  // directly — e.g. the "Send a Pro access link by email" admin action, or
  // the staff password-reset link builder — would silently emit links
  // pointing at http://localhost:5173, which error instantly when the
  // recipient clicks them. Bennardo Lukman incident.
  appUrl: (() => {
    const raw = (process.env.APP_URL || process.env.VITE_APP_URL || "").trim();
    const fallback = process.env.NODE_ENV === "production"
      ? "https://www.spectaeducation.com"
      : "http://localhost:5173";
    const u = (raw || fallback).replace(/\/+$/, "");
    return /^https?:\/\//i.test(u) ? u : `https://${u}`;
  })(),

  // ----- Auth: Email + password ------------------------------------------
  // Email of the user automatically granted admin role on signup.
  ownerEmail: process.env.OWNER_EMAIL ?? "",

  // ----- LLM: DeepSeek ---------------------------------------------------
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",

  // ----- Speech-to-text: OpenAI Whisper ----------------------------------
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",

  // ----- Text-to-speech: ElevenLabs --------------------------------------
  // Used for IELTS mock test:
  //   - Listening sections: generate audio once, store in R2, serve forever
  //   - Speaking live agent: examiner voice (streamed during test)
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  // Default examiner voice (overridable per test/section).
  // Pre-picked voices for IELTS authenticity:
  //   - British female: "EXAVITQu4vr4xnSDxMaL" (Bella)
  //   - British male:   "ErXwobaYiN019PkySvjV" (Antoni)
  //   - Australian male: "VR6AewLTigWG4xSOukaG" (Arnold)
  //   - American academic: "21m00Tcm4TlvDq8ikWAM" (Rachel)
  elevenLabsDefaultVoiceId:
    process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL",
  // eleven_turbo_v2_5 is the lowest-latency model (good for live speaking).
  // eleven_multilingual_v2 is higher quality (good for listening sections).
  elevenLabsModelId:
    process.env.ELEVENLABS_MODEL_ID ?? "eleven_turbo_v2_5",

  // ----- Image generation: DeepInfra FLUX --------------------------------
  deepinfraApiKey: process.env.DEEPINFRA_API_KEY ?? "",
  // FLUX-1.1-pro = highest quality, ~$0.04/img (best for landing pages).
  // FLUX-1-dev   = ~$0.005/img.
  // FLUX-1-schnell = ~$0.0005/img, fastest but lower quality.
  deepinfraImageModel:
    process.env.DEEPINFRA_IMAGE_MODEL ?? "black-forest-labs/FLUX-1.1-pro",

  // ----- Object storage: Cloudflare R2 (S3-compatible) -------------------
  // Falls back to AWS S3 if R2_* are blank and AWS_* are set.
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "",
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? "",
  awsRegion: process.env.AWS_REGION ?? "ap-southeast-1",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  awsS3PublicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL ?? "",

  // ----- Email -----------------------------------------------------------
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: parseInt(process.env.SMTP_PORT ?? "587", 10),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "noreply@spectaeducation.com",
  resendApiKey: process.env.RESEND_API_KEY ?? "",

  // ----- Payments: Xendit ------------------------------------------------
  xenditSecretKey: process.env.XENDIT_SECRET_KEY ?? "",
  xenditWebhookToken: process.env.XENDIT_WEBHOOK_TOKEN ?? "",

  // ----- IELTS Mock Test free trial --------------------------------------
  // Comma-separated test codes that bypass payment entirely. Used for
  // internal staff testing before launch. Set FREE_TRIAL_TEST_CODES=ACAD-001
  // in Railway to make ACAD-001 free; clear or remove to make it paid again.
  freeTrialTestCodes: (process.env.FREE_TRIAL_TEST_CODES ?? "")
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0),
};
