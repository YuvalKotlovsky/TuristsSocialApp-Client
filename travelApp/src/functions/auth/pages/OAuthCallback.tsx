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
    console.log('[OAuthCallback] search params:', Object.fromEntries(params.entries()));

    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userRaw = params.get('user');
    console.log('[OAuthCallback] accessToken:', accessToken);
    console.log('[OAuthCallback] refreshToken:', refreshToken);
    console.log('[OAuthCallback] userRaw:', userRaw);

    // No URL params — second render after navigation; fall back to localStorage
    if (!accessToken || !refreshToken || !userRaw) {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedAccessToken && storedRefreshToken && storedUser) {
        try {
          const user = JSON.parse(storedUser) as User;
          dispatch(login({ user, accessToken: storedAccessToken, refreshToken: storedRefreshToken }));
          navigate(ROUTES.HOME, { replace: true });
        } catch (err) {
          console.error('[OAuthCallback] error restoring session from localStorage:', err);
          navigate(ROUTES.LOGIN, { replace: true });
        }
      } else {
        navigate(ROUTES.LOGIN, { replace: true });
      }
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw)) as User;
      // Persist before navigating so the second render can restore the session
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      dispatch(login({ user, accessToken, refreshToken }));
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      console.error('[OAuthCallback] error parsing user:', err);
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [dispatch, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Completing sign in…</p>
    </div>
  );
}
