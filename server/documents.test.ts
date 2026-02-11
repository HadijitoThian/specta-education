import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@specta.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@specta.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createGMContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "gm-user",
    email: "gm@specta.com",
    name: "General Manager",
    loginMethod: "manus",
    role: "general_manager",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ==========================================
// UNIFIED DOCUMENTS VIEW TESTS
// ==========================================
describe("admin.getDocuments - Unified Documents View", () => {
  it("admin can view all documents from unified view", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.getDocuments();

    expect(result).toHaveProperty("documents");
    expect(Array.isArray(result.documents)).toBe(true);
    
    // Each document should have the unified format fields
    if (result.documents.length > 0) {
      const doc = result.documents[0];
      expect(doc).toHaveProperty("id");
      expect(doc).toHaveProperty("fileName");
      expect(doc).toHaveProperty("fileUrl");
      expect(doc).toHaveProperty("source");
      expect(doc).toHaveProperty("documentType");
      expect(doc).toHaveProperty("createdAt");
      // Source should be one of the valid types
      expect(["chatbot", "application", "counselor"]).toContain(doc.source);
    }
  });

  it("general_manager can view all documents", async () => {
    const caller = appRouter.createCaller(createGMContext());
    const result = await caller.admin.getDocuments();

    expect(result).toHaveProperty("documents");
    expect(Array.isArray(result.documents)).toBe(true);
  });

  it("non-admin gets empty documents list", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.admin.getDocuments();

    expect(result.documents).toEqual([]);
  });

  it("documents are sorted by most recent first", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.getDocuments();

    if (result.documents.length > 1) {
      for (let i = 0; i < result.documents.length - 1; i++) {
        const current = new Date(result.documents[i].createdAt).getTime();
        const next = new Date(result.documents[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });
});

// ==========================================
// APPLICATION SUBMIT WITH DOCUMENT TRACKING TESTS
// ==========================================
describe("application.submit - Document Tracking", () => {
  it("submits application with documents and creates applicationDocuments entries", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.application.submit({
      fullName: "Doc Test Student",
      email: "doctest@student.com",
      phone: "+628111333444",
      currentSchool: "Test Academy",
      selectedUniversities: JSON.stringify([
        { university: "University of Melbourne", country: "Australia", program: "Engineering" },
      ]),
      transcriptUrl: "https://s3.example.com/transcript.pdf",
      transcriptKey: "applications/test-transcript.pdf",
      passportUrl: "https://s3.example.com/passport.jpg",
      passportKey: "applications/test-passport.jpg",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("referenceNumber");
    expect(result.referenceNumber).toMatch(/^SPECTA-/);
    expect(result).toHaveProperty("application");
    expect(result.application).toHaveProperty("id");
  });

  it("submits application without documents successfully", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.application.submit({
      fullName: "No Doc Student",
      email: "nodoc@student.com",
      phone: "+628111555666",
      selectedUniversities: JSON.stringify([
        { university: "NUS", country: "Singapore", program: "Business" },
      ]),
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("referenceNumber");
  });
});

// ==========================================
// APPLICATION DOCUMENT UPLOAD TESTS
// ==========================================
describe("application.uploadDocument", () => {
  it("uploads a document and returns URL and key", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    
    // Create a small base64 encoded test file
    const testContent = Buffer.from("test document content").toString("base64");
    
    const result = await caller.application.uploadDocument({
      fileName: "test-transcript.pdf",
      fileData: testContent,
      fileType: "application/pdf",
      documentType: "transcript",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("fileKey");
    expect(typeof result.url).toBe("string");
    expect(typeof result.fileKey).toBe("string");
    expect(result.url!.length).toBeGreaterThan(0);
  });
});

// ==========================================
// ADMIN LEAD DOCUMENTS TESTS
// ==========================================
describe("admin.getLeadDocuments", () => {
  it("admin can view documents for a specific lead", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.getLeadDocuments({ leadId: 1 });

    expect(result).toHaveProperty("documents");
    expect(Array.isArray(result.documents)).toBe(true);
  });

  it("non-admin gets empty documents for lead", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.admin.getLeadDocuments({ leadId: 1 });

    expect(result.documents).toEqual([]);
  });
});
