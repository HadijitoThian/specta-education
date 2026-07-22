# Emma bot — WhatsApp attribution integration

For the team maintaining the `specta-whatsapp-api` Railway service (Emma the bot).

## What this is

The main SpecTa website now supports **trackable WhatsApp links** at
`/wa/<code>` (server code lives in `server/waAttribution.ts` +
`server/_core/index.ts`). Each click through such a link is logged into a
`wa_sessions` table with the visitor's GCLID + UTMs, and the visitor is
redirected to WhatsApp with a pre-filled message containing a session tag
like `[REF:WA-abc123XyZ]`.

For this to be useful, Emma (the WhatsApp bot) needs to:

1. Recognise `[REF:WA-...]` in the first incoming message from a new
   contact
2. Call our API to look up which campaign / product / greeting maps to
   that session
3. Strip the tag from the visible conversation
4. Personalise her reply based on the product
5. Report the session ID + lead phone back to us when she creates the
   lead so we can join the click to a paying customer downstream

This document is the API contract Emma needs to hit.

## Environment on Emma's side

```
CRM_API_BASE_URL = https://www.spectaeducation.com
CRM_API_KEY      = <shared secret — same value as CRM_BOT_API_KEY on the main site>
```

The main site already has `CRM_BOT_API_KEY` set. Ask Hadi for the value if
you don't have it, and put the same value in Emma's env as `CRM_API_KEY`.

## Endpoints Emma calls

All endpoints require `x-crm-key: <CRM_API_KEY>` header.

### 1. Look up a session — `GET /api/wa/lookup/:sessionId`

Call this immediately when the first incoming message from a new contact
contains a `[REF:WA-...]` tag.

**Request:**
```
GET https://www.spectaeducation.com/api/wa/lookup/WA-abc123XyZ
x-crm-key: <shared secret>
```

**Response 200:**
```json
{
  "sessionId": "WA-abc123XyZ",
  "campaignCode": "tutor-gad-jul26",
  "campaignName": "AI Tutor — Google Ads July 2026",
  "product": "tutor",
  "platform": "google_ads",
  "greeting": "Halo, saya mau info tentang AI IELTS Tutor SpecTa",
  "gclid": "CjwKCAjw...",
  "utm": {
    "source": "google",
    "medium": "cpc",
    "campaign": "ielts_tutor_jul26",
    "term": null,
    "content": null
  },
  "clickedAt": "2026-07-04T18:22:03.000Z",
  "leadId": null
}
```

**Response 404** if the session doesn't exist (unknown or expired code).

**Response 401** if the `x-crm-key` header is missing or wrong.

### 2. Report first message received — `POST /api/wa/message-received`

Call once per session, right after Emma sees the first message with a REF
tag. Stamps `messagedAt` on the session so the /admin/wa-links funnel
view knows "clicked ≠ silent" vs "clicked AND messaged."

**Request:**
```
POST https://www.spectaeducation.com/api/wa/message-received
x-crm-key: <shared secret>
Content-Type: application/json

{ "sessionId": "WA-abc123XyZ" }
```

**Response 200:** `{ "ok": true }`

### 3. Upsert lead — `POST /api/bot/upsert-student` (already exists, one new field)

The existing lead-creation endpoint now accepts an optional
`waSessionId` field. When supplied, we link the session to the lead and
backfill the lead's GCLID + UTMs from the click. This is what makes
"offline conversion upload to Google Ads" work later.

**Request (only the new field shown):**
```json
{
  "phone": "+6281234567890",
  "name": "Alia Wibisono",
  "email": "alia@example.com",
  "waSessionId": "WA-abc123XyZ"
}
```

Everything else in this endpoint is unchanged — see `server/crmBotApi.ts`
docstring for the full list of fields.

## Suggested Emma logic

Pseudo-code Emma should implement:

```js
async function handleIncomingMessage(msg) {
  const isFirst = !(await hasPreviousMessages(msg.from));
  let session = null;

  if (isFirst) {
    // Match [REF:WA-...] in the first incoming message.
    const refMatch = msg.text.match(/\[REF:(WA-[A-Za-z0-9_-]+)\]/);
    if (refMatch) {
      const sessionId = refMatch[1];
      session = await fetch(
        `${CRM_API_BASE_URL}/api/wa/lookup/${sessionId}`,
        { headers: { "x-crm-key": CRM_API_KEY } }
      ).then(r => r.ok ? r.json() : null);

      if (session) {
        // Notify us that this session actually messaged.
        await fetch(`${CRM_API_BASE_URL}/api/wa/message-received`, {
          method: "POST",
          headers: {
            "x-crm-key": CRM_API_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        // Strip the REF tag from the visible message (so counsellors
        // don't see the tracking code in the CRM timeline).
        msg.text = msg.text.replace(/\s*\[REF:WA-[A-Za-z0-9_-]+\]\s*/g, " ").trim();
      }
    }
  }

  // Personalise Emma's greeting by product when we have a session.
  const openingContext = session
    ? productContext(session.product)   // e.g. "AI Tutor pricing + benefits"
    : GENERIC_GREETING;

  const reply = await runEmmaLLM({ history: [msg], openingContext });
  await sendMessage(msg.from, reply);

  // When Emma decides to create/update a lead, pass waSessionId so we can
  // link the click to the eventual payment.
  if (shouldCreateLead(msg, reply)) {
    await fetch(`${CRM_API_BASE_URL}/api/bot/upsert-student`, {
      method: "POST",
      headers: {
        "x-crm-key": CRM_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        phone: msg.from,
        name: extractedName,
        email: extractedEmail,
        source: session ? `whatsapp:${session.campaignCode}` : "whatsapp",
        waSessionId: session?.sessionId,
      }),
    });
  }
}

function productContext(product) {
  switch (product) {
    case "mock":
      return "IELTS Mock Test Rp 79k — 4 skills, AI-graded report in 24h.";
    case "tutor":
      return "AI IELTS Tutor — unlimited Writing & Speaking practice, Rp 149k/2wk or Rp 249k/month.";
    case "igcse":
      return "IGCSE AI Teacher — Math, Physics, Chemistry, Biology, Economics, Business. Rp 299k/month, 30 min free trial.";
    case "ielts_course":
      return "IELTS classroom courses at Kelapa Gading, PIK, Gading Serpong. VIP/80/40/short/private options.";
    case "study_abroad":
      return "Study abroad counselling — Australia, UK, USA, Canada, Singapore, Malaysia and more. Free 30-min consult.";
    case "scholarship":
      return "Scholarship guidance — China 100%, Malaysia Mila, LPDP prep. 200+ students placed since 2005.";
    case "aptitude":
      return "Tes Bakat AI — RIASEC + Multiple Intelligences. Free tier + Rp 79k Pro report.";
    default:
      return "SpecTa Education — study abroad + IELTS + IGCSE consulting since 2005.";
  }
}
```

## What Emma does NOT need to do

- Fire Google Ads conversions herself. The main site handles that via
  the Xendit webhook (offline conversion upload with the stored GCLID).
- Compute cost per lead / ROAS. That happens in `/admin/wa-links`.
- Store the session locally. Just re-fetch when needed via the lookup
  endpoint.

## Testing checklist

1. On the main site's `/admin/wa-links` page, create a test campaign
   (product: consult, platform: direct, code: `test-emma`).
2. Copy the URL: `https://www.spectaeducation.com/wa/test-emma`
3. Open it in an incognito browser (so no cookie interferes).
4. It should redirect to `wa.me/62...?text=Halo,%20saya%20mau%20info...%20%5BREF:WA-xxx%5D`
5. On WhatsApp, send the pre-filled message to Emma.
6. Emma should:
   - Match the `[REF:WA-xxx]` regex on the first message
   - Call `/api/wa/lookup/WA-xxx` and get 200 with product `consult`
   - Call `/api/wa/message-received` and get `{ ok: true }`
   - Reply with a product-appropriate greeting
7. Back on `/admin/wa-links`, the test campaign row should show
   `clicks: 1, messaged: 1`.
8. When the student later pays for a Tutor/IGCSE/Mock subscription
   linked to the same phone, the Xendit webhook fires, `recordConversion`
   finds the session, and `uploadOfflineConversion` pushes the GCLID +
   value to Google Ads. Session row in /admin/wa-links should now show
   `converted: 1, offlineUploadStatus: success`.

## Ownership

- Main site (this repo): `server/waAttribution.ts`,
  `server/_core/index.ts`, `server/crmBotApi.ts`,
  `server/xenditWebhook.ts`, `server/waAttributionAdminRouter.ts`,
  `client/src/pages/AdminWaLinks.tsx`,
  `client/src/components/GlobalConversionTracking.tsx`
- Emma bot service (separate Railway): needs the client-side changes
  outlined above.

Questions → ask Hadi.
