/**
 * Refund Policy — required by Google Ads for subscription products.
 * States the refund window clearly, which is the specific missing piece
 * that gets flagged as "Evasive Ad Content" on subscription landing pages.
 */
export default function Refund() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 text-slate-700 leading-relaxed">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Refund &amp; Cancellation Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: 23 July 2026</p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">1. Free trial first</h2>
        <p>
          Every new user gets a free evaluation (1 Writing + 1 Speaking) with no credit card,
          so you can confirm the product works for you <em>before</em> paying anything.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">2. 7-day money-back guarantee</h2>
        <p>
          If you paid for an AI IELTS Tutor subscription and the product doesn't work as
          described, email <a className="text-indigo-600" href="mailto:info@spectaeducation.com">info@spectaeducation.com</a> within
          <strong> 7 days of your first payment</strong> and we'll refund you in full — no questions asked.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">3. Cancelling a subscription</h2>
        <p>
          Cancel any time from your account dashboard, or email us. Cancellation stops the
          <strong> next</strong> renewal. Your current period stays active until it ends — you keep
          full access until the paid-through date.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">4. Mock Test (one-off Rp 79.000)</h2>
        <p>
          The IELTS Mock Test is a one-time purchase, not a subscription. If technical issues
          prevent you from completing your test, email us within 14 days and we'll either fix
          the issue, grant a fresh attempt, or refund you.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">5. IELTS Course (classroom)</h2>
        <p>
          Classroom refunds follow the enrolment contract you signed on registration. Contact
          your branch admin or email us for a copy.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">6. How to request a refund</h2>
        <p>
          Email <a className="text-indigo-600" href="mailto:info@spectaeducation.com">info@spectaeducation.com</a> with:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>The email address on your account.</li>
          <li>The Xendit transaction reference (in your receipt email).</li>
          <li>A short note on why you're requesting a refund.</li>
        </ul>
        <p>Approved refunds are processed to your original payment method within 7–14 business days.</p>

        <p className="mt-10 text-sm text-slate-500">
          Questions? WhatsApp <a className="text-indigo-600" href="https://wa.me/62818218388">+62 818 218 388</a> or
          email <a className="text-indigo-600" href="mailto:info@spectaeducation.com">info@spectaeducation.com</a>.
        </p>
      </div>
    </div>
  );
}
