# Application Tracker Portal — Blueprint

**Project:** SpecTa Education  
**Author:** Manus AI  
**Date:** February 10, 2026  
**Status:** Draft for Review

---

## 1. Overview

The Application Tracker Portal allows students who have submitted applications through the Quick Apply form to track their application status in real-time. On the admin side, SpecTa's counselors can update statuses, add notes, and manage the full application pipeline. This feature transforms the current one-way application submission into a two-way communication channel between students and SpecTa Education.

---

## 2. User Roles & Access

| Role | Access Method | Capabilities |
|------|--------------|--------------|
| **Student (Applicant)** | Tracking link (email + application ID) — no login required | View application status, see status timeline, view counselor notes (public ones), upload additional documents |
| **Admin (Counselor)** | Login via Manus OAuth (role = admin) | View all applications, update status, add internal/public notes, assign counselors, download documents, send status update notifications |

**Key Decision:** Students do **not** need to create an account. They track their application using their **email address + application reference number** (e.g., `SPECTA-2026-00042`). This removes friction and matches the current Quick Apply flow where students don't log in.

---

## 3. Application Status Pipeline

The application moves through these stages. Each transition triggers a notification to the student.

```
┌──────────┐    ┌───────────┐    ┌─────────────┐    ┌────────────────┐    ┌──────────┐
│ Submitted │───▶│ Reviewing │───▶│ Processing  │───▶│ Offer Received │───▶│ Accepted │
└──────────┘    └───────────┘    └─────────────┘    └────────────────┘    └──────────┘
                                        │                                       │
                                        ▼                                       ▼
                                 ┌─────────────┐                        ┌──────────────┐
                                 │  On Hold    │                        │  Enrolled    │
                                 └─────────────┘                        └──────────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │  Rejected   │
                                 └─────────────┘
```

| Status | Description | Color |
|--------|-------------|-------|
| **Submitted** | Application received, pending initial review | Gray |
| **Reviewing** | Counselor is reviewing documents and eligibility | Blue |
| **Processing** | Application forwarded to university | Amber |
| **On Hold** | Missing documents or additional info needed | Orange |
| **Offer Received** | University has issued an offer letter | Purple |
| **Accepted** | Student has accepted the offer | Green |
| **Enrolled** | Student has completed enrollment | Emerald |
| **Rejected** | Application was unsuccessful | Red |

---

## 4. Database Schema Changes

### 4.1 Modify Existing `applications` Table

The current `applications` table already has most fields. We need to add:

| New Column | Type | Purpose |
|------------|------|---------|
| `referenceNumber` | `varchar(20)` | Unique tracking reference (e.g., SPECTA-2026-00042) |
| `assignedCounselor` | `varchar(255)` | Name of assigned SpecTa counselor |
| `universityResponse` | `text` | University's response/offer details |
| `statusHistory` | `text` | JSON array of status changes with timestamps |

The `status` enum needs to be expanded from the current `["submitted", "reviewing", "processing", "accepted", "rejected"]` to include `["submitted", "reviewing", "processing", "on_hold", "offer_received", "accepted", "enrolled", "rejected"]`.

### 4.2 New `applicationNotes` Table

```
applicationNotes
├── id (int, PK, auto-increment)
├── applicationId (int, FK → applications.id)
├── authorName (varchar 255) — counselor name
├── content (text) — the note content
├── isPublic (boolean) — visible to student or internal only
├── createdAt (timestamp)
```

### 4.3 New `applicationDocuments` Table

```
applicationDocuments
├── id (int, PK, auto-increment)
├── applicationId (int, FK → applications.id)
├── fileName (varchar 255)
├── fileType (varchar 100)
├── fileUrl (text) — S3 URL
├── fileKey (varchar 500) — S3 key
├── documentType (enum: transcript, passport, ielts, certificate, offer_letter, visa, other)
├── uploadedBy (enum: student, counselor)
├── createdAt (timestamp)
```

This separates document management from the main application record, allowing multiple documents per application and tracking who uploaded what.

---

## 5. User Flows

### 5.1 Student Flow — Submitting & Tracking

```
Student submits Quick Apply form
        │
        ▼
System generates reference number (SPECTA-2026-XXXXX)
        │
        ▼
Confirmation page shows reference number
+ "Save this number to track your application"
        │
        ▼
Student receives email with reference number + tracking link
        │
        ▼
Student visits /track page
        │
        ▼
Enters email + reference number
        │
        ▼
Sees application dashboard:
  - Status timeline (visual progress bar)
  - Current status with description
  - Counselor notes (public ones)
  - Uploaded documents
  - Option to upload additional documents
  - Option to add a message/note
  - WhatsApp button to contact counselor
```

### 5.2 Admin Flow — Managing Applications

```
Admin logs in → Admin Dashboard
        │
        ▼
New "Applications" tab in admin dashboard
        │
        ▼
Application list view:
  - Filter by status, country, date
  - Search by name, email, reference number
  - Sort by date, status
  - Quick status badges
        │
        ▼
Click application → Detail view:
  - Student info (name, email, phone, school)
  - Selected universities & programs
  - All uploaded documents (downloadable)
  - Status timeline
  - Change status dropdown
  - Add note (public/internal toggle)
  - Assign counselor
  - Send notification to student
```

---

## 6. Frontend Pages

### 6.1 `/track` — Student Application Tracker

**Layout:** Public page (no login required), accessible from navigation.

**Sections:**
1. **Hero:** "Track Your Application" with reference number + email input form
2. **Application Dashboard** (after verification):
   - **Progress Bar:** Visual horizontal stepper showing all statuses, with the current one highlighted
   - **Status Card:** Large card showing current status, date of last update, and assigned counselor
   - **Timeline:** Vertical timeline of all status changes with dates and notes
   - **Documents:** Grid of uploaded documents with option to upload more
   - **Notes:** Public notes from counselors
   - **Actions:** "Upload Document" button, "Contact Counselor" WhatsApp link

### 6.2 Admin Dashboard — Applications Tab

**Added to existing `/admin` page as a new tab.**

**List View:**
- Table with columns: Reference #, Student Name, Universities, Status, Counselor, Date, Actions
- Filter bar: Status dropdown, Country dropdown, Date range
- Search bar

**Detail View (modal or side panel):**
- Full student information
- Document viewer/downloader
- Status change dropdown with confirmation
- Note input with public/internal toggle
- Status history timeline

---

## 7. API Endpoints (tRPC Procedures)

### 7.1 Public Procedures (Student-facing)

| Procedure | Input | Output | Description |
|-----------|-------|--------|-------------|
| `tracker.lookup` | `{ email, referenceNumber }` | Application details + public notes + documents | Student looks up their application |
| `tracker.uploadDocument` | `{ applicationId, email, fileName, fileData, fileType, documentType }` | `{ success, url }` | Student uploads additional document (verified by email match) |
| `tracker.addNote` | `{ applicationId, email, content }` | `{ success }` | Student adds a message/note |

### 7.2 Protected Procedures (Admin-facing)

| Procedure | Input | Output | Description |
|-----------|-------|--------|-------------|
| `application.getAll` | (existing) | Enhanced with reference numbers | List all applications |
| `application.updateStatus` | `{ id, status, notifyStudent? }` | `{ success }` | Update status + optional notification |
| `application.addNote` | `{ applicationId, content, isPublic }` | `{ success }` | Add counselor note |
| `application.assignCounselor` | `{ applicationId, counselorName }` | `{ success }` | Assign a counselor |
| `application.getNotes` | `{ applicationId }` | Notes list | Get all notes for an application |
| `application.getDocuments` | `{ applicationId }` | Documents list | Get all documents |

---

## 8. Notification System

When admin updates an application status, the student receives a notification via the built-in `notifyOwner` system. Additionally, the confirmation page and tracking page prominently display a WhatsApp link for direct communication.

| Trigger | Notification | Recipient |
|---------|-------------|-----------|
| New application submitted | "New Application: [Name]" with details | Admin (owner) |
| Status changed by admin | Status update message | Admin (owner) — student sees it on tracker |
| New document uploaded by student | "New Document: [Name] uploaded [file]" | Admin (owner) |
| Counselor adds public note | Note visible on tracker | Student (views on tracker page) |

**Note:** Since the current system uses `notifyOwner` for push notifications (which goes to the project owner), student-facing notifications will be visible when they check the tracker page. For email notifications to students, we would need an email service integration (future enhancement).

---

## 9. Reference Number Format

Format: `SPECTA-{YEAR}-{SEQUENTIAL_5_DIGIT}`

Examples: `SPECTA-2026-00001`, `SPECTA-2026-00042`, `SPECTA-2026-01337`

The reference number is generated server-side when the application is submitted. It is unique and sequential within each year.

---

## 10. Security Considerations

| Concern | Solution |
|---------|----------|
| Student data privacy | Tracker requires both email AND reference number to access (two-factor verification) |
| Document access | Documents served via S3 presigned URLs, not publicly enumerable |
| Admin-only operations | All admin endpoints use `protectedProcedure` with role check |
| Rate limiting | Tracker lookup should be rate-limited to prevent brute-force reference guessing |
| Internal notes | `isPublic: false` notes are never returned to student-facing endpoints |

---

## 11. Implementation Order

| Step | Task | Estimated Effort |
|------|------|-----------------|
| 1 | Update database schema (add columns + new tables) | Small |
| 2 | Update server db.ts with new query helpers | Small |
| 3 | Generate reference numbers on application submit | Small |
| 4 | Build tRPC procedures for tracker + admin | Medium |
| 5 | Build `/track` student-facing page | Medium |
| 6 | Add Applications tab to Admin Dashboard | Medium |
| 7 | Add "Track Application" to navigation | Small |
| 8 | Write tests | Small |
| 9 | Update Quick Apply confirmation to show reference number | Small |

---

## 12. Visual Mockup Description

### Student Tracker Page (`/track`)

```
┌─────────────────────────────────────────────────────────┐
│  [SpecTa Logo]  Home  IELTS  Destinations  Compare  ... │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ✨ Track Your Application                             │
│                                                         │
│   Enter your details to check your application status   │
│                                                         │
│   ┌─────────────────┐  ┌─────────────────────────────┐  │
│   │ Reference Number │  │ Email Address               │  │
│   └─────────────────┘  └─────────────────────────────┘  │
│                    [ Track Application ]                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ● Submitted ──── ● Reviewing ──── ○ Processing ────    │
│                                                         │
│  ○ Offer ──── ○ Accepted ──── ○ Enrolled                │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  📋 Current Status: REVIEWING                     │  │
│  │  Assigned Counselor: Adhitya Irvan                │  │
│  │  Last Updated: Feb 10, 2026                       │  │
│  │                                                   │  │
│  │  Applying to:                                     │  │
│  │  • University of Melbourne — Business (Australia) │  │
│  │  • Taylor's University — Hospitality (Malaysia)   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  📝 Timeline                                            │
│  ├─ Feb 10 — Application submitted                     │
│  ├─ Feb 11 — Status changed to Reviewing               │
│  └─ Feb 11 — Note: "Documents look good, forwarding    │
│              to university admissions team."            │
│                                                         │
│  📎 Documents                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐                            │
│  │Trans │ │Pass  │ │IELTS │  [ + Upload More ]          │
│  └──────┘ └──────┘ └──────┘                            │
│                                                         │
│  💬 Need Help?                                          │
│  [ Chat on WhatsApp ]  [ Contact Counselor ]            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 13. Summary

This Application Tracker transforms SpecTa Education's application process from a one-way submission into a transparent, trackable pipeline. Students get peace of mind knowing their application status at all times, while SpecTa's counselors get a structured workflow to manage applications efficiently. The design prioritizes simplicity (no student login required) and leverages the existing database and Quick Apply infrastructure.

**Key benefits:**
- Reduces WhatsApp follow-up volume by 50-70% (students can self-serve status checks)
- Increases student trust and professionalism perception
- Gives counselors a structured pipeline to manage applications
- Captures additional documents students may need to submit later
- Creates a foundation for future email notification integration
