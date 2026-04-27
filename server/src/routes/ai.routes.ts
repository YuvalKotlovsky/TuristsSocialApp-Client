import { Router, Request, Response } from "express";
import { Comment, Post } from "../models";
import { verifyAccessToken } from "../middleware/auth.middleware";
import { extractQueryIntents } from "../services/gemini.service";

const router = Router();

router.use(verifyAccessToken);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.post("/search", async (req: Request, res: Response) => {
  try {
    const query = String(req.body.query ?? "").trim();
    if (!query) {
      res.status(400).json({ message: "query is required" });
      return;
    }

    const intents = await extractQueryIntents(query);

    const searchTerms = Array.from(
      new Set(
        [...intents.locations, ...intents.themes, ...intents.keywords]
          .map((term) => term.trim())
          .filter((term) => term.length > 0)
      )
    );

    if (searchTerms.length === 0) {
      res.json({ results: [], query: intents });
      return;
    }

    const orConditions = searchTerms.flatMap((term) => {
      const pattern = escapeRegex(term);
      return [
        { content: { $regex: pattern, $options: "i" } },
        { location: { $regex: pattern, $options: "i" } },
      ];
    });

    const posts = await Post.find({ $or: orConditions })
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName avatar email");

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

    const results = posts.map((post) => ({
      ...post.toObject(),
      isLikedByMe: post.likes.some((id) => id.toString() === req.user!.userId),
      commentsCount: commentCountByPostId.get(post._id.toString()) ?? 0,
    }));

    res.json({ results, query: intents });
  } catch (err) {
    res.status(500).json({ message: "Failed to search posts", error: err });
  }
});

export default router;
