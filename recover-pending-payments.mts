/**
 * Recovery script to manually process pending Pro test payments
 * Run this ONCE to send access links to customers who paid but didn't receive links
 */

import { db } from "./server/db.js";
import { aptitudeProOrders, aptitudeAccessTokens } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";
import { sendProAccessLinkEmail, sendPaymentConfirmationEmail } from "./server/resendService.js";
import { notifyOwner } from "./server/_core/notification.js";
import crypto from "crypto";

async function recoverPendingPayments() {
  console.log("[Recovery] Starting recovery of pending payments...");

  // Get all pending orders
  const pendingOrders = await db
    .select()
    .from(aptitudeProOrders)
    .where(eq(aptitudeProOrders.status, "pending"));

  console.log(`[Recovery] Found ${pendingOrders.length} pending orders`);

  if (pendingOrders.length === 0) {
    console.log("[Recovery] No pending orders to process");
    return;
  }

  const baseUrl = process.env.VITE_APP_URL || "https://spectaeducation.com";

  for (const order of pendingOrders) {
    console.log(`\n[Recovery] Processing order: ${order.externalId}`);
    console.log(`  Customer: ${order.customerName} (${order.customerEmail})`);

    try {
      // Generate a single-use access token (valid for 7 days)
      const tokenValue = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Create access token
      const [createdToken] = await db.insert(aptitudeAccessTokens).values({
        token: tokenValue,
        status: "unused",
        expiresAt,
      });

      // Update order status to paid
      await db
        .update(aptitudeProOrders)
        .set({
          status: "paid",
          paidAt: new Date(),
          accessTokenId: createdToken.insertId,
        })
        .where(eq(aptitudeProOrders.id, order.id));

      // Send access link email
      await sendProAccessLinkEmail({
        to: order.customerEmail,
        customerName: order.customerName,
        token: tokenValue,
        baseUrl,
      });

      // Send payment confirmation email
      await sendPaymentConfirmationEmail({
        to: order.customerEmail,
        customerName: order.customerName,
        amount: order.amount,
        orderId: order.externalId,
      });

      // Notify owner
      const formattedAmount = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(order.amount);

      await notifyOwner({
        title: `🔧 Recovered Pro Test Payment: ${order.customerName}`,
        content: `Manually processed payment for ${order.customerName} (${order.customerEmail}) - ${formattedAmount}. Access link sent. Order: ${order.externalId}`,
      });

      console.log(`  ✅ Successfully processed and sent access link`);
    } catch (error) {
      console.error(`  ❌ Error processing order ${order.externalId}:`, error);
    }
  }

  console.log(`\n[Recovery] Recovery complete!`);
  process.exit(0);
}

recoverPendingPayments().catch((err) => {
  console.error("[Recovery] Fatal error:", err);
  process.exit(1);
});
