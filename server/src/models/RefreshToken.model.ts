import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IRefreshToken extends Document {
  token: string;
  userId: Types.ObjectId;
  expiresAt: Date;
}

interface IRefreshTokenModel extends Model<IRefreshToken> {
  isValid(token: string): Promise<boolean>;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true },
});

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.static("isValid", async function (token: string): Promise<boolean> {
  const record = await this.findOne({ token, expiresAt: { $gt: new Date() } });
  return record !== null;
});

export default mongoose.model<IRefreshToken, IRefreshTokenModel>("RefreshToken", refreshTokenSchema);
