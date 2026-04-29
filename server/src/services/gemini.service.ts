import { GoogleGenerativeAI } from "@google/generative-ai";

export interface QueryIntents {
  locations: string[];
  themes: string[];
  keywords: string[];
  expandedKeywords: string[];
}

export interface RankingCandidatePost {
  id: string;
  content: string;
  location?: string | null;
}

export interface RankedPostMatch {
  postId: string;
  score: number;
  reason: string;
}

const MODEL_NAME = "gemini-1.5-flash";
const SYSTEM_PROMPT =
  "You are a bilingual (Hebrew + English) travel search assistant. Analyze the user query and return ONLY valid JSON with this exact shape: { \"locations\": string[], \"themes\": string[], \"keywords\": string[], \"expandedKeywords\": string[] }. Rules: 1) Include locations in original language and English when possible (for example, \"איטליה\" and \"Italy\"). 2) themes should include travel intents such as beaches, food, nightlife, nature, shopping, adventure, romantic, family. 3) keywords are the important words from the user query. 4) expandedKeywords must include useful synonyms and related words in Hebrew and English for better travel-post retrieval. 5) Do not include explanations, markdown, or text outside JSON.";
const RANKING_SYSTEM_PROMPT =
  "You are a bilingual (Hebrew + English) travel semantic ranking assistant. Return ONLY valid JSON with shape: { \"matches\": [{ \"postId\": \"string\", \"score\": number, \"reason\": \"string\" }] }. Task: score post relevance to a travel query by meaning/context, not exact words only. Consider location relevance, travel style, mood, destination fit, and intent. Score range is 0-100. Include only posts with score >= 50. Keep reasons concise.";

function dedupeTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const term of terms) {
    const key = term.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(term);
  }

  return result;
}

function tokenizeQuery(query: string): string[] {
  return dedupeTerms(
    query
      .split(/[\s,.;:!?()\[\]{}"'`~\\/|+-]+/u)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2)
  );
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sanitizeIntents(value: unknown): QueryIntents {
  if (!value || typeof value !== "object") {
    return { locations: [], themes: [], keywords: [], expandedKeywords: [] };
  }

  const intents = value as Partial<Record<keyof QueryIntents, unknown>>;

  return {
    locations: dedupeTerms(sanitizeStringArray(intents.locations)),
    themes: dedupeTerms(sanitizeStringArray(intents.themes)),
    keywords: dedupeTerms(sanitizeStringArray(intents.keywords)),
    expandedKeywords: dedupeTerms(sanitizeStringArray(intents.expandedKeywords)),
  };
}

function extractJsonObject(rawText: string): string {
  const cleaned = rawText.trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return cleaned;
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function sanitizeMatches(value: unknown, candidatePostIds: Set<string>): RankedPostMatch[] {
  if (!Array.isArray(value)) return [];

  const output: RankedPostMatch[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const rawPostId = (item as { postId?: unknown }).postId;
    const rawScore = (item as { score?: unknown }).score;
    const rawReason = (item as { reason?: unknown }).reason;

    if (typeof rawPostId !== "string") continue;
    const postId = rawPostId.trim();
    if (!postId || !candidatePostIds.has(postId) || seen.has(postId)) continue;

    const score = typeof rawScore === "number" ? rawScore : Number(rawScore);
    if (!Number.isFinite(score)) continue;

    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
    if (normalizedScore < 50) continue;

    const reason = typeof rawReason === "string" ? rawReason.trim() : "";

    seen.add(postId);
    output.push({
      postId,
      score: normalizedScore,
      reason,
    });
  }

  output.sort((a, b) => b.score - a.score);
  return output;
}

function fallback(query: string): QueryIntents {
  const words = tokenizeQuery(query);
  const keywords = dedupeTerms([query, ...words].filter((term) => term.trim().length > 0));

  return {
    locations: [],
    themes: [],
    keywords,
    expandedKeywords: words,
  };
}

export async function extractQueryIntents(query: string): Promise<QueryIntents> {
  const trimmedQuery = String(query ?? "").trim();
  if (!trimmedQuery) {
    return fallback("");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallback(trimmedQuery);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(trimmedQuery);
    const rawText = result.response.text();
    const jsonText = extractJsonObject(rawText);
    const parsed = JSON.parse(jsonText) as unknown;
    const intents = sanitizeIntents(parsed);

    if (
      intents.locations.length ||
      intents.themes.length ||
      intents.keywords.length ||
      intents.expandedKeywords.length
    ) {
      return intents;
    }

    return fallback(trimmedQuery);
  } catch {
    return fallback(trimmedQuery);
  }
}

export async function rankPostsForQuery(
  query: string,
  intents: QueryIntents,
  posts: RankingCandidatePost[]
): Promise<RankedPostMatch[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || posts.length === 0) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: RANKING_SYSTEM_PROMPT,
    });

    const prompt = JSON.stringify({
      query,
      intents,
      posts,
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const jsonText = extractJsonObject(rawText);
    const parsed = JSON.parse(jsonText) as { matches?: unknown };
    const candidatePostIds = new Set(posts.map((post) => post.id));
    return sanitizeMatches(parsed.matches, candidatePostIds);
  } catch {
    return null;
  }
}
