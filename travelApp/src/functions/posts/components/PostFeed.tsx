import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, MessageCircle } from "lucide-react";
import type { Post } from "@/types";
import { getInitials } from "@/lib/utils";

interface PostsFeedProps {
  posts: Post[];
  onLike: (postId: string) => void;
  onOpenPost: (postId: string) => void;
}

export default function PostsFeed({
  posts,
  onLike,
  onOpenPost,
}: PostsFeedProps) {
  return (
    <div className="flex flex-col gap-6">
      {posts.map((post) => (
        <Card
          key={post.id}
          className="rounded-xl bg-card border border-border shadow-sm overflow-hidden"
        >
          {/* Author */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Avatar className="size-10">
              <AvatarImage
                src={post.createdBy.avatar}
                alt={post.createdBy.fullName}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(post.createdBy.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm truncate">
                {post.createdBy.fullName}
              </p>
              {post.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {post.location}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Image */}
          {post.image && (
            <div
              className="aspect-4/3 cursor-pointer"
              onClick={() => onOpenPost(post.id)}
            >
              <img
                src={post.image}
                alt="Post"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-4 space-y-2">
            <p
              className="text-foreground leading-relaxed cursor-pointer"
              onClick={() => onOpenPost(post.id)}
            >
              {post.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLike(post.id)}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Heart
                  className={`size-5 ${
                    post.isLikedByMe ? "fill-red-500 text-red-500" : ""
                  }`}
                />
                <span className="text-sm">{post.likesCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenPost(post.id)}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <MessageCircle className="size-5" />
                <span className="text-sm">{post.commentsCount}</span>
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
