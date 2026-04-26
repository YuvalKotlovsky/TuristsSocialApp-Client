import axios from 'axios';
import { store } from './index';
import { logout, setTokens } from './reducers/auth';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

export const api = axios.create({ baseURL: BASE_URL });

// Attach Bearer token from Redux store
api.interceptors.request.use((config) => {
  const { accessToken } = store.getState().auth;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) =>
        failedQueue.push({ resolve, reject })
      ).then((token) => {
        if (original) original.headers.Authorization = `Bearer ${token}`;
        return api(original!);
      });
    }

    original!._retry = true;
    isRefreshing = true;

    const { refreshToken } = store.getState().auth;

    try {
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(`${BASE_URL}/auth/refresh`, { refreshToken });

      store.dispatch(
        setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
      );

      flushQueue(null, data.accessToken);
      original!.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original!);
    } catch (refreshErr) {
      flushQueue(refreshErr, null);
      store.dispatch(logout());
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
