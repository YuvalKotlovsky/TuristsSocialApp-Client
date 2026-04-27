import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Comment, Post } from "../models";
import { verifyAccessToken } from "../middleware/auth.middleware";

const router = Router();

router.use(verifyAccessToken);

/**
 * @openapi
 * /comments/{postId}:
 *   get:
 *     tags: [Comments]
 *     summary: Get all comments for a post (oldest first)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 */
router.get("/:postId", async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .sort({ createdAt: 1 })
      .populate("createdBy", "fullName avatar");
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch comments", error: err });
  }
});

/**
 * @openapi
 * /comments/{postId}:
 *   post:
 *     tags: [Comments]
 *     summary: Add a comment to a post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:postId", async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const { content } = req.body;
    if (!content) {
      res.status(400).json({ message: "Content is required" });
      return;
    }

    const comment = await Comment.create({
      postId: new Types.ObjectId(String(req.params.postId)),
      content,
      createdBy: new Types.ObjectId(String(req.user!.userId)),
    });
    const populated = await comment.populate("createdBy", "fullName avatar");
    res.status(201).json({ comment: populated });
  } catch (err) {
    res.status(500).json({ message: "Failed to add comment", error: err });
  }
});

/**
 * @openapi
 * /comments/single/{commentId}:
 *   delete:
 *     tags: [Comments]
 *     summary: Delete a comment (owner only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Comment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/single/:commentId", async (req: Request, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }
    if (comment.createdBy.toString() !== req.user!.userId) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }
    await comment.deleteOne();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete comment", error: err });
  }
});

export default router;
