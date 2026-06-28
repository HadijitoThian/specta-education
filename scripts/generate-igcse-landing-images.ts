/**
 * One-off CLI: generates the IGCSE dashboard imagery via DeepInfra and
 * uploads each to R2. Same logic the admin button uses.
 *
 * Usage (in Railway Console with DEEPINFRA_API_KEY available):
 *   pnpm tsx scripts/generate-igcse-landing-images.ts
 *
 * Same R2 keys → safe to re-run; the previous images are overwritten.
 * Cost ≈ \$0.32 per full run.
 *
 * NOTE: this CLI is now mostly a convenience wrapper. The same generation
 * can be triggered from the UI: /admin → IGCSE tab → "Regenerate dashboard
 * images". No more terminal needed.
 */
import { generateIgcseDashboardImages } from "../server/igcseDashboardImages";

async function main() {
  console.log("Generating IGCSE dashboard images…\n");
  const result = await generateIgcseDashboardImages({ subset: "all" });
  console.log("");
  for (const r of result.results) {
    if (r.ok) {
      console.log(`  OK   ${r.key}   ${(r.bytes! / 1024).toFixed(0)} KB   → /files/${r.key}`);
    } else {
      console.log(`  FAIL ${r.key}   ${r.error}`);
    }
  }
  console.log(`\n${result.state.toUpperCase()} — ${result.results.filter(r => r.ok).length}/${result.total} succeeded.`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
