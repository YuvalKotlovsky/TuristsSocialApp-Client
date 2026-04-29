import { Router, Request, Response } from "express";
import { Comment, Post } from "../models";
import { verifyAccessToken } from "../middleware/auth.middleware";
import { findSemanticMatches } from "../services/gemini.service";

const router = Router();

router.use(verifyAccessToken);

/**
 * @openapi
 * /ai/search:
 *   post:
 *     tags: [AI]
 *     summary: Semantic search across posts using Gemini
 *     description: >
 *       Understands the meaning of the query (Hebrew or English) and returns
 *       posts that are contextually relevant, even without exact word matches.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: "beach vacation"
 *     responses:
 *       200:
 *         description: Semantically matched posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *       400:
 *         description: Query is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/search", async (req: Request, res: Response) => {
  try {
    const query = String(req.body.query ?? "").trim();
    if (!query) {
      res.status(400).json({ message: "query is required" });
      return;
    }

    const candidatePosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("createdBy", "fullName avatar email");

    const summaries = candidatePosts.map((p) => ({
      id: p._id.toString(),
      content: p.content,
      location: p.location,
    }));

    const matchingIds = await findSemanticMatches(query, summaries);

    if (matchingIds.length === 0) {
      res.json({ results: [] });
      return;
    }

    const postById = new Map(candidatePosts.map((p) => [p._id.toString(), p]));
    const orderedPosts = matchingIds
      .map((id) => postById.get(id))
      .filter(Boolean) as typeof candidatePosts;

    const postIds = orderedPosts.map((p) => p._id);
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

    const results = orderedPosts.map((post) => ({
      ...post.toObject(),
      isLikedByMe: post.likes.some(
        (id) => id != null && id.toString() === req.user!.userId
      ),
      commentsCount: commentCountByPostId.get(post._id.toString()) ?? 0,
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ message: "Failed to search posts", error: err });
  }
});

export default router;
