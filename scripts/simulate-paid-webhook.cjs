/**
 * Simulate a Xendit "PAID" webhook for the most recent awaiting-payment IELTS
 * attempt — so we can verify the full automated flow (webhook -> mark paid ->
 * buyer "Start my test" email) WITHOUT spending real money.
 *
 * Prereq: create ONE attempt via the buy form on the site (fill name/email,
 * click buy) and then CLOSE the Xendit page WITHOUT paying. That leaves an
 * "awaiting_payment" attempt for this script to confirm.
 *
 * Run in the Railway Console:
 *   node scripts/simulate-paid-webhook.cjs
 */
const mysql = require("mysql2/promise");

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await c.query(
    "SELECT a.paymentRef, a.attemptToken, a.status, u.email " +
      "FROM ieltsMockAttempts a JOIN users u ON u.id = a.userId " +
      "WHERE a.status = 'awaiting_payment' AND a.paymentRef LIKE 'IELTS-MOCK-%' " +
      "ORDER BY a.createdAt DESC LIMIT 1"
  );
  await c.end();
  const a = rows[0];
  if (!a) {
    console.log(
      "No awaiting_payment attempt found.\n" +
        "→ Go to the site, fill the buy form, click buy, then CLOSE the Xendit page WITHOUT paying. Re-run this."
    );
    return;
  }

  console.log("Simulating Xendit PAID webhook for:");
  console.log("  external_id :", a.paymentRef);
  console.log("  buyer email :", a.email);

  const port = process.env.PORT || 8080;
  const token = process.env.XENDIT_WEBHOOK_TOKEN || "";
  const res = await fetch(`http://localhost:${port}/api/xendit/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-callback-token": token },
    body: JSON.stringify({
      external_id: a.paymentRef,
      status: "PAID",
      id: "TEST-SIMULATED-" + Date.now(),
    }),
  });
  const body = await res.text();
  console.log("\nWebhook HTTP:", res.status, body);
  console.log(
    res.ok
      ? "\n✅ If response shows ielts:true → attempt marked PAID + buyer emailed the start link."
      : "\n❌ Webhook rejected — check XENDIT_WEBHOOK_TOKEN is set (401 = token mismatch)."
  );
  console.log(
    "\nTake link (also emailed to the buyer):\n  https://www.spectaeducation.com/ielts/mock-test/take/" +
      a.attemptToken
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
