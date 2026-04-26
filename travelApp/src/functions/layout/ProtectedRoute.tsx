import { ROUTES } from '@/constants/routes';
import type { RootState } from '@/services';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const isUserLoggedIn = useSelector((state: RootState) => state.auth.isUserLoggedIn);

  if (!isUserLoggedIn) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
