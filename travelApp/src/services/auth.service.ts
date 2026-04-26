import api from './api';
import type { User } from '@/types';

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function registerApi(
  fullName: string,
  email: string,
  password: string,
  avatarFile?: File | null
): Promise<AuthResponse> {
  const form = new FormData();
  form.append('fullName', fullName);
  form.append('email', email);
  form.append('password', password);
  if (avatarFile) form.append('avatar', avatarFile);

  const { data } = await api.post<AuthResponse>('/auth/register', form);
  return data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}
