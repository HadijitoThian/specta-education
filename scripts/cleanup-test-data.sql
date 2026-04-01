-- ============================================================
-- SpecTa Education — Test Data Cleanup Script
-- Deletes ALL student/lead data to start fresh
-- KEEPS: system config, templates, universities, blog, agents
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── Student Portal ──────────────────────────────────────────
DELETE FROM student_notifications;
DELETE FROM student_rewards;
DELETE FROM student_referrals;
DELETE FROM student_referral_codes;
DELETE FROM student_ai_chat_history;
DELETE FROM student_university_wishlist;
DELETE FROM student_portal_appointments;
DELETE FROM student_portal_profiles;
DELETE FROM student_portal_accounts;
DELETE FROM student_visa_tracking;
DELETE FROM student_applications;

-- ── CRM Student Data ────────────────────────────────────────
DELETE FROM crm_notifications;
DELETE FROM crm_activity_timeline;
DELETE FROM crm_appointments;
DELETE FROM crm_student_documents;
DELETE FROM crm_chat_history;
DELETE FROM ai_followup_suggestions;
DELETE FROM consultation_notes;
DELETE FROM staff_team_chat;

-- ── Leads & Pipeline ────────────────────────────────────────
DELETE FROM follow_up_actions;
DELETE FROM lead_assignments;
DELETE FROM lead_pipeline_stages;
DELETE FROM crm_tasks;
DELETE FROM counselor_performance;

-- ── Legacy Lead Tables ──────────────────────────────────────
DELETE FROM applications;
DELETE FROM application_notes;
DELETE FROM application_documents;
DELETE FROM appointments;
DELETE FROM whatsapp_messages;
DELETE FROM documents;
DELETE FROM leads;
DELETE FROM scholarship_leads;

-- ── Drip Campaign Enrollments & Logs (keep templates) ───────
DELETE FROM drip_email_logs;
DELETE FROM drip_enrollments;

-- ── Quiz / Aptitude / Simulator Results ─────────────────────
DELETE FROM aptitude_results;
DELETE FROM aptitude_access_tokens;
DELETE FROM aptitude_pro_orders;
DELETE FROM quiz_results;
DELETE FROM persona_results;
DELETE FROM ielts_practice_results;
DELETE FROM simulator_choices;
DELETE FROM simulator_results;
DELETE FROM simulator_sessions;
DELETE FROM user_checklist_progress;

-- ── Chatbot Conversations ────────────────────────────────────
DELETE FROM messages;
DELETE FROM conversations;

-- ── Visitor Tracking ────────────────────────────────────────
DELETE FROM visitor_tracking;
DELETE FROM tracking_tokens;

-- ── Agent Run Logs & Reports (clean slate) ──────────────────
DELETE FROM agent_run_logs;
DELETE FROM daily_reports;
DELETE FROM gm_executive_reports;
DELETE FROM gm_health_checks;
DELETE FROM gm_recommendations;

-- ── Social / Competitor Data (refresh on next run) ──────────
DELETE FROM social_mentions;
DELETE FROM university_reply_queue;

-- ── Manus OAuth Users (test logins) ─────────────────────────
DELETE FROM users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- KEPT (not deleted):
--   agent_configs           — scheduler settings
--   drip_campaigns          — campaign templates
--   drip_email_steps        — email step templates
--   blog_categories/posts/tags/comments — content
--   universities / match_universities / match_programs
--   cost_of_living_data
--   checklist_items
--   counselors / staff_accounts
--   competitor_profiles / competitor_intelligence
--   university_partnerships
--   seo_content_calendar / seo_page_audits / seo_recommendations / seo_score_history
-- ============================================================
