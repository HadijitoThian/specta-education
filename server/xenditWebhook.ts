import { Express, Request, Response } from "express";
import { verifyWebhookToken, isTutorExternalId, TUTOR_PLANS, isIgcseExternalId, IGCSE_PLANS } from "./xenditService";
import { getAccessTokenByToken, createAccessTokens, getAptitudeProOrderByExternalId, updateAptitudeProOrderStatus, getTutorSubscriptionByInvoice, updateTutorSubscription, getIgcseSubscriptionByInvoice, updateIgcseSubscription } from "./db";
import { sendProAccessLinkEmail, sendPaymentConfirmationEmail } from "./resendService";
import { notifyOwner } from "./_core/notification";
import {
  isIeltsMockExternalId,
  markIeltsAttemptPaid,
  markIeltsAttemptFailed,
} from "./ieltsMockService";
import crypto from "crypto";

/**
 * Register the Xendit webhook endpoint on the Express app.
 * This must be called BEFORE the Vite/static middleware so the route is reachable.
 */
export function registerXenditWebhook(app: Express) {
  app.post("/api/xendit/webhook", async (req: Request, res: Response) => {
    try {
      // Verify webhook token
      const callbackToken = req.headers["x-callback-token"] as string;
      if (!callbackToken || !verifyWebhookToken(callbackToken)) {
        console.error("[Xendit Webhook] Invalid callback token");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const body = req.body;
      console.log("[Xendit Webhook] Received:", JSON.stringify(body, null, 2));

      const externalId = body.external_id;

      // Branch: IELTS Mock Test purchases are handled separately from
      // Tes Bakat AI Pro purchases. They use the IELTS-MOCK- prefix on
      // external_id.
      if (isIeltsMockExternalId(externalId)) {
        if (body.status === "PAID" || body.status === "SETTLED") {
          const result = await markIeltsAttemptPaid(externalId, body.id);
          if (!result) {
            console.error(`[Xendit Webhook][IELTS] Attempt not found: ${externalId}`);
            return res.status(404).json({ error: "Attempt not found" });
          }
          return res.status(200).json({
            received: true,
            ielts: true,
            already_processed: result.alreadyProcessed,
          });
        }
        if (body.status === "EXPIRED" || body.status === "FAILED") {
          await markIeltsAttemptFailed(externalId);
        }
        return res.status(200).json({ received: true, ielts: true });
      }

      // Branch: AI IELTS Tutor subscriptions (TUTOR- prefix).
      if (isTutorExternalId(externalId)) {
        if (body.status === "PAID" || body.status === "SETTLED") {
          const sub = await getTutorSubscriptionByInvoice(externalId);
          if (!sub) {
            console.error(`[Xendit Webhook][Tutor] Subscription not found: ${externalId}`);
            return res.status(404).json({ error: "Subscription not found" });
          }
          if (sub.status === "active") {
            return res.status(200).json({ received: true, tutor: true, already_processed: true });
          }
          const plan = TUTOR_PLANS[sub.plan as keyof typeof TUTOR_PLANS];
          const days = plan?.days ?? 30;
          const startsAt = new Date();
          const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          await updateTutorSubscription(sub.id, {
            status: "active",
            xenditInvoiceId: body.id || externalId,
            startsAt,
            expiresAt,
          });
          await notifyOwner({
            title: `💎 New AI IELTS Tutor subscription: ${plan?.label || sub.plan}`,
            content: `Lead #${sub.leadId} activated ${plan?.label || sub.plan}. Expires ${expiresAt.toISOString().slice(0, 10)}. Order: ${externalId}`,
          });
          console.log(`[Xendit Webhook][Tutor] Subscription activated: ${externalId}`);
          return res.status(200).json({ received: true, tutor: true, success: true });
        }
        if (body.status === "EXPIRED" || body.status === "FAILED") {
          const sub = await getTutorSubscriptionByInvoice(externalId);
          if (sub && sub.status !== "active") {
            await updateTutorSubscription(sub.id, { status: "cancelled" });
          }
        }
        return res.status(200).json({ received: true, tutor: true });
      }

      // Branch: IGCSE AI Teacher subscriptions (IGCSE- prefix).
      if (isIgcseExternalId(externalId)) {
        if (body.status === "PAID" || body.status === "SETTLED") {
          const sub = await getIgcseSubscriptionByInvoice(externalId);
          if (!sub) {
            console.error(`[Xendit Webhook][IGCSE] Subscription not found: ${externalId}`);
            return res.status(404).json({ error: "Subscription not found" });
          }
          if (sub.status === "active") {
            return res.status(200).json({ received: true, igcse: true, already_processed: true });
          }
          const plan = IGCSE_PLANS[sub.plan as keyof typeof IGCSE_PLANS];
          const days = plan?.days ?? 30;
          const startsAt = new Date();
          const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
          await updateIgcseSubscription(sub.id, {
            status: "active",
            xenditInvoiceId: body.id || externalId,
            startsAt,
            expiresAt,
          });
          await notifyOwner({
            title: `🎓 New IGCSE AI Teacher subscription: ${plan?.label || sub.plan}`,
            content: `Lead #${sub.leadId} activated ${plan?.label || sub.plan}. Expires ${expiresAt.toISOString().slice(0, 10)}. Order: ${externalId}`,
          });
          console.log(`[Xendit Webhook][IGCSE] Subscription activated: ${externalId}`);
          return res.status(200).json({ received: true, igcse: true, success: true });
        }
        if (body.status === "EXPIRED" || body.status === "FAILED") {
          const sub = await getIgcseSubscriptionByInvoice(externalId);
          if (sub && sub.status !== "active") {
            await updateIgcseSubscription(sub.id, { status: "cancelled" });
          }
        }
        return res.status(200).json({ received: true, igcse: true });
      }

      // ----- Tes Bakat AI Pro purchases (existing path) -----

      // We only care about invoice paid events
      if (body.status !== "PAID" && body.status !== "SETTLED") {
        // Handle expired/failed
        if (body.status === "EXPIRED" || body.status === "FAILED") {
          if (externalId) {
            await updateAptitudeProOrderStatus(externalId, body.status === "EXPIRED" ? "expired" : "failed");
          }
        }
        return res.status(200).json({ received: true });
      }

      if (!externalId) {
        console.error("[Xendit Webhook] No external_id in payload");
        return res.status(400).json({ error: "Missing external_id" });
      }

      // Check if order exists
      const order = await getAptitudeProOrderByExternalId(externalId);
      if (!order) {
        console.error(`[Xendit Webhook] Order not found: ${externalId}`);
        return res.status(404).json({ error: "Order not found" });
      }

      // Skip if already processed
      if (order.status === "paid") {
        console.log(`[Xendit Webhook] Order already processed: ${externalId}`);
        return res.status(200).json({ received: true, already_processed: true });
      }

      // Generate a single-use access token (valid for 7 days)
      const tokenValue = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const [createdToken] = await createAccessTokens([{
        token: tokenValue,
        status: "unused",
        expiresAt,
      }]);

      // Update order status
      await updateAptitudeProOrderStatus(externalId, "paid", {
        xenditInvoiceId: body.id,
        paidAt: new Date(),
        accessTokenId: createdToken?.id,
      });

      // Determine base URL for the access link
      const baseUrl = process.env.VITE_APP_URL || (process.env.NODE_ENV === "production" ? "https://spectaeducation.com" : "http://localhost:3000");

      // Send access link email via Resend
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
        orderId: externalId,
      });

      // Notify owner
      const formattedAmount = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(order.amount);

      await notifyOwner({
        title: `💰 New Pro Test Purchase: ${order.customerName}`,
        content: `${order.customerName} (${order.customerEmail}) just purchased Tes Bakat AI Pro for ${formattedAmount}. Access link has been sent automatically. Order: ${externalId}`,
      });

      console.log(`[Xendit Webhook] Payment processed successfully for ${externalId}`);
      return res.status(200).json({ received: true, success: true });
    } catch (err) {
      console.error("[Xendit Webhook] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}
