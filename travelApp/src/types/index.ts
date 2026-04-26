export interface User {
  id: string;
  fullName: string;
  email: string;
  avatar?: string | null;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  createdBy: User;
  createdAt: string;
}

export interface Post {
  id: string;
  content: string;
  image?: string | null;
  location?: string | null;
  createdBy: User;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  comments?: Comment[];
}

export interface PaginatedResponse<T> {
  posts: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}
