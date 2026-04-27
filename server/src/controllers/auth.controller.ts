import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import User from "../models/User";

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
