import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { injectSeoMetaAsync } from "../seoMetaInjector";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      // Inject page-specific SEO meta tags before Vite transforms
      template = await injectSeoMetaAsync(template, url);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Hashed assets (JS/CSS bundles with content hash) get 1-year immutable cache.
  // Safe because Vite appends a content hash to every filename on build.
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year in ms
    immutable: true,
    etag: false,
    lastModified: false,
  }));

  // Other static files (images, fonts, favicon) get 7-day cache
  app.use(express.static(distPath, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    etag: true,
    lastModified: true,
  }));

  // fall through to index.html if the file doesn't exist
  // Inject page-specific SEO meta tags for production
  app.use("*", async (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    let html = fs.readFileSync(indexPath, "utf-8");
    html = await injectSeoMetaAsync(html, req.originalUrl);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });
}
