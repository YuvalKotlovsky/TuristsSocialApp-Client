import AppLayout from '@/functions/layout/AppLayout';
import Create from '@/functions/posts/pages/Create';
import Home from '@/functions/posts/pages/Home';
import Login from '@/functions/auth/pages/Login';
import Post from '@/functions/posts/pages/Post';
import Profile from '@/functions/profile/pages/Profile';
import Register from '@/functions/auth/pages/Register';
import OAuthCallback from '@/functions/auth/pages/OAuthCallback';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/functions/layout/ProtectedRoute';
import EditPost from '@/functions/posts/pages/EditPost';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/home" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/post/:postId/edit" element={<EditPost />} />
          <Route path="/post/:postId" element={<Post />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
