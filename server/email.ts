import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

// Create reusable transporter
function createTransporter() {
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPass) {
    console.warn("[Email] SMTP not configured, emails will be skipped");
    return null;
  }

  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

// ==========================================
// CORE SEND EMAIL FUNCTION
// ==========================================
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.warn(`[Email] Skipped sending to ${to}: SMTP not configured`);
    return false;
  }

  try {
    await transport.sendMail({
      from: `"SpecTa Education" <${ENV.smtpFrom}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });
    console.log(`[Email] Sent "${subject}" to ${to}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
    return false;
  }
}

// ==========================================
// VERIFY SMTP CONNECTION
// ==========================================
export async function verifySmtpConnection(): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;

  try {
    await transport.verify();
    return true;
  } catch (error) {
    console.error("[Email] SMTP verification failed:", error);
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
