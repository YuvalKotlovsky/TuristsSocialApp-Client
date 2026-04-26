import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/services/hooks';
import { login } from '@/services/reducers/auth';
import { ROUTES } from '@/constants/routes';
import type { User } from '@/types';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userRaw = params.get('user');

    if (!accessToken || !refreshToken || !userRaw) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw)) as User;
      dispatch(login({ user, accessToken, refreshToken }));
      navigate(ROUTES.HOME, { replace: true });
    } catch {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [dispatch, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Completing sign in…</p>
    </div>
  );
}
