import api from './api';
import type { Post } from '@/types';

type ApiUser = Post['createdBy'] & { _id?: string };
type ApiPost = Omit<Post, 'id' | 'createdBy'> & {
  id?: string;
  _id?: string;
  createdBy?: ApiUser;
};

interface AiSearchResponse {
  results: ApiPost[];
  query?: {
    locations: string[];
    themes: string[];
    keywords: string[];
    expandedKeywords: string[];
  };
}

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
    likesCount: post.likesCount ?? 0,
    commentsCount: post.commentsCount ?? 0,
    isLikedByMe: Boolean(post.isLikedByMe),
    comments: post.comments,
  };
}

export async function naturalLanguageSearch(query: string, signal?: AbortSignal): Promise<{
  results: Post[];
  query: {
    locations: string[];
    themes: string[];
    keywords: string[];
    expandedKeywords: string[];
  };
}> {
  const { data } = await api.post<AiSearchResponse>('/ai/search', { query }, { signal });
  return {
    results: data.results.map(normalizePost),
    query: {
      locations: data.query?.locations ?? [],
      themes: data.query?.themes ?? [],
      keywords: data.query?.keywords ?? [],
      expandedKeywords: data.query?.expandedKeywords ?? [],
    },
  };
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
