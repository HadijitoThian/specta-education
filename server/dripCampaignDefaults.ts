import {
  getAllDripCampaigns,
  createDripCampaign,
  createDripEmailStep,
} from "./db";

/**
 * Seed default drip campaigns if none exist.
 * Called once on server startup.
 */
export async function seedDefaultCampaigns(): Promise<void> {
  try {
    const existing = await getAllDripCampaigns();
    if (existing.length > 0) {
      console.log(`[DripCampaign] ${existing.length} campaigns already exist, skipping seed`);
      return;
    }

    console.log("[DripCampaign] Seeding default campaigns...");

    // ========================================
    // Campaign 1: Pro Test Upsell (after free aptitude test)
    // ========================================
    const proTestCampaign = await createDripCampaign({
      name: "Tes Bakat AI Pro - Upsell",
      description: "Follow-up emails for students who completed the free aptitude test, encouraging them to upgrade to Pro",
      triggerSource: "aptitude_test",
      isActive: true,
    });

    if (proTestCampaign) {
      const baseUrl = "{{unsubscribe_url}}";
      
      await createDripEmailStep({
        campaignId: proTestCampaign.id,
        stepOrder: 1,
        delayDays: 3,
        subject: "{{name}}, sudah lihat hasil tes bakat kamu? 🧠",
        htmlContent: wrapEmailTemplate(`
          <h3>Halo {{name}}! 👋</h3>
          <p>Beberapa hari lalu kamu sudah menyelesaikan <strong>Tes Bakat AI SpecTa Play</strong>. Semoga hasilnya bermanfaat!</p>
          <p>Tapi tahukah kamu? Versi <strong>Pro</strong> memberikan analisis yang <strong>jauh lebih mendalam</strong>:</p>
          <ul style="color: #475569; line-height: 2;">
            <li>✅ 7 bagian tes komprehensif (vs 3 di versi gratis)</li>
            <li>✅ Analisis kepribadian Big Five</li>
            <li>✅ Situational Judgment Test (SJT)</li>
            <li>✅ Tes kreativitas & ranking prioritas</li>
            <li>✅ Laporan PDF profesional 8 halaman</li>
            <li>✅ Rekomendasi jurusan & universitas yang lebih akurat</li>
          </ul>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://spectaeducation.com/test/pro" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">🚀 Upgrade ke Pro - Rp 79.000</a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Harga spesial untuk waktu terbatas!</p>
        `),
      });

      await createDripEmailStep({
        campaignId: proTestCampaign.id,
        stepOrder: 2,
        delayDays: 3,
        subject: "Siswa lain sudah menemukan jurusan impian mereka 🎓",
        htmlContent: wrapEmailTemplate(`
          <h3>{{name}}, jangan sampai ketinggalan! 🎯</h3>
          <p>Ratusan siswa sudah menggunakan <strong>Tes Bakat AI Pro</strong> untuk menemukan jurusan yang benar-benar cocok dengan kepribadian dan bakat mereka.</p>
          <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 16px 0; border-left: 4px solid #10b981;">
            <p style="color: #166534; font-style: italic; margin: 0;">"Setelah ambil tes Pro, saya jadi yakin dengan pilihan jurusan saya. Hasilnya detail banget dan sangat membantu diskusi dengan orang tua." — <strong>Rina, SMA kelas 12</strong></p>
          </div>
          <p>Tes Pro hanya membutuhkan <strong>30-45 menit</strong> dan kamu akan mendapat laporan lengkap yang bisa dibagikan ke orang tua dan guru BK.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://spectaeducation.com/test/pro" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">📋 Ambil Tes Pro Sekarang</a>
          </div>
        `),
      });

      await createDripEmailStep({
        campaignId: proTestCampaign.id,
        stepOrder: 3,
        delayDays: 3,
        subject: "Terakhir: Diskon spesial Tes Bakat AI Pro untuk {{name}} 💰",
        htmlContent: wrapEmailTemplate(`
          <h3>Penawaran terakhir untuk kamu, {{name}}! 🎁</h3>
          <p>Ini adalah email terakhir dari kami tentang <strong>Tes Bakat AI Pro</strong>.</p>
          <p>Kami ingin memberikan kamu kesempatan terakhir untuk mendapatkan analisis bakat yang lebih mendalam dengan harga spesial.</p>
          <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; padding: 20px; margin: 16px 0; text-align: center;">
            <p style="color: #92400e; font-size: 14px; margin: 0 0 8px;">Harga Normal</p>
            <p style="color: #92400e; font-size: 24px; text-decoration: line-through; margin: 0;">Rp 79.000</p>
            <p style="color: #7c3aed; font-size: 36px; font-weight: bold; margin: 8px 0;">Rp 59.000</p>
            <p style="color: #92400e; font-size: 13px; margin: 0;">Gunakan kode: <strong>SPECTA25</strong></p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://spectaeducation.com/test/pro" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #f43f5e); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">🔥 Klaim Diskon Sekarang</a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Jika kamu tidak tertarik, tidak apa-apa! Kami tidak akan mengirim email tentang ini lagi.</p>
        `),
      });

      console.log("[DripCampaign] Created 'Pro Test Upsell' campaign with 3 steps");
    }

    // ========================================
    // Campaign 2: General Follow-up (after contact form)
    // ========================================
    const contactCampaign = await createDripCampaign({
      name: "Follow-up Konsultasi",
      description: "Follow-up emails for students who submitted the contact form, sharing tips and encouraging consultation booking",
      triggerSource: "contact_form",
      isActive: true,
    });

    if (contactCampaign) {
      await createDripEmailStep({
        campaignId: contactCampaign.id,
        stepOrder: 1,
        delayDays: 2,
        subject: "Tips persiapan kuliah di luar negeri untuk {{name}} 🌏",
        htmlContent: wrapEmailTemplate(`
          <h3>Halo {{name}}! 🌟</h3>
          <p>Terima kasih sudah menghubungi <strong>SpecTa Education</strong>! Kami senang kamu tertarik untuk kuliah di luar negeri.</p>
          <p>Sambil menunggu konsultasi, ini beberapa tips yang bisa kamu persiapkan:</p>
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 16px 0;">
            <p style="margin: 8px 0;"><strong>1. 📝 Persiapkan IELTS</strong> — Kebanyakan universitas membutuhkan skor IELTS minimal 6.0</p>
            <p style="margin: 8px 0;"><strong>2. 📊 Jaga nilai akademik</strong> — GPA yang baik membuka lebih banyak pilihan</p>
            <p style="margin: 8px 0;"><strong>3. 🎯 Tentukan jurusan</strong> — Coba <a href="https://spectaeducation.com/test" style="color: #7c3aed;">Tes Bakat AI</a> gratis kami!</p>
            <p style="margin: 8px 0;"><strong>4. 💰 Cari beasiswa</strong> — Lihat daftar <a href="https://spectaeducation.com/scholarships" style="color: #7c3aed;">beasiswa</a> yang tersedia</p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://wa.me/62818218388?text=Hi%20SpecTa!%20Saya%20ingin%20konsultasi%20tentang%20kuliah%20di%20luar%20negeri" style="display: inline-block; background: #25D366; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">💬 Chat via WhatsApp</a>
          </div>
        `),
      });

      await createDripEmailStep({
        campaignId: contactCampaign.id,
        stepOrder: 2,
        delayDays: 5,
        subject: "{{name}}, sudah tahu negara tujuan kuliah kamu? 🗺️",
        htmlContent: wrapEmailTemplate(`
          <h3>Masih bingung pilih negara, {{name}}? 🤔</h3>
          <p>Tidak perlu khawatir! Banyak siswa yang awalnya bingung tapi akhirnya menemukan tempat yang tepat.</p>
          <p>Coba tools gratis kami untuk membantu:</p>
          <div style="display: grid; gap: 12px; margin: 16px 0;">
            <div style="background: #eff6ff; border-radius: 12px; padding: 16px; border-left: 4px solid #3b82f6;">
              <strong>🎯 Quiz: Negara Mana yang Cocok?</strong>
              <p style="margin: 4px 0 0; color: #475569; font-size: 14px;">Jawab 10 pertanyaan singkat dan temukan negara yang paling cocok untuk kamu</p>
              <a href="https://spectaeducation.com/quiz" style="color: #3b82f6; font-size: 14px;">Coba sekarang →</a>
            </div>
            <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; border-left: 4px solid #10b981;">
              <strong>🧠 Tes Bakat AI</strong>
              <p style="margin: 4px 0 0; color: #475569; font-size: 14px;">Temukan jurusan yang cocok berdasarkan minat dan bakatmu</p>
              <a href="https://spectaeducation.com/test" style="color: #10b981; font-size: 14px;">Mulai tes →</a>
            </div>
            <div style="background: #fef3c7; border-radius: 12px; padding: 16px; border-left: 4px solid #f59e0b;">
              <strong>🏫 Bandingkan Universitas</strong>
              <p style="margin: 4px 0 0; color: #475569; font-size: 14px;">Bandingkan 2-3 universitas secara langsung dengan analisis AI</p>
              <a href="https://spectaeducation.com/compare" style="color: #f59e0b; font-size: 14px;">Bandingkan →</a>
            </div>
          </div>
        `),
      });

      await createDripEmailStep({
        campaignId: contactCampaign.id,
        stepOrder: 3,
        delayDays: 7,
        subject: "Konsultasi GRATIS menunggu kamu, {{name}}! 📞",
        htmlContent: wrapEmailTemplate(`
          <h3>{{name}}, kami di sini untuk membantu! 🤗</h3>
          <p>Sudah hampir 2 minggu sejak kamu menghubungi kami. Kami ingin memastikan kamu mendapat bantuan yang dibutuhkan.</p>
          <p>Tim konselor kami siap membantu kamu dengan:</p>
          <ul style="color: #475569; line-height: 2;">
            <li>✅ Pemilihan universitas yang tepat</li>
            <li>✅ Persiapan dokumen aplikasi</li>
            <li>✅ Informasi beasiswa</li>
            <li>✅ Persiapan IELTS</li>
            <li>✅ Proses visa</li>
          </ul>
          <p><strong>Konsultasi pertama GRATIS!</strong> Tidak ada kewajiban apapun.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://wa.me/62818218388?text=Hi%20SpecTa!%20Saya%20ingin%20jadwalkan%20konsultasi%20gratis" style="display: inline-block; background: #e53e3e; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">📅 Jadwalkan Konsultasi Gratis</a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Ini adalah email terakhir dari seri ini. Jika kamu butuh bantuan di masa depan, jangan ragu untuk menghubungi kami!</p>
        `),
      });

      console.log("[DripCampaign] Created 'Follow-up Konsultasi' campaign with 3 steps");
    }

    // ========================================
    // Campaign 3: Scholarship Follow-up
    // ========================================
    const scholarshipCampaign = await createDripCampaign({
      name: "Follow-up Beasiswa",
      description: "Follow-up emails for students who checked scholarship eligibility",
      triggerSource: "scholarship_form",
      isActive: true,
    });

    if (scholarshipCampaign) {
      await createDripEmailStep({
        campaignId: scholarshipCampaign.id,
        stepOrder: 1,
        delayDays: 3,
        subject: "{{name}}, update beasiswa terbaru untukmu! 🎓💰",
        htmlContent: wrapEmailTemplate(`
          <h3>Halo {{name}}! 🌟</h3>
          <p>Terima kasih sudah mengecek kelayakan beasiswa di SpecTa Education!</p>
          <p>Berikut beberapa beasiswa yang sedang dibuka:</p>
          <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 16px 0;">
            <p style="margin: 8px 0;"><strong>🇨🇳 CSC Scholarship (China)</strong> — Full scholarship untuk S1, S2, S3</p>
            <p style="margin: 8px 0;"><strong>🇲🇾 MILA Scholarship (Malaysia)</strong> — Potongan biaya kuliah hingga 50%</p>
            <p style="margin: 8px 0;"><strong>🇮🇩 LPDP Scholarship</strong> — Beasiswa penuh dari pemerintah Indonesia</p>
            <p style="margin: 8px 0;"><strong>🇦🇺 Australia Awards</strong> — Beasiswa penuh untuk S2 di Australia</p>
          </div>
          <p>Tim SpecTa bisa membantu kamu mempersiapkan dokumen aplikasi beasiswa. <strong>Konsultasi GRATIS!</strong></p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://wa.me/62818218388?text=Hi%20SpecTa!%20Saya%20tertarik%20dengan%20beasiswa%20dan%20ingin%20konsultasi" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">💬 Konsultasi Beasiswa</a>
          </div>
        `),
      });

      await createDripEmailStep({
        campaignId: scholarshipCampaign.id,
        stepOrder: 2,
        delayDays: 7,
        subject: "Deadline beasiswa mendekat! Sudah siap, {{name}}? ⏰",
        htmlContent: wrapEmailTemplate(`
          <h3>Jangan sampai terlewat, {{name}}! ⏰</h3>
          <p>Banyak beasiswa memiliki deadline yang ketat. Persiapan yang matang adalah kunci keberhasilan.</p>
          <p>Checklist persiapan beasiswa:</p>
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 16px 0;">
            <p style="margin: 8px 0;">☐ Skor IELTS/TOEFL yang memenuhi syarat</p>
            <p style="margin: 8px 0;">☐ Transkrip nilai yang baik</p>
            <p style="margin: 8px 0;">☐ Surat motivasi (motivation letter)</p>
            <p style="margin: 8px 0;">☐ Surat rekomendasi dari guru/dosen</p>
            <p style="margin: 8px 0;">☐ CV/Resume yang up-to-date</p>
            <p style="margin: 8px 0;">☐ Proposal penelitian (untuk S2/S3)</p>
          </div>
          <p>Belum punya skor IELTS? Cek program <a href="https://spectaeducation.com/ielts" style="color: #e53e3e;">IELTS SpecTa</a> dengan jaminan skor!</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://spectaeducation.com/scholarships" style="display: inline-block; background: #7c3aed; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">📋 Lihat Semua Beasiswa</a>
          </div>
        `),
      });

      console.log("[DripCampaign] Created 'Follow-up Beasiswa' campaign with 2 steps");
    }

    console.log("[DripCampaign] Default campaigns seeded successfully");
  } catch (err) {
    console.error("[DripCampaign] Error seeding default campaigns:", err);
  }
}

/**
 * Wrap content in the standard SpecTa email template with unsubscribe link
 */
function wrapEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { text-align: center; margin-bottom: 24px; }
    .header h2 { color: #e53e3e; margin: 12px 0 0; font-size: 20px; }
    .content { color: #333; line-height: 1.6; font-size: 15px; }
    .content h3 { color: #1a1a1a; margin-top: 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; }
    .footer a { color: #e53e3e; text-decoration: none; }
    .unsubscribe { text-align: center; color: #999; font-size: 11px; margin-top: 16px; }
    .unsubscribe a { color: #999; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h2>SpecTa Education</h2>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} SpecTa Education. All rights reserved.</p>
        <p><a href="https://spectaeducation.com">spectaeducation.com</a></p>
      </div>
      <div class="unsubscribe">
        <p>Tidak ingin menerima email ini? <a href="{{unsubscribe_url}}">Berhenti berlangganan</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
