import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPost extends Document {
  content: string;
  image?: string;
  location?: string;
  createdBy: Types.ObjectId;
  likes: Types.ObjectId[];
  likesCount: number;
}

const postSchema = new Schema<IPost>(
  {
    content: { type: String, required: true, maxlength: 2000 },
    image: { type: String },
    location: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    likes: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

postSchema.virtual("likesCount").get(function () {
  return this.likes.length;
});

export default mongoose.model<IPost>("Post", postSchema);
