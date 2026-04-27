import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import User from "../models/User";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        console.log("[passport] Google profile received:", JSON.stringify(profile, null, 2));
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;

        // Find by googleId
        const asExpressUser = (u: typeof user) => u as unknown as Express.User;

        let user = await User.findOne({ googleId });
        if (user) return done(null, asExpressUser(user));

        // Find by email and link googleId
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = googleId;
            user.provider = "google";
            await user.save();
            return done(null, asExpressUser(user));
          }
        }

        // Create new user
        user = await User.create({
          fullName: profile.displayName || "User",
          email: email || `${googleId}@google.placeholder`,
          passwordHash: crypto.randomBytes(32).toString("hex"),
          googleId,
          provider: "google",
          avatar: profile.photos?.[0]?.value ?? null,
        });

        return done(null, asExpressUser(user));
      } catch (err) {
        console.error("[passport] Google strategy error:", err);
        return done(err as Error);
      }
    }
  )
);

export default passport;
