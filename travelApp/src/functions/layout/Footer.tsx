import { ROUTES } from '@/constants/routes';
import { useAppDispatch, useAppSelector } from '@/services/hooks';
import { logout } from '@/services/reducers/auth';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, LogOut, PlusSquare, User } from 'lucide-react';
import { logoutApi } from '@/services/auth.service';

export const Footer = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);

  const handleLogout = async () => {
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // Proceed even if server call fails
      }
    }
    dispatch(logout());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-card border-b border-border z-50 pb-safe">
      <div className="max-w-97.5 mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex flex-col items-center gap-1 text-muted-foreground"
            aria-label="Home"
            onClick={() => navigate(ROUTES.HOME)}
          >
            <HomeIcon className="size-6" />
            <span className="text-xs">Home</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center gap-1 text-muted-foreground"
            aria-label="Create"
            onClick={() => navigate(ROUTES.CREATE_POST)}
          >
            <PlusSquare className="size-6" />
            <span className="text-xs">Create</span>
          </button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex flex-col items-center gap-1 text-primary"
              aria-label="Profile"
              onClick={() => navigate(ROUTES.PROFILE)}
            >
              <User className="size-6" />
              <span className="text-xs">Profile</span>
            </button>

            <button
              type="button"
              aria-label="Logout"
              onClick={() => void handleLogout()}
              className="text-destructive hover:opacity-80"
            >
              <LogOut className="size-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
