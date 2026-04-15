import { describe, it, expect } from "vitest";
import { composeInstagramImage, type CompositorInput } from "./imageCompositor";

describe("imageCompositor", () => {
  it("should compose an image with all text elements (no background URL)", async () => {
    const input: CompositorInput = {
      headline: "KULIAH DI MONASH UNIVERSITY",
      subheadline: "Dapatkan LOA Melalui SpecTa Education",
      cta: "DAFTAR SEKARANG",
      badge: "BEASISWA LPDP 2026",
      copyright: "© 2026 SpecTa Education | spectaeducation.com | @spectaeducation",
    };

    const result = await composeInstagramImage(input);

    expect(result.success).toBe(true);
    expect(result.imageBuffer).toBeDefined();
    expect(result.imageBuffer!.length).toBeGreaterThan(10000); // Should be a real image
    expect(result.error).toBeUndefined();
  }, 30000);

  it("should handle empty headline gracefully", async () => {
    const input: CompositorInput = {
      headline: "",
      subheadline: "Test subheadline",
    };

    const result = await composeInstagramImage(input);
    expect(result.success).toBe(true);
    expect(result.imageBuffer).toBeDefined();
  }, 30000);

  it("should compose with a background URL", async () => {
    const input: CompositorInput = {
      backgroundUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663225686644/HYZQfmGzLP8hwhgd2UnqHZ/specta_logo_official_9fa82bda.jpeg",
      headline: "TEST HEADLINE",
      subheadline: "Test subheadline text",
      cta: "DAFTAR SEKARANG",
    };

    const result = await composeInstagramImage(input);
    expect(result.success).toBe(true);
    expect(result.imageBuffer).toBeDefined();
    expect(result.imageBuffer!.length).toBeGreaterThan(5000);
  }, 30000);

  it("should use default CTA and copyright when not provided", async () => {
    const input: CompositorInput = {
      headline: "DEFAULT VALUES TEST",
      subheadline: "Testing defaults",
    };

    const result = await composeInstagramImage(input);
    expect(result.success).toBe(true);
    expect(result.imageBuffer).toBeDefined();
  }, 30000);

  it("should handle long headline text with word wrapping", async () => {
    const input: CompositorInput = {
      headline: "KULIAH DI MONASH UNIVERSITY AUSTRALIA DENGAN BEASISWA LPDP TAHUN 2026 SEKARANG JUGA",
      subheadline: "Dapatkan LOA Melalui SpecTa Education — Konsultasi Gratis Untuk Semua Program Studi",
      cta: "DAFTAR SEKARANG",
      badge: "PROMO SPESIAL",
    };

    const result = await composeInstagramImage(input);
    expect(result.success).toBe(true);
    expect(result.imageBuffer).toBeDefined();
  }, 30000);
});
