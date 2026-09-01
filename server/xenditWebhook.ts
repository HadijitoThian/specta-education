import { Express, Request, Response } from "express";
import { verifyWebhookToken, isTutorExternalId, TUTOR_PLANS, isIgcseExternalId, IGCSE_PLANS, isBundleExternalId, isVoiceCloneExternalId } from "./xenditService";
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
 * Fire-and-forget: record a WhatsApp-tracked conversion and (if we captured a
 * GCLID at click time) upload the offline conversion to Google Ads so Smart
 * Bidding sees the eventual payment attributed back to the original ad click.
 *
 * Safe to call for any lead — if the lead never came through a /wa/:code
 * link, recordConversion returns null and this is a silent no-op.
 */
function fireOfflineConversion(
  leadId: number,
  kind: "mockTest" | "tutor" | "igcse",
  valueIdr: number,
): void {
  (async () => {
    try {
      const { recordConversion, uploadOfflineConversion } = await import("./waAttribution");
      const record = await recordConversion({ leadId, conversionKind: kind, valueIdr });
      if (!record) return; // no wa_session tied to this lead
      if (!record.gclid) return; // came via WhatsApp but not from a paid ad click
      const result = await uploadOfflineConversion({
        sessionId: record.sessionId,
        gclid: record.gclid,
        conversionKind: kind,
        valueIdr,
      });
      if (result.ok) {
        console.log(`[wa offline] uploaded ${kind} conversion Rp ${valueIdr} for session ${record.sessionId}`);
      } else {
        console.warn(`[wa offline] upload failed for ${record.sessionId}: ${result.error}`);
      }
    } catch (e) {
      console.error("[wa offline] error:", (e as Error).message);
    }
  })();
}

/**
 * Fire-and-forget: upload a Google Ads offline conversion for a DIRECT-WEB
 * checkout (where the buyer went straight from ad → landing → purchase,
 * NOT through WhatsApp). Reads GCLID from the payment entity's own attribution
 * columns, which we now capture at checkout time.
 *
 * This is the fix for the "Google Ads shows zero conversions" problem:
 * browser-side gtag misses ~30-50% of payments (adblockers, mobile banking
 * apps, students who close the tab). Server-side upload catches all of them.
 *
 * Google Ads dedupes uploads by (gclid + conversionAction + gclidDateTime)
 * PLUS orderId, so this safely coexists with browser-side firing AND the
 * WhatsApp path — the same payment can trigger both without double-counting.
 *
 * conversionUploadedAt is stamped on success so webhook retries don't re-fire.
 */
function fireWebCheckoutConversion(input: {
  table: "mock" | "tutor" | "igcse" | "aptitudePro" | "iqDiscovery";
  entityId: number;
  gclid?: string | null;
  valueIdr: number;
  orderId: string;
}): void {
  (async () => {
    try {
      if (!input.gclid) return; // no ad click to attribute back to
      const { uploadOfflineConversion } = await import("./googleAdsApi");
      const kindByTable = {
        mock: "Mock Test purchased",
        tutor: "AI Tutor subscribed",
        igcse: "IGCSE subscribed",
        aptitudePro: "Tes Bakat AI Pro purchased",
        iqDiscovery: "IQ Discovery purchased",
      } as const;
      const result = await uploadOfflineConversion({
        kind: kindByTable[input.table],
        gclid: input.gclid,
        valueIdr: input.valueIdr,
        occurredAt: new Date(),
        orderId: input.orderId,
      });
      if (!result.uploaded) return; // uploader logs the reason
      // Stamp the payment entity so retries don't re-fire.
      try {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return;
        const { sql } = await import("drizzle-orm");
        const tableName =
          input.table === "mock" ? "ieltsMockAttempts" :
          input.table === "tutor" ? "tutor_subscriptions" :
          input.table === "aptitudePro" ? "aptitudeProOrders" :
          input.table === "iqDiscovery" ? "iq_orders" :
          "igcse_subscriptions";
        await db.execute(sql.raw(
          `UPDATE ${tableName} SET conversionUploadedAt = NOW() WHERE id = ${input.entityId}`
        ));
      } catch { /* stamp is best-effort — dedup key already covers double-firing */ }
    } catch (e) {
      console.error("[web offline] error:", (e as Error).message);
    }
  })();
}

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

      // Branch: VOICE CLONE — Rp 49k post-Mock-Test upsell. On paid,
      // marks the session paid + kicks off the ElevenLabs pipeline in
      // the background (frontend polls getVoiceCloneSession for status).
      if (isVoiceCloneExternalId(externalId)) {
        if (body.status === "PAID" || body.status === "SETTLED") {
          try {
            const { getDb } = await import("./db");
            const db = await getDb();
            if (!db) return res.status(500).json({ error: "DB unavailable" });
            const { sql } = await import("drizzle-orm");
            const rows: any = await db.execute(sql`
              SELECT * FROM voice_clone_sessions WHERE xenditExternalId = ${externalId} LIMIT 1
            `);
            const list = Array.isArray(rows[0]) ? rows[0] : rows;
            const session = list[0];
            if (!session) {
              console.error(`[Xendit Webhook][VoiceClone] Session not found: ${externalId}`);
              return res.status(404).json({ error: "Session not found" });
            }
            if (session.status === "ready" || session.status === "processing") {
              return res.status(200).json({ received: true, voiceClone: true, already_processed: true });
            }
            const sessionId = session.id;

            // Mark paid. For STANDALONE mode, don't start processing yet —
            // user still needs to record 3 questions on /voice-clone/record/[token].
            // For FROM_MOCK mode, kick off processing immediately since audio
            // already exists from their completed Mock Test.
            const isStandalone = session.mode === "standalone";
            await db.execute(sql`
              UPDATE voice_clone_sessions
              SET status = ${isStandalone ? "pending" : "processing"},
                  paidAt = NOW(),
                  xenditInvoiceId = ${body.id || externalId}
              WHERE id = ${sessionId}
            `);

            if (isStandalone) {
              // Standalone: don't process yet. User will trigger via
              // finalizeStandaloneRecordings after uploading all 3 recordings.
              await notifyOwner({
                title: `🎙️ Voice Clone (standalone) paid: ${session.customerName}`,
                content: `Session ${sessionId} paid Rp ${session.amountIdr}. User will now record 3 questions at /voice-clone/record/${session.sessionToken}.`,
              }).catch(() => {});
              return res.status(200).json({ received: true, voiceClone: true, standalone: true });
            }

            // From-Mock mode: fire-and-forget the actual cloning pipeline (30-90s)
            const attemptId = session.attemptId as number;
            void (async () => {
              try {
                const { runVoiceCloneForAttempt } = await import("./voiceCloneService");
                const result = await runVoiceCloneForAttempt(attemptId);
                await db.execute(sql`
                  UPDATE voice_clone_sessions SET
                    status = 'ready',
                    processedAt = NOW(),
                    elevenLabsVoiceId = ${result.voiceId},
                    targetedPartNumber = ${result.targetedPartNumber},
                    originalTranscript = ${result.originalTranscript},
                    originalAudioKey = ${result.originalAudioKey || null},
                    band8Transcript = ${result.band8Transcript},
                    band8AudioKey = ${result.band8AudioKey},
                    changesSummary = ${result.changesSummary},
                    partsJson = ${JSON.stringify(result.parts)},
                assessmentJson = ${JSON.stringify(result.assessment)},
                pdfKey = ${result.pdfKey || null}
                  WHERE id = ${sessionId}
                `);
                console.log(`[VoiceClone] Session ${sessionId} READY (paid, ${result.parts.length} parts)`);
                await notifyOwner({
                  title: `🎙️ Voice Clone sold + delivered: ${session.customerName}`,
                  content: `Session ${sessionId} for attempt ${attemptId}. ${result.parts.length} parts rewritten (weakest = Part ${result.targetedPartNumber}). Voice ${result.voiceId}. Rp ${session.amountIdr}.`,
                }).catch(() => {});
              } catch (e) {
                await db.execute(sql`
                  UPDATE voice_clone_sessions SET status = 'failed', errorMessage = ${(e as Error).message}
                  WHERE id = ${sessionId}
                `);
                console.error(`[VoiceClone] Session ${sessionId} FAILED:`, e);
                await notifyOwner({
                  title: `🚨 Voice Clone FAILED after payment: ${session.customerName}`,
                  content: `Session ${sessionId} attempt ${attemptId}. Error: ${(e as Error).message}. Customer paid Rp ${session.amountIdr} — refund or retry needed.`,
                }).catch(() => {});
              }
            })();

            return res.status(200).json({ received: true, voiceClone: true });
          } catch (e) {
            console.error("[Xendit Webhook][VoiceClone] activation failed:", e);
            return res.status(500).json({ error: (e as Error).message });
          }
        }
        return res.status(200).json({ received: true, voiceClone: true });
      }

      // Branch: IELTS BUNDLE (Mock + Tutor 30d + Voice Clone). Single
      // Xendit invoice creates TWO downstream records sharing the same
      // BUNDLE-xxx external_id: one ieltsMockAttempts row + one
      // tutorSubscriptions row. On paid, we activate both.
      if (isBundleExternalId(externalId)) {
        if (body.status === "PAID" || body.status === "SETTLED") {
          try {
            const { getDb } = await import("./db");
            const db = await getDb();
            if (!db) return res.status(500).json({ error: "DB unavailable" });
            const { ieltsMockAttempts, tutorSubscriptions } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");

            // 1) Mark Mock attempt paid + issue take-test email
            const [mockAttempt] = await db.select().from(ieltsMockAttempts)
              .where(eq(ieltsMockAttempts.paymentRef, externalId)).limit(1);
            if (mockAttempt && (mockAttempt as any).status === "awaiting_payment") {
              const { markIeltsAttemptPaid } = await import("./ieltsMockService");
              await markIeltsAttemptPaid(externalId, body.id);
              console.log(`[Xendit Webhook][BUNDLE] Mock attempt ${mockAttempt.id} activated`);
              // Fire offline conversion for the Mock portion of the bundle
              // (attribute Rp 299k to Google Ads on the Mock Test action —
              // we use the bundle total, not just Rp 79k, since the buyer
              // clicked ONE ad to buy the whole bundle).
              fireWebCheckoutConversion({
                table: "mock",
                entityId: mockAttempt.id,
                gclid: (mockAttempt as any).gclid,
                valueIdr: 299000,
                orderId: externalId,
              });
            }

            // 2) Activate Tutor subscription (30 days)
            const [tutorSub] = await db.select().from(tutorSubscriptions)
              .where(eq(tutorSubscriptions.xenditInvoiceId, externalId)).limit(1);
            if (tutorSub && (tutorSub as any).status === "pending") {
              const startsAt = new Date();
              const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              const { updateTutorSubscription } = await import("./db");
              await updateTutorSubscription((tutorSub as any).id, {
                status: "active",
                xenditInvoiceId: body.id || externalId,
                startsAt,
                expiresAt,
              });
              console.log(`[Xendit Webhook][BUNDLE] Tutor subscription ${(tutorSub as any).id} activated until ${expiresAt.toISOString().slice(0, 10)}`);
            }

            await notifyOwner({
              title: `🎁 New IELTS BUNDLE sale: ${mockAttempt?.customerName || "?"}`,
              content: `Bundle Rp 299k paid. Mock attempt ${mockAttempt?.id} + Tutor sub ${(tutorSub as any)?.id} both activated for 30 days. Voice Clone entitlement flagged. Order: ${externalId}`,
            }).catch(() => {});

            return res.status(200).json({ received: true, bundle: true });
          } catch (e) {
            console.error("[Xendit Webhook][BUNDLE] activation failed:", e);
            return res.status(500).json({ error: (e as Error).message });
          }
        }
        return res.status(200).json({ received: true, bundle: true });
      }

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
          // Direct-web offline conversion upload (Rp 79k Mock Test). Reads
          // the GCLID we captured at checkout — if the buyer came from a
          // Google Ad, this pushes the conversion back to Google Ads so
          // Smart Bidding sees the ROAS. Skipped silently if no GCLID.
          if (!result.alreadyProcessed) {
            try {
              const { getDb } = await import("./db");
              const db = await getDb();
              if (db) {
                const { ieltsMockAttempts } = await import("../drizzle/schema");
                const { eq } = await import("drizzle-orm");
                const [attempt] = await db.select().from(ieltsMockAttempts)
                  .where(eq(ieltsMockAttempts.paymentRef, externalId)).limit(1);
                if (attempt) {
                  fireWebCheckoutConversion({
                    table: "mock",
                    entityId: attempt.id,
                    gclid: (attempt as any).gclid,
                    valueIdr: 79000,
                    orderId: externalId,
                  });
                }
              }
            } catch (e) { console.error("[Xendit Webhook][IELTS] gclid lookup failed:", e); }
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

          // WhatsApp attribution: record the conversion + push offline
          // conversion to Google Ads if this lead came from a tracked
          // /wa/:code click. Fire-and-forget — never block the webhook.
          const amount = plan?.amount ?? 199000;
          fireOfflineConversion(sub.leadId, "tutor", amount);

          // Direct-web offline conversion — uploads if this sub was created
          // via web checkout with a captured GCLID (not through WhatsApp).
          // Both paths can fire; Google Ads dedupes by orderId.
          fireWebCheckoutConversion({
            table: "tutor",
            entityId: sub.id,
            gclid: (sub as any).gclid,
            valueIdr: amount,
            orderId: externalId,
          });

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

          // WhatsApp attribution: same as Tutor branch above. IGCSE plans
          // vary in price (Standard vs Premium) but the offline conversion
          // uploader just needs the real IDR amount so Smart Bidding sees
          // ROAS honestly.
          const amount = plan?.amount ?? 299000;
          fireOfflineConversion(sub.leadId, "igcse", amount);

          // Direct-web offline conversion — uploads if this sub was created
          // via web checkout with a captured GCLID (not through WhatsApp).
          fireWebCheckoutConversion({
            table: "igcse",
            entityId: sub.id,
            gclid: (sub as any).gclid,
            valueIdr: amount,
            orderId: externalId,
          });

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

      // ----- SpecTa IQ Discovery — Rp 59k paid test -----
      // externalId format: IQ-<timestamp>-<random> (see generateIqExternalId).
      // On paid: mint access token, mark order paid, email the access link,
      // notify owner, fire Google Ads offline conversion.
      if (externalId && externalId.startsWith("IQ-")) {
        if (body.status !== "PAID" && body.status !== "SETTLED") {
          if (body.status === "EXPIRED" || body.status === "FAILED") {
            const { updateIqOrderStatus } = await import("./db");
            await updateIqOrderStatus(externalId, body.status === "EXPIRED" ? "expired" : "failed");
          }
          return res.status(200).json({ received: true, iq: true });
        }

        const { getIqOrderByExternalId, updateIqOrderStatus, createIqAccessToken } = await import("./db");
        const iqOrder = await getIqOrderByExternalId(externalId);
        if (!iqOrder) {
          console.error(`[Xendit Webhook][IQ] Order not found: ${externalId}`);
          return res.status(404).json({ error: "IQ order not found" });
        }
        if (iqOrder.status === "paid") {
          console.log(`[Xendit Webhook][IQ] Order already processed: ${externalId}`);
          return res.status(200).json({ received: true, iq: true, already_processed: true });
        }

        // Mint a single-use 7-day access token.
        const tokenValue = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const createdToken = await createIqAccessToken({
          token: tokenValue,
          status: "unused",
          expiresAt,
        });

        await updateIqOrderStatus(externalId, "paid", {
          xenditInvoiceId: body.id,
          paidAt: new Date(),
          accessTokenId: createdToken?.id,
        });

        // Email the access link (Bahasa, brand-consistent).
        const { sendIqAccessLinkEmail } = await import("./iqDiscoveryEmail");
        await sendIqAccessLinkEmail({
          to: iqOrder.customerEmail,
          customerName: iqOrder.customerName,
          token: tokenValue,
        });

        const formattedAmount = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(iqOrder.amount);
        await notifyOwner({
          title: `💜 New IQ Discovery Purchase: ${iqOrder.customerName}`,
          content: `${iqOrder.customerName} (${iqOrder.customerEmail}) just purchased SpecTa IQ Discovery for ${formattedAmount}. Access link sent automatically. Order: ${externalId}`,
        });

        // Google Ads offline conversion — same helper the aptitude flow uses.
        if (!iqOrder.conversionUploadedAt) {
          fireWebCheckoutConversion({
            table: "iqDiscovery",
            entityId: iqOrder.id,
            gclid: iqOrder.gclid,
            valueIdr: iqOrder.amount,
            orderId: externalId,
          });
        }

        console.log(`[Xendit Webhook][IQ] ✅ Paid + link sent: ${externalId}`);
        return res.status(200).json({ received: true, iq: true });
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
      const baseUrl = process.env.VITE_APP_URL || (process.env.NODE_ENV === "production" ? "https://www.spectaeducation.com" : "http://localhost:3000");

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

      // Google Ads offline conversion upload — this is what makes the sale
      // appear as a "Conversion" in Google Ads / smart bidding, matched back
      // to the original ad click via GCLID. Runs only if we captured a GCLID
      // at checkout AND haven't already uploaded this order.
      if (!order.conversionUploadedAt) {
        fireWebCheckoutConversion({
          table: "aptitudePro",
          entityId: order.id,
          gclid: order.gclid,
          valueIdr: order.amount,
          orderId: externalId,
        });
      }

      console.log(`[Xendit Webhook] Payment processed successfully for ${externalId}`);
      return res.status(200).json({ received: true, success: true });
    } catch (err) {
      console.error("[Xendit Webhook] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}
