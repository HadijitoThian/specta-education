/**
 * Privacy Policy — required for Google Ads compliance. Plain-language,
 * honest description of what we collect and why.
 */
export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12 text-slate-700 leading-relaxed">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: 23 July 2026</p>

        <p>
          SpecTa Education ("<strong>SpecTa</strong>") respects your privacy. This policy
          explains what we collect, why, and what your rights are.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">1. What we collect</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account:</strong> name, email, phone number, hashed password.</li>
          <li><strong>Practice content:</strong> essays you write and voice recordings you submit, so the AI can grade them.</li>
          <li><strong>Billing:</strong> processed by Xendit — we store the transaction reference, not your card.</li>
          <li><strong>Analytics:</strong> anonymised usage events (page views, clicks) via Google Analytics.</li>
        </ul>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">2. How we use it</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Deliver the product you signed up for (grading, feedback, tracking).</li>
          <li>Send transactional emails (receipts, account notices, exam reminders).</li>
          <li>Send educational and marketing emails — you can opt out any time via the unsubscribe link.</li>
          <li>Improve the AI feedback quality (aggregated, never re-identified).</li>
        </ul>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">3. Who we share with</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Xendit</strong> — payment processing.</li>
          <li><strong>Resend</strong> — transactional and marketing email delivery.</li>
          <li><strong>OpenAI / Anthropic / Google</strong> — AI providers that grade your practice.</li>
          <li><strong>Google Analytics</strong> — anonymised usage measurement.</li>
        </ul>
        <p>We do not sell your personal data.</p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">4. Your rights</h2>
        <p>
          You can access, correct, or delete your data any time. Email
          <a className="text-indigo-600" href="mailto:info@spectaeducation.com"> info@spectaeducation.com</a> and
          we'll respond within 14 days.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">5. Retention</h2>
        <p>
          We keep your account and practice history while your account is active, and for up to
          24 months after you close it (for legal and support reasons). You can request earlier
          deletion at any time.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">6. Cookies</h2>
        <p>
          We use essential cookies for login and payment, plus Google Analytics cookies for
          anonymised usage measurement. No third-party ad cookies.
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-2">7. Contact</h2>
        <p>
          SpecTa Education, Jl. Kelapa Nias Raya QE1 No. 14, Kelapa Gading, Jakarta Utara 14240,
          Indonesia. Email: <a className="text-indigo-600" href="mailto:info@spectaeducation.com">info@spectaeducation.com</a>.
        </p>
      </div>
    </div>
  );
}
