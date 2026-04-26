export const ROUTES = {
  HOME: "/home",
  LOGIN: "/login",
  REGISTER: "/register",
  PROFILE: "/profile",
  CREATE_POST: "/create",
  VIEW_POST: (postId: string) => `/post/${postId}`,
  EDIT_POST: (postId: string) => `/post/${postId}/edit`,
} as const;
