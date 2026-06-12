/**
 * Scan every table's text/char/json columns for leftover "manuscdn" URLs
 * stored as DATA (e.g. seeded article images). Run in the Railway Console:
 *
 *   node scripts/scan-manus-db.cjs
 *
 * Prints "table.column: N" for any hit, or "CLEAN" if none — i.e. nothing in
 * the database depends on Manus and it's safe to delete.
 */
const mysql = require("mysql2/promise");

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  const [tables] = await c.query("SHOW TABLES");
  const tkey = Object.keys(tables[0] || {})[0];
  let hits = 0;

  for (const row of tables) {
    const tbl = row[tkey];
    let cols;
    try {
      [cols] = await c.query("SHOW COLUMNS FROM `" + tbl + "`");
    } catch {
      continue;
    }
    const textCols = cols
      .filter(col => /char|text|json|enum/i.test(col.Type))
      .map(col => col.Field);

    for (const col of textCols) {
      try {
        const [r] = await c.query(
          "SELECT COUNT(*) AS n FROM `" + tbl + "` WHERE `" + col + "` LIKE ?",
          ["%manuscdn%"]
        );
        if (r[0].n > 0) {
          console.log(`HIT  ${tbl}.${col}: ${r[0].n} row(s)`);
          hits += r[0].n;
        }
      } catch {
        /* skip columns that can't be LIKE-compared */
      }
    }
  }

  console.log(hits === 0 ? "\nCLEAN — no manuscdn URLs in the database." : `\nTotal hits: ${hits}`);
  await c.end();
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
