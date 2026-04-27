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

router.post("/register", upload.single("avatar"), register);
router.post("/login", login);
router.post("/refresh", refresh);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

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
