/**
 * Remove duplicate blog DRAFTS created by the auto-producer spam.
 *
 * Groups posts by target keyword (fallback: title). For each group with more
 * than one post, it KEEPS one (a published one if any, otherwise the newest)
 * and DELETES the rest — but ONLY if they are drafts. Published posts are never
 * deleted. Prints a summary; safe to run again (idempotent).
 *
 *   node scripts/dedupe-blog.cjs            # dry run (shows what it would do)
 *   node scripts/dedupe-blog.cjs --apply    # actually delete
 */
const mysql = require("mysql2/promise");

(async () => {
  const apply = process.argv.includes("--apply");
  const c = await mysql.createConnection({ uri: process.env.DATABASE_URL, charset: "utf8mb4" });

  const [posts] = await c.query(
    "SELECT id, title, slug, status, targetKeyword, createdAt, publishedAt FROM blog_posts ORDER BY createdAt ASC"
  );

  const groups = new Map();
  for (const p of posts) {
    const key = (p.targetKeyword || p.title || "").toString().trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const toDelete = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    // Prefer to keep a published post; else keep the newest.
    const published = list.filter(p => p.status === "published");
    let keep;
    if (published.length) {
      keep = published.sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))[0];
    } else {
      keep = list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    }
    for (const p of list) {
      if (p.id === keep.id) continue;
      if (p.status === "draft") toDelete.push(p); // only ever delete drafts
    }
    console.log(`\nKeyword "${key}" (${list.length} posts) → keep #${keep.id} [${keep.status}] "${keep.title}"`);
  }

  console.log(`\n${toDelete.length} duplicate DRAFT(s) to delete.`);
  for (const p of toDelete) console.log(`  - #${p.id} "${p.title}"`);

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to delete.");
    await c.end();
    return;
  }
  if (toDelete.length) {
    const ids = toDelete.map(p => p.id);
    await c.query(`DELETE FROM blog_post_tags WHERE postId IN (${ids.map(() => "?").join(",")})`, ids).catch(() => {});
    await c.query(`DELETE FROM blog_posts WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
    console.log(`\nDeleted ${ids.length} duplicate drafts.`);
  }
  await c.end();
})().catch(e => { console.error("Failed:", e.message); process.exit(1); });
