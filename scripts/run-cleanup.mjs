/**
 * Test Data Cleanup Script
 * Deletes all student/lead data from the database to start fresh.
 * Run with: node scripts/run-cleanup.mjs
 */

import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("ERROR: DATABASE_URL environment variable is not set");
  process.exit(1);
}

// Tables to clean in order (child tables first to respect FK constraints)
const deletions = [
  // Student Portal
  { table: "student_notifications", label: "Student Notifications" },
  { table: "student_rewards", label: "Student Rewards" },
  { table: "student_referrals", label: "Student Referrals" },
  { table: "student_referral_codes", label: "Student Referral Codes" },
  { table: "student_ai_chat_history", label: "Student AI Chat History" },
  { table: "student_university_wishlist", label: "Student University Wishlist" },
  { table: "student_portal_appointments", label: "Student Portal Appointments" },
  { table: "student_portal_profiles", label: "Student Portal Profiles" },
  { table: "student_portal_accounts", label: "Student Portal Accounts" },
  { table: "student_visa_tracking", label: "Student Visa Tracking" },
  { table: "student_applications", label: "Student Applications" },

  // CRM Student Data
  { table: "crm_notifications", label: "CRM Notifications" },
  { table: "crm_activity_timeline", label: "CRM Activity Timeline" },
  { table: "crm_appointments", label: "CRM Appointments" },
  { table: "crm_student_documents", label: "CRM Student Documents" },
  { table: "crm_chat_history", label: "CRM Chat History" },
  { table: "ai_followup_suggestions", label: "AI Follow-up Suggestions" },
  { table: "consultation_notes", label: "Consultation Notes" },
  { table: "staff_team_chat", label: "Staff Team Chat" },

  // Leads & Pipeline
  { table: "follow_up_actions", label: "Follow-up Actions" },
  { table: "lead_assignments", label: "Lead Assignments" },
  { table: "lead_pipeline_stages", label: "Lead Pipeline Stages" },
  { table: "crm_tasks", label: "CRM Tasks" },
  { table: "counselor_performance", label: "Counselor Performance" },

  // Legacy Lead Tables
  { table: "application_notes", label: "Application Notes" },
  { table: "application_documents", label: "Application Documents" },
  { table: "applications", label: "Applications" },
  { table: "appointments", label: "Appointments (Legacy)" },
  { table: "whatsapp_messages", label: "WhatsApp Messages" },
  { table: "documents", label: "Documents (Legacy)" },
  { table: "leads", label: "CRM Leads" },
  { table: "scholarship_leads", label: "Scholarship Leads" },

  // Drip Campaign Enrollments (keep templates)
  { table: "drip_email_logs", label: "Drip Email Logs" },
  { table: "drip_enrollments", label: "Drip Enrollments" },

  // Quiz / Aptitude / Simulator
  { table: "aptitude_pro_orders", label: "Aptitude Pro Orders" },
  { table: "aptitude_access_tokens", label: "Aptitude Access Tokens" },
  { table: "aptitude_results", label: "Aptitude Results" },
  { table: "quiz_results", label: "Quiz Results" },
  { table: "persona_results", label: "Persona Results" },
  { table: "ielts_practice_results", label: "IELTS Practice Results" },
  { table: "simulator_choices", label: "Simulator Choices" },
  { table: "simulator_results", label: "Simulator Results" },
  { table: "simulator_sessions", label: "Simulator Sessions" },
  { table: "user_checklist_progress", label: "User Checklist Progress" },

  // Chatbot Conversations
  { table: "messages", label: "Chatbot Messages" },
  { table: "conversations", label: "Chatbot Conversations" },

  // Visitor Tracking
  { table: "visitor_tracking", label: "Visitor Tracking" },
  { table: "tracking_tokens", label: "Tracking Tokens" },

  // Agent Logs & Reports
  { table: "agent_run_logs", label: "Agent Run Logs" },
  { table: "daily_reports", label: "Daily Reports" },
  { table: "gm_executive_reports", label: "GM Executive Reports" },
  { table: "gm_health_checks", label: "GM Health Checks" },
  { table: "gm_recommendations", label: "GM Recommendations" },

  // Social / Competitor Data
  { table: "social_mentions", label: "Social Mentions" },
  { table: "university_reply_queue", label: "University Reply Queue" },

  // Manus OAuth Users
  { table: "users", label: "OAuth Users" },
];

async function runCleanup() {
  console.log("🧹 SpecTa Education — Test Data Cleanup");
  console.log("==========================================");
  console.log("Connecting to database...");

  const conn = await mysql.createConnection(dbUrl + "&multipleStatements=true");

  try {
    await conn.execute("SET FOREIGN_KEY_CHECKS = 0");

    let totalDeleted = 0;
    for (const { table, label } of deletions) {
      try {
        const [result] = await conn.execute(`DELETE FROM \`${table}\``);
        const count = result.affectedRows || 0;
        if (count > 0) {
          console.log(`  ✅ ${label}: deleted ${count} rows`);
        } else {
          console.log(`  ⬜ ${label}: already empty`);
        }
        totalDeleted += count;
      } catch (err) {
        if (err.code === "ER_NO_SUCH_TABLE") {
          console.log(`  ⚠️  ${label}: table not found (skipped)`);
        } else {
          console.error(`  ❌ ${label}: ${err.message}`);
        }
      }
    }

    await conn.execute("SET FOREIGN_KEY_CHECKS = 1");

    console.log("==========================================");
    console.log(`✅ Cleanup complete! Total rows deleted: ${totalDeleted}`);
    console.log("");
    console.log("KEPT (untouched):");
    console.log("  • agent_configs (scheduler settings)");
    console.log("  • drip_campaigns + drip_email_steps (email templates)");
    console.log("  • universities + match data");
    console.log("  • blog posts + SEO content");
    console.log("  • counselors + staff accounts");
    console.log("  • competitor profiles");
    console.log("  • checklist items");
  } finally {
    await conn.end();
  }
}

runCleanup().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
