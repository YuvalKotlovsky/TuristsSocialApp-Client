import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import User from "../models/User";
import { RefreshToken } from "../models";

function getRefreshTokenExpiryDate(token: string): Date {
  const decoded = jwt.decode(token);
  if (decoded && typeof decoded === "object" && typeof decoded.exp === "number") {
    return new Date(decoded.exp * 1000);
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 7);
  return fallback;
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!fullName || !email || !password) {
      res.status(400).json({ message: "fullName, email and password are required" });
      return;
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = await User.create({
      fullName,
      email,
      passwordHash,
      avatar: null,
    });

    const accessSecret = process.env.JWT_ACCESS_SECRET || "dev_access_secret";
    const refreshSecret = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
    const accessExpires = (process.env.JWT_ACCESS_EXPIRES || "15m") as StringValue;
    const refreshExpires = (process.env.JWT_REFRESH_EXPIRES || "7d") as StringValue;

    const tokenPayload = { sub: createdUser._id.toString(), email: createdUser.email };

    const accessToken = jwt.sign(tokenPayload, accessSecret, { expiresIn: accessExpires });
    const refreshToken = jwt.sign(tokenPayload, refreshSecret, { expiresIn: refreshExpires });

    res.status(201).json({
      user: {
        id: createdUser._id.toString(),
        fullName: createdUser.fullName,
        email: createdUser.email,
        avatar: createdUser.avatar,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      res.status(400).json({ message: "email and password are required" });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const accessSecret = process.env.JWT_ACCESS_SECRET || "dev_access_secret";
    const refreshSecret = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
    const accessExpires = (process.env.JWT_ACCESS_EXPIRES || "15m") as StringValue;
    const refreshExpires = (process.env.JWT_REFRESH_EXPIRES || "7d") as StringValue;

    const tokenPayload = { userId: user._id.toString(), email: user.email };

    const accessToken = jwt.sign(tokenPayload, accessSecret, { expiresIn: accessExpires });
    const refreshToken = jwt.sign(tokenPayload, refreshSecret, { expiresIn: refreshExpires });

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: getRefreshTokenExpiryDate(refreshToken),
    });

    res.status(200).json({
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const incomingRefreshToken = String(req.body.refreshToken || "").trim();
    if (!incomingRefreshToken) {
      res.status(400).json({ message: "refreshToken is required" });
      return;
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
    let decoded: jwt.JwtPayload | string;

    try {
      decoded = jwt.verify(incomingRefreshToken, refreshSecret);
    } catch {
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    const refreshRecord = await RefreshToken.findOne({
      token: incomingRefreshToken,
      expiresAt: { $gt: new Date() },
    });

    if (!refreshRecord) {
      res.status(401).json({ message: "Refresh token not found or expired" });
      return;
    }

    const tokenUserId =
      typeof decoded === "object"
        ? String(decoded.userId || decoded.sub || "")
        : "";

    if (!tokenUserId || refreshRecord.userId.toString() !== tokenUserId) {
      res.status(401).json({ message: "Refresh token user mismatch" });
      return;
    }

    const user = await User.findById(refreshRecord.userId).lean();
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const accessSecret = process.env.JWT_ACCESS_SECRET || "dev_access_secret";
    const accessExpires = (process.env.JWT_ACCESS_EXPIRES || "15m") as StringValue;

    const tokenPayload = { userId: user._id.toString(), email: user.email };
    const accessToken = jwt.sign(tokenPayload, accessSecret, { expiresIn: accessExpires });

    // Keep refresh-token rotation disabled for minimal, architecture-safe behavior.
    res.status(200).json({ accessToken, refreshToken: incomingRefreshToken });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
