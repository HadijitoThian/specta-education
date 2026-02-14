import { ENV } from "./_core/env";

const RESEND_API_BASE = "https://api.resend.com";
const FROM_EMAIL = `SpecTa Education <${ENV.smtpFrom || "noreply@spectaeducation.com"}>`;

// ==========================================
// CORE SEND EMAIL FUNCTION (via Resend)
// ==========================================
export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.warn(`[Email] Skipped sending to ${to}: Resend API key not configured`);
    return false;
  }

  try {
    // Build Resend-compatible attachments (base64 encoded)
    const resendAttachments = attachments?.map(a => ({
      filename: a.filename,
      content: a.content.toString("base64"),
      type: a.contentType || "application/octet-stream",
    }));

    const body: Record<string, any> = {
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    };

    if (text) body.text = text;
    if (resendAttachments && resendAttachments.length > 0) {
      body.attachments = resendAttachments;
    }

    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.resendApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Email] Resend failed to send to ${to}: ${response.status} ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`[Email] Sent "${subject}" to ${to} via Resend (id: ${result.id})`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
    return false;
  }
}

// ==========================================
// VERIFY EMAIL CONNECTION (Resend)
// ==========================================
export async function verifySmtpConnection(): Promise<boolean> {
  if (!ENV.resendApiKey) return false;

  try {
    const response = await fetch(`${RESEND_API_BASE}/domains`, {
      headers: { Authorization: `Bearer ${ENV.resendApiKey}` },
    });
    return response.ok;
  } catch (error) {
    console.error("[Email] Resend verification failed:", error);
    return false;
  }
}

// ==========================================
// EMAIL WRAPPER (base layout)
// ==========================================
function emailWrapper(content: string): string {
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
    .header img { height: 48px; }
    .header h2 { color: #e53e3e; margin: 12px 0 0; font-size: 20px; }
    .content { color: #333; line-height: 1.6; font-size: 15px; }
    .content h3 { color: #1a1a1a; margin-top: 24px; }
    .info-box { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #e53e3e; }
    .info-box p { margin: 4px 0; }
    .info-box strong { color: #1a1a1a; }
    .btn { display: inline-block; background: #e53e3e; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; }
    .footer a { color: #e53e3e; text-decoration: none; }
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
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// STAFF WELCOME EMAIL
// ==========================================
export async function sendStaffWelcomeEmail({
  to,
  name,
  role,
  password,
  loginUrl,
}: {
  to: string;
  name: string;
  role: string;
  password: string;
  loginUrl: string;
}): Promise<boolean> {
  const roleLabel = role === "counselor" ? "Education Counselor" : role === "admin" ? "Administrator" : "Staff Member";

  const html = emailWrapper(`
    <h3>Welcome to SpecTa Education!</h3>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your account has been created as a <strong>${roleLabel}</strong> at SpecTa Education. You can now log in to access the dashboard.</p>
    
    <div class="info-box">
      <p><strong>Email:</strong> ${to}</p>
      <p><strong>Password:</strong> ${password}</p>
      <p><strong>Role:</strong> ${roleLabel}</p>
    </div>
    
    <p>Please log in and change your password as soon as possible for security.</p>
    
    <a href="${loginUrl}" class="btn">Log In to Dashboard</a>
    
    <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${loginUrl}</p>
  `);

  return sendEmail({
    to,
    subject: `Welcome to SpecTa Education - Your ${roleLabel} Account`,
    html,
  });
}

// ==========================================
// DOCUMENT UPLOAD NOTIFICATION EMAIL
// ==========================================
export async function sendDocumentNotificationEmail({
  to,
  studentName,
  studentEmail,
  documentType,
  fileName,
  source,
  referenceNumber,
  dashboardUrl,
}: {
  to: string;
  studentName: string;
  studentEmail?: string;
  documentType: string;
  fileName: string;
  source: string;
  referenceNumber?: string;
  dashboardUrl: string;
}): Promise<boolean> {
  const sourceLabel = source === "chatbot" ? "AI Chatbot" : source === "application" ? "Quick Apply" : "Track My Application";

  const html = emailWrapper(`
    <h3>New Document Uploaded</h3>
    <p>A new document has been uploaded by a student.</p>
    
    <div class="info-box">
      <p><strong>Student:</strong> ${studentName}</p>
      ${studentEmail ? `<p><strong>Email:</strong> ${studentEmail}</p>` : ""}
      ${referenceNumber ? `<p><strong>Reference:</strong> ${referenceNumber}</p>` : ""}
      <p><strong>Document:</strong> ${fileName}</p>
      <p><strong>Type:</strong> ${documentType}</p>
      <p><strong>Source:</strong> ${sourceLabel}</p>
    </div>
    
    <a href="${dashboardUrl}" class="btn">View in Dashboard</a>
    
    <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${dashboardUrl}</p>
  `);

  return sendEmail({
    to,
    subject: `New Document: ${documentType} from ${studentName}`,
    html,
  });
}

// ==========================================
// APPLICATION SUBMISSION NOTIFICATION EMAIL
// ==========================================
export async function sendApplicationNotificationEmail({
  to,
  studentName,
  studentEmail,
  referenceNumber,
  universities,
  dashboardUrl,
}: {
  to: string;
  studentName: string;
  studentEmail: string;
  referenceNumber: string;
  universities: string;
  dashboardUrl: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h3>New Application Submitted</h3>
    <p>A new student application has been submitted.</p>
    
    <div class="info-box">
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Email:</strong> ${studentEmail}</p>
      <p><strong>Reference:</strong> ${referenceNumber}</p>
      <p><strong>Universities:</strong> ${universities}</p>
    </div>
    
    <a href="${dashboardUrl}" class="btn">View Application</a>
    
    <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${dashboardUrl}</p>
  `);

  return sendEmail({
    to,
    subject: `New Application: ${studentName} (${referenceNumber})`,
    html,
  });
}

// ==========================================
// PASSWORD RESET EMAIL
// ==========================================
export async function sendPasswordResetEmail({
  to,
  name,
  newPassword,
  loginUrl,
}: {
  to: string;
  name: string;
  newPassword: string;
  loginUrl: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h3>Password Reset</h3>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your password has been reset by an administrator. Here are your new login credentials:</p>
    
    <div class="info-box">
      <p><strong>Email:</strong> ${to}</p>
      <p><strong>New Password:</strong> ${newPassword}</p>
    </div>
    
    <p>Please log in and change your password as soon as possible for security.</p>
    
    <a href="${loginUrl}" class="btn">Log In</a>
    
    <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${loginUrl}</p>
  `);

  return sendEmail({
    to,
    subject: "SpecTa Education - Your Password Has Been Reset",
    html,
  });
}

// ==========================================
// COUNSELOR ASSIGNMENT NOTIFICATION EMAIL
// ==========================================
export async function sendCounselorAssignmentEmail({
  to,
  counselorName,
  studentName,
  studentEmail,
  referenceNumber,
  universities,
  dashboardUrl,
}: {
  to: string;
  counselorName: string;
  studentName: string;
  studentEmail: string;
  referenceNumber: string;
  universities: string;
  dashboardUrl: string;
}): Promise<boolean> {
  const html = emailWrapper(`
    <h3>New Student Assigned to You</h3>
    <p>Hi <strong>${counselorName}</strong>,</p>
    <p>A new student has been assigned to you. Please review their application and reach out to them.</p>
    
    <div class="info-box">
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Email:</strong> ${studentEmail}</p>
      <p><strong>Reference:</strong> ${referenceNumber}</p>
      <p><strong>Universities:</strong> ${universities}</p>
    </div>
    
    <a href="${dashboardUrl}" class="btn">View in Your Dashboard</a>
    
    <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${dashboardUrl}</p>
  `);

  return sendEmail({
    to,
    subject: `New Student Assigned: ${studentName} (${referenceNumber})`,
    html,
  });
}

// ==========================================
// STUDENT NOTIFICATION: COUNSELOR ACTION
// ==========================================
export async function sendStudentNotificationEmail({
  to,
  studentName,
  counselorName,
  actionType,
  actionDetails,
  referenceNumber,
  trackUrl,
}: {
  to: string;
  studentName: string;
  counselorName: string;
  actionType: "document_uploaded" | "note_added" | "status_updated";
  actionDetails: string;
  referenceNumber: string;
  trackUrl: string;
}): Promise<boolean> {
  const actionLabels: Record<string, { title: string; description: string }> = {
    document_uploaded: {
      title: "New Document Uploaded for Your Application",
      description: `Your counselor <strong>${counselorName}</strong> has uploaded a new document for your application.`,
    },
    note_added: {
      title: "New Note on Your Application",
      description: `Your counselor <strong>${counselorName}</strong> has added a note to your application.`,
    },
    status_updated: {
      title: "Application Status Updated",
      description: `Your application status has been updated by your counselor <strong>${counselorName}</strong>.`,
    },
  };

  const action = actionLabels[actionType] || actionLabels.note_added;

  const html = emailWrapper(`
    <h3>${action.title}</h3>
    <p>Hi <strong>${studentName}</strong>,</p>
    <p>${action.description}</p>
    
    <div class="info-box">
      <p><strong>Reference:</strong> ${referenceNumber}</p>
      <p><strong>Details:</strong> ${actionDetails}</p>
    </div>
    
    <a href="${trackUrl}" class="btn">Track Your Application</a>
    
    <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${trackUrl}</p>
  `);

  return sendEmail({
    to,
    subject: `SpecTa Education - ${action.title}`,
    html,
  });
}

// ==========================================
// APTITUDE TEST RESULTS EMAIL
// ==========================================
export async function sendAptitudeResultsEmail({
  to,
  studentName,
  language,
  hollandCode,
  riasecScores,
  miScores,
  aiAnalysis,
  pdfBuffer,
}: {
  to: string;
  studentName: string;
  language: "id" | "en";
  hollandCode: string;
  riasecScores: Record<string, number>;
  miScores: Record<string, number>;
  aiAnalysis: any;
  pdfBuffer?: Buffer;
}): Promise<boolean> {
  const isId = language === "id";

  // RIASEC type labels
  const riasecLabels: Record<string, { id: string; en: string; emoji: string }> = {
    R: { id: "Realistis", en: "Realistic", emoji: "🔧" },
    I: { id: "Investigatif", en: "Investigative", emoji: "🔬" },
    A: { id: "Artistik", en: "Artistic", emoji: "🎨" },
    S: { id: "Sosial", en: "Social", emoji: "🤝" },
    E: { id: "Enterprising", en: "Enterprising", emoji: "💼" },
    C: { id: "Konvensional", en: "Conventional", emoji: "📊" },
  };

  // MI type labels
  const miLabels: Record<string, { id: string; en: string; emoji: string }> = {
    linguistic: { id: "Linguistik", en: "Linguistic", emoji: "📝" },
    logical: { id: "Logis-Matematis", en: "Logical-Mathematical", emoji: "🧮" },
    spatial: { id: "Visual-Spasial", en: "Visual-Spatial", emoji: "🎯" },
    musical: { id: "Musikal", en: "Musical", emoji: "🎵" },
    kinesthetic: { id: "Kinestetik", en: "Kinesthetic", emoji: "🏃" },
    interpersonal: { id: "Interpersonal", en: "Interpersonal", emoji: "👥" },
    intrapersonal: { id: "Intrapersonal", en: "Intrapersonal", emoji: "🧘" },
    naturalistic: { id: "Naturalis", en: "Naturalistic", emoji: "🌿" },
  };

  // Build RIASEC scores HTML
  const sortedRiasec = Object.entries(riasecScores).sort((a, b) => b[1] - a[1]);
  const riasecHtml = sortedRiasec.map(([key, score]) => {
    const label = riasecLabels[key];
    const barWidth = Math.max(score, 5);
    return `<div style="margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="font-size: 13px; color: #333;">${label?.emoji || ""} ${isId ? label?.id : label?.en} (${key})</span>
        <span style="font-size: 13px; font-weight: bold; color: #0d9488;">${score}%</span>
      </div>
      <div style="background: #e5e7eb; border-radius: 6px; height: 10px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #14b8a6, #10b981); height: 100%; width: ${barWidth}%; border-radius: 6px;"></div>
      </div>
    </div>`;
  }).join("");

  // Build MI scores HTML
  const sortedMi = Object.entries(miScores).sort((a, b) => b[1] - a[1]);
  const miHtml = sortedMi.map(([key, score]) => {
    const label = miLabels[key];
    const barWidth = Math.max(score, 5);
    return `<div style="margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span style="font-size: 13px; color: #333;">${label?.emoji || ""} ${isId ? label?.id : label?.en}</span>
        <span style="font-size: 13px; font-weight: bold; color: #7c3aed;">${score}%</span>
      </div>
      <div style="background: #e5e7eb; border-radius: 6px; height: 10px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #8b5cf6, #a78bfa); height: 100%; width: ${barWidth}%; border-radius: 6px;"></div>
      </div>
    </div>`;
  }).join("");

  // Build major recommendations HTML
  const majorsHtml = (aiAnalysis.recommendedMajors || []).map((m: any, i: number) => {
    const careersHtml = (m.careers || []).map((c: string) => `<span style="display: inline-block; background: #f0fdf4; color: #166534; padding: 2px 10px; border-radius: 12px; font-size: 12px; margin: 2px 4px 2px 0;">${c}</span>`).join("");
    return `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="margin: 0; color: #1e293b; font-size: 16px;">#${i + 1} ${m.name}</h4>
        <span style="background: #ccfbf1; color: #0d9488; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold;">${m.compatibilityScore}% ${isId ? "cocok" : "match"}</span>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 8px 0;">${m.reason}</p>
      <div style="margin-top: 8px;">${careersHtml}</div>
    </div>`;
  }).join("");

  // Personality snapshot
  const snapshot = aiAnalysis.personalitySnapshot || {};
  const snapshotTitle = snapshot.title || "";
  const snapshotEmoji = snapshot.emoji || "🧠";
  const snapshotDesc = snapshot.description || "";

  const html = emailWrapper(`
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 48px; margin-bottom: 8px;">${snapshotEmoji}</div>
      <h2 style="color: #1e293b; margin: 0 0 4px;">${isId ? "Hasil Tes Bakat AI" : "AI Aptitude Test Results"}</h2>
      <p style="color: #64748b; margin: 0;">${isId ? `Halo ${studentName}! Ini hasil lengkap tes bakat kamu.` : `Hi ${studentName}! Here are your complete aptitude test results.`}</p>
    </div>

    <!-- Personality Snapshot -->
    <div style="background: linear-gradient(135deg, #0d9488, #10b981); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px; font-size: 20px; color: white;">${snapshotTitle}</h3>
      <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6;">${snapshotDesc}</p>
      <div style="margin-top: 16px; background: rgba(255,255,255,0.2); border-radius: 12px; padding: 12px 16px; display: inline-block;">
        <span style="font-size: 12px; opacity: 0.8;">Holland Code</span><br/>
        <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${hollandCode}</span>
      </div>
    </div>

    <!-- RIASEC Analysis -->
    ${aiAnalysis.riasecAnalysis ? `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #0d9488; font-size: 16px; margin-bottom: 8px;">🧠 ${isId ? "Analisis Minat & Kepribadian" : "Interest & Personality Analysis"}</h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">${aiAnalysis.riasecAnalysis}</p>
    </div>` : ""}

    <!-- RIASEC Scores -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 16px;">📊 ${isId ? "Skor RIASEC" : "RIASEC Scores"}</h3>
      ${riasecHtml}
    </div>

    <!-- MI Analysis -->
    ${aiAnalysis.miAnalysis ? `
    <div style="margin-bottom: 24px;">
      <h3 style="color: #7c3aed; font-size: 16px; margin-bottom: 8px;">✨ ${isId ? "Analisis Kecerdasan" : "Intelligence Analysis"}</h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">${aiAnalysis.miAnalysis}</p>
    </div>` : ""}

    <!-- MI Scores -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 16px;">🧩 ${isId ? "Skor Kecerdasan Majemuk" : "Multiple Intelligence Scores"}</h3>
      ${miHtml}
    </div>

    <!-- Cross Analysis -->
    ${aiAnalysis.crossAnalysis ? `
    <div style="background: linear-gradient(135deg, #f0fdfa, #faf5ff); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
      <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 8px;">⚡ ${isId ? "Insight Unik Kamu" : "Your Unique Insight"}</h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">${aiAnalysis.crossAnalysis}</p>
    </div>` : ""}

    <!-- Major Recommendations -->
    <div style="margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">🎓 ${isId ? "Rekomendasi Jurusan" : "Recommended Majors"}</h3>
      ${majorsHtml}
    </div>

    <!-- Career Outlook -->
    ${aiAnalysis.careerOutlook ? `
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 8px;">💼 ${isId ? "Prospek Karir" : "Career Outlook"}</h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">${aiAnalysis.careerOutlook}</p>
    </div>` : ""}

    <!-- Study Tips -->
    ${aiAnalysis.studyTips ? `
    <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #bfdbfe;">
      <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 8px;">📚 ${isId ? "Tips Persiapan" : "Preparation Tips"}</h3>
      <p style="color: #1e40af; font-size: 14px; line-height: 1.6;">${aiAnalysis.studyTips}</p>
    </div>` : ""}

    <!-- Parent Summary -->
    ${aiAnalysis.parentSummary ? `
    <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #fde68a;">
      <h3 style="color: #92400e; font-size: 16px; margin: 0 0 4px;">👨‍👩‍👧 ${isId ? "Ringkasan untuk Orang Tua" : "Parent Summary"}</h3>
      <p style="color: #78350f; font-size: 12px; margin: 0 0 8px;">${isId ? "Bagikan bagian ini kepada orang tua Anda" : "Share this section with your parents"}</p>
      <p style="color: #92400e; font-size: 14px; line-height: 1.6;">${aiAnalysis.parentSummary}</p>
    </div>` : ""}

    <!-- CTA -->
    <div style="background: linear-gradient(135deg, #ef4444, #f43f5e); border-radius: 16px; padding: 24px; text-align: center; color: white; margin-bottom: 16px;">
      <h3 style="margin: 0 0 8px; color: white;">${isId ? "Mau konsultasi lebih lanjut?" : "Want further consultation?"}</h3>
      <p style="margin: 0 0 16px; color: rgba(255,255,255,0.8); font-size: 14px;">${isId ? "Tim SpecTa siap bantu kamu memilih jurusan dan universitas yang tepat!" : "The SpecTa team is ready to help you choose the right major and university!"}</p>
      <a href="https://wa.me/6281287878055?text=Hi%20SpecTa!%20Saya%20baru%20selesai%20Tes%20Bakat%20AI%20dan%20ingin%20konsultasi%20lebih%20lanjut!" style="display: inline-block; background: white; color: #ef4444; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 600; font-size: 14px;">💬 ${isId ? "Chat via WhatsApp" : "Chat via WhatsApp"}</a>
    </div>

    <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">${isId ? "Email ini dikirim secara otomatis oleh SpecTa Education AI Aptitude Test." : "This email was sent automatically by SpecTa Education AI Aptitude Test."}</p>
  `);

  const attachments = pdfBuffer
    ? [{
        filename: `Tes-Bakat-AI_${studentName.replace(/\s+/g, "-")}_${new Date().toISOString().split("T")[0]}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      }]
    : undefined;

  return sendEmail({
    to,
    subject: isId
      ? `🧠 Hasil Tes Bakat AI Kamu - ${studentName} | SpecTa Education`
      : `🧠 Your AI Aptitude Test Results - ${studentName} | SpecTa Education`,
    html,
    attachments,
  });
}
