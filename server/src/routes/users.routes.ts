import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { User, Post, Comment } from "../models";
import { verifyAccessToken, optionalAuth } from "../middleware/auth.middleware";
import { uploadAvatar } from "../middleware/upload.middleware";

const router = Router();

function buildAvatarUrl(req: Request, filename: string): string {
  return `${req.protocol}://${req.get("host")}/uploads/avatars/${filename}`;
}

function deleteAvatarFile(avatarUrl: string) {
  try {
    const filename = avatarUrl.split("/uploads/avatars/")[1];
    if (filename) {
      const filePath = path.join(__dirname, "../../uploads/avatars", filename);
      fs.unlink(filePath, () => {});
    }
  } catch {}
}

// PUT /me — must be declared before /:userId to avoid "me" matching the param
router.put("/me", verifyAccessToken, uploadAvatar, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { fullName, email } = req.body;
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;

    if (req.file) {
      if (user.avatar) deleteAvatarFile(user.avatar);
      user.avatar = buildAvatarUrl(req, req.file.filename);
    }

    await user.save();
    const { password: _pw, ...userObj } = user.toObject();
    res.json({ user: userObj });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile", error: err });
  }
});

// GET /:userId
router.get("/:userId", optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const postsCount = await Post.countDocuments({ createdBy: req.params.userId });
    res.json({ user, postsCount });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err });
  }
});

// GET /:userId/posts
router.get("/:userId/posts", optionalAuth, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({ createdBy: req.params.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "fullName avatar email"),
      Post.countDocuments({ createdBy: req.params.userId }),
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
      isLikedByMe: req.user
        ? post.likes.some((id) => id.toString() === req.user!.userId)
        : false,
      commentsCount: commentCountByPostId.get(post._id.toString()) ?? 0,
    }));

    res.json({ posts: postsWithLike, total, page, totalPages, hasMore: page < totalPages });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user posts", error: err });
  }
});

export default router;
