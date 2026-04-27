import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User, RefreshToken } from "../models";
import { uploadAvatar } from "../middleware/upload.middleware";
import { verifyAccessToken, JwtPayload } from "../middleware/auth.middleware";

const router = Router();

function generateTokens(payload: JwtPayload) {
  const accessExpiry = (process.env.JWT_ACCESS_EXPIRES || "15m") as unknown as jwt.SignOptions["expiresIn"];
  const refreshExpiry = (process.env.JWT_REFRESH_EXPIRES || "7d") as unknown as jwt.SignOptions["expiresIn"];

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, { expiresIn: accessExpiry });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, { expiresIn: refreshExpiry });
  return { accessToken, refreshToken };
}

async function saveRefreshToken(token: string, userId: string) {
  const decoded = jwt.decode(token) as { exp: number };
  await RefreshToken.create({
    token,
    userId,
    expiresAt: new Date(decoded.exp * 1000),
  });
}

function buildAvatarUrl(req: Request, filename: string): string {
  return `${req.protocol}://${req.get("host")}/uploads/avatars/${filename}`;
}

// POST /register
router.post("/register", uploadAvatar, async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }

    const avatar = req.file ? buildAvatarUrl(req, req.file.filename) : undefined;
    const user = await User.create({ fullName, email, password, avatar });

    const payload: JwtPayload = { userId: String(user._id), email: user.email };
    const { accessToken, refreshToken } = generateTokens(payload);
    await saveRefreshToken(refreshToken, String(user._id));

    const { password: _pw, ...userObj } = user.toObject();
    res.status(201).json({ user: userObj, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err });
  }
});

// POST /login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const payload: JwtPayload = { userId: String(user._id), email: user.email };
    const { accessToken, refreshToken } = generateTokens(payload);
    await saveRefreshToken(refreshToken, String(user._id));

    const { password: _pw, ...userObj } = user.toObject();
    res.json({ user: userObj, accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err });
  }
});

// POST /logout
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    await RefreshToken.deleteOne({ token: refreshToken });
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed", error: err });
  }
});

// POST /refresh
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token required" });
      return;
    }

    const stored = await RefreshToken.findOne({
      token: refreshToken,
      expiresAt: { $gt: new Date() },
    });
    if (!stored) {
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
    } catch {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    await RefreshToken.deleteOne({ token: refreshToken });

    const newPayload: JwtPayload = { userId: payload.userId, email: payload.email };
    const { accessToken: newAccess, refreshToken: newRefresh } = generateTokens(newPayload);
    await saveRefreshToken(newRefresh, payload.userId);

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    res.status(500).json({ message: "Token refresh failed", error: err });
  }
});

// GET /me
router.get("/me", verifyAccessToken, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err });
  }
});

export default router;
