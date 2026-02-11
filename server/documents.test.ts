import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getAllDocuments: vi.fn().mockResolvedValue([
    { id: 1, fileName: 'transcript.pdf', documentType: 'transcript', fileUrl: 'https://s3.example.com/doc1.pdf', conversationId: 1, createdAt: new Date() },
    { id: 2, fileName: 'passport.pdf', documentType: 'passport', fileUrl: 'https://s3.example.com/doc2.pdf', conversationId: 2, createdAt: new Date() },
  ]),
  getAllApplicationDocuments: vi.fn().mockResolvedValue([
    { id: 1, applicationId: 10, documentType: 'transcript', fileName: 'grades.pdf', fileUrl: 'https://s3.example.com/app1.pdf', uploadedBy: 'student', createdAt: new Date(), studentName: 'John Doe', studentEmail: 'john@example.com', referenceNumber: 'SA-2025-001' },
    { id: 2, applicationId: 10, documentType: 'passport', fileName: 'passport-scan.pdf', fileUrl: 'https://s3.example.com/app2.pdf', uploadedBy: 'student', createdAt: new Date(), studentName: 'John Doe', studentEmail: 'john@example.com', referenceNumber: 'SA-2025-001' },
    { id: 3, applicationId: 11, documentType: 'ielts', fileName: 'ielts-cert.pdf', fileUrl: 'https://s3.example.com/app3.pdf', uploadedBy: 'student', createdAt: new Date(), studentName: 'Jane Smith', studentEmail: 'jane@example.com', referenceNumber: 'SA-2025-002' },
  ]),
  createApplicationDocument: vi.fn().mockResolvedValue({ id: 100 }),
  createApplication: vi.fn().mockResolvedValue({ id: 50 }),
  generateReferenceNumber: vi.fn().mockResolvedValue('SA-2025-TEST'),
}));

// Mock the email module
vi.mock('./email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  sendDocumentNotificationEmail: vi.fn().mockResolvedValue(true),
}));

// Mock notification
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { getAllDocuments, getAllApplicationDocuments, createApplicationDocument } from './db';
import { sendEmail, sendDocumentNotificationEmail } from './email';

describe('Document Management System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllDocuments (chatbot docs)', () => {
    it('should return chatbot-uploaded documents', async () => {
      const docs = await getAllDocuments();
      expect(docs).toHaveLength(2);
      expect(docs[0].fileName).toBe('transcript.pdf');
      expect(docs[1].documentType).toBe('passport');
    });
  });

  describe('getAllApplicationDocuments (unified view)', () => {
    it('should return application documents with student info', async () => {
      const docs = await getAllApplicationDocuments();
      expect(docs).toHaveLength(3);
      expect(docs[0].studentName).toBe('John Doe');
      expect(docs[0].studentEmail).toBe('john@example.com');
      expect(docs[0].referenceNumber).toBe('SA-2025-001');
    });

    it('should include documents from multiple applications', async () => {
      const docs = await getAllApplicationDocuments();
      const uniqueApps = new Set(docs.map((d: any) => d.applicationId));
      expect(uniqueApps.size).toBe(2);
    });

    it('should include document type information', async () => {
      const docs = await getAllApplicationDocuments();
      const types = docs.map((d: any) => d.documentType);
      expect(types).toContain('transcript');
      expect(types).toContain('passport');
      expect(types).toContain('ielts');
    });
  });

  describe('createApplicationDocument (linking Quick Apply docs)', () => {
    it('should create a document entry with correct fields', async () => {
      const result = await createApplicationDocument({
        applicationId: 50,
        documentType: 'transcript',
        fileName: 'grades.pdf',
        fileType: 'application/pdf',
        fileUrl: 'https://s3.example.com/new-doc.pdf',
        fileKey: 'applications/abc123-grades.pdf',
        uploadedBy: 'student',
      });
      
      expect(result).toEqual({ id: 100 });
      expect(createApplicationDocument).toHaveBeenCalledWith({
        applicationId: 50,
        documentType: 'transcript',
        fileName: 'grades.pdf',
        fileType: 'application/pdf',
        fileUrl: 'https://s3.example.com/new-doc.pdf',
        fileKey: 'applications/abc123-grades.pdf',
        uploadedBy: 'student',
      });
    });
  });

  describe('Document notification emails', () => {
    it('should send document notification email with correct params', async () => {
      const result = await sendDocumentNotificationEmail({
        to: 'hadi@spectaeducation.com',
        studentName: 'John Doe',
        studentEmail: 'john@example.com',
        documentType: 'transcript',
        fileName: 'grades.pdf',
        source: 'application',
        referenceNumber: 'SA-2025-001',
        dashboardUrl: 'https://spectaeducation.com/admin',
      });

      expect(result).toBe(true);
      expect(sendDocumentNotificationEmail).toHaveBeenCalledWith({
        to: 'hadi@spectaeducation.com',
        studentName: 'John Doe',
        studentEmail: 'john@example.com',
        documentType: 'transcript',
        fileName: 'grades.pdf',
        source: 'application',
        referenceNumber: 'SA-2025-001',
        dashboardUrl: 'https://spectaeducation.com/admin',
      });
    });

    it('should send generic email with correct params', async () => {
      const result = await sendEmail({
        to: 'test@spectaeducation.com',
        subject: 'Welcome to SpecTa Education',
        html: '<h1>Welcome!</h1>',
      });

      expect(result).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@spectaeducation.com',
        subject: 'Welcome to SpecTa Education',
        html: '<h1>Welcome!</h1>',
      });
    });
  });

  describe('Unified document view logic', () => {
    it('should combine chatbot and application documents', async () => {
      const chatbotDocs = await getAllDocuments();
      const appDocs = await getAllApplicationDocuments();
      
      const totalDocs = chatbotDocs.length + appDocs.length;
      expect(totalDocs).toBe(5);
    });

    it('should support filtering by student name', async () => {
      const appDocs = await getAllApplicationDocuments();
      
      const johnDocs = appDocs.filter((d: any) => d.studentName === 'John Doe');
      expect(johnDocs).toHaveLength(2);
      
      const janeDocs = appDocs.filter((d: any) => d.studentName === 'Jane Smith');
      expect(janeDocs).toHaveLength(1);
    });

    it('should support search by reference number', async () => {
      const appDocs = await getAllApplicationDocuments();
      
      const searchResult = appDocs.filter((d: any) => 
        d.referenceNumber?.toLowerCase().includes('sa-2025-001')
      );
      expect(searchResult).toHaveLength(2);
    });
  });
});
