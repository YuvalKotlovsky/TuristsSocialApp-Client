import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PostsFeed from '../components/PostFeed';
import { getFeed, toggleLike } from '@/services/posts.service';
import type { Post } from '@/types';
import { ROUTES } from '@/constants/routes';
import AISearchBar from '@/components/AISearchBar';

export default function Home() {
  const navigate = useNavigate();

  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await getFeed(pageNum, 10);
        const newPosts = data.posts;

        setAllPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
        setDisplayedPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
        setHasMore(data.hasMore);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (isSearching) return;

    observerRef.current?.disconnect();

    if (!hasMore || loadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          const next = page + 1;
          setPage(next);
          void loadPage(next, true);
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observerRef.current.observe(sentinel);

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, page, loadPage, isSearching]);

  const handleLike = async (postId: string) => {
    const prevDisplayedPosts = displayedPosts;
    const prevAllPosts = allPosts;

    // Optimistic update on both displayed + all
    const optimistic = (posts: Post[]) =>
      posts.map((p) =>
        p.id !== postId
          ? p
          : { ...p, isLikedByMe: !p.isLikedByMe, likesCount: p.isLikedByMe ? p.likesCount - 1 : p.likesCount + 1 }
      );

    setDisplayedPosts(optimistic);
    setAllPosts(optimistic);

    const updated = await toggleLike(postId);
    if (!updated) {
      setDisplayedPosts(prevDisplayedPosts);
      setAllPosts(prevAllPosts);
      return;
    }

    const sync = (posts: Post[]) =>
      posts.map((p) =>
        p.id !== postId
          ? p
          : { ...p, isLikedByMe: updated.isLikedByMe, likesCount: updated.likesCount }
      );
    setDisplayedPosts(sync);
    setAllPosts(sync);
  };

  const handleSearchResults = (filtered: Post[]) => {
    setIsSearching(true);
    setDisplayedPosts(filtered);
  };

  const handleSearchClear = () => {
    setIsSearching(false);
    setDisplayedPosts(allPosts);
  };

  return (
    <div className="min-h-screen pb-20 bg-background w-full max-w-3xl mx-auto">
      <header className="bg-card border-b border-border">
        <div className="px-4 py-4 space-y-3">
          <h1 className="text-xl font-semibold text-foreground">Home</h1>
          <AISearchBar
            allPosts={allPosts}
            onResults={handleSearchResults}
            onClear={handleSearchClear}
          />
        </div>
      </header>

      <main className="w-full px-4 py-6">
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : displayedPosts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {isSearching ? 'No posts matched your search.' : 'No posts yet.'}
          </p>
        ) : (
          <>
            <PostsFeed
              posts={displayedPosts}
              onLike={handleLike}
              onOpenPost={(id) => navigate(ROUTES.VIEW_POST(id))}
            />

            {/* Infinite scroll sentinel */}
            {!isSearching && (
              <div ref={sentinelRef} className="h-8 mt-4 flex items-center justify-center">
                {loadingMore && (
                  <p className="text-sm text-muted-foreground">Loading more…</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
