import request from "supertest";
import mongoose from "mongoose";
import app from "../server";
import { RefreshToken } from "../models";
import { buildTestDbUri, createTestUser } from "./testHelpers";

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

// ─── Register ────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("registers a new user and returns tokens", async () => {
    const res = await request(app).post("/api/auth/register").send({
      fullName: "Alice",
      email: "alice@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("returns 409 for duplicate email", async () => {
    await createTestUser("bob@example.com");

    const res = await request(app).post("/api/auth/register").send({
      fullName: "Bob",
      email: "bob@example.com",
      password: "password123",
    });

    expect(res.status).toBe(409);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "missing@example.com",
    });

    expect(res.status).toBe(400);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and returns tokens", async () => {
    await createTestUser("carol@example.com", "secret123");

    const res = await request(app).post("/api/auth/login").send({
      email: "carol@example.com",
      password: "secret123",
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe("carol@example.com");
  });

  it("returns 401 for wrong password", async () => {
    await createTestUser("dan@example.com", "correct");

    const res = await request(app).post("/api/auth/login").send({
      email: "dan@example.com",
      password: "wrong",
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 for non-existent user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
  });
});

// ─── Refresh token rotation ───────────────────────────────────────────────────

describe("POST /api/auth/refresh", () => {
  it("issues new tokens and invalidates the old refresh token", async () => {
    await createTestUser("eve@example.com", "password123");

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "eve@example.com",
      password: "password123",
    });
    const { refreshToken: oldRefresh } = loginRes.body;

    const refreshRes = await request(app).post("/api/auth/refresh").send({
      refreshToken: oldRefresh,
    });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();
    expect(refreshRes.body.refreshToken).not.toBe(oldRefresh);

    // Old token must be gone from DB
    const old = await RefreshToken.findOne({ token: oldRefresh });
    expect(old).toBeNull();
  });

  it("returns 401 for an invalid refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({
      refreshToken: "not.a.valid.token",
    });

    expect(res.status).toBe(401);
  });
});
