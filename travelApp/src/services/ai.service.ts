import api from './api';

interface PostMeta {
  id: string;
  content: string;
  location?: string | null;
}

interface SearchResult {
  matchingIds: string[];
  reasoning: Record<string, string>;
}

export async function naturalLanguageSearch(
  query: string,
  posts: PostMeta[]
): Promise<SearchResult> {
  const { data } = await api.post<SearchResult>('/ai/search', { query, posts });
  return data;
}

export async function generateCaption(
  location: string,
  description?: string
): Promise<string[]> {
  const { data } = await api.post<{ captions: string[] }>('/ai/caption', {
    location,
    description,
  });
  return data.captions;
}
