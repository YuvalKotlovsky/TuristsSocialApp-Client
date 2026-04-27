import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { MapPin, ArrowLeft, Heart, Send, Pencil, Trash2 } from 'lucide-react';
import {
  getPostById,
  toggleLike,
  getComments,
  addComment,
  deleteComment,
} from '@/services/posts.service';
import type { Comment, Post } from '@/types';
import { getInitials } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import { useAppSelector } from '@/services/hooks';

export default function PostPage() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const currentUserId = useAppSelector((s) => s.auth.user?.id);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    void (async () => {
      try {
        const [p, c] = await Promise.all([getPostById(postId), getComments(postId)]);
        setPost(p);
        setComments(c);
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  const handleLike = async () => {
    if (!post) return;
    const prevPost = post;

    setPost((prev) =>
      !prev
        ? prev
        : { ...prev, isLikedByMe: !prev.isLikedByMe, likesCount: prev.isLikedByMe ? prev.likesCount - 1 : prev.likesCount + 1 }
    );

    const updated = await toggleLike(post.id);
    if (updated) {
      setPost(updated);
      return;
    }

    setPost(prevPost);
  };

  const handleAddComment = async () => {
    if (!post) return;
    const text = newComment.trim();
    if (!text) return;

    setIsSubmitting(true);
    setNewComment('');

    try {
      const created = await addComment(post.id, text);
      setComments((prev) => [created, ...prev]);
      setPost((prev) => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setPost((prev) => prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Post not found</h1>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="size-4 mr-2" /> Go back
          </Button>
        </div>
      </div>
    );
  }

  const authorId = post.createdBy?.id;
  const isOwner = Boolean(authorId && currentUserId && authorId === currentUserId);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="flex-1 text-lg font-semibold text-foreground truncate">Post</h1>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.EDIT_POST(post.id))}
            >
              <Pencil className="size-4 mr-2" /> Edit
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Card className="rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Avatar className="size-10">
              <AvatarImage src={post.createdBy?.avatar ?? undefined} alt={post.createdBy?.fullName ?? 'Unknown'} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(post.createdBy?.fullName ?? 'Unknown')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{post.createdBy?.fullName ?? 'Unknown'}</p>
              {post.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">{post.location}</span>
                </div>
              )}
            </div>
          </div>

          {post.image && (
            <div className="aspect-4/3">
              <img src={post.image} alt="Post" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-4">
            <p className="text-foreground leading-relaxed">{post.content}</p>
            <div className="flex items-center gap-4 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Heart className={`size-5 ${post.isLikedByMe ? 'fill-red-500 text-red-500' : ''}`} />
                <span className="text-sm">{post.likesCount}</span>
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>{post.commentsCount}</span>
                <span>Comments</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Add comment */}
        <Card className="rounded-xl overflow-hidden">
          <div className="p-4 space-y-3">
            <p className="font-semibold text-foreground">Add a comment</p>
            <Textarea
              placeholder="Write your comment…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-24 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void handleAddComment();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ctrl+Enter to submit</span>
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                <Send className="size-4 mr-2" />
                {isSubmitting ? 'Posting…' : 'Post'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Comments list */}
        <Card className="rounded-xl overflow-hidden">
          <div className="p-4">
            <p className="font-semibold text-foreground mb-3">
              Comments ({comments.length})
            </p>
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-4">
                {comments.map((c, idx) => (
                  <div key={c.id}>
                    {idx > 0 && <Separator className="my-4" />}
                    <div className="flex gap-3">
                      <Avatar className="size-8 shrink-0">
                        <AvatarImage src={c.createdBy.avatar ?? undefined} alt={c.createdBy.fullName} />
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          {getInitials(c.createdBy.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{c.createdBy.fullName}</p>
                          {c.createdBy.id === currentUserId && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteComment(c.id)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground break-words">{c.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
