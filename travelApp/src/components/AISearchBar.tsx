import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { naturalLanguageSearch } from '@/services/ai.service';
import type { Post } from '@/types';

interface AISearchBarProps {
  onResults: (filtered: Post[]) => void;
  onClear: () => void;
  onSearchStateChange: (active: boolean) => void;
}

function isCanceledError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' ||
      error.name === 'CanceledError' ||
      'code' in error &&
        typeof error.code === 'string' &&
        error.code === 'ERR_CANCELED')
  );
}

export default function AISearchBar({ onResults, onClear, onSearchStateChange }: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const lastSubmittedQueryRef = useRef('');
  const onResultsRef = useRef(onResults);
  const onClearRef = useRef(onClear);
  const onSearchStateChangeRef = useRef(onSearchStateChange);

  useEffect(() => {
    onResultsRef.current = onResults;
    onClearRef.current = onClear;
    onSearchStateChangeRef.current = onSearchStateChange;
  }, [onResults, onClear, onSearchStateChange]);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmedQuery = q.trim();
      if (!trimmedQuery) {
        return;
      }

      if (trimmedQuery === lastSubmittedQueryRef.current) {
        return;
      }

      lastSubmittedQueryRef.current = trimmedQuery;
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const { results } = await naturalLanguageSearch(trimmedQuery, controller.signal);
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setHasSearched(true);
        onResultsRef.current(results);
      } catch (error) {
        if (isCanceledError(error) || currentRequestId !== requestIdRef.current) {
          return;
        }

        setHasSearched(true);
        onResultsRef.current([]);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const trimmedQuery = query.trim();

    onSearchStateChangeRef.current(Boolean(trimmedQuery));

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!trimmedQuery) {
      abortRef.current?.abort();
      requestIdRef.current += 1;
      lastSubmittedQueryRef.current = '';
      setLoading(false);
      setHasSearched(false);
      onClearRef.current();
      return;
    }

    debounceRef.current = setTimeout(() => void runSearch(trimmedQuery), 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleClear = () => {
    setQuery('');
    setHasSearched(false);
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
        {(query || hasSearched) && (
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
      {hasSearched && !loading && query.trim() && (
        <p className="mt-1 text-xs text-muted-foreground">
          Showing AI-filtered results for &quot;{query}&quot;
        </p>
      )}
    </div>
  );
}
