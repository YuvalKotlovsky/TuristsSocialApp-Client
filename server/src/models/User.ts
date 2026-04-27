import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  avatar: string | null;
  googleId?: string;
  provider: "local" | "google";
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false, default: null },
    avatar: { type: String, default: null },
    googleId: { type: String },
    provider: { type: String, enum: ["local", "google"], default: "local" },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
