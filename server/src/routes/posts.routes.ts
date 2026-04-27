import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Comment, Post } from "../models";
import { uploadPost } from "../middleware/upload.middleware";
import { verifyAccessToken } from "../middleware/auth.middleware";

const router = Router();

router.use(verifyAccessToken);

export function buildImageUrl(req: Request, filename: string, folder: string): string {
  return `${req.protocol}://${req.get("host")}/uploads/${folder}/${filename}`;
}

function deleteImageFile(imageUrl: string, folder: string) {
  try {
    const filename = imageUrl.split(`/uploads/${folder}/`)[1];
    if (filename) {
      const filePath = path.join(__dirname, `../../uploads/${folder}`, filename);
      fs.unlink(filePath, () => {});
    }
  } catch {}
}

// GET /feed
router.get("/feed", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "fullName avatar email"),
      Post.countDocuments(),
    ]);

    const postIds = posts.map((post) => post._id);
    const commentCountRows =
      postIds.length > 0
        ? await Comment.aggregate<{ _id: string; count: number }>([
            { $match: { postId: { $in: postIds } } },
            { $group: { _id: "$postId", count: { $sum: 1 } } },
          ])
        : [];

    const commentCountByPostId = new Map(
      commentCountRows.map((row) => [String(row._id), row.count])
    );

    const totalPages = Math.ceil(total / limit);

    const postsWithLike = posts.map((post) => ({
      ...post.toObject(),
      isLikedByMe: post.likes.some((id) => id.toString() === req.user!.userId),
      commentsCount: commentCountByPostId.get(post._id.toString()) ?? 0,
    }));

    res.json({ posts: postsWithLike, total, page, totalPages, hasMore: page < totalPages });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch feed", error: err });
  }
});

// GET /:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id).populate("createdBy", "fullName avatar email");
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const commentsCount = await Comment.countDocuments({ postId: post._id });

    res.json({
      post: {
        ...post.toObject(),
        isLikedByMe: post.likes.some((id) => id.toString() === req.user!.userId),
        commentsCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch post", error: err });
  }
});

// POST /
router.post("/", uploadPost, async (req: Request, res: Response) => {
  try {
    const { content, location } = req.body;
    if (!content) {
      res.status(400).json({ message: "Content is required" });
      return;
    }
    const image = req.file ? buildImageUrl(req, req.file.filename, "posts") : undefined;
    const post = await Post.create({ content, location, image, createdBy: req.user!.userId });
    const populated = await post.populate("createdBy", "fullName avatar email");
    res.status(201).json({
      post: {
        ...populated.toObject(),
        commentsCount: 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create post", error: err });
  }
});

// PUT /:id
router.put("/:id", uploadPost, async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }
    if (post.createdBy.toString() !== req.user!.userId) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }

    const { content, location, removeImage } = req.body;

    if (content !== undefined) post.content = content;
    if (location !== undefined) post.location = location;

    if (removeImage === "true" && post.image) {
      deleteImageFile(post.image, "posts");
      post.image = undefined;
    }

    if (req.file) {
      if (post.image) deleteImageFile(post.image, "posts");
      post.image = buildImageUrl(req, req.file.filename, "posts");
    }

    await post.save();
    const populated = await post.populate("createdBy", "fullName avatar email");
    const commentsCount = await Comment.countDocuments({ postId: populated._id });
    res.json({
      post: {
        ...populated.toObject(),
        commentsCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update post", error: err });
  }
});

// POST /:id/like
router.post("/:id/like", async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const userId = req.user!.userId;
    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId as unknown as typeof post.likes[0]);
    }

    await post.save();
    const populated = await post.populate("createdBy", "fullName avatar email");
    const commentsCount = await Comment.countDocuments({ postId: populated._id });
    res.json({
      post: {
        ...populated.toObject(),
        isLikedByMe: !alreadyLiked,
        commentsCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle like", error: err });
  }
});

// DELETE /:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }
    if (post.createdBy.toString() !== req.user!.userId) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }
    if (post.image) deleteImageFile(post.image, "posts");
    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete post", error: err });
  }
});

export default router;
