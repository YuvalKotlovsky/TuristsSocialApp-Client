import { Router, Request, Response } from "express";
import { Comment, Post } from "../models";
import { verifyAccessToken } from "../middleware/auth.middleware";
import { extractQueryIntents, rankPostsForQuery } from "../services/gemini.service";

const router = Router();

router.use(verifyAccessToken);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const REGEX_CANDIDATE_LIMIT = 50;
const RECENT_CANDIDATE_LIMIT = 40;
const MIN_CANDIDATES_FOR_RANKING = 20;

function uniquePostsById<T extends { _id: unknown }>(posts: T[]): T[] {
  const map = new Map<string, T>();
  for (const post of posts) {
    map.set(String(post._id), post);
  }
  return Array.from(map.values());
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
        [
          ...intents.locations,
          ...intents.themes,
          ...intents.keywords,
          ...intents.expandedKeywords,
        ]
          .map((term) => term.trim())
          .filter((term) => term.length > 0)
      )
    );

    const orConditions = searchTerms.flatMap((term) => {
      const pattern = escapeRegex(term);
      return [
        { content: { $regex: pattern, $options: "i" } },
        { location: { $regex: pattern, $options: "i" } },
      ];
    });

    const regexPosts =
      orConditions.length > 0
        ? await Post.find({ $or: orConditions })
            .sort({ createdAt: -1 })
            .limit(REGEX_CANDIDATE_LIMIT)
            .populate("createdBy", "fullName avatar email")
        : [];

    const needsExpansion = regexPosts.length < MIN_CANDIDATES_FOR_RANKING;
    const recentPosts = needsExpansion
      ? await Post.find()
          .sort({ createdAt: -1 })
          .limit(RECENT_CANDIDATE_LIMIT)
          .populate("createdBy", "fullName avatar email")
      : [];

    const candidatePosts = uniquePostsById([...regexPosts, ...recentPosts]);
    const rankingInput = candidatePosts.map((post) => ({
      id: post._id.toString(),
      content: post.content,
      location: post.location ?? null,
    }));

    const rankedMatches = await rankPostsForQuery(query, intents, rankingInput);

    const posts =
      rankedMatches !== null
        ? (() => {
            const scoreByPostId = new Map(
              rankedMatches.map((match) => [match.postId, match.score])
            );

            return candidatePosts
              .filter((post) => scoreByPostId.has(post._id.toString()))
              .sort(
                (a, b) =>
                  (scoreByPostId.get(b._id.toString()) ?? 0) -
                  (scoreByPostId.get(a._id.toString()) ?? 0)
              );
          })()
        : regexPosts;

    if (posts.length === 0) {
      res.json({ results: [], query: intents });
      return;
    }

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

    const rankedByPostId = new Map(
      (rankedMatches ?? []).map((match) => [match.postId, match])
    );

    const results = posts.map((post) => {
      const ranked = rankedByPostId.get(post._id.toString());

      return {
        ...post.toObject(),
        isLikedByMe: post.likes.some((id) => id.toString() === req.user!.userId),
        commentsCount: commentCountByPostId.get(post._id.toString()) ?? 0,
        aiScore: ranked?.score,
        aiReason: ranked?.reason,
      };
    });

    res.json({ results, query: intents });
  } catch (err) {
    res.status(500).json({ message: "Failed to search posts", error: err });
  }
});

export default router;
