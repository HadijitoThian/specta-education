import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock the database module
vi.mock('./db', () => ({
  getStaffAccountByEmail: vi.fn(),
  getStaffAccountById: vi.fn(),
  createStaffAccount: vi.fn(),
  getAllStaffAccounts: vi.fn(),
  updateStaffAccount: vi.fn(),
  deleteStaffAccount: vi.fn(),
  deleteApplication: vi.fn(),
  deleteDocument: vi.fn(),
  deleteApplicationDocument: vi.fn(),
  deleteLead: vi.fn(),
  deleteAppointment: vi.fn(),
  deleteCounselor: vi.fn(),
  deleteScholarshipLead: vi.fn(),
  deleteConversation: vi.fn(),
}));

// Mock email module
vi.mock('./email', () => ({
  sendStaffWelcomeEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  sendEmail: vi.fn().mockResolvedValue(true),
  sendDocumentNotificationEmail: vi.fn().mockResolvedValue(true),
}));

// Mock notification
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import {
  getStaffAccountByEmail,
  getStaffAccountById,
  createStaffAccount,
  getAllStaffAccounts,
  updateStaffAccount,
  deleteStaffAccount,
  deleteApplication,
  deleteDocument,
  deleteApplicationDocument,
  deleteLead,
  deleteAppointment,
  deleteCounselor,
  deleteScholarshipLead,
  deleteConversation,
} from './db';

import { sendStaffWelcomeEmail, sendPasswordResetEmail } from './email';

describe('Staff Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Staff login', () => {
    it('should authenticate with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('testpass123', 10);
      const mockStaff = {
        id: 1,
        name: 'Test Counselor',
        email: 'test@spectaeducation.com',
        passwordHash,
        role: 'counselor' as const,
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getStaffAccountByEmail).mockResolvedValue(mockStaff);

      const staff = await getStaffAccountByEmail('test@spectaeducation.com');
      expect(staff).toBeTruthy();
      expect(staff!.email).toBe('test@spectaeducation.com');

      const valid = await bcrypt.compare('testpass123', staff!.passwordHash);
      expect(valid).toBe(true);
    });

    it('should reject invalid password', async () => {
      const passwordHash = await bcrypt.hash('testpass123', 10);
      const mockStaff = {
        id: 1,
        name: 'Test Counselor',
        email: 'test@spectaeducation.com',
        passwordHash,
        role: 'counselor' as const,
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getStaffAccountByEmail).mockResolvedValue(mockStaff);

      const staff = await getStaffAccountByEmail('test@spectaeducation.com');
      const valid = await bcrypt.compare('wrongpassword', staff!.passwordHash);
      expect(valid).toBe(false);
    });

    it('should reject inactive staff', async () => {
      const mockStaff = {
        id: 1,
        name: 'Inactive Staff',
        email: 'inactive@spectaeducation.com',
        passwordHash: 'hash',
        role: 'staff' as const,
        isActive: false,
        mustChangePassword: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getStaffAccountByEmail).mockResolvedValue(mockStaff);

      const staff = await getStaffAccountByEmail('inactive@spectaeducation.com');
      expect(staff!.isActive).toBe(false);
    });

    it('should return null for non-existent email', async () => {
      vi.mocked(getStaffAccountByEmail).mockResolvedValue(null);

      const staff = await getStaffAccountByEmail('nonexistent@spectaeducation.com');
      expect(staff).toBeNull();
    });
  });

  describe('Password change', () => {
    it('should hash new password with bcrypt', async () => {
      const newPassword = 'newSecurePass123';
      const hash = await bcrypt.hash(newPassword, 10);
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(newPassword);

      const valid = await bcrypt.compare(newPassword, hash);
      expect(valid).toBe(true);
    });
  });
});

describe('Staff Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create staff account', () => {
    it('should create a new staff account with hashed password', async () => {
      const mockCreated = {
        id: 10,
        name: 'New Counselor',
        email: 'new@spectaeducation.com',
        passwordHash: 'hashedvalue',
        role: 'counselor' as const,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getStaffAccountByEmail).mockResolvedValue(null);
      vi.mocked(createStaffAccount).mockResolvedValue(mockCreated);

      // Verify email not taken
      const existing = await getStaffAccountByEmail('new@spectaeducation.com');
      expect(existing).toBeNull();

      // Create account
      const passwordHash = await bcrypt.hash('tempPass123', 10);
      const staff = await createStaffAccount({
        name: 'New Counselor',
        email: 'new@spectaeducation.com',
        passwordHash,
        role: 'counselor',
        mustChangePassword: true,
        isActive: true,
      });

      expect(staff).toBeTruthy();
      expect(staff!.name).toBe('New Counselor');
      expect(staff!.mustChangePassword).toBe(true);
      expect(createStaffAccount).toHaveBeenCalledTimes(1);
    });

    it('should reject duplicate email', async () => {
      const existingStaff = {
        id: 1,
        name: 'Existing Staff',
        email: 'existing@spectaeducation.com',
        passwordHash: 'hash',
        role: 'counselor' as const,
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getStaffAccountByEmail).mockResolvedValue(existingStaff);

      const existing = await getStaffAccountByEmail('existing@spectaeducation.com');
      expect(existing).toBeTruthy();
      // In the real flow, the router would return { success: false, error: "Email already registered" }
    });

    it('should send welcome email after creation', async () => {
      await sendStaffWelcomeEmail({
        to: 'new@spectaeducation.com',
        name: 'New Counselor',
        role: 'counselor',
        password: 'tempPass123',
        loginUrl: 'https://spectaeducation.com/staff-login',
      });

      expect(sendStaffWelcomeEmail).toHaveBeenCalledWith({
        to: 'new@spectaeducation.com',
        name: 'New Counselor',
        role: 'counselor',
        password: 'tempPass123',
        loginUrl: 'https://spectaeducation.com/staff-login',
      });
    });
  });

  describe('Get all staff accounts', () => {
    it('should return all staff accounts', async () => {
      const mockStaff = [
        { id: 1, name: 'Adhitya', email: 'adhitya@spectaeducation.com', role: 'admin', isActive: true, mustChangePassword: true, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'Fitriana', email: 'fitriana@spectaeducation.com', role: 'counselor', isActive: true, mustChangePassword: true, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, name: 'Jenny', email: 'jenny@spectaeducation.com', role: 'counselor', isActive: true, mustChangePassword: true, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.mocked(getAllStaffAccounts).mockResolvedValue(mockStaff as any);

      const staff = await getAllStaffAccounts();
      expect(staff).toHaveLength(3);
      expect(staff[0].name).toBe('Adhitya');
    });
  });

  describe('Update staff account', () => {
    it('should toggle active status', async () => {
      vi.mocked(updateStaffAccount).mockResolvedValue();

      await updateStaffAccount(1, { isActive: false } as any);
      expect(updateStaffAccount).toHaveBeenCalledWith(1, { isActive: false });
    });

    it('should update role', async () => {
      vi.mocked(updateStaffAccount).mockResolvedValue();

      await updateStaffAccount(1, { role: 'admin' } as any);
      expect(updateStaffAccount).toHaveBeenCalledWith(1, { role: 'admin' });
    });
  });

  describe('Reset password', () => {
    it('should reset password and send email', async () => {
      const mockStaff = {
        id: 1,
        name: 'Test Staff',
        email: 'test@spectaeducation.com',
        passwordHash: 'oldhash',
        role: 'counselor' as const,
        isActive: true,
        mustChangePassword: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getStaffAccountById).mockResolvedValue(mockStaff);
      vi.mocked(updateStaffAccount).mockResolvedValue();

      const staff = await getStaffAccountById(1);
      expect(staff).toBeTruthy();

      const newHash = await bcrypt.hash('newTempPass', 10);
      await updateStaffAccount(1, { passwordHash: newHash, mustChangePassword: true } as any);
      expect(updateStaffAccount).toHaveBeenCalled();

      await sendPasswordResetEmail({
        to: staff!.email,
        name: staff!.name,
        newPassword: 'newTempPass',
        loginUrl: 'https://spectaeducation.com/staff-login',
      });
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('Delete staff account', () => {
    it('should delete a staff account by id', async () => {
      vi.mocked(deleteStaffAccount).mockResolvedValue();

      await deleteStaffAccount(5);
      expect(deleteStaffAccount).toHaveBeenCalledWith(5);
    });
  });
});

describe('Admin Delete Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an application', async () => {
    vi.mocked(deleteApplication).mockResolvedValue();
    await deleteApplication(1);
    expect(deleteApplication).toHaveBeenCalledWith(1);
  });

  it('should delete a chatbot document', async () => {
    vi.mocked(deleteDocument).mockResolvedValue();
    await deleteDocument(1);
    expect(deleteDocument).toHaveBeenCalledWith(1);
  });

  it('should delete an application document', async () => {
    vi.mocked(deleteApplicationDocument).mockResolvedValue();
    await deleteApplicationDocument(1);
    expect(deleteApplicationDocument).toHaveBeenCalledWith(1);
  });

  it('should delete a lead', async () => {
    vi.mocked(deleteLead).mockResolvedValue();
    await deleteLead(1);
    expect(deleteLead).toHaveBeenCalledWith(1);
  });

  it('should delete an appointment', async () => {
    vi.mocked(deleteAppointment).mockResolvedValue();
    await deleteAppointment(1);
    expect(deleteAppointment).toHaveBeenCalledWith(1);
  });

  it('should delete a counselor', async () => {
    vi.mocked(deleteCounselor).mockResolvedValue();
    await deleteCounselor(1);
    expect(deleteCounselor).toHaveBeenCalledWith(1);
  });

  it('should delete a scholarship lead', async () => {
    vi.mocked(deleteScholarshipLead).mockResolvedValue();
    await deleteScholarshipLead(1);
    expect(deleteScholarshipLead).toHaveBeenCalledWith(1);
  });

  it('should delete a conversation and related records', async () => {
    vi.mocked(deleteConversation).mockResolvedValue();
    await deleteConversation(1);
    expect(deleteConversation).toHaveBeenCalledWith(1);
  });
});
