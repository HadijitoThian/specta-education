import { ENV } from "./_core/env";

const RESEND_API_BASE = "https://api.resend.com";
const FROM_EMAIL = "SpecTa Education <noreply@spectaeducation.com>";

interface SendAccessLinkParams {
  to: string;
  customerName: string;
  token: string;
  baseUrl: string;
}

/**
 * Send Tes Bakat AI Pro access link email via Resend
 */
export async function sendProAccessLinkEmail(params: SendAccessLinkParams): Promise<boolean> {
  const { to, customerName, token, baseUrl } = params;
  const accessUrl = `${baseUrl}/test/pro?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;">🧠 Tes Bakat AI Pro</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Comprehensive Aptitude Assessment</p>
      </div>
      
      <!-- Body -->
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
          Hai <strong>${customerName}</strong>! 👋
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Terima kasih telah membeli Tes Bakat AI Pro! Klik tombol di bawah untuk memulai tes kamu. Link ini hanya bisa digunakan satu kali dan berlaku selama 7 hari.
        </p>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 24px;">
          Thank you for purchasing the AI Aptitude Test Pro! Click the button below to start your test. This link is single-use and valid for 7 days.
        </p>
        
        <!-- CTA Button -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${accessUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:bold;font-size:16px;">
            Mulai Tes Sekarang / Start Test Now
          </a>
        </div>
        
        <!-- What to expect -->
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0;">
          <h3 style="color:#374151;margin:0 0 12px;font-size:14px;">Yang akan kamu dapatkan / What you'll get:</h3>
          <ul style="color:#6b7280;font-size:13px;line-height:2;margin:0;padding-left:20px;">
            <li>7 bagian tes mendalam / 7 in-depth test sections</li>
            <li>Analisis kepribadian RIASEC Pro / RIASEC Pro personality analysis</li>
            <li>Profil kecerdasan majemuk / Multiple intelligence profile</li>
            <li>Penilaian situasional & kreativitas / Situational & creative assessment</li>
            <li>Laporan PDF lengkap via email / Complete PDF report via email</li>
          </ul>
        </div>
        
        <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;">
          Jika tombol tidak berfungsi, salin link ini ke browser kamu:<br>
          <a href="${accessUrl}" style="color:#6366f1;word-break:break-all;">${accessUrl}</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} SpecTa Education • www.spectaeducation.com
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.resendApiKey}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `🧠 Link Akses Tes Bakat AI Pro - ${customerName}`,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Resend] Email send failed:", response.status, error);
      return false;
    }

    console.log(`[Resend] Access link email sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[Resend] Email send error:", err);
    return false;
  }
}

/**
 * Send payment confirmation email (receipt)
 */
export async function sendPaymentConfirmationEmail(params: {
  to: string;
  customerName: string;
  amount: number;
  orderId: string;
}): Promise<boolean> {
  const { to, customerName, amount, orderId } = params;

  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;">✅ Pembayaran Berhasil!</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Payment Successful</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
          Hai <strong>${customerName}</strong>!
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Pembayaran kamu untuk Tes Bakat AI Pro telah berhasil. Kamu akan segera menerima email terpisah berisi link akses tes.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0;">
          <table style="width:100%;font-size:13px;color:#374151;">
            <tr><td style="padding:4px 0;color:#6b7280;">Order ID</td><td style="padding:4px 0;text-align:right;font-weight:bold;">${orderId}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Produk</td><td style="padding:4px 0;text-align:right;">Tes Bakat AI Pro</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Total</td><td style="padding:4px 0;text-align:right;font-weight:bold;color:#059669;">${formattedAmount}</td></tr>
          </table>
        </div>
      </div>
      <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
          © ${new Date().getFullYear()} SpecTa Education • www.spectaeducation.com
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.resendApiKey}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `✅ Pembayaran Berhasil - Tes Bakat AI Pro`,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Resend] Confirmation email failed:", response.status, error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Resend] Confirmation email error:", err);
    return false;
  }
}

/**
 * Nurture reminder for AI IELTS Tutor: a student tried the free taster but
 * hasn't subscribed. `step` is 1 (first nudge) or 2 (final nudge).
 */
export async function sendTutorReminderEmail(params: {
  to: string;
  name?: string | null;
  step: 1 | 2;
  appUrl: string;
}): Promise<boolean> {
  const { to, step } = params;
  const name = (params.name || "").trim() || "there";
  const base = params.appUrl.replace(/\/+$/, "");
  const ctaUrl = `${base}/ielts/tutor`;
  const unsubUrl = `${base}/unsubscribe?email=${encodeURIComponent(to)}`;
  const subject = step === 1
    ? "Lanjutkan latihan IELTS-mu 🎯 (Writing & Speaking tanpa batas)"
    : "Terakhir: buka kembali AI IELTS Tutor-mu ✨";
  const lead = step === 1
    ? "Kamu sudah mencoba evaluasi gratis di AI IELTS Tutor — bagus! Untuk lanjut latihan tanpa batas dengan feedback instan, band score, dan contoh jawaban, pilih paket langganan."
    : "Ini pengingat terakhir dari kami. Jangan biarkan persiapan IELTS-mu berhenti — lanjutkan latihan Writing & Speaking tanpa batas dengan AI tutor pribadimu.";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(135deg,#9C27B0,#E91E8C);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;">🎤 AI IELTS Tutor</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:13px;">Latihan Writing & Speaking tanpa batas</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hai <strong>${name}</strong>! 👋</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">${lead}</p>
        <div style="background:#faf5ff;border-radius:12px;padding:18px;margin:0 0 24px;">
          <ul style="color:#6b7280;font-size:13px;line-height:1.9;margin:0;padding-left:20px;">
            <li>Feedback & band score instan untuk Writing dan Speaking</li>
            <li>Contoh jawaban band tinggi + koreksi langsung</li>
            <li>Tes Speaking Part 1 terpandu — rekam & dengar ulang jawabanmu</li>
          </ul>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#9C27B0,#E91E8C);color:white;text-decoration:none;padding:15px 38px;border-radius:12px;font-weight:bold;font-size:15px;">
            Pilih Paket & Lanjutkan →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:10px 0 0;">Mulai Rp 149.000 · 2 Minggu atau 1 Bulan</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:20px 0 0;">
          Jika tombol tidak berfungsi, buka: <a href="${ctaUrl}" style="color:#9C27B0;word-break:break-all;">${ctaUrl}</a>
        </p>
      </div>
      <div style="background:#f9fafb;padding:18px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0 0 6px;">© ${new Date().getFullYear()} SpecTa Education • www.spectaeducation.com</p>
        <p style="color:#c0c4cc;font-size:11px;margin:0;"><a href="${unsubUrl}" style="color:#c0c4cc;">Berhenti berlangganan email ini</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.resendApiKey}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    if (!response.ok) {
      console.error("[Resend] Tutor reminder failed:", response.status, await response.text());
      return false;
    }
    console.log(`[Resend] Tutor reminder (step ${step}) sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[Resend] Tutor reminder error:", err);
    return false;
  }
}

/**
 * Send a student their FREE IELTS Practice result (band + feedback) by email.
 * The on-screen result is intentionally hidden, so this email IS the result —
 * it also carries the Mock Test + AI Tutor promo.
 */
export async function sendIeltsPracticeResultEmail(params: {
  to: string;
  studentName?: string | null;
  section: string;
  result: any;
  appUrl: string;
}): Promise<boolean> {
  const { to, section } = params;
  const name = (params.studentName || "").trim() || "there";
  const r = params.result || {};
  const base = params.appUrl.replace(/\/+$/, "");
  const mockUrl = `${base}/ielts/mock-test`;
  const tutorUrl = `${base}/ielts/tutor`;
  const unsubUrl = `${base}/unsubscribe?email=${encodeURIComponent(to)}`;
  const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1);
  const band = r.bandScore != null ? String(r.bandScore) : "—";
  const overall = r.overallFeedback || r.feedback || "Great effort — keep practising to improve your band!";
  const correctLine = (r.correctCount != null && r.totalQuestions != null)
    ? `<p style="margin:0 0 14px 0;color:#475569;font-size:14px;">Score: <strong>${r.correctCount}/${r.totalQuestions}</strong> correct</p>` : "";
  const liItems = (arr: any) => Array.isArray(arr) ? arr.map((s: string) => `<li>${String(s)}</li>`).join("") : "";
  const strengths = liItems(r.strengths);
  const improvements = liItems(r.improvements);
  const criteria = r.criteria && typeof r.criteria === "object"
    ? Object.entries(r.criteria).map(([k, v]: [string, any]) => `<li><strong>${k.replace(/([A-Z])/g, " $1").trim()}:</strong> ${v?.band ?? "—"} — ${v?.feedback ?? ""}</li>`).join("") : "";

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:30px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;">Hasil Latihan IELTS — ${sectionLabel}</h1>
        <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px;">Your IELTS Practice Result</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hai <strong>${name}</strong> 👋 — ini hasil latihanmu:</p>
        <div style="text-align:center;margin:0 0 20px;">
          <div style="display:inline-block;background:#eef2ff;border-radius:16px;padding:16px 28px;">
            <div style="font-size:12px;color:#6366f1;text-transform:uppercase;letter-spacing:1px;">Estimated Band</div>
            <div style="font-size:44px;font-weight:800;color:#4338ca;line-height:1;">${band}</div>
          </div>
        </div>
        ${correctLine}
        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:0 0 16px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#374151;">AI Feedback</h3>
          <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">${overall}</p>
        </div>
        ${criteria ? `<div style="margin:0 0 16px;"><h3 style="font-size:14px;color:#374151;margin:0 0 6px;">Criteria</h3><ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.7;">${criteria}</ul></div>` : ""}
        ${strengths ? `<div style="margin:0 0 12px;"><h4 style="color:#15803d;font-size:13px;margin:0 0 4px;">✓ Strengths</h4><ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.6;">${strengths}</ul></div>` : ""}
        ${improvements ? `<div style="margin:0 0 8px;"><h4 style="color:#b45309;font-size:13px;margin:0 0 4px;">→ Areas to improve</h4><ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.6;">${improvements}</ul></div>` : ""}

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <h3 style="font-size:15px;color:#111827;margin:0 0 4px;">Ready to push your band higher? 🚀</h3>
        <p style="color:#6b7280;font-size:13px;margin:0 0 14px;">This was a free taster. Two ways to seriously prepare:</p>
        <div style="border:1px solid #dbeafe;border-radius:12px;padding:16px;margin:0 0 12px;">
          <strong style="color:#1e3a8a;font-size:14px;">📝 Full IELTS Mock Test — Rp 79.000</strong>
          <p style="color:#6b7280;font-size:13px;margin:6px 0 10px;">A complete 4-skill exam, AI-graded to the IELTS rubric, PDF report emailed to you.</p>
          <a href="${mockUrl}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:9px 20px;border-radius:8px;font-weight:bold;font-size:13px;">Take the Mock Test →</a>
        </div>
        <div style="border:1px solid #fbcfe8;border-radius:12px;padding:16px;background:#fdf2fa;">
          <strong style="color:#9d174d;font-size:14px;">🎤 AI IELTS Tutor — try free</strong>
          <p style="color:#6b7280;font-size:13px;margin:6px 0 10px;">Unlimited Writing & Speaking practice with instant feedback. First try free.</p>
          <a href="${tutorUrl}" style="display:inline-block;background:#db2777;color:white;text-decoration:none;padding:9px 20px;border-radius:8px;font-weight:bold;font-size:13px;">Try the AI Tutor →</a>
        </div>
      </div>
      <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0 0 6px;">© ${new Date().getFullYear()} SpecTa Education • www.spectaeducation.com</p>
        <p style="color:#c0c4cc;font-size:11px;margin:0;"><a href="${unsubUrl}" style="color:#c0c4cc;">Unsubscribe</a></p>
      </div>
    </div>
  </div>
</body></html>`;

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.resendApiKey}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject: `Hasil Latihan IELTS-mu (${sectionLabel}) — Band ${band} 🎯`, html }),
    });
    if (!response.ok) {
      console.error("[Resend] IELTS practice result failed:", response.status, await response.text());
      return false;
    }
    console.log(`[Resend] IELTS practice result sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[Resend] IELTS practice result error:", err);
    return false;
  }
}

/**
 * Follow-up for someone who took the FREE IELTS practice test: invite them to
 * the paid full Mock Test and the AI IELTS Tutor. One-time per email.
 */
export async function sendPracticeFollowupEmail(params: {
  to: string;
  name?: string | null;
  appUrl: string;
}): Promise<boolean> {
  const { to } = params;
  const name = (params.name || "").trim() || "there";
  const base = params.appUrl.replace(/\/+$/, "");
  const mockUrl = `${base}/ielts/mock-test`;
  const tutorUrl = `${base}/ielts/tutor`;
  const unsubUrl = `${base}/unsubscribe?email=${encodeURIComponent(to)}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;">Sudah coba IELTS Practice kami? 🎯</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:13px;">Langkah selanjutnya menuju band impianmu</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 14px;">Hai <strong>${name}</strong>! 👋</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Terima kasih sudah mencoba <strong>latihan IELTS gratis</strong> di SpecTa. Kalau kamu serius mengejar target band, ini dua cara untuk lanjut:
        </p>

        <!-- Mock Test -->
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:0 0 16px;">
          <h3 style="color:#1e3a8a;margin:0 0 6px;font-size:16px;">📝 Full IELTS Mock Test — Rp 79.000</h3>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 14px;">
            Tes lengkap 4 skill (Listening, Reading, Writing, Speaking), dinilai AI sesuai rubrik IELTS, laporan PDF dikirim ke emailmu. Sekali bayar, tanpa langganan.
          </p>
          <a href="${mockUrl}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:11px 24px;border-radius:10px;font-weight:bold;font-size:14px;">Mulai Mock Test →</a>
        </div>

        <!-- AI Tutor -->
        <div style="border:1px solid #f5d0e8;border-radius:12px;padding:20px;margin:0 0 8px;background:#fdf2fa;">
          <h3 style="color:#9d174d;margin:0 0 6px;font-size:16px;">🎤 AI IELTS Tutor — coba gratis</h3>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 14px;">
            Latihan Writing & Speaking tanpa batas dengan feedback instan, band score, contoh jawaban, dan tes Speaking terpandu. Coba 1x gratis — tanpa kartu.
          </p>
          <a href="${tutorUrl}" style="display:inline-block;background:#db2777;color:white;text-decoration:none;padding:11px 24px;border-radius:10px;font-weight:bold;font-size:14px;">Coba AI Tutor →</a>
        </div>
      </div>
      <div style="background:#f9fafb;padding:18px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0 0 6px;">© ${new Date().getFullYear()} SpecTa Education • www.spectaeducation.com</p>
        <p style="color:#c0c4cc;font-size:11px;margin:0;"><a href="${unsubUrl}" style="color:#c0c4cc;">Berhenti berlangganan email ini</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.resendApiKey}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject: "Lanjutkan persiapan IELTS-mu — Mock Test & AI Tutor 🎯", html }),
    });
    if (!response.ok) {
      console.error("[Resend] Practice follow-up failed:", response.status, await response.text());
      return false;
    }
    console.log(`[Resend] Practice follow-up sent to ${to}`);
    return true;
  } catch (err) {
    console.error("[Resend] Practice follow-up error:", err);
    return false;
  }
}

/**
 * Upsell email to Mock Test buyers: "You just took our Mock Test — here's how
 * to push your band higher with unlimited AI Tutor practice." Personalised
 * with their overall band when we have it. One-time per buyer.
 *
 * Targeting philosophy: this is a soft nudge, not a hard sell. The buyer
 * ALREADY paid us Rp 79k so trust is real — the goal is to convert them into
 * the recurring Tutor subscription that compounds their prep.
 */
export async function sendMockTestUpsellEmail(params: {
  to: string;
  name?: string | null;
  overallBand?: number | null;
  appUrl: string;
}): Promise<boolean> {
  const { to } = params;
  const name = (params.name || "").trim() || "there";
  const base = params.appUrl.replace(/\/+$/, "");
  const tutorUrl = `${base}/ielts/tutor`;
  const unsubUrl = `${base}/unsubscribe?email=${encodeURIComponent(to)}`;

  // Band-aware framing — feels much more personal than a generic upsell.
  const band = params.overallBand;
  const openingBahasa = band != null
    ? `Selamat! Kamu baru saja menyelesaikan IELTS Mock Test kami dengan overall band <strong>${band.toFixed(1)}</strong>. 🎉`
    : `Selamat! Kamu baru saja menyelesaikan IELTS Mock Test kami. 🎉`;
  const nextStepBahasa = band != null && band < 7
    ? `Target band 7.0+? Kelemahan paling umum di skor ${band.toFixed(1)} biasanya di <strong>Writing & Speaking</strong> — dua skill yang paling sulit dilatih sendirian tanpa examiner feedback.`
    : band != null
    ? `Skor ${band.toFixed(1)} itu solid! Untuk konsistensi + naik lagi ke 7.5-8.0, latihan Writing & Speaking dengan feedback instan adalah kunci.`
    : `Untuk mengejar target band impianmu, latihan konsisten Writing & Speaking dengan AI feedback adalah cara tercepat.`;

  const subject = band != null
    ? `Band ${band.toFixed(1)} — ini cara push ke band impianmu 🎯`
    : `Langkah berikutnya setelah Mock Test-mu 🎯`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <div style="text-align:center;padding:24px 24px 8px 24px;line-height:1;">
        <a href="https://www.spectaeducation.com" style="text-decoration:none;display:inline-block;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#4338ca;">SpecTa</span><span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:400;letter-spacing:-0.3px;color:#6b7280;margin-left:6px;">Education</span>
        </a>
      </div>
      <div style="background:linear-gradient(135deg,#db2777,#9333ea);padding:24px 30px;text-align:center;color:white;">
        <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.85;">SpecTa AI IELTS Tutor</div>
        <h1 style="color:white;margin:6px 0 0 0;font-size:24px;line-height:1.25;">${band != null ? `Band ${band.toFixed(1)} — bagus, sekarang push ke atas 🚀` : `Siap tingkatkan band-mu? 🚀`}</h1>
      </div>
      <div style="padding:30px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 14px;">Hai <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 14px;">${openingBahasa}</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 22px;">${nextStepBahasa}</p>

        <!-- Value prop card -->
        <div style="border:1px solid #f5d0e8;border-radius:14px;padding:22px;margin:0 0 20px;background:linear-gradient(180deg,#fdf2fa,#fce7f3);">
          <h2 style="color:#9d174d;margin:0 0 10px;font-size:18px;">🎤 AI IELTS Tutor — latihan tanpa batas</h2>
          <ul style="color:#374151;font-size:14px;line-height:1.7;padding-left:18px;margin:0 0 18px;">
            <li><strong>Writing:</strong> Task 1 + Task 2, AI grading sesuai IELTS rubric, feedback per criterion + contoh jawaban band 8.</li>
            <li><strong>Speaking:</strong> Latihan Part 1/2/3, rekam suaramu, AI transkrip + skor pronunciation + fluency + coherence.</li>
            <li><strong>Full Speaking Mock Test:</strong> simulasi ujian resmi, 11-14 menit, evaluasi lengkap.</li>
            <li><strong>Unlimited:</strong> berapapun kali kamu latihan, harga sama.</li>
          </ul>
          <div style="text-align:center;">
            <a href="${tutorUrl}"
               style="display:inline-block;background:#db2777;color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:15px;">
              Mulai Free Trial (1× Writing + 1× Speaking) →
            </a>
          </div>
          <p style="color:#831843;font-size:12px;line-height:1.5;margin:14px 0 0;text-align:center;">
            Rp 149.000 / 2 minggu · Rp 249.000 / bulan · batalkan kapan aja.
          </p>
        </div>

        <div style="border-left:4px solid #db2777;padding:8px 14px;background:#fdf2fa;border-radius:0 8px 8px 0;margin:0 0 6px;">
          <p style="color:#831843;font-size:13px;line-height:1.6;margin:0;">
            <strong>Kenapa AI Tutor lebih efisien dari kursus?</strong><br/>
            Kursus tatap muka Rp 3-8 juta, 8-16 minggu, jadwal fixed. AI Tutor Rp 149-249k, kapanpun, sebanyak yang kamu mau. Cocok kalau kamu punya tanggal tes yang dekat atau sudah punya dasar dan tinggal polish.
          </p>
        </div>
      </div>
      <div style="background:#f9fafb;padding:18px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0 0 6px;">© ${new Date().getFullYear()} SpecTa Education • Sejak 2005 • 1000+ pelajar terbantu</p>
        <p style="color:#c0c4cc;font-size:11px;margin:0;"><a href="${unsubUrl}" style="color:#c0c4cc;">Berhenti berlangganan email marketing</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.resendApiKey}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    if (!response.ok) {
      console.error("[Resend] Mock Test upsell failed:", response.status, await response.text());
      return false;
    }
    console.log(`[Resend] Mock Test upsell sent to ${to} (band=${band ?? "n/a"})`);
    return true;
  } catch (err) {
    console.error("[Resend] Mock Test upsell error:", err);
    return false;
  }
}

// ============================================================================
// VOICE CLONE upsell — "Hear yourself at Band 8" drip to all past customers
// ============================================================================

export async function sendVoiceCloneUpsellEmail(params: {
  to: string;
  name?: string | null;
  segment?: string;   // "aptitude-free" | "aptitude-pro" | "practice" | "mock" | "tutor-trial" | "tutor-paid" | "preview"
  appUrl: string;
}): Promise<boolean> {
  const { to } = params;
  const name = (params.name || "").trim() || "there";
  const base = params.appUrl.replace(/\/+$/, "");
  const voiceCloneUrl = `${base}/voice-clone?utm_source=email&utm_medium=drip&utm_campaign=voice-clone-upsell&utm_content=${encodeURIComponent(params.segment || "unknown")}`;
  const unsubUrl = `${base}/unsubscribe?email=${encodeURIComponent(to)}`;

  const subject = "🎙️ Hear yourself speak at IELTS Band 8 — Rp 49k";

  // Segment-aware opener (subtle personalization to boost open/click rates)
  const segmentOpeners: Record<string, string> = {
    "aptitude-free": "You've tried our free AI Aptitude Test — here's something new that gets even more personal:",
    "aptitude-pro": "Thank you for purchasing the AI Aptitude Pro report. We've just launched something you'll want to try:",
    "practice": "You've tried our free IELTS Practice — here's a much more powerful way to sharpen your Speaking:",
    "mock": "As one of our IELTS Mock Test buyers, this new feature is made for you:",
    "tutor-trial": "You've tried the AI IELTS Tutor for free — we just built something a lot more personal:",
    "tutor-paid": "As one of our AI Tutor subscribers, you'll want to try this new feature:",
    "preview": "PREVIEW EMAIL — this is what will be sent to past customers (50/day):",
  };
  const opener = segmentOpeners[params.segment || ""] || "We just launched a new feature we think you'll love:";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <!-- Wordmark header -->
      <div style="text-align:center;padding:24px 24px 8px 24px;line-height:1;">
        <a href="https://www.spectaeducation.com" style="text-decoration:none;display:inline-block;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#4338ca;">SpecTa</span><span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:400;letter-spacing:-0.3px;color:#6b7280;margin-left:6px;">Education</span>
        </a>
      </div>

      <!-- Purple gradient hero -->
      <div style="background:linear-gradient(135deg,#7c3aed,#c026d3,#db2777);padding:28px 30px;text-align:center;color:white;">
        <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.9;font-weight:700;">🔥 Just Launched · SpecTa Voice Clone</div>
        <h1 style="color:white;margin:8px 0 0 0;font-size:26px;line-height:1.25;font-weight:800;">Hear yourself speak at<br/>IELTS Band 8 🚀</h1>
      </div>

      <div style="padding:30px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 14px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">${opener}</p>

        <!-- The pitch -->
        <div style="border:2px solid #e9d5ff;border-radius:14px;padding:22px;margin:0 0 20px;background:linear-gradient(180deg,#faf5ff,#fdf2f8);">
          <div style="text-align:center;margin-bottom:12px;">
            <span style="display:inline-block;padding:6px 12px;background:#7c3aed;color:white;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:999px;">SpecTa Voice Clone</span>
          </div>
          <h2 style="color:#6b21a8;margin:0 0 10px;font-size:20px;text-align:center;">🎙️ Record. Clone. Hear yourself at Band 8.</h2>
          <p style="color:#374151;font-size:14px;line-height:1.65;margin:0 0 16px;text-align:center;">
            Record 3 IELTS Speaking questions (5 minutes). Our AI clones your voice, then rewrites your weakest answer to Band 8 level. You hear the result in <strong>YOUR OWN VOICE</strong>.
          </p>
          <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:18px;margin:0 0 18px;">
            <li>🎤 Record Speaking Parts 1, 2, and 3</li>
            <li>🤖 AI grades + rewrites to Band 8 using the official IELTS rubric</li>
            <li>✨ Generates Band 8 audio in your own cloned voice</li>
            <li>📱 Compare side-by-side: your original vs Band 8 version</li>
          </ul>
          <div style="text-align:center;">
            <a href="${voiceCloneUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#c026d3);color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:15px;box-shadow:0 4px 12px rgba(124,58,237,0.35);">
              🎙️ Start Recording — Rp 49,000 →
            </a>
          </div>
          <p style="color:#6b21a8;font-size:12px;line-height:1.5;margin:14px 0 0;text-align:center;">
            One-off payment · No subscription · Results in 5-10 minutes · 100% private (voice auto-deleted after 90 days)
          </p>
        </div>

        <div style="border-left:4px solid #7c3aed;padding:10px 14px;background:#faf5ff;border-radius:0 8px 8px 0;margin:0 0 6px;">
          <p style="color:#6b21a8;font-size:13px;line-height:1.6;margin:0;">
            <strong>Why this works so well:</strong><br/>
            Your brain learns 10× faster when it can DIRECTLY COMPARE the current you against a "best-version" you. This isn't listening to someone else — it's listening to <em>yourself</em> at Band 8. The motivation hook that makes you want to practise every single day.
          </p>
        </div>
      </div>
      <div style="background:#f9fafb;padding:18px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0 0 6px;">© ${new Date().getFullYear()} SpecTa Education • Since 2005 • 10,000+ students supported</p>
        <p style="color:#c0c4cc;font-size:11px;margin:0;"><a href="${unsubUrl}" style="color:#c0c4cc;">Unsubscribe from marketing emails</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.resendApiKey}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    });
    if (!response.ok) {
      console.error("[Resend] Voice Clone upsell failed:", response.status, await response.text());
      return false;
    }
    console.log(`[Resend] Voice Clone upsell sent to ${to} (segment=${params.segment || "?"})`);
    return true;
  } catch (err) {
    console.error("[Resend] Voice Clone upsell error:", err);
    return false;
  }
}
