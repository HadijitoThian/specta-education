import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import compression from "compression";
import helmet from "helmet";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerPasswordAuthRoutes } from "./passwordAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerXenditWebhook } from "../xenditWebhook";
import { processDripEmails, checkCampaignPerformanceAlerts } from "../dripCampaignService";
import { seedDefaultCampaigns } from "../dripCampaignDefaults";
import { runWeeklyPerformanceReport } from "../agentWeeklyReport";
import { runAutoParentWeeklyEmail } from "../agentParentWeeklyEmail";
import { runAdsAgent } from "../adsAgent";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function approvalResultPage(success: boolean, message: string): string {
  const icon = success ? '✅' : '❌';
  const color = success ? '#16a34a' : '#dc2626';
  const title = success ? 'Action Completed' : 'Action Failed';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} - SpecTa Education</title><style>body{margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}.card{background:#fff;border-radius:16px;padding:48px;max-width:500px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);}.icon{font-size:64px;margin-bottom:16px;}.title{font-size:24px;font-weight:700;color:${color};margin:0 0 12px;}.msg{font-size:16px;color:#333;line-height:1.6;margin:0 0 24px;}.btn{display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;}</style></head><body><div class="card"><div class="icon">${icon}</div><h1 class="title">${title}</h1><p class="msg">${message}</p><a href="https://www.spectaeducation.com/admin/agents" class="btn">Go to Agent Command Center</a></div></body></html>`;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust reverse proxy (required for req.protocol to return 'https' in production)
  app.set("trust proxy", 1);

  // ── Performance: gzip compression (reduces page size ~70%) ──
  app.use(compression());

  // ── Security headers (X-Frame-Options, CSP, HSTS, etc.) ──
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://www.googletagmanager.com",
            "https://www.google-analytics.com",
            "https://ssl.google-analytics.com",
            "https://maps.googleapis.com",
            "https://maps.gstatic.com",
            "https://cdn.jsdelivr.net",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: [
            "'self'",
            "https://www.google-analytics.com",
            "https://analytics.google.com",
            "https://www.googletagmanager.com",
            "https://maps.googleapis.com",
            "wss:",
            "ws:",
          ],
          frameSrc: ["'self'", "https://www.google.com"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow Google Maps embedding
      xFrameOptions: { action: "sameorigin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Email + password auth under /api/auth/*
  registerPasswordAuthRoutes(app);
  // Xendit payment webhook
  registerXenditWebhook(app);
  // R2 file streaming proxy. Lets us serve audio + other private files
  // from the same origin as the app (no CORS, no browser warnings on the
  // raw pub-*.r2.dev URL). Path: /files/<key/with/slashes.ext>
  app.get("/files/*", async (req, res) => {
    try {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      const key = (req.params as any)[0] as string;
      if (!key) return res.status(400).send("missing key");

      const usingR2 =
        !!process.env.R2_ACCOUNT_ID &&
        !!process.env.R2_ACCESS_KEY_ID &&
        !!process.env.R2_SECRET_ACCESS_KEY;

      const client = new S3Client(
        usingR2
          ? {
              region: "auto",
              endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID!,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
              },
            }
          : {
              region: process.env.AWS_REGION ?? "ap-southeast-1",
              credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
              },
            }
      );

      const bucket = usingR2 ? process.env.R2_BUCKET! : process.env.AWS_S3_BUCKET!;
      const obj = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );

      if (obj.ContentType) res.set("Content-Type", obj.ContentType);
      if (obj.ContentLength) res.set("Content-Length", String(obj.ContentLength));
      res.set("Accept-Ranges", "bytes");
      res.set("Cache-Control", "public, max-age=3600");

      const body = obj.Body as any;
      if (body && typeof body.pipe === "function") {
        body.pipe(res);
      } else if (body) {
        const buf = Buffer.from(await body.transformToByteArray());
        res.send(buf);
      } else {
        res.status(500).send("empty body");
      }
    } catch (err: any) {
      console.error("[/files] error", err?.message ?? err);
      res.status(404).send("not found");
    }
  });

  // IELTS sample listening audio review page (admin/internal).
  // Loads the 4 voice samples from R2 in inline HTML5 players so they can
  // be reviewed without hitting browser warnings on the raw R2 URL.
  app.get("/admin/ielts-samples", (_req, res) => {
    const samples = [
      { label: "Section 1 — Customer booking (British female)", file: "section1-customer-booking.mp3" },
      { label: "Section 2 — Sanctuary welcome (Australian male)", file: "section2-sanctuary-welcome.mp3" },
      { label: "Section 3 — Tutor discussion (British female)", file: "section3-tutor-discussion.mp3" },
      { label: "Section 4 — Economics lecture (British academic male)", file: "section4-economics-lecture.mp3" },
    ];
    const rows = samples
      .map(
        s => `
        <div style="margin:0 0 20px 0;">
          <div style="font-weight:600;margin-bottom:6px;">${s.label}</div>
          <audio controls preload="metadata" style="width:100%;max-width:560px;">
            <source src="/files/ielts/samples/${s.file}" type="audio/mpeg" />
          </audio>
        </div>`
      )
      .join("");
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8" />
<title>IELTS Listening — Voice Samples</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width:680px; margin:40px auto; padding:0 20px; color:#111; line-height:1.5; }
  h1 { font-size:22px; margin:0 0 4px; }
  p.lede { color:#666; margin:0 0 28px; }
  audio { background:#f5f5f5; border-radius:8px; }
</style>
</head><body>
<h1>IELTS Listening — Voice Samples</h1>
<p class="lede">Generated with ElevenLabs (eleven_multilingual_v2). Streamed from your storage bucket via the app server.</p>
${rows}
</body></html>`);
  });

  // Email open tracking pixel
  app.get("/api/track/open/:logId", async (req, res) => {
    try {
      const logId = parseInt(req.params.logId);
      if (!isNaN(logId)) {
        const { getDripEmailLogById, updateDripEmailLog } = await import("../db");
        const log = await getDripEmailLogById(logId);
        if (log && !log.openedAt) {
          await updateDripEmailLog(logId, { openedAt: new Date() });
        }
      }
    } catch (e) {
      // Silently fail - tracking should never break
    }
    // Return 1x1 transparent pixel
    const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.set("Content-Type", "image/gif");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.send(pixel);
  });

  // Email click tracking
  app.get("/api/track/click/:logId", async (req, res) => {
    try {
      const logId = parseInt(req.params.logId);
      const url = req.query.url as string;
      if (!isNaN(logId)) {
        const { getDripEmailLogById, updateDripEmailLog } = await import("../db");
        const log = await getDripEmailLogById(logId);
        if (log && !log.clickedAt) {
          await updateDripEmailLog(logId, { clickedAt: new Date() });
        }
      }
      res.redirect(url || "/");
    } catch (e) {
      res.redirect(req.query.url as string || "/");
    }
  });

  // Dynamic sitemap.xml for SEO
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const { listPublishedBlogPosts } = await import("../db");
      const baseUrl = "https://www.spectaeducation.com";
      
      // Static pages - all public-facing pages with SEO value
      // Excludes: /staff-login, /staff-dashboard, /admin, /unsubscribe, /simulator/experience, /simulator/report, /component-showcase
      const staticPages = [
        // Core pages (highest priority)
        { url: "/", priority: "1.0", changefreq: "weekly" },
        { url: "/about", priority: "0.8", changefreq: "monthly" },
        { url: "/ielts", priority: "0.9", changefreq: "monthly" },
        { url: "/ielts/practice", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations", priority: "0.9", changefreq: "monthly" },
        { url: "/scholarships", priority: "0.8", changefreq: "monthly" },
        { url: "/compare", priority: "0.7", changefreq: "monthly" },
        { url: "/contact", priority: "0.8", changefreq: "monthly" },
        { url: "/book", priority: "0.8", changefreq: "monthly" },
        { url: "/apply", priority: "0.7", changefreq: "monthly" },
        { url: "/blog", priority: "0.8", changefreq: "daily" },
        { url: "/articles", priority: "0.7", changefreq: "weekly" },

        // Destination country pages (high priority - these drive organic traffic)
        { url: "/malaysia", priority: "0.9", changefreq: "monthly" },
        { url: "/destinations/australia", priority: "0.9", changefreq: "monthly" },
        { url: "/destinations/singapore", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/uk", priority: "0.9", changefreq: "monthly" },
        { url: "/destinations/usa", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/canada", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/china", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/ireland", priority: "0.7", changefreq: "monthly" },
        { url: "/destinations/new-zealand", priority: "0.7", changefreq: "monthly" },
        { url: "/destinations/netherlands", priority: "0.7", changefreq: "monthly" },

        // Interactive tools (medium priority - unique differentiators)
        { url: "/country-quiz", priority: "0.7", changefreq: "monthly" },
        { url: "/aptitude-test", priority: "0.7", changefreq: "monthly" },
        { url: "/aptitude-test/pro", priority: "0.6", changefreq: "monthly" },
        { url: "/simulator", priority: "0.6", changefreq: "monthly" },
        { url: "/specta-play", priority: "0.6", changefreq: "monthly" },
        { url: "/persona", priority: "0.5", changefreq: "monthly" },

        // Utility pages (lower priority)
        { url: "/track", priority: "0.5", changefreq: "monthly" },
        { url: "/my-journey", priority: "0.5", changefreq: "monthly" },
      ];

      // Dynamic blog posts
      const { posts } = await listPublishedBlogPosts({ limit: 500 });
      const blogUrls = posts.map(post => ({
        url: `/blog/${post.slug}`,
        priority: "0.6",
        changefreq: "monthly",
        lastmod: post.updatedAt ? new Date(post.updatedAt).toISOString().split("T")[0] : undefined,
      }));

      const allPages: Array<{ url: string; priority: string; changefreq: string; lastmod?: string }> = [...staticPages, ...blogUrls];
      const today = new Date().toISOString().split("T")[0];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${baseUrl}${p.url}</loc>
    <lastmod>${p.lastmod || today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

      res.set("Content-Type", "application/xml");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (e) {
      res.status(500).send("Error generating sitemap");
    }
  });

  // ==========================================
  // Real-time visitor tracking endpoint (Feature 1)
  // Receives tracking data from frontend useVisitorTracking hook
  // ==========================================
  app.post("/api/track/visitor", async (req, res) => {
    try {
      const body = req.body;
      if (!body || !body.sessionId) {
        console.warn("[Visitor Track] Missing sessionId in body:", JSON.stringify(body).substring(0, 200));
        res.status(204).end();
        return;
      }
      const { trackVisitorBehavior } = await import("../agentLeadHunter");
      await trackVisitorBehavior(body);
      res.status(204).end();
    } catch (e) {
      console.error("[Visitor Track] Error:", e);
      res.status(204).end();
    }
  });

  // Resend inbound email webhook — receives emails at hadi@spectaeducation.com
  // Filters only replies from universities we sent outreach to
  app.post("/api/inbound/university-reply", async (req, res) => {
    try {
      // Verify Resend webhook token if set
      const webhookToken = process.env.RESEND_WEBHOOK_TOKEN;
      if (webhookToken) {
        const svixId = req.headers["svix-id"];
        const svixSignature = req.headers["svix-signature"];
        if (!svixId || !svixSignature) {
          console.warn("[InboundEmail] Missing Svix headers");
          // Still process — don't block in case headers are missing
        }
      }

      const event = req.body;
      if (!event || event.type !== "email.received") {
        res.status(200).json({ ok: true, skipped: "Not an email.received event" });
        return;
      }

      const { handleInboundUniversityReply } = await import("../agentUniversityReplyHandler");
      const result = await handleInboundUniversityReply(event);
      console.log(`[InboundEmail] Result: ${result.reason}`);
      res.status(200).json({ ok: true, ...result });
    } catch (error: any) {
      console.error("[InboundEmail] Error:", error);
      res.status(200).json({ ok: false, error: error.message }); // Always 200 to prevent Resend retries
    }
  });

  // Partnership outreach approval via email link
  app.get("/api/partnership-approval", async (req, res) => {
    try {
      const { action, id, token } = req.query as { action: string; id: string; token: string };
      if (!action || !id || !token || !['approve', 'reject'].includes(action)) {
        res.status(400).send(approvalResultPage(false, 'Invalid approval link. Please check the link in your email.'));
        return;
      }
      const { handleApprovalAction } = await import("../agentUniversityScout");
      const result = await handleApprovalAction(action as 'approve' | 'reject', parseInt(id), token);
      res.send(approvalResultPage(result.success, result.message));
    } catch (error: any) {
      console.error('[Partnership Approval] Error:', error);
      res.status(500).send(approvalResultPage(false, 'An error occurred. Please try again or use the admin dashboard.'));
    }
  });

  // ─── SSE: Real-time Team Chat ──────────────────────────────────────────────
  // Map of channel -> Set of SSE response objects
  const chatSSEClients = new Map<string, Set<any>>();
  // Map of staffEmail -> { name, lastSeen }
  const onlineStaff = new Map<string, { name: string; lastSeen: number }>();
  // Expose broadcaster so tRPC procedures can push events
  (global as any).__chatSSEClients = chatSSEClients;
  (global as any).__onlineStaff = onlineStaff;

  // SSE stream endpoint for team chat
  app.get("/api/chat/stream", (req, res) => {
    const channel = (req.query.channel as string) || "general";
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    if (!chatSSEClients.has(channel)) chatSSEClients.set(channel, new Set());
    chatSSEClients.get(channel)!.add(res);
    const heartbeat = setInterval(() => {
      try { res.write("event: ping\ndata: {}\n\n"); } catch {}
    }, 25000);
    req.on("close", () => {
      clearInterval(heartbeat);
      chatSSEClients.get(channel)?.delete(res);
    });
  });

  // Online presence: staff heartbeat endpoint
  app.post("/api/chat/presence", (req, res) => {
    const { email, name } = req.body || {};
    if (email && name) {
      onlineStaff.set(email, { name, lastSeen: Date.now() });
    }
    const now = Date.now();
    const keysToDelete: string[] = [];
    onlineStaff.forEach((v, k) => { if (now - v.lastSeen > 45000) keysToDelete.push(k); });
    keysToDelete.forEach(k => onlineStaff.delete(k));
    const online: { email: string; name: string }[] = [];
    onlineStaff.forEach((v, em) => online.push({ email: em, name: v.name }));
    res.json({ online });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Run expired conversation cleanup once on startup, then every 24 hours
    (async () => {
      try {
        const { cleanupExpiredConversations } = await import("../db");
        const deleted = await cleanupExpiredConversations(30);
        if (deleted > 0) console.log(`[Cleanup] Removed ${deleted} expired conversations (30+ days inactive)`);
      } catch (e) {
        console.error("[Cleanup] Initial cleanup failed:", e);
      }
    })();

    setInterval(async () => {
      try {
        const { cleanupExpiredConversations } = await import("../db");
        const deleted = await cleanupExpiredConversations(30);
        if (deleted > 0) console.log(`[Cleanup] Removed ${deleted} expired conversations (30+ days inactive)`);
      } catch (e) {
        console.error("[Cleanup] Scheduled cleanup failed:", e);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    // Seed default drip campaigns on first startup
    (async () => {
      try {
        await seedDefaultCampaigns();
      } catch (e) {
        console.error("[DripCampaign] Seed failed:", e);
      }
    })();

    // DRIP CAMPAIGN AUTO-SCHEDULER DISABLED
    // Campaigns must be manually triggered from the admin panel to prevent accidental bulk sends.
    // To re-enable, uncomment the setInterval block below and ensure all campaign content is reviewed.
    // setInterval(async () => {
    //   try {
    //     const result = await processDripEmails();
    //     if (result.sent > 0 || result.errors > 0) {
    //       console.log(`[DripCampaign] Processed: ${result.sent} sent, ${result.errors} errors`);
    //     }
    //   } catch (e) {
    //     console.error("[DripCampaign] Scheduled processing failed:", e);
    //   }
    // }, 60 * 60 * 1000); // Every 1 hour
    console.log("[DripCampaign] Auto-scheduler is DISABLED. Use admin panel to manually send campaigns.");

    // Check campaign performance alerts daily (every 24 hours)
    // Also run once on startup (delayed by 30 seconds to let data load)
    setTimeout(async () => {
      try {
        await checkCampaignPerformanceAlerts();
      } catch (e) {
        console.error("[DripCampaign] Initial performance check failed:", e);
      }
    }, 30 * 1000);

    setInterval(async () => {
      try {
        await checkCampaignPerformanceAlerts();
      } catch (e) {
        console.error("[DripCampaign] Scheduled performance check failed:", e);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  });
}

// Weekly CRM Performance Report — runs every Monday at 8AM WIB (checked hourly)
setInterval(async () => {
  try {
    const result = await runWeeklyPerformanceReport();
    if (result.sent) console.log("[WeeklyReport] Weekly performance report sent successfully");
  } catch (e) {
    console.error("[WeeklyReport] Scheduled run failed:", e);
  }
}, 60 * 60 * 1000);

// Auto Weekly Parent Email — runs every Monday at 9AM WIB (checked hourly)
setInterval(async () => {
  try {
    const result = await runAutoParentWeeklyEmail();
    if (result.sent > 0) console.log(`[ParentWeeklyEmail] Sent ${result.sent} parent reports (${result.errors} errors)`);
  } catch (e) {
    console.error("[ParentWeeklyEmail] Scheduled run failed:", e);
  }
}, 60 * 60 * 1000);

// AI Ads Agent — runs every 6 hours automatically
setInterval(async () => {
  try {
    const result = await runAdsAgent();
    if (result.actionsCount > 0) console.log(`[AdsAgent] Run complete: ${result.actionsCount} action(s) taken. ${result.errors.length} error(s).`);
    else console.log("[AdsAgent] Run complete: no actions needed.");
  } catch (e) {
    console.error("[AdsAgent] Scheduled run failed:", e);
  }
}, 6 * 60 * 60 * 1000); // Every 6 hours
startServer().catch(console.error);
