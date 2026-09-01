/**
 * SpecTa IQ Discovery — email helpers.
 *
 * Two flows:
 *   1. sendIqAccessLinkEmail — after successful payment, deliver the
 *      single-use access token as a clickable link. Bahasa Indonesia,
 *      SpecTa brand.
 *   2. sendIqResultEmail — after the student finishes the test, deliver
 *      the PDF report + Instagram share graphic as attachments so they
 *      have permanent copies even if they lose the browser tab.
 */

import { sendEmail } from "./email";
import { ENV } from "./_core/env";

const FROM_NAME = "SpecTa Education";

// ── Access-link email (post-payment) ──────────────────────────────────────

export async function sendIqAccessLinkEmail(params: {
  to: string;
  customerName: string;
  token: string;
}): Promise<boolean> {
  const { to, customerName, token } = params;
  const baseUrl = ENV.appUrl.replace(/\/+$/, "");
  const accessUrl = `${baseUrl}/iq-discovery?token=${token}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
      <!-- Header with brand gradient -->
      <div style="background:linear-gradient(135deg,#1e1b4b,#6366f1,#a855f7);padding:32px;text-align:center;">
        <div style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:700;letter-spacing:4px;">SPECTA IQ DISCOVERY</div>
        <h1 style="color:white;font-size:24px;margin:12px 0 0;">Otakmu menunggu 🧠</h1>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 12px;">
          Hai <strong>${escapeHtml(customerName)}</strong>! 👋
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Terima kasih sudah beli SpecTa IQ Discovery! Klik tombol di bawah untuk mulai tes kamu.
          Link ini <strong>hanya bisa digunakan satu kali</strong> dan berlaku selama 7 hari.
        </p>

        <!-- CTA -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${accessUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:bold;font-size:16px;">
            🚀 Mulai Tes IQ Discovery
          </a>
        </div>

        <!-- What to expect -->
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0;">
          <h3 style="color:#374151;margin:0 0 12px;font-size:14px;">Yang akan kamu dapat:</h3>
          <ul style="color:#6b7280;font-size:13px;line-height:2;margin:0;padding-left:20px;">
            <li>40 soal · 5 dimensi kognitif · ~35-45 menit</li>
            <li>Estimasi IQ ± 5 poin + persentil</li>
            <li>Arketip kognitif unik (dari 12 tipe)</li>
            <li>Laporan PDF 6 halaman via email</li>
            <li>Gambar Instagram Story 1080×1080</li>
            <li>Rekomendasi jurusan sesuai profilmu</li>
          </ul>
        </div>

        <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:24px 0 0;">
          Kalau tombol tidak berfungsi, salin link ini ke browser:<br>
          <a href="${accessUrl}" style="color:#6366f1;word-break:break-all;">${accessUrl}</a>
        </p>
        <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:16px 0 0;">
          Butuh bantuan? WhatsApp <a href="https://wa.me/62818218388" style="color:#6366f1;">0818-2183-8388</a>.
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:11px;margin:0 0 4px;">
          Estimasi berbasis AI. Bukan pengganti tes IQ klinis profesional.
        </p>
        <p style="color:#9ca3af;font-size:11px;margin:0;">
          © ${new Date().getFullYear()} ${FROM_NAME} · spectaeducation.com
        </p>
      </div>
    </div>
  </div>
</body></html>`;

  const text = `Hai ${customerName}!\n\nTerima kasih sudah beli SpecTa IQ Discovery! Klik link ini untuk mulai tes:\n\n${accessUrl}\n\nLink berlaku 7 hari, satu kali pakai. Butuh bantuan: WA 0818-2183-8388.\n\nSpecTa Education`;

  return sendEmail({
    to,
    subject: "🧠 Link Akses SpecTa IQ Discovery kamu",
    html,
    text,
  });
}

// ── Result email (post-test, with attachments) ────────────────────────────

export async function sendIqResultEmail(params: {
  to: string;
  studentName: string;
  fsiq: number;
  archetypeLabel: string;
  archetypeEmoji: string;
  pdfBuffer?: Buffer;
  shareImageBuffer?: Buffer;
}): Promise<boolean> {
  const { to, studentName, fsiq, archetypeLabel, archetypeEmoji, pdfBuffer, shareImageBuffer } = params;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
      <div style="background:linear-gradient(135deg,#1e1b4b,#6366f1,#a855f7,#ec4899);padding:32px;text-align:center;">
        <div style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:700;letter-spacing:4px;">HASIL SPECTA IQ DISCOVERY</div>
        <div style="color:white;font-size:64px;font-weight:900;margin:8px 0 0;letter-spacing:-2px;">${fsiq}</div>
        <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:4px;">Estimasi IQ</div>
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.15);">
          <div style="font-size:48px;">${archetypeEmoji}</div>
          <div style="color:white;font-size:20px;font-weight:800;margin-top:4px;">${escapeHtml(archetypeLabel)}</div>
        </div>
      </div>
      <div style="padding:32px;">
        <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 12px;">
          Selamat, <strong>${escapeHtml(studentName)}</strong>! 🎉
        </p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px;">
          Hasil lengkap SpecTa IQ Discovery kamu sudah siap. Lampiran email ini berisi:
        </p>
        <ul style="color:#374151;font-size:14px;line-height:2;margin:0 0 24px;padding-left:20px;">
          <li>📄 <strong>Laporan PDF 6 halaman</strong> — analisis mendalam, radar chart 5 dimensi, kekuatan + area tumbuh, rekomendasi jurusan/karir</li>
          <li>🖼️ <strong>Gambar Instagram Story</strong> — 1080×1080 siap upload ke IG. Tag @spectaeducation!</li>
        </ul>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
            💡 <strong>Bingung pilih jurusan?</strong> Konsul GRATIS bareng konselor SpecTa.
            <br>
            <a href="https://wa.me/62818218388" style="color:#6366f1;font-weight:700;">WhatsApp Emma 0818-2183-8388</a>
          </p>
        </div>
      </div>
      <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:11px;margin:0 0 4px;">
          Estimasi berbasis AI. Bukan pengganti tes IQ klinis profesional.
        </p>
        <p style="color:#9ca3af;font-size:11px;margin:0;">
          © ${new Date().getFullYear()} ${FROM_NAME} · spectaeducation.com
        </p>
      </div>
    </div>
  </div>
</body></html>`;

  const text = `Selamat ${studentName}!\n\nEstimasi IQ kamu: ${fsiq}\nArketip: ${archetypeLabel}\n\nLampiran email ini berisi laporan PDF lengkap dan gambar untuk Instagram Story.\n\nBingung pilih jurusan? WA Emma di 0818-2183-8388.\n\nSpecTa Education`;

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `SpecTa-IQ-Discovery-${studentName.replace(/\s+/g, "-")}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    });
  }
  if (shareImageBuffer) {
    attachments.push({
      filename: `SpecTa-IQ-Share-${studentName.replace(/\s+/g, "-")}.png`,
      content: shareImageBuffer,
      contentType: "image/png",
    });
  }

  return sendEmail({
    to,
    subject: `🧠 Hasil SpecTa IQ Discovery kamu — ${archetypeLabel}`,
    html,
    text,
    attachments,
  });
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
