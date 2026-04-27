import api from './api';
import type { Post, Comment, PaginatedResponse } from '@/types';

// GET /api/posts/feed?page=&limit=
export async function getFeed(
  page = 1,
  limit = 10
): Promise<PaginatedResponse<Post>> {
  const { data } = await api.get<PaginatedResponse<Post>>(
    `/posts/feed?page=${page}&limit=${limit}`
  );
  return data;
}

// GET /api/posts/:id
export async function getPostById(postId: string): Promise<Post | null> {
  try {
    const { data } = await api.get<{ post: Post }>(`/posts/${postId}`);
    return data.post;
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

  const response = await api.post<{ post: Post }>('/posts', form);
  return response.data.post;
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

  const { data: response } = await api.put<{ post: Post }>(`/posts/${postId}`, form);
  return response.post;
}

// DELETE /api/posts/:id
export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

// POST /api/posts/:id/like
export async function toggleLike(postId: string): Promise<Post | null> {
  try {
    const { data } = await api.post<{ post: Post }>(`/posts/${postId}/like`);
    return data.post;
  } catch {
    return null;
  }
}

// GET /api/comments/:postId
export async function getComments(postId: string): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>(`/comments/${postId}`);
  return data;
}

// POST /api/comments/:postId
export async function addComment(
  postId: string,
  content: string
): Promise<Comment> {
  const { data } = await api.post<Comment>(`/comments/${postId}`, { content });
  return data;
}

// DELETE /api/comments/single/:commentId
export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/single/${commentId}`);
}
