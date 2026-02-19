import { describe, it, expect } from "vitest";
import {
  createBlogComment,
  getCommentsByPostId,
  getPostRatingSummary,
  getMultiplePostRatings,
  getAllBlogComments,
  updateBlogCommentStatus,
  deleteBlogComment,
} from "./db";

describe("Blog Comments & Ratings", () => {
  let testPostId = 999999; // Use a high ID to avoid conflicts
  let createdCommentId: number;

  it("should create a comment with rating", async () => {
    const comment = await createBlogComment({
      postId: testPostId,
      name: "Test User",
      email: "test@example.com",
      content: "This is a great article about studying abroad!",
      rating: 5,
    });

    expect(comment).toBeDefined();
    expect(comment!.id).toBeGreaterThan(0);
    expect(comment!.name).toBe("Test User");
    expect(comment!.email).toBe("test@example.com");
    expect(comment!.content).toBe("This is a great article about studying abroad!");
    expect(comment!.rating).toBe(5);
    expect(comment!.status).toBe("pending");
    createdCommentId = comment!.id;
  });

  it("should create a comment without rating", async () => {
    const comment = await createBlogComment({
      postId: testPostId,
      name: "Another User",
      email: "another@example.com",
      content: "Very informative, thank you!",
    });

    expect(comment).toBeDefined();
    expect(comment!.rating).toBeNull();
    expect(comment!.status).toBe("pending");
  });

  it("should not return pending comments in approved list", async () => {
    const approved = await getCommentsByPostId(testPostId, "approved");
    expect(approved.length).toBe(0); // All comments are pending
  });

  it("should approve a comment", async () => {
    await updateBlogCommentStatus(createdCommentId, "approved");
    const approved = await getCommentsByPostId(testPostId, "approved");
    expect(approved.length).toBe(1);
    expect(approved[0].name).toBe("Test User");
  });

  it("should calculate post rating from approved comments", async () => {
    const rating = await getPostRatingSummary(testPostId);
    expect(rating).toBeDefined();
    expect(rating.averageRating).toBe(5);
    expect(rating.totalRatings).toBe(1);
  });

  it("should create more rated comments for average calculation", async () => {
    const comment3 = await createBlogComment({
      postId: testPostId,
      name: "Third User",
      email: "third@example.com",
      content: "Good but could be better.",
      rating: 3,
    });
    // Approve it
    await updateBlogCommentStatus(comment3!.id, "approved");

    const rating = await getPostRatingSummary(testPostId);
    expect(rating).toBeDefined();
    expect(rating.totalRatings).toBe(2);
    expect(rating.averageRating).toBe(4); // (5+3)/2 = 4
  });

  it("should get multiple post ratings at once", async () => {
    const ratings = await getMultiplePostRatings([testPostId, 888888]);
    expect(ratings[testPostId]).toBeDefined();
    expect(ratings[testPostId].totalRatings).toBe(2);
    // Non-existent post should not be in results or have 0
    expect(ratings[888888]?.totalRatings ?? 0).toBe(0);
  });

  it("should list all comments for admin", async () => {
    const comments = await getAllBlogComments(50, 0);
    expect(comments.length).toBeGreaterThanOrEqual(3);
  });

  it("should reject a comment", async () => {
    const comment = await createBlogComment({
      postId: testPostId,
      name: "Spam User",
      email: "spam@example.com",
      content: "Buy cheap stuff here!",
      rating: 1,
    });
    await updateBlogCommentStatus(comment!.id, "rejected");

    const approved = await getCommentsByPostId(testPostId, "approved");
    const rejected = approved.filter(c => c.name === "Spam User");
    expect(rejected.length).toBe(0); // Rejected comments should not appear
  });

  it("should delete a comment", async () => {
    const comment = await createBlogComment({
      postId: testPostId,
      name: "Delete Me",
      email: "delete@example.com",
      content: "This will be deleted",
    });
    await deleteBlogComment(comment!.id);

    const all = await getAllBlogComments(100, 0);
    const found = all.find(c => c.name === "Delete Me");
    expect(found).toBeUndefined();
  });

  // Cleanup
  describe("Cleanup", () => {
    it("should clean up test comments", async () => {
      const all = await getAllBlogComments(200, 0);
      const testComments = all.filter(c => c.postId === testPostId);
      for (const c of testComments) {
        await deleteBlogComment(c.id);
      }
      const remaining = await getAllBlogComments(200, 0);
      const leftover = remaining.filter(c => c.postId === testPostId);
      expect(leftover.length).toBe(0);
    });
  });
});
