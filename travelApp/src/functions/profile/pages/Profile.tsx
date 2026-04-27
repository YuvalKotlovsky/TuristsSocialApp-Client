import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import PostsFeed from '@/functions/posts/components/PostFeed';
import { useNavigate } from 'react-router-dom';
import type { Post } from '@/types';
import { getInitials } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import { useAppSelector, useAppDispatch } from '@/services/hooks';
import { updateUser } from '@/services/reducers/auth';
import api from '@/services/api';

interface ProfileResponse {
  user: { id: string; fullName: string; email: string; avatar?: string | null };
  posts: Post[];
}

export default function Profile() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const { data } = await api.get<{ posts: Post[] }>(
          `/users/${currentUser.id}/posts?page=1&limit=20`
        );
        setPosts(data.posts);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.id]);

  const handleEditStart = () => {
    setTempName(currentUser?.fullName ?? '');
    setTempEmail(currentUser?.email ?? '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Upload avatar if changed
      if (avatarFile) {
        const form = new FormData();
        form.append('avatar', avatarFile);
        const { data: updated } = await api.post<{
          id: string; fullName: string; email: string; avatar?: string | null;
        }>('/profile/avatar', form);
        dispatch(updateUser(updated));
      }

      // Update name / email
      const { data: updated } = await api.put<{
        id: string; fullName: string; email: string; avatar?: string | null;
      }>('/profile', { fullName: tempName.trim(), email: tempEmail.trim() });

      dispatch(updateUser(updated));
      setIsEditing(false);
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
      )
    );
  };

  const displayAvatar = avatarPreview ?? currentUser?.avatar ?? undefined;
  const displayName = isEditing ? tempName : (currentUser?.fullName ?? '');

  return (
    <div className="min-h-screen pb-20 bg-background w-full max-w-3xl mx-auto">
      <header className="bg-card border-b border-border">
        <div className="px-4 py-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Profile</h1>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleEditStart} className="text-primary font-medium">
              Edit
            </Button>
          )}
        </div>
      </header>

      <main className="w-full px-4 py-6">
        {error && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <Avatar
              className={`size-24 ring-4 ring-primary/20 ${isEditing ? 'cursor-pointer' : ''}`}
              onClick={() => isEditing && fileInputRef.current?.click()}
            >
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(displayName || 'U')}
              </AvatarFallback>
            </Avatar>

            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
                aria-label="Change profile picture"
              >
                <Camera className="size-4" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {isEditing ? (
            <div className="space-y-2 w-full max-w-xs">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="Full name"
                className="w-full text-xl font-semibold text-foreground text-center bg-transparent border-b-2 border-primary outline-none px-2 py-1"
                autoFocus
              />
              <input
                type="email"
                value={tempEmail}
                onChange={(e) => setTempEmail(e.target.value)}
                placeholder="Email"
                className="w-full text-sm text-muted-foreground text-center bg-transparent border-b border-border outline-none px-2 py-1"
              />
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-1">{currentUser?.fullName}</h2>
              <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            </>
          )}
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-4">My Posts</h3>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <PostsFeed
            posts={posts}
            onLike={handleLike}
            onOpenPost={(id) => navigate(ROUTES.VIEW_POST(id))}
          />
        )}
      </main>
    </div>
  );
}
