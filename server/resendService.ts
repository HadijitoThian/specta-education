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
