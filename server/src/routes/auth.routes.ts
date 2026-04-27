import { Router, Request, Response } from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import passport from "../config/passport";
import { login, register, refresh } from "../controllers/auth.controller";
import { RefreshToken } from "../models";
import type { IUser } from "../models/User";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [fullName, email, password]
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/register", upload.single("avatar"), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate refresh token and get new access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/refresh", refresh);

/**
 * @openapi
 * /auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Initiate Google OAuth flow
 *     description: Redirects the browser to Google's consent screen.
 *     responses:
 *       302:
 *         description: Redirect to Google
 */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback
 *     description: >
 *       Handles the redirect from Google. On success, redirects to
 *       CLIENT_URL/auth/callback with accessToken, refreshToken, and user as query params.
 *     responses:
 *       302:
 *         description: Redirect to client with tokens
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  async (req: Request, res: Response) => {
    try {
      console.log("req.user:", req.user);
      const user = req.user as unknown as IUser;

      const accessSecret = process.env.JWT_ACCESS_SECRET || "dev_access_secret";
      const refreshSecret =
        process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";
      const accessExpires = (process.env.JWT_ACCESS_EXPIRES ||
        "15m") as StringValue;
      const refreshExpires = (process.env.JWT_REFRESH_EXPIRES ||
        "7d") as StringValue;

      const tokenPayload = { userId: user._id.toString(), email: user.email };

      const accessToken = jwt.sign(tokenPayload, accessSecret, {
        expiresIn: accessExpires,
      });
      const refreshToken = jwt.sign(tokenPayload, refreshSecret, {
        expiresIn: refreshExpires,
      });

      const decoded = jwt.decode(refreshToken) as { exp: number };
      await RefreshToken.create({
        token: refreshToken,
        userId: user._id,
        expiresAt: new Date(decoded.exp * 1000),
      });

      const { passwordHash: _ph, ...userObj } = user.toObject();
      const userParam = encodeURIComponent(JSON.stringify(userObj));

      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const redirectUrl = `${clientUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&user=${userParam}`;
      console.log("[oauth/callback] redirecting to:", redirectUrl);
      res.redirect(redirectUrl);
    } catch (err) {
      console.error("[oauth/callback] error:", err);
      res.redirect("/");
    }
  }
);

export default router;
