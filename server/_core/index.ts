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
      
      // Static pages
      const staticPages = [
        { url: "/", priority: "1.0", changefreq: "weekly" },
        { url: "/destinations/australia", priority: "0.9", changefreq: "monthly" },
        { url: "/destinations/malaysia", priority: "0.9", changefreq: "monthly" },
        { url: "/destinations/uk", priority: "0.9", changefreq: "monthly" },
        { url: "/destinations/usa", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/canada", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/new-zealand", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/singapore", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/japan", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/south-korea", priority: "0.8", changefreq: "monthly" },
        { url: "/destinations/germany", priority: "0.8", changefreq: "monthly" },
        { url: "/ielts", priority: "0.9", changefreq: "monthly" },
        { url: "/scholarships", priority: "0.8", changefreq: "monthly" },
        { url: "/country-quiz", priority: "0.7", changefreq: "monthly" },
        { url: "/specta-play", priority: "0.7", changefreq: "monthly" },
        { url: "/blog", priority: "0.8", changefreq: "daily" },
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
