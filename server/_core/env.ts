export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Public base URL of the app. Used to build OAuth redirect URIs and
  // absolute links in emails. Local: http://localhost:5173.
  appUrl: process.env.APP_URL ?? "http://localhost:5173",

  // ----- Auth: Google OAuth ----------------------------------------------
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // Email of the user automatically granted admin role on first login.
  ownerEmail: process.env.OWNER_EMAIL ?? "",

  // ----- LLM: DeepSeek ---------------------------------------------------
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",

  // ----- Speech-to-text: OpenAI Whisper ----------------------------------
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",

  // ----- Image generation: DeepInfra FLUX --------------------------------
  deepinfraApiKey: process.env.DEEPINFRA_API_KEY ?? "",
  deepinfraImageModel:
    process.env.DEEPINFRA_IMAGE_MODEL ?? "black-forest-labs/FLUX-1-schnell",

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
};
