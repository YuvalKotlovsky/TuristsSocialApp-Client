import request from "supertest";
import mongoose from "mongoose";
import app from "../server";
import {
  buildTestDbUri,
  createTestUser,
  generateTestTokens,
  createTestPost,
  createTestComment,
} from "./testHelpers";

const DB_URI = buildTestDbUri();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(DB_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
});

beforeEach(async () => {
  for (const col of Object.values(mongoose.connection.collections)) {
    await col.deleteMany({});
  }
});

// ─── Add comment ─────────────────────────────────────────────────────────────

describe("POST /api/comments/:postId", () => {
  it("adds a comment and returns it populated", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);
    const post = await createTestPost(user._id.toString());

    const res = await request(app)
      .post(`/api/comments/${post._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Great post!" });

    expect(res.status).toBe(201);
    expect(res.body.comment.content).toBe("Great post!");
    expect(res.body.comment.createdBy.fullName).toBe("Test User");
  });

  it("returns 404 if the post does not exist", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);

    const res = await request(app)
      .post(`/api/comments/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Orphan comment" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when content is missing", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);
    const post = await createTestPost(user._id.toString());

    const res = await request(app)
      .post(`/api/comments/${post._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── Get comments ────────────────────────────────────────────────────────────

describe("GET /api/comments/:postId", () => {
  it("returns comments sorted oldest first", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);
    const post = await createTestPost(user._id.toString());

    await createTestComment(post._id.toString(), user._id.toString(), "First");
    await createTestComment(post._id.toString(), user._id.toString(), "Second");

    const res = await request(app)
      .get(`/api/comments/${post._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(2);
    expect(res.body.comments[0].content).toBe("First");
    expect(res.body.comments[1].content).toBe("Second");
  });

  it("returns an empty array for a post with no comments", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);
    const post = await createTestPost(user._id.toString());

    const res = await request(app)
      .get(`/api/comments/${post._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(0);
  });
});

// ─── Delete comment ───────────────────────────────────────────────────────────

describe("DELETE /api/comments/single/:commentId", () => {
  it("allows the owner to delete their comment", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);
    const post = await createTestPost(user._id.toString());
    const comment = await createTestComment(post._id.toString(), user._id.toString());

    const res = await request(app)
      .delete(`/api/comments/single/${comment._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Comment deleted");
  });

  it("returns 403 when a different user tries to delete", async () => {
    const { user: author } = await createTestUser("author@example.com");
    const { user: other } = await createTestUser("other@example.com");
    const { accessToken } = await generateTestTokens(other._id.toString(), other.email);
    const post = await createTestPost(author._id.toString());
    const comment = await createTestComment(post._id.toString(), author._id.toString());

    const res = await request(app)
      .delete(`/api/comments/single/${comment._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent comment", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);

    const res = await request(app)
      .delete(`/api/comments/single/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});
