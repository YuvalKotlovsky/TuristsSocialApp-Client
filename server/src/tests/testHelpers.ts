import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import User from "../models/User";
import { Post, Comment, RefreshToken } from "../models";

export async function createTestUser(
  email = "test@example.com",
  password = "password123",
  fullName = "Test User"
) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ fullName, email, passwordHash, avatar: null });
  return { user, password };
}

export async function generateTestTokens(userId: string, email: string) {
  const accessToken = jwt.sign(
    { userId, email },
    process.env.JWT_ACCESS_SECRET || "dev_access_secret",
    { expiresIn: "15m" as StringValue }
  );
  const refreshToken = jwt.sign(
    { userId, email },
    process.env.JWT_REFRESH_SECRET || "dev_refresh_secret",
    { expiresIn: "7d" as StringValue }
  );
  const decoded = jwt.decode(refreshToken) as { exp: number };
  await RefreshToken.create({
    token: refreshToken,
    userId,
    expiresAt: new Date(decoded.exp * 1000),
  });
  return { accessToken, refreshToken };
}

export async function createTestPost(
  userId: string,
  content = "Test post content",
  overrides: Record<string, unknown> = {}
) {
  return Post.create({ content, createdBy: userId, ...overrides });
}

export async function createTestComment(
  postId: string,
  userId: string,
  content = "Test comment"
) {
  return Comment.create({ postId, content, createdBy: userId });
}

export function buildTestDbUri() {
  const base = process.env.MONGODB_URI || "mongodb://localhost:27017/travelapp";
  return base.replace(/(mongodb(?:\+srv)?:\/\/[^/]+\/)([^/?]+)/, "$1travelapp_test");
}
