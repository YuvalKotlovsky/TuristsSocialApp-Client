import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  avatar?: string;
  googleId?: string;
  provider: "local" | "google";
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    avatar: { type: String },
    googleId: { type: String },
    provider: { type: String, enum: ["local", "google"], default: "local" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

const User =
  (mongoose.models.User as mongoose.Model<IUser> | undefined) ||
  mongoose.model<IUser>("User", userSchema);

export default User;
