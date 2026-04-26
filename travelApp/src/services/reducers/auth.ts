import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isUserLoggedIn: boolean;
}

const STORAGE_KEY = 'travel_auth';

function loadFromStorage(): Partial<AuthState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<AuthState>) : {};
  } catch {
    return {};
  }
}

function persist(state: AuthState) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: state.user,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      isUserLoggedIn: state.isUserLoggedIn,
    })
  );
}

const saved = loadFromStorage();

const initialState: AuthState = {
  user: saved.user ?? null,
  accessToken: saved.accessToken ?? null,
  refreshToken: saved.refreshToken ?? null,
  isUserLoggedIn: saved.isUserLoggedIn ?? false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isUserLoggedIn = true;
      persist(state);
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isUserLoggedIn = false;
      localStorage.removeItem(STORAGE_KEY);
    },
    setTokens(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>
    ) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persist(state);
    },
    updateUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      persist(state);
    },
  },
});

export const { login, logout, setTokens, updateUser } = authSlice.actions;
export default authSlice.reducer;
