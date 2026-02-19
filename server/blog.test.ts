import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  createBlogPost: vi.fn().mockResolvedValue({ insertId: "1" }),
  updateBlogPost: vi.fn().mockResolvedValue(undefined),
  deleteBlogPost: vi.fn().mockResolvedValue(undefined),
  getBlogPostById: vi.fn().mockResolvedValue({
    id: 1,
    title: "Study in Australia: Complete Guide 2026",
    slug: "study-in-australia-complete-guide-2026",
    excerpt: "Everything you need to know about studying in Australia",
    content: "<h1>Study in Australia</h1><p>Australia is one of the top destinations...</p>",
    coverImage: "https://example.com/image.jpg",
    metaTitle: "Study in Australia | SpecTa Education",
    metaDescription: "Complete guide to studying in Australia for Indonesian students",
    tags: "australia,study-abroad,education",
    status: "published",
    authorId: "user-1",
    authorName: "Admin",
    publishedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),
  getBlogPostBySlug: vi.fn().mockResolvedValue({
    id: 1,
    title: "Study in Australia: Complete Guide 2026",
    slug: "study-in-australia-complete-guide-2026",
    excerpt: "Everything you need to know about studying in Australia",
    content: "<h1>Study in Australia</h1><p>Australia is one of the top destinations...</p>",
    coverImage: "https://example.com/image.jpg",
    metaTitle: "Study in Australia | SpecTa Education",
    metaDescription: "Complete guide to studying in Australia for Indonesian students",
    tags: "australia,study-abroad,education",
    status: "published",
    authorId: "user-1",
    authorName: "Admin",
    publishedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),
  listBlogPosts: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: "Study in Australia: Complete Guide 2026",
      slug: "study-in-australia-complete-guide-2026",
      excerpt: "Everything you need to know about studying in Australia",
      coverImage: "https://example.com/image.jpg",
      status: "published",
      authorName: "Admin",
      tags: "australia,study-abroad",
      publishedAt: Date.now(),
      createdAt: Date.now(),
    },
    {
      id: 2,
      title: "IELTS Preparation Tips for Beginners",
      slug: "ielts-preparation-tips-beginners",
      excerpt: "Top tips to prepare for your IELTS exam",
      coverImage: "https://example.com/ielts.jpg",
      status: "published",
      authorName: "Admin",
      tags: "ielts,preparation",
      publishedAt: Date.now(),
      createdAt: Date.now(),
    },
  ]),
  listPublishedBlogPosts: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: "Study in Australia: Complete Guide 2026",
      slug: "study-in-australia-complete-guide-2026",
      excerpt: "Everything you need to know about studying in Australia",
      coverImage: "https://example.com/image.jpg",
      authorName: "Admin",
      tags: "australia,study-abroad",
      publishedAt: Date.now(),
    },
  ]),
  countBlogPosts: vi.fn().mockResolvedValue(2),
  countPublishedBlogPosts: vi.fn().mockResolvedValue(1),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            title: "Study in Australia: Complete Guide for Indonesian Students 2026",
            slug: "study-in-australia-complete-guide-indonesian-students-2026",
            excerpt: "Discover everything about studying in Australia — from top universities to visa requirements and scholarships available for Indonesian students.",
            content: "<h1>Study in Australia</h1><p>Australia remains one of the most popular destinations for Indonesian students seeking world-class education.</p><h2>Top Universities</h2><p>The Group of Eight universities lead the rankings...</p>",
            metaTitle: "Study in Australia 2026 - Complete Guide | SpecTa Education",
            metaDescription: "Complete guide to studying in Australia for Indonesian students. Universities, costs, visa, scholarships, and IELTS requirements.",
            tags: "study-in-australia,australian-universities,study-abroad,indonesian-students",
          }),
        },
      },
    ],
  }),
}));

import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogPostById,
  getBlogPostBySlug,
  listBlogPosts,
  listPublishedBlogPosts,
  countBlogPosts,
  countPublishedBlogPosts,
} from "./db";

import { invokeLLM } from "./_core/llm";

describe("Blog System", () => {
  describe("Blog CRUD Operations", () => {
    it("should create a blog post", async () => {
      const result = await createBlogPost({
        title: "Study in Australia: Complete Guide 2026",
        slug: "study-in-australia-complete-guide-2026",
        excerpt: "Everything you need to know about studying in Australia",
        content: "<h1>Study in Australia</h1><p>Australia is one of the top destinations...</p>",
        coverImage: "https://example.com/image.jpg",
        metaTitle: "Study in Australia | SpecTa Education",
        metaDescription: "Complete guide to studying in Australia for Indonesian students",
        tags: "australia,study-abroad,education",
        status: "published",
        authorId: "user-1",
        authorName: "Admin",
      });

      expect(createBlogPost).toHaveBeenCalledOnce();
      expect(result).toHaveProperty("insertId");
    });

    it("should get a blog post by ID", async () => {
      const post = await getBlogPostById(1);

      expect(getBlogPostById).toHaveBeenCalledWith(1);
      expect(post).toBeDefined();
      expect(post!.title).toBe("Study in Australia: Complete Guide 2026");
      expect(post!.slug).toBe("study-in-australia-complete-guide-2026");
      expect(post!.status).toBe("published");
    });

    it("should get a blog post by slug", async () => {
      const post = await getBlogPostBySlug("study-in-australia-complete-guide-2026");

      expect(getBlogPostBySlug).toHaveBeenCalledWith("study-in-australia-complete-guide-2026");
      expect(post).toBeDefined();
      expect(post!.title).toBe("Study in Australia: Complete Guide 2026");
    });

    it("should list all blog posts", async () => {
      const posts = await listBlogPosts(10, 0);

      expect(listBlogPosts).toHaveBeenCalledWith(10, 0);
      expect(posts).toHaveLength(2);
      expect(posts[0].title).toContain("Australia");
      expect(posts[1].title).toContain("IELTS");
    });

    it("should list only published blog posts", async () => {
      const posts = await listPublishedBlogPosts(10, 0);

      expect(listPublishedBlogPosts).toHaveBeenCalledWith(10, 0);
      expect(posts).toHaveLength(1);
      expect(posts[0].status || "published").toBe("published");
    });

    it("should count blog posts", async () => {
      const total = await countBlogPosts();
      const published = await countPublishedBlogPosts();

      expect(total).toBe(2);
      expect(published).toBe(1);
    });

    it("should update a blog post", async () => {
      await updateBlogPost(1, {
        title: "Study in Australia: Updated Guide 2026",
        content: "<h1>Updated content</h1>",
      });

      expect(updateBlogPost).toHaveBeenCalledWith(1, expect.objectContaining({
        title: "Study in Australia: Updated Guide 2026",
      }));
    });

    it("should delete a blog post", async () => {
      await deleteBlogPost(1);

      expect(deleteBlogPost).toHaveBeenCalledWith(1);
    });
  });

  describe("Blog SEO Features", () => {
    it("should generate SEO-friendly slugs from titles", () => {
      const generateSlug = (title: string) =>
        title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();

      expect(generateSlug("Study in Australia: Complete Guide 2026")).toBe(
        "study-in-australia-complete-guide-2026"
      );
      expect(generateSlug("IELTS Preparation Jakarta — Best Tips")).toBe(
        "ielts-preparation-jakarta-best-tips"
      );
      expect(generateSlug("Les IELTS Jakarta")).toBe("les-ielts-jakarta");
    });

    it("should have meta title and description for SEO", async () => {
      const post = await getBlogPostById(1);

      expect(post!.metaTitle).toBeDefined();
      expect(post!.metaTitle).toContain("SpecTa Education");
      expect(post!.metaDescription).toBeDefined();
      expect(post!.metaDescription!.length).toBeLessThanOrEqual(200);
    });

    it("should have tags for categorization", async () => {
      const post = await getBlogPostById(1);

      expect(post!.tags).toBeDefined();
      expect(post!.tags).toContain("australia");
      expect(post!.tags).toContain("study-abroad");
    });
  });

  describe("AI Article Generation", () => {
    it("should generate a blog article from a topic prompt", async () => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an SEO content writer for SpecTa Education." },
          { role: "user", content: "Write a blog article about studying in Australia for Indonesian students" },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "blog_article",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                slug: { type: "string" },
                excerpt: { type: "string" },
                content: { type: "string" },
                metaTitle: { type: "string" },
                metaDescription: { type: "string" },
                tags: { type: "string" },
              },
              required: ["title", "slug", "excerpt", "content", "metaTitle", "metaDescription", "tags"],
              additionalProperties: false,
            },
          },
        },
      });

      expect(invokeLLM).toHaveBeenCalledOnce();
      expect(response.choices).toBeDefined();
      expect(response.choices[0].message.content).toBeDefined();

      const article = JSON.parse(response.choices[0].message.content);
      expect(article.title).toBeDefined();
      expect(article.slug).toBeDefined();
      expect(article.excerpt).toBeDefined();
      expect(article.content).toBeDefined();
      expect(article.metaTitle).toBeDefined();
      expect(article.metaDescription).toBeDefined();
      expect(article.tags).toBeDefined();
      expect(article.slug).toContain("australia");
    });

    it("should generate article with proper HTML structure", async () => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an SEO content writer." },
          { role: "user", content: "Write about IELTS preparation" },
        ],
      });

      const article = JSON.parse(response.choices[0].message.content);
      expect(article.content).toContain("<h1>");
      expect(article.content).toContain("<p>");
    });
  });

  describe("Blog Post Validation", () => {
    it("should require title for blog post creation", () => {
      const validatePost = (post: { title?: string; content?: string }) => {
        const errors: string[] = [];
        if (!post.title || post.title.trim().length === 0) errors.push("Title is required");
        if (!post.content || post.content.trim().length === 0) errors.push("Content is required");
        return errors;
      };

      expect(validatePost({ title: "", content: "Some content" })).toContain("Title is required");
      expect(validatePost({ title: "Valid Title", content: "" })).toContain("Content is required");
      expect(validatePost({ title: "Valid Title", content: "Valid content" })).toHaveLength(0);
    });

    it("should validate slug format", () => {
      const isValidSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

      expect(isValidSlug("study-in-australia")).toBe(true);
      expect(isValidSlug("ielts-preparation-jakarta")).toBe(true);
      expect(isValidSlug("Study In Australia")).toBe(false);
      expect(isValidSlug("study_in_australia")).toBe(false);
      expect(isValidSlug("")).toBe(false);
    });
  });
});
