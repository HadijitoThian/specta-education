import { describe, it, expect } from "vitest";
import { injectSeoMeta } from "./seoMetaInjector";

// Sample HTML template matching the structure of index.html
const TEMPLATE_HTML = `<!doctype html>
<html lang="en">
<head>
  <title>SpecTa Education - Study Abroad Consultant Jakarta | IELTS Preparation</title>
  <meta name="description" content="Default description" />
  <meta name="keywords" content="default keywords" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.spectaeducation.com/" />
  <meta property="og:url" content="https://www.spectaeducation.com/" />
  <meta property="og:title" content="Default OG Title" />
  <meta property="og:description" content="Default OG Description" />
  <meta name="twitter:title" content="Default Twitter Title" />
  <meta name="twitter:description" content="Default Twitter Description" />
</head>
<body><div id="root"></div></body>
</html>`;

describe("SEO Meta Injector", () => {
  it("should inject homepage meta tags for root path", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/");
    expect(result).toContain("<title>SpecTa Education - Study Abroad Consultant Indonesia | Kuliah di Luar Negeri</title>");
    expect(result).toContain('content="SpecTa Education adalah konsultan pendidikan luar negeri terpercaya');
    expect(result).toContain('href="https://www.spectaeducation.com"');
  });

  it("should inject IELTS page meta tags", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/ielts");
    expect(result).toContain("<title>IELTS Preparation Course - SpecTa Education | Kursus IELTS Terbaik</title>");
    expect(result).toContain("Persiapan IELTS terbaik di Indonesia");
    expect(result).toContain('href="https://www.spectaeducation.com/ielts"');
  });

  it("should inject destination country meta tags", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/destinations/australia");
    expect(result).toContain("Study in Australia");
    expect(result).toContain("Kuliah di Australia");
    expect(result).toContain('href="https://www.spectaeducation.com/destinations/australia"');
  });

  it("should handle dynamic blog post URLs", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/blog/tips-for-ielts-preparation");
    expect(result).toContain("Tips For Ielts Preparation | SpecTa Education Blog");
    expect(result).toContain('href="https://www.spectaeducation.com/blog/tips-for-ielts-preparation"');
  });

  it("should handle unknown destination countries dynamically", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/destinations/sweden");
    expect(result).toContain("Study in Sweden");
    expect(result).toContain("Kuliah di Sweden");
  });

  it("should set noindex for admin pages", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/admin");
    expect(result).toContain('content="noindex, nofollow"');
  });

  it("should set noindex for staff pages", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/staff-login");
    expect(result).toContain('content="noindex, nofollow"');
  });

  it("should inject Open Graph URL correctly", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/about");
    expect(result).toContain('property="og:url" content="https://www.spectaeducation.com/about"');
    expect(result).toContain('property="og:title" content="About SpecTa Education');
  });

  it("should inject Twitter Card tags correctly", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/scholarships");
    expect(result).toContain('name="twitter:title" content="Study Abroad Scholarships 2026');
  });

  it("should handle trailing slashes", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/ielts/");
    expect(result).toContain("IELTS Preparation Course");
  });

  it("should handle query strings", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/contact?ref=google");
    expect(result).toContain("Contact Us - SpecTa Education Indonesia");
  });

  it("should use fallback for unknown paths", () => {
    const result = injectSeoMeta(TEMPLATE_HTML, "/some-random-page");
    expect(result).toContain("SpecTa Education - Study Abroad Consultant Indonesia");
  });

  it("should inject correct canonical for all known static pages", () => {
    const pages = ["/about", "/ielts", "/destinations", "/scholarships", "/contact", "/blog", "/articles", "/compare"];
    for (const page of pages) {
      const result = injectSeoMeta(TEMPLATE_HTML, page);
      expect(result).toContain(`href="https://www.spectaeducation.com${page}"`);
    }
  });
});
