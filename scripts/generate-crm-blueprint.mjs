/**
 * One-off: render the SpecTa Education internal-CRM blueprint as a branded PDF
 * the owner can read/print. Uses the same pdfmake setup as the IELTS report.
 *
 *   node scripts/generate-crm-blueprint.mjs
 *
 * Output: SpecTa-CRM-Blueprint.pdf in the repo root.
 */
// @ts-ignore - pdfmake printer lacks types
import PdfPrinterModule from "pdfmake/js/Printer.js";
import { writeFileSync } from "node:fs";

const PdfPrinter = PdfPrinterModule.default || PdfPrinterModule;

const FONTS = {
  Roboto: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const PINK = "#E91E8C";
const PURPLE = "#9C27B0";
const DARK = "#1f2937";
const GREY = "#6b7280";
const LIGHT = "#f3f4f6";

// ---- small content helpers -------------------------------------------------
const h1 = text => ({ text, fontSize: 16, bold: true, color: PURPLE, margin: [0, 18, 0, 6] });
const h2 = text => ({ text, fontSize: 12.5, bold: true, color: PINK, margin: [0, 12, 0, 4] });
const p = text => ({ text, fontSize: 10.5, color: DARK, margin: [0, 0, 0, 6], lineHeight: 1.25 });
const note = text => ({ text, fontSize: 9.5, italics: true, color: GREY, margin: [0, 0, 0, 6] });
const bullets = items => ({
  ul: items.map(t => ({ text: t, fontSize: 10.5, color: DARK, margin: [0, 1, 0, 1], lineHeight: 1.2 })),
  margin: [0, 0, 0, 8],
});
function table(headers, rows, widths) {
  return {
    table: {
      headerRows: 1,
      widths: widths || headers.map(() => "*"),
      body: [
        headers.map(h => ({ text: h, bold: true, fontSize: 9.5, color: "white", fillColor: PURPLE, margin: [4, 4, 4, 4] })),
        ...rows.map((r, i) =>
          r.map(c => ({
            text: c,
            fontSize: 9.5,
            color: DARK,
            fillColor: i % 2 ? LIGHT : "white",
            margin: [4, 3, 4, 3],
          }))
        ),
      ],
    },
    layout: { hLineWidth: () => 0.4, vLineWidth: () => 0.4, hLineColor: () => "#e5e7eb", vLineColor: () => "#e5e7eb" },
    margin: [0, 2, 0, 10],
  };
}

const content = [];

// ---- Cover ------------------------------------------------------------------
content.push(
  { text: "SpecTa Education", fontSize: 26, bold: true, color: PINK, margin: [0, 60, 0, 0] },
  { text: "Internal CRM & Parent-Update System", fontSize: 18, bold: true, color: PURPLE, margin: [0, 4, 0, 0] },
  { text: "Blueprint — Draft v1 for review", fontSize: 13, color: GREY, margin: [0, 8, 0, 0] },
  {
    text: "Prepared for Hadi Jito Thian (Founder/CEO). This document describes WHAT we will build and HOW we will work — before any code is written. Everything here is a proposal: please mark anything you want changed.",
    fontSize: 10.5,
    color: DARK,
    margin: [0, 30, 0, 0],
    lineHeight: 1.3,
  },
  { text: "Generated " + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), fontSize: 9, color: GREY, margin: [0, 24, 0, 0] },
  { text: "", pageBreak: "after" }
);

// ---- 1. Goal ----------------------------------------------------------------
content.push(h1("1. The Goal"));
content.push(p("Build one internal dashboard where your whole team works on every student — replacing today's mix of spreadsheets, WhatsApp and email — and which automatically delivers the promise on your website: a progress report to every parent, every Monday morning."));
content.push(h2("Guiding principles"));
content.push(bullets([
  "Easier than a spreadsheet. If logging a student update takes more than ~5 seconds, counselors won't do it, and the Monday reports will be empty. Speed of data entry is the #1 design goal.",
  "One source of truth. Every student exists exactly once. Everything (notes, documents, IELTS, applications) hangs off that one record.",
  "The parent promise must be reliable. Better to send a short honest update than a blank one — the system actively flags students with nothing to report.",
  "You can see everything. As owner you monitor the whole team's activity, the pipeline, and every Monday report from one screen.",
  "Build on what works. We keep the proven plumbing (email, file storage, payments, login) and rebuild only the CRM cleanly.",
]));

// ---- 2. System boundary -----------------------------------------------------
content.push(h1("2. How it fits with your WhatsApp bot"));
content.push(p("Two specialised systems with a clear boundary, talking over the internet:"));
content.push(bullets([
  "The CRM (this dashboard) = the system of record. Student data, the pipeline, documents, tasks, parent contacts and the Monday reports all live here.",
  "Your WhatsApp bot = the messaging channel + AI assistant. It keeps doing what it already does (replying to students, helping counselors, reading transcript photos, sending you reports).",
]));
content.push(p("They connect both ways: the CRM asks the bot to SEND messages (Monday reports, team nudges); the bot pushes things it captures (a transcript it read, info it gathered) back INTO the CRM. The student's phone number links the two systems. Wiring this is a later phase and is handled entirely on my side — you won't need to touch it."));
content.push(note("For now, counselors keep using their personal WhatsApp with students. The bot's number is used only for parent reports and internal notifications, so nothing about how the team works today is disrupted."));

// ---- 3. Roles ---------------------------------------------------------------
content.push(h1("3. Who uses it — one login, five roles"));
content.push(p("Everyone signs in to the same dashboard; what they see and can do depends on their role and which office they belong to (Kelapa Gading, PIK, Gading Serpong)."));
content.push(table(
  ["Role", "What they can do"],
  [
    ["Owner / Admin (you)", "See and edit everything across all offices. Monitor team activity. Approve & send parent reports. Manage team members and settings."],
    ["Education Counselor", "Manage their assigned students: log activity, advance the stage, upload documents, set tasks, draft the parent report."],
    ["IELTS Instructor", "See students in IELTS prep, log IELTS milestones and mock-test results."],
    ["Visa Specialist", "See students in the visa stage, log visa progress and documents."],
    ["Front Desk", "Add new walk-in students/leads, book consultations, see basic info."],
  ],
  ["28%", "72%"]
));
content.push(note("Default proposal: counselors fully manage their OWN students and can VIEW (read-only) others; the owner sees and edits all. Tell me if you'd rather counselors not see each other's students at all."));

// ---- 4. Student record ------------------------------------------------------
content.push(h1("4. The Student record (the spine)"));
content.push(p("One profile per student that ties everything together. Proposed fields:"));
content.push(table(
  ["Group", "Fields"],
  [
    ["Student", "Full name, WhatsApp phone, email, date of birth (optional)"],
    ["Parent / Guardian", "Name, WhatsApp phone, email  — this is what powers the Monday report"],
    ["Assignment", "Office, assigned counselor, source (referral / ads / walk-in / website / aptitude test / IELTS mock)"],
    ["Goals", "Target country, program / major, study level, target intake (e.g. Sept 2026)"],
    ["Services", "Which services engaged: Counseling, IELTS Prep, Scholarship, Visa (can be several)"],
    ["Status", "Current pipeline stage + overall status (active / enrolled / inactive)"],
  ],
  ["24%", "76%"]
));

// ---- 5. The 9-stage journey -------------------------------------------------
content.push(h1("5. The student journey — 9 stages"));
content.push(p("Each student sits at one stage; moving stages is one click and is recorded automatically on their timeline."));
content.push(table(
  ["#", "Stage", "Meaning"],
  [
    ["1", "New Lead", "Just made contact; not yet consulted."],
    ["2", "Consultation", "Had (or booked) the first counseling session."],
    ["3", "IELTS Prep", "Enrolled in / preparing for IELTS."],
    ["4", "University Shortlist", "Counselor has proposed target universities."],
    ["5", "Application", "Applications submitted to universities."],
    ["6", "Offer Received", "At least one offer in hand; choosing."],
    ["7", "Visa Process", "Preparing / submitting the student visa."],
    ["8", "Pre-Departure", "Visa granted; accommodation & travel logistics."],
    ["9", "Enrolled", "Arrived and studying abroad. 🎓"],
  ],
  ["6%", "26%", "68%"]
));
content.push(note("There is also an off-pipeline 'Inactive / Lost' status for students who go quiet, so they leave the active funnel but aren't deleted."));

// ---- 6. Activity logging ----------------------------------------------------
content.push(h1("6. Activity logging — the engine"));
content.push(p("Every meaningful action becomes a dated entry on the student's timeline. This is what the Monday report and your monitoring are built from. Logging is a single quick action from the student's page:"));
content.push(bullets([
  "Call / WhatsApp / Meeting / Email — counselor picks the type and writes one line.",
  "Document received / verified — e.g. passport, transcript, IELTS certificate.",
  "IELTS milestone — mock score, class attended.",
  "Application submitted · Offer received · Visa update — the big pipeline moments.",
  "Stage change & notes — recorded automatically when you move a student forward.",
]));
content.push(p("Each entry has a 'show this to the parent?' toggle, so sensitive internal notes stay private while genuine progress flows into the Monday report."));

// ---- 7. Monday report -------------------------------------------------------
content.push(h1("7. The Monday Parent Report — review, then send"));
content.push(p("Your flagship promise, automated but with a human check (as you chose):"));
content.push(table(
  ["When", "What happens"],
  [
    ["Sunday evening", "System auto-DRAFTS a report for every active student that has a parent contact — using this week's parent-visible activity + the student's current snapshot."],
    ["Monday morning", "Drafts wait in a 'Parent Reports — Review' queue. The counselor (or you) can tweak the summary line, toggle which items show, add a personal note, or skip a student."],
    ["Monday 09:00 WIB", "Approved reports send automatically — by email now, by WhatsApp later (via your bot). Every send is logged."],
    ["After sending", "Your cockpit shows: queued / approved / sent / failed, so nothing silently fails."],
  ],
  ["22%", "78%"]
));
content.push(h2("What the parent sees"));
content.push(bullets([
  "A warm branded (pink/purple, SpecTa logo) email addressed to the parent by name.",
  "Student name, current stage, target country / program / level / intake.",
  "Documents ready (e.g. 3/5 submitted).",
  "This week's activity list (only the parent-visible items).",
  "A short 'what happens next' line and your contact details.",
  "Bilingual — Indonesian + English.",
]));
content.push(note("Open decision: if a draft is NOT reviewed by 09:00, should we (a) send it anyway if it has real content, or (b) hold it for you? My recommendation: send if it has content, hold & flag if it would be empty."));

// ---- 8. Screens -------------------------------------------------------------
content.push(h1("8. The screens"));
content.push(h2("Counselor workspace (the daily driver)"));
content.push(bullets([
  "My Students — a list filtered by stage, with a search box and 'needs attention' markers.",
  "Student 360 page — contact + parent + stage at the top; timeline, documents, and tasks below; a quick-log bar always in reach.",
  "My Tasks Today — follow-ups due, so nothing slips.",
  "Add Student — fast intake for walk-ins and calls.",
]));
content.push(h2("Owner cockpit (your monitoring view)"));
content.push(bullets([
  "Pipeline funnel — how many students at each of the 9 stages.",
  "Team activity this week — per counselor: students touched, updates logged, tasks done.",
  "Attention alerts — students with no activity in X days, students missing a parent contact, students with nothing to report this week.",
  "This Monday's reports — queued / approved / sent / failed at a glance.",
  "New leads & conversions over time.",
]));
content.push(h2("Admin"));
content.push(bullets([
  "Team members — add/edit people, set role & office, deactivate leavers.",
  "Settings — report timing, the report template, the stage names.",
]));

// ---- 9. Data model ----------------------------------------------------------
content.push(h1("9. Data model (for the record)"));
content.push(p("Clean new tables for the CRM (built additively — nothing existing is disturbed):"));
content.push(table(
  ["Table", "Holds"],
  [
    ["students", "The one profile per student (section 4)."],
    ["student_activities", "The timeline entries (section 6), each with a 'visible to parent' flag."],
    ["student_documents", "Files (passport, transcript, IELTS, offer, visa…) with status."],
    ["tasks", "Follow-ups assigned to a team member, with due dates."],
    ["parent_reports", "Each weekly report: draft → approved → sent/failed, with what was sent."],
    ["users (reused)", "Team logins, extended with role + office."],
  ],
  ["32%", "68%"]
));

// ---- 10. Phases -------------------------------------------------------------
content.push(h1("10. How we build it — phases"));
content.push(p("Each phase is shippable and testable on the live site. You try it, I fix, then we move on."));
content.push(table(
  ["Phase", "What you get", "Why"],
  [
    ["1. Foundation", "Clean data model + single login + roles & offices + team management.", "The base everything sits on."],
    ["2. Counselor workspace", "Student profiles, the 9-stage pipeline, 5-second activity logging, documents, tasks.", "Makes real data exist."],
    ["3. The parent promise", "Monday auto-draft → review → send by email + delivery log.", "Delivers your headline promise."],
    ["4. Your cockpit", "Funnel, team monitoring, attention alerts, reports panel.", "Lets you run the team."],
    ["5. WhatsApp + onboarding", "Wire your bot (both ways); import your spreadsheets.", "Full channel + real data in."],
  ],
  ["18%", "52%", "30%"]
));

// ---- 11. Decisions ----------------------------------------------------------
content.push(h1("11. Decisions to confirm"));
content.push(p("A few choices shape the build. My recommendation is in brackets — just tell me if you disagree."));
content.push(bullets([
  "Unreviewed Monday drafts: auto-send if they have content, or always hold for you?  [send if it has content; hold & flag if empty]",
  "Parent report language: Indonesian only, English only, or both?  [both / bilingual]",
  "Should counselors see each other's students (read-only) or only their own?  [read-only others; you see all]",
  "Do enrolled (graduated-out) students still get weekly reports?  [no — they leave the active list]",
  "How do new students mainly enter — counselors typing them in, website forms, or the bot?  [all three feed in]",
  "Where should team members log in — the same /admin area, or a dedicated workspace URL?  [a clean dedicated CRM workspace]",
]));

// ---- 12. Working together ---------------------------------------------------
content.push(h1("12. How we'll work together"));
content.push(bullets([
  "We agree on this blueprint first (mark anything to change).",
  "I build phase by phase; each phase deploys to the live site for you to try.",
  "You test and tell me what's wrong; I fix before starting the next phase.",
  "I confirm with you before each new phase, and give you the exact one-line command whenever the database needs an update.",
  "This document stays our shared plan — we update it as decisions are made.",
]));
content.push({ text: "End of blueprint — your feedback drives v2.", fontSize: 10, italics: true, color: GREY, margin: [0, 16, 0, 0] });

// ---- Render -----------------------------------------------------------------
const docDef = {
  pageSize: "A4",
  pageMargins: [48, 54, 48, 54],
  defaultStyle: { font: "Roboto", fontSize: 10.5, color: DARK },
  footer: (currentPage, pageCount) =>
    currentPage === 1
      ? null
      : {
          columns: [
            { text: "SpecTa Education — CRM Blueprint (Draft v1)", fontSize: 8, color: GREY, margin: [48, 0, 0, 0] },
            { text: `${currentPage} / ${pageCount}`, fontSize: 8, color: GREY, alignment: "right", margin: [0, 0, 48, 0] },
          ],
        },
  content,
};

const printer = new PdfPrinter(FONTS);
const pdfDoc = await printer.createPdfKitDocument(docDef);
const chunks = [];
await new Promise((resolve, reject) => {
  pdfDoc.on("data", c => chunks.push(c));
  pdfDoc.on("end", resolve);
  pdfDoc.on("error", reject);
  pdfDoc.end();
});
const out = "SpecTa-CRM-Blueprint.pdf";
writeFileSync(out, Buffer.concat(chunks));
console.log(`Wrote ${out} (${Buffer.concat(chunks).length} bytes)`);
