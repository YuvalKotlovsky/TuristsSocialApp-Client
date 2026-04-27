import request from "supertest";
import mongoose from "mongoose";
import app from "../server";
import {
  buildTestDbUri,
  createTestUser,
  generateTestTokens,
  createTestPost,
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

// ─── Create post ─────────────────────────────────────────────────────────────

describe("POST /api/posts", () => {
  it("creates a post and returns it populated", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);

    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Hello world", location: "Tel Aviv" });

    expect(res.status).toBe(201);
    expect(res.body.post.content).toBe("Hello world");
    expect(res.body.post.location).toBe("Tel Aviv");
    expect(res.body.post.createdBy.email).toBe(user.email);
    expect(res.body.post.commentsCount).toBe(0);
  });

  it("returns 400 when content is missing", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);

    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ location: "Somewhere" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/posts").send({ content: "No auth" });
    expect(res.status).toBe(401);
  });
});

// ─── Feed ────────────────────────────────────────────────────────────────────

describe("GET /api/posts/feed", () => {
  it("returns paginated posts sorted newest first", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);

    await createTestPost(user._id.toString(), "First");
    await createTestPost(user._id.toString(), "Second");
    await createTestPost(user._id.toString(), "Third");

    const res = await request(app)
      .get("/api/posts/feed?page=1&limit=2")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.hasMore).toBe(true);
    expect(res.body.posts[0].content).toBe("Third");
  });

  it("includes isLikedByMe field", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);
    await createTestPost(user._id.toString());

    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.posts[0].isLikedByMe).toBe("boolean");
  });
});

// ─── Get by ID ───────────────────────────────────────────────────────────────

describe("GET /api/posts/:id", () => {
  it("returns the post with isLikedByMe and commentsCount", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);
    const post = await createTestPost(user._id.toString(), "Detail view");

    const res = await request(app)
      .get(`/api/posts/${post._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.post.content).toBe("Detail view");
    expect(typeof res.body.post.isLikedByMe).toBe("boolean");
    expect(res.body.post.commentsCount).toBe(0);
  });

  it("returns 404 for unknown id", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);

    const res = await request(app)
      .get(`/api/posts/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── Like / unlike ───────────────────────────────────────────────────────────

describe("POST /api/posts/:id/like", () => {
  it("adds a like and then removes it on second call", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);
    const post = await createTestPost(user._id.toString());

    const like = await request(app)
      .post(`/api/posts/${post._id}/like`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(like.status).toBe(200);
    expect(like.body.post.isLikedByMe).toBe(true);
    expect(like.body.post.likes).toHaveLength(1);

    const unlike = await request(app)
      .post(`/api/posts/${post._id}/like`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(unlike.body.post.isLikedByMe).toBe(false);
    expect(unlike.body.post.likes).toHaveLength(0);
  });
});

// ─── Delete ──────────────────────────────────────────────────────────────────

describe("DELETE /api/posts/:id", () => {
  it("allows the owner to delete their post", async () => {
    const { user } = await createTestUser();
    const { accessToken } = await generateTestTokens(user._id.toString(), user.email);
    const post = await createTestPost(user._id.toString());

    const res = await request(app)
      .delete(`/api/posts/${post._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Post deleted");
  });

  it("returns 403 when a different user tries to delete", async () => {
    const { user: owner } = await createTestUser("owner@example.com");
    const { user: other } = await createTestUser("other@example.com");
    const { accessToken } = await generateTestTokens(other._id.toString(), other.email);
    const post = await createTestPost(owner._id.toString());

    const res = await request(app)
      .delete(`/api/posts/${post._id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});
