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
  isPro = false,
}: {
  to: string;
  studentName: string;
  language: "id" | "en";
  hollandCode: string;
  riasecScores: Record<string, number>;
  miScores: Record<string, number>;
  aiAnalysis: any;
  pdfBuffer?: Buffer;
  isPro?: boolean;
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

    <!-- PRO UPSELL (only for free test) -->
    ${!isPro ? `
    <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
      <!-- Discount Banner -->
      <div style="background: linear-gradient(90deg, #ef4444, #f97316, #ef4444); padding: 12px 16px; text-align: center;">
        <span style="color: white; font-size: 14px; font-weight: bold;">⚡ ${isId ? "PROMO TERBATAS — Hemat Rp 20.000!" : "LIMITED OFFER — Save Rp 20,000!"} ⚡</span>
      </div>
      
      <!-- Header -->
      <div style="padding: 24px 24px 16px; text-align: center; color: white;">
        <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 16px; margin-bottom: 12px;">
          <span style="font-size: 13px; font-weight: 600;">👑 ${isId ? "Upgrade ke Pro" : "Upgrade to Pro"}</span>
        </div>
        <h3 style="margin: 0 0 8px; font-size: 22px; color: white;">${isId ? "Mau Tahu Lebih Dalam?" : "Want to Go Deeper?"}</h3>
        <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 13px; line-height: 1.5;">${isId ? "Tes Bakat AI Pro menganalisis 7 dimensi kepribadian kamu secara mendalam — dari minat, kecerdasan, hingga kreativitas dan pengambilan keputusan." : "AI Aptitude Test Pro analyzes 7 dimensions of your personality in depth — from interests, intelligence, to creativity and decision-making."}</p>
      </div>
      
      <!-- Comparison -->
      <div style="padding: 0 24px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td width="48%" valign="top" style="padding-right: 8px;">
              <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px;">
                <div style="color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px;">${isId ? "Versi Gratis" : "Free Version"}</div>
                <div style="color: rgba(255,255,255,0.7); font-size: 12px; line-height: 1.8;">✓ ${isId ? "3 bagian tes" : "3 test sections"}<br/>✓ ${isId ? "RIASEC dasar" : "Basic RIASEC"}<br/>✓ ${isId ? "MI dasar" : "Basic MI"}<br/>✓ ${isId ? "Analisis AI singkat" : "Brief AI analysis"}<br/>✓ ${isId ? "Rekomendasi jurusan" : "Major recommendations"}</div>
              </div>
            </td>
            <td width="48%" valign="top" style="padding-left: 8px;">
              <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.2);">
                <div style="color: #fbbf24; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px;">👑 ${isId ? "Versi Pro" : "Pro Version"}</div>
                <div style="color: white; font-size: 12px; line-height: 1.8;">✓ ${isId ? "7 bagian tes mendalam" : "7 in-depth sections"}<br/>✓ ${isId ? "RIASEC Pro + Personality" : "RIASEC Pro + Personality"}<br/>✓ ${isId ? "Situational Judgment" : "Situational Judgment"}<br/>✓ ${isId ? "Creative Assessment" : "Creative Assessment"}<br/>✓ ${isId ? "Laporan PDF 10+ halaman" : "10+ page PDF report"}<br/>✓ ${isId ? "Analisis AI mendalam" : "Deep AI analysis"}<br/>✓ ${isId ? "Rekomendasi karir & gaji" : "Career & salary recs"}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Price & CTA -->
      <div style="background: rgba(255,255,255,0.1); padding: 24px; text-align: center;">
        <div style="margin-bottom: 16px;">
          <span style="color: rgba(255,255,255,0.5); font-size: 14px; text-decoration: line-through;">Rp 149.000</span>
          <span style="color: rgba(255,255,255,0.6); font-size: 14px; text-decoration: line-through; margin: 0 8px;">Rp 79.000</span>
          <br/>
          <span style="color: #fbbf24; font-size: 32px; font-weight: bold;">Rp 59.000</span>
        </div>
        <div style="margin-bottom: 16px;">
          <span style="display: inline-block; background: #ef4444; color: white; font-size: 12px; font-weight: bold; padding: 4px 14px; border-radius: 20px;">${isId ? "HEMAT Rp 20.000!" : "SAVE Rp 20,000!"}</span>
        </div>
        <a href="https://spectaeducation.com/test/pro" style="display: inline-block; background: linear-gradient(90deg, #fbbf24, #f59e0b); color: #1e1b4b; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 700; font-size: 16px;">🚀 ${isId ? "Upgrade ke Pro Sekarang" : "Upgrade to Pro Now"}</a>
        <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin-top: 12px;">${isId ? "Pembayaran aman via Xendit • Hasil langsung ke email" : "Secure payment via Xendit • Results sent to your email"}</p>
      </div>
    </div>
    ` : ""}

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


// ==========================================
// LEAD NOTIFICATION EMAIL (Chatbot Lead Capture)
// ==========================================
export async function sendLeadNotificationEmail({
  leadName,
  leadPhone,
  intentSummary,
  tags,
  isAnonymous,
}: {
  leadName: string;
  leadPhone?: string;
  intentSummary?: string;
  tags?: string[];
  isAnonymous?: boolean;
}) {
  const ownerEmail = ENV.smtpFrom || "info@spectaeducation.com";
  const tagBadges = (tags || []).map(t => `<span style="display:inline-block;background:#E8F5E9;color:#2E7D32;padding:2px 10px;border-radius:12px;font-size:13px;margin:2px 4px;">${t}</span>`).join("");

  const html = `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0;">
    <div style="background:linear-gradient(135deg,#E53935,#FF6F61);padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">🎯 New Chatbot Lead Captured</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">A visitor just shared their contact info via the AI chatbot</p>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#666;font-size:13px;width:120px;">Name</td>
          <td style="padding:8px 0;font-weight:600;font-size:15px;">${leadName}${isAnonymous ? ' <span style="color:#999;font-weight:normal;">(anonymous)</span>' : ''}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;font-size:13px;">Phone</td>
          <td style="padding:8px 0;font-weight:600;font-size:15px;">${leadPhone || '<span style="color:#999;">Not provided</span>'}</td>
        </tr>
        ${intentSummary ? `<tr>
          <td style="padding:8px 0;color:#666;font-size:13px;vertical-align:top;">Intent</td>
          <td style="padding:8px 0;font-size:14px;line-height:1.5;">${intentSummary}</td>
        </tr>` : ''}
        ${tagBadges ? `<tr>
          <td style="padding:8px 0;color:#666;font-size:13px;vertical-align:top;">Interests</td>
          <td style="padding:8px 0;">${tagBadges}</td>
        </tr>` : ''}
      </table>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
        <p style="color:#888;font-size:12px;margin:0;">This lead was captured automatically by the SpecTa AI chatbot. Log in to the admin dashboard to view the full conversation transcript and manage this lead.</p>
      </div>
    </div>
  </div>`;

  return sendEmail({
    to: ownerEmail,
    subject: `🎯 New Lead: ${leadName}${tags?.length ? ` — ${tags.slice(0, 3).join(', ')}` : ''}`,
    html,
  });
}


// ==========================================
// PARTNERSHIP OUTREACH APPROVAL EMAIL
// ==========================================
export async function sendPartnershipApprovalEmail({
  to,
  universityName,
  country,
  recipientEmail,
  contactPerson,
  contactTitle,
  emailSubject,
  emailBody,
  partnershipScore,
  priority,
  worldRanking,
  approveUrl,
  rejectUrl,
  editUrl,
}: {
  to: string;
  universityName: string;
  country: string;
  recipientEmail: string;
  contactPerson?: string;
  contactTitle?: string;
  emailSubject: string;
  emailBody: string;
  partnershipScore?: number;
  priority?: string;
  worldRanking?: number;
  approveUrl: string;
  rejectUrl: string;
  editUrl: string;
}): Promise<boolean> {
  const priorityColor = priority === "critical" ? "#dc2626" : priority === "high" ? "#ea580c" : priority === "medium" ? "#ca8a04" : "#16a34a";
  const priorityLabel = (priority || "medium").charAt(0).toUpperCase() + (priority || "medium").slice(1);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e53e3e; padding-bottom: 16px; }
    .header h2 { color: #e53e3e; margin: 0; font-size: 22px; }
    .header p { color: #666; margin: 8px 0 0; font-size: 14px; }
    .uni-card { background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%); border-radius: 10px; padding: 20px; margin: 16px 0; border: 1px solid #fecaca; }
    .uni-name { font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px; }
    .uni-country { font-size: 14px; color: #666; margin: 0; }
    .stats { display: flex; gap: 12px; margin-top: 12px; }
    .stat { background: white; border-radius: 6px; padding: 8px 14px; font-size: 13px; }
    .stat strong { color: #e53e3e; }
    .section { margin: 20px 0; }
    .section h3 { color: #1a1a1a; font-size: 16px; margin: 0 0 8px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .recipient-info { background: #f8f9fa; border-radius: 8px; padding: 14px; margin: 12px 0; }
    .recipient-info p { margin: 4px 0; font-size: 14px; color: #333; }
    .recipient-info strong { color: #1a1a1a; }
    .email-preview { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 12px 0; }
    .email-preview .subject { font-weight: 700; font-size: 15px; color: #1a1a1a; margin: 0 0 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
    .email-preview .body { font-size: 14px; color: #333; line-height: 1.7; white-space: pre-wrap; }
    .actions { text-align: center; margin: 28px 0 16px; }
    .btn { display: inline-block; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 6px 8px; }
    .btn-approve { background: #16a34a; color: #ffffff !important; }
    .btn-reject { background: #dc2626; color: #ffffff !important; }
    .btn-edit { background: #2563eb; color: #ffffff !important; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; }
    .footer a { color: #e53e3e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h2>Partnership Outreach Approval</h2>
        <p>Review and approve this outreach email before it's sent</p>
      </div>

      <div class="uni-card">
        <p class="uni-name">${universityName}</p>
        <p class="uni-country">${country}</p>
        <div style="margin-top: 12px;">
          ${worldRanking ? `<span style="background:white;border-radius:6px;padding:6px 12px;font-size:13px;margin-right:8px;display:inline-block;margin-bottom:4px;"><strong style="color:#e53e3e;">World Rank:</strong> #${worldRanking}</span>` : ''}
          <span style="background:white;border-radius:6px;padding:6px 12px;font-size:13px;margin-right:8px;display:inline-block;margin-bottom:4px;"><strong style="color:${priorityColor};">Priority:</strong> ${priorityLabel}</span>
          ${partnershipScore ? `<span style="background:white;border-radius:6px;padding:6px 12px;font-size:13px;display:inline-block;margin-bottom:4px;"><strong style="color:#e53e3e;">Score:</strong> ${partnershipScore}/100</span>` : ''}
        </div>
      </div>

      <div class="section">
        <h3>Recipient</h3>
        <div class="recipient-info">
          <p><strong>Email:</strong> ${recipientEmail}</p>
          ${contactPerson ? `<p><strong>Contact:</strong> ${contactPerson}</p>` : ''}
          ${contactTitle ? `<p><strong>Title:</strong> ${contactTitle}</p>` : ''}
        </div>
      </div>

      <div class="section">
        <h3>Email Draft Preview</h3>
        <div class="email-preview">
          <p class="subject">Subject: ${emailSubject}</p>
          <div class="body">${emailBody}</div>
        </div>
      </div>

      <div class="actions">
        <a href="${approveUrl}" class="btn btn-approve">✅ Approve & Send</a>
        <a href="${editUrl}" class="btn btn-edit">✏️ Edit Draft</a>
        <a href="${rejectUrl}" class="btn btn-reject">❌ Reject</a>
      </div>

      <p style="color: #888; font-size: 12px; text-align: center;">Clicking "Approve & Send" will immediately send this email to ${recipientEmail} on behalf of SpecTa Education.</p>

      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} SpecTa Education AI Agent System</p>
        <p><a href="https://spectaeducation.com">spectaeducation.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `🤝 Approve Partnership Outreach: ${universityName} (${country})`,
    html,
  });
}

// ==========================================
// PARTNERSHIP OUTREACH EMAIL (sent to university)
// ==========================================
export async function sendPartnershipOutreachEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  // The body is already formatted by the AI agent, wrap it in a clean professional template
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.7; }
    .container { max-width: 650px; margin: 0 auto; padding: 32px 20px; }
    .content { font-size: 15px; white-space: pre-wrap; }
    .signature { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #555; }
    .signature strong { color: #1a1a1a; }
    .signature a { color: #e53e3e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">${body}</div>
    <div class="signature">
      <p><strong>Hadi Jito Thian</strong><br>
      Founder & CEO<br>
      SpecTa Education<br>
      <a href="https://spectaeducation.com">www.spectaeducation.com</a><br>
      Jakarta, Indonesia</p>
    </div>
  </div>
</body>
</html>`;

  return sendPartnershipEmail({
    to,
    subject,
    html,
  });
}


// ==========================================
// PARTNERSHIP OUTREACH EMAIL (from CEO)
// Uses hadi@spectaeducation.com instead of global SMTP_FROM
// Only for university partnership outreach emails
// ==========================================
const PARTNERSHIP_FROM_EMAIL = "Hadi Jito Thian - SpecTa Education <hadi@spectaeducation.com>";

export async function sendPartnershipEmail({
  to,
  cc,
  subject,
  html,
  text,
}: {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.warn(`[Partnership Email] Skipped sending to ${to}: Resend API key not configured`);
    return false;
  }

  try {
    const body: Record<string, any> = {
      from: PARTNERSHIP_FROM_EMAIL,
      to: [to],
      subject,
      html,
    };

    if (cc) body.cc = [cc];
    if (text) body.text = text;

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
      console.error(`[Partnership Email] Resend failed to send to ${to}: ${response.status} ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`[Partnership Email] Sent "${subject}" to ${to} via Resend from hadi@spectaeducation.com (id: ${result.id})`);
    return true;
  } catch (error) {
    console.error(`[Partnership Email] Failed to send to ${to}:`, error);
    return false;
  }
}
