/**
 * Dedicated key/value flag store — the "have we already sent today's email?"
 * marker (and any similar single-value state) needs to survive Railway
 * redeploys. Earlier we tried piggybacking on growth_digests.periodLabel but:
 *
 *   1) periodLabel is NOT a UNIQUE column → ON DUPLICATE KEY UPDATE never
 *      fires → every writeFlag() INSERTed a duplicate row.
 *   2) The INSERT statement referenced columns (wins, todos, spendTotal) that
 *      don't exist on the growth_digests schema → the INSERT failed every
 *      time → the try/catch swallowed the error → marker was NEVER persisted.
 *
 * Result: two ads-related "daily digest" emailers both spammed the owner
 * on every deploy. This module is the proper fix — a dedicated table where
 * `key` is a real PRIMARY KEY.
 */
import { sql } from "drizzle-orm";
import { getDb } from "./db";

export async function ensureSystemFlagsSchema(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_flags (
        flagKey VARCHAR(200) PRIMARY KEY,
        flagValue VARCHAR(500) NOT NULL DEFAULT '',
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e) {
    console.error("[systemFlags] schema init failed:", (e as Error).message);
  }
}

export async function readFlag(key: string): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "";
    const rows: any = await db.execute(sql`
      SELECT flagValue FROM system_flags WHERE flagKey = ${key} LIMIT 1
    `);
    const list: any[] = Array.isArray(rows[0]) ? rows[0] : rows;
    return list?.[0]?.flagValue || "";
  } catch { return ""; }
}

export async function writeFlag(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    // `flagKey` IS the PRIMARY KEY here so ON DUPLICATE KEY UPDATE actually
    // works — unlike the earlier attempt on growth_digests.periodLabel.
    await db.execute(sql`
      INSERT INTO system_flags (flagKey, flagValue) VALUES (${key}, ${value})
      ON DUPLICATE KEY UPDATE flagValue = ${value}
    `);
  } catch (e) {
    console.warn("[systemFlags] writeFlag failed for", key, ":", (e as Error).message);
  }
}
