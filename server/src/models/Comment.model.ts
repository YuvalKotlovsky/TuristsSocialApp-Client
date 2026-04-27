import mongoose, { Document, Schema, Types } from "mongoose";

export interface IComment extends Document {
  postId: Types.ObjectId;
  content: string;
  createdBy: Types.ObjectId;
}

const commentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    content: { type: String, required: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IComment>("Comment", commentSchema);
