/**
 * Generate sitemap.xml for SpecTa Education
 * Run with: node scripts/generate-sitemap.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://spectaeducation.com';

// Public pages that should be indexed
const routes = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/about', priority: 0.8, changefreq: 'monthly' },
  { path: '/ielts', priority: 0.9, changefreq: 'weekly' },
  { path: '/scholarships', priority: 0.9, changefreq: 'weekly' },
  { path: '/destinations', priority: 0.8, changefreq: 'monthly' },
  { path: '/destinations/uk', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/usa', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/australia', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/canada', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/singapore', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/malaysia', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/china', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/japan', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/south-korea', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/germany', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/france', priority: 0.7, changefreq: 'monthly' },
  { path: '/destinations/netherlands', priority: 0.7, changefreq: 'monthly' },
  { path: '/contact', priority: 0.6, changefreq: 'monthly' },
  { path: '/compare', priority: 0.5, changefreq: 'monthly' },
  { path: '/quiz', priority: 0.8, changefreq: 'monthly' },
  { path: '/test/pro', priority: 0.9, changefreq: 'weekly' },
  { path: '/track', priority: 0.6, changefreq: 'monthly' },
  { path: '/book-consultation', priority: 0.7, changefreq: 'monthly' },
];

function generateSitemap() {
  const now = new Date().toISOString();
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  const publicDir = path.join(__dirname, '../client/public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
  console.log('✅ Sitemap generated at client/public/sitemap.xml');
  console.log(`📄 ${routes.length} URLs included`);
}

generateSitemap();
