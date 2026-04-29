import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash";

export interface PostSummary {
  id: string;
  content: string;
  location?: string;
}

const SEMANTIC_SEARCH_PROMPT = `You are a semantic search engine for a multilingual travel blog.

Your task: given a search query and a list of travel posts, return the IDs of posts that are semantically or thematically relevant to the query.

Rules:
- The query and posts may be in Hebrew, English, or mixed. Understand MEANING regardless of language.
- Match by CONCEPT and CONTEXT, not by literal word overlap.
  * "beach" → match posts about ocean, surf, waves, sand, snorkeling, or coastal destinations (Philippines, Bali, Tel Aviv beach, etc.)
  * "הר" (mountain in Hebrew) → match posts about hiking, Alps, snow, ski, trekking, peaks, elevation
  * "אוכל" (food) → match posts about restaurants, cuisine, street food, local dishes, markets
  * "ג'ונגל" (jungle) → match posts about rainforest, Amazon, dense forest, tropical nature
- Be liberal: include a post if there is reasonable thematic overlap, even if the query word never appears.
- Exclude posts that are clearly unrelated.

Return ONLY a valid JSON array of matching post IDs (strings). Example: ["abc123","def456"]
Return [] if nothing matches. Do not include any explanation or extra text.`;

function extractJsonArray(rawText: string): string {
  const cleaned = rawText.trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return "[]";
  return cleaned.slice(start, end + 1);
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "trip",
  "travel",
  "with",
  "טיול",
  "טיולים",
  "של",
  "עם",
  "על",
  "גם",
  "זה",
  "זו",
]);

function buildQueryTerms(query: string): string[] {
  const terms = new Set<string>();
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery) {
    terms.add(normalizedQuery);
  }

  for (const rawToken of normalizedQuery.split(/[^\p{L}\p{N}]+/u)) {
    const token = rawToken.trim();
    if (!token || STOP_WORDS.has(token)) {
      continue;
    }

    terms.add(token);

    if (token.length > 3 && token.endsWith("s")) {
      terms.add(token.slice(0, -1));
    }

    if (token.length > 4 && token.endsWith("es")) {
      terms.add(token.slice(0, -2));
    }

    if (token.length > 4 && token.endsWith("ing")) {
      terms.add(token.slice(0, -3));
    }

    if (token.length > 3 && (token.endsWith("ים") || token.endsWith("ות"))) {
      terms.add(token.slice(0, -2));
    }
  }

  return Array.from(terms);
}

function keywordFallback(query: string, posts: PostSummary[]): string[] {
  const queryTerms = buildQueryTerms(query);

  if (queryTerms.length === 0) {
    return [];
  }

  return posts
    .map((post) => {
      const haystack = `${post.content} ${post.location ?? ""}`.toLowerCase();
      const score = queryTerms.reduce((total, term) => {
        if (!term || !haystack.includes(term)) {
          return total;
        }

        return total + Math.max(1, Math.min(term.length, 4));
      }, 0);

      return { id: post.id, score };
    })
    .filter((post) => post.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((post) => post.id);
}

export async function findSemanticMatches(
  query: string,
  posts: PostSummary[]
): Promise<string[]> {
  if (!query.trim() || posts.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return keywordFallback(query, posts);

  const postList = posts.map((p) => ({
    id: p.id,
    content: p.content.slice(0, 250),
    ...(p.location ? { location: p.location } : {}),
  }));

  const prompt = `Query: "${query}"\n\nPosts:\n${JSON.stringify(postList, null, 0)}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SEMANTIC_SEARCH_PROMPT,
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const jsonText = extractJsonArray(rawText);
    const parsed = JSON.parse(jsonText) as unknown;

    if (!Array.isArray(parsed)) return keywordFallback(query, posts);

    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return keywordFallback(query, posts);
  }
}
