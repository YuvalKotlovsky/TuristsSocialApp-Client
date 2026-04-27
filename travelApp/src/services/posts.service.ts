import api from './api';
import type { Post, Comment, PaginatedResponse } from '@/types';

type ApiUser = Post['createdBy'] & { _id?: string };
type ApiPost = Omit<Post, 'id' | 'createdBy'> & {
  id?: string;
  _id?: string;
  createdBy?: ApiUser;
};
type ApiComment = Omit<Comment, 'id' | 'createdBy'> & {
  id?: string;
  _id?: string;
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
    likesCount: post.likesCount ?? 0,
    commentsCount: post.commentsCount ?? 0,
    isLikedByMe: Boolean(post.isLikedByMe),
    comments: post.comments,
  };
}

function normalizeComment(comment: ApiComment): Comment {
  const createdBy = comment.createdBy;

  return {
    id: comment.id ?? comment._id ?? '',
    postId: comment.postId,
    content: comment.content,
    createdBy: {
      id: createdBy?.id ?? createdBy?._id ?? '',
      fullName: createdBy?.fullName ?? '',
      email: createdBy?.email ?? '',
      avatar: createdBy?.avatar ?? null,
    },
    createdAt: comment.createdAt,
  };
}

// GET /api/posts/feed?page=&limit=
export async function getFeed(
  page = 1,
  limit = 10
): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<ApiPost>>(
    `/posts/feed?page=${page}&limit=${limit}`
  );
  return { ...data, posts: data.posts.map(normalizePost) };
}

// GET /api/users/:userId/posts?page=&limit=
export async function getUserPosts(
  userId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<ApiPost>>(
    `/users/${userId}/posts?page=${page}&limit=${limit}`
  );
  return { ...data, posts: data.posts.map(normalizePost) };
}

// GET /api/posts/:id
export async function getPostById(postId: string): Promise<Post | null> {
  try {
    const { data } = await api.get<Post>(`/posts/${postId}`);
    return data;
  } catch {
    return null;
  }
}

// POST /api/posts  (multipart/form-data)
export async function createPost(data: {
  content: string;
  location?: string;
  imageFile?: File | null;
}): Promise<Post> {
  const form = new FormData();
  form.append('content', data.content);
  if (data.location) form.append('location', data.location);
  if (data.imageFile) form.append('image', data.imageFile);

  const { data: post } = await api.post<Post>('/posts', form);
  return post;
}

// PUT /api/posts/:id  (multipart/form-data)
export async function updatePost(
  postId: string,
  data: {
    content: string;
    location?: string;
    imageFile?: File | null;
    removeImage?: boolean;
  }
): Promise<Post | null> {
  const form = new FormData();
  form.append('content', data.content);
  if (data.location !== undefined) form.append('location', data.location);
  if (data.imageFile) form.append('image', data.imageFile);
  if (data.removeImage) form.append('removeImage', 'true');

  const { data: post } = await api.put<Post>(`/posts/${postId}`, form);
  return post;
}

// DELETE /api/posts/:id
export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

// POST /api/posts/:id/like
export async function toggleLike(postId: string): Promise<Post | null> {
  try {
    const { data } = await api.post<Post>(`/posts/${postId}/like`);
    return data;
  } catch {
    return null;
  }
}

// GET /api/comments/:postId
export async function getComments(postId: string): Promise<Comment[]> {
  const { data } = await api.get<{ comments: ApiComment[] }>(`/comments/${postId}`);
  return data.comments.map(normalizeComment);
}

// POST /api/comments/:postId
export async function addComment(
  postId: string,
  content: string
): Promise<Comment> {
  const { data } = await api.post<{ comment: ApiComment }>(`/comments/${postId}`, { content });
  return normalizeComment(data.comment);
}

// DELETE /api/comments/single/:commentId
export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/single/${commentId}`);
}
