import api from './api';
import type { Post } from '@/types';

type ApiUser = Post['createdBy'] & { _id?: string };
type ApiPost = Omit<Post, 'id' | 'createdBy' | 'likesCount'> & {
  id?: string;
  _id?: string;
  likes?: unknown[];
  likesCount?: number;
  createdBy?: ApiUser;
};

function normalizePost(post: ApiPost): Post {
  const createdBy = post.createdBy;

  return {
    id: post.id ?? post._id ?? '',
    content: post.content,
    image: post.image ?? null,
    location: post.location ?? null,
    createdBy: {
      id: createdBy?.id ?? createdBy?._id ?? '',
      fullName: createdBy?.fullName ?? '',
      email: createdBy?.email ?? '',
      avatar: createdBy?.avatar ?? null,
    },
    createdAt: post.createdAt,
    likesCount: post.likesCount ?? (Array.isArray(post.likes) ? post.likes.length : 0),
    commentsCount: post.commentsCount ?? 0,
    isLikedByMe: Boolean(post.isLikedByMe),
    comments: post.comments,
  };
}

export async function naturalLanguageSearch(query: string): Promise<{ results: Post[] }> {
  const { data } = await api.post<{ results: ApiPost[] }>('/ai/search', { query });
  return { results: data.results.map(normalizePost) };
}

export async function generateCaption(
  location: string,
  description?: string
): Promise<string[]> {
  const { data } = await api.post<{ captions: string[] }>('/ai/caption', {
    location,
    description,
  });
  return data.captions;
}
