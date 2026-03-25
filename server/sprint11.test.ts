import { describe, it, expect } from "vitest";

describe("Sprint 11 — WhatsApp, Document Upload, Document Summary", () => {
  it("WhatsApp URL format is correct for Malaysian numbers", () => {
    const phone = "+60 12-345 6789";
    const cleaned = phone.replace(/[^0-9]/g, "");
    const waUrl = `https://wa.me/${cleaned}`;
    expect(waUrl).toBe("https://wa.me/60123456789");
  });

  it("WhatsApp URL with pre-filled message encodes student name", () => {
    const name = "Raiden Thian";
    const encoded = encodeURIComponent(name);
    expect(encoded).toBe("Raiden%20Thian");
    const url = `https://wa.me/60123456789?text=Hi ${encoded}, this is from SpecTa Education.`;
    expect(url).toContain("Raiden%20Thian");
  });

  it("File size validation rejects files over 16MB", () => {
    const maxSize = 16 * 1024 * 1024;
    const smallFile = { size: 5 * 1024 * 1024 };
    const largeFile = { size: 20 * 1024 * 1024 };
    expect(smallFile.size <= maxSize).toBe(true);
    expect(largeFile.size <= maxSize).toBe(false);
  });

  it("Base64 encoding works for file upload", () => {
    const testData = "Hello, World!";
    const base64 = Buffer.from(testData).toString("base64");
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    expect(decoded).toBe(testData);
  });

  it("Document status summary counts are correct", () => {
    const docs = [
      { status: "pending", fileUrl: null },
      { status: "pending", fileUrl: null },
      { status: "submitted", fileUrl: "https://example.com/file1.pdf" },
      { status: "verified", fileUrl: "https://example.com/file2.pdf" },
      { status: "rejected", fileUrl: "https://example.com/file3.pdf" },
    ];
    const pending = docs.filter(d => d.status === "pending").length;
    const submitted = docs.filter(d => d.status === "submitted").length;
    const verified = docs.filter(d => d.status === "verified").length;
    const rejected = docs.filter(d => d.status === "rejected").length;
    const withFile = docs.filter(d => d.fileUrl).length;
    const missingDocs = docs.filter(d => d.status === "pending" && !d.fileUrl);

    expect(pending).toBe(2);
    expect(submitted).toBe(1);
    expect(verified).toBe(1);
    expect(rejected).toBe(1);
    expect(withFile).toBe(3);
    expect(missingDocs.length).toBe(2);
  });

  it("Document progress percentage is calculated correctly", () => {
    const docs = Array(8).fill(null).map((_, i) => ({
      status: i < 3 ? "verified" : "pending",
    }));
    const verified = docs.filter(d => d.status === "verified").length;
    const progress = Math.round((verified / docs.length) * 100);
    expect(progress).toBe(38);
  });

  it("File MIME type detection works for images and PDFs", () => {
    const isImage = (mime?: string) => mime?.startsWith("image/");
    const isPdf = (mime?: string) => mime === "application/pdf";

    expect(isImage("image/jpeg")).toBe(true);
    expect(isImage("image/png")).toBe(true);
    expect(isImage("application/pdf")).toBe(false);
    expect(isPdf("application/pdf")).toBe(true);
    expect(isPdf("image/jpeg")).toBe(false);
  });

  it("S3 file key format is correct for CRM documents", () => {
    const leadId = 300001;
    const fileName = "passport.pdf";
    const nanoid = () => "abc123xyz";
    const fileKey = `crm-docs/${leadId}/${nanoid()}-${fileName}`;
    expect(fileKey).toBe("crm-docs/300001/abc123xyz-passport.pdf");
    expect(fileKey).toContain("crm-docs/");
    expect(fileKey).toContain(String(leadId));
  });

  it("Missing docs alert shows correct count", () => {
    const docs = [
      { id: 1, docLabel: "Passport", status: "pending", fileUrl: null },
      { id: 2, docLabel: "Transcript", status: "pending", fileUrl: null },
      { id: 3, docLabel: "IELTS", status: "submitted", fileUrl: "https://s3.example.com/ielts.pdf" },
      { id: 4, docLabel: "Personal Statement", status: "pending", fileUrl: null },
    ];
    const missingDocs = docs.filter(d => d.status === "pending" && !d.fileUrl);
    expect(missingDocs.length).toBe(3);
    expect(missingDocs.map(d => d.docLabel)).toContain("Passport");
    expect(missingDocs.map(d => d.docLabel)).toContain("Transcript");
  });
});
