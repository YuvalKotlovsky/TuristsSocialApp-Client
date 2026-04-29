import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { naturalLanguageSearch } from '@/services/ai.service';
import type { Post } from '@/types';

interface AISearchBarProps {
  onResults: (filtered: Post[]) => void;
  onClear: () => void;
}

export default function AISearchBar({ onResults, onClear }: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setHasResults(false);
        onClear();
        return;
      }

      setLoading(true);
      try {
        const { results } = await naturalLanguageSearch(q);
        setHasResults(true);
        onResults(results);
      } catch {
        setHasResults(false);
        onClear();
      } finally {
        setLoading(false);
      }
    },
    [onResults, onClear]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void runSearch(query), 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const handleClear = () => {
    setQuery('');
    setHasResults(false);
    onClear();
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
        ) : (
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search with AI… e.g. &quot;beach sunsets in Asia&quot;"
          className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {(query || hasResults) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {hasResults && !loading && (
        <p className="mt-1 text-xs text-muted-foreground">
          Showing AI-filtered results for &quot;{query}&quot;
        </p>
      )}
    </div>
  );
}
