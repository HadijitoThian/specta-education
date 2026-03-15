import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerXenditWebhook } from "../xenditWebhook";
import { processDripEmails, checkCampaignPerformanceAlerts } from "../dripCampaignService";
import { seedDefaultCampaigns } from "../dripCampaignDefaults";

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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Xendit payment webhook
  registerXenditWebhook(app);
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

    // Process drip campaign emails every hour
    setInterval(async () => {
      try {
        const result = await processDripEmails();
        if (result.sent > 0 || result.errors > 0) {
          console.log(`[DripCampaign] Processed: ${result.sent} sent, ${result.errors} errors`);
        }
      } catch (e) {
        console.error("[DripCampaign] Scheduled processing failed:", e);
      }
    }, 60 * 60 * 1000); // Every 1 hour

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

startServer().catch(console.error);
