import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-1.5-flash";

export interface PostSummary {
  id: string;
  content: string;
  location?: string;
}

const SEMANTIC_SEARCH_PROMPT = `You are a semantic travel search engine with deep knowledge of world destinations and their characteristics.

Your task: given a search query and a list of travel posts, return the IDs of posts that are semantically or thematically relevant.

IMPORTANT - Location-based matching:
You must use your knowledge of destinations to match queries to locations even when the query word doesn't appear in the post.
Examples:
- "גלישה" / "surfing" / "waves" → match posts about: Philippines, Bali, Hawaii, Sri Lanka, Portugal, Australia, Tel Aviv beach
- "ים" / "beach" / "חוף" → match posts about: any coastal destination, Mediterranean, Caribbean, Southeast Asia beaches
- "שקיעות" / "sunset" → match posts about: Santorini, Bali, Maldives, desert locations
- "הרים" / "mountains" / "טיפוס" → match posts about: Nepal, Switzerland, Alps, Himalayas, Colorado
- "ג'ונגל" / "jungle" → match posts about: Amazon, Thailand, Costa Rica, Borneo, Philippines
- "מדבר" / "desert" → match posts about: Sahara, Jordan, Arizona, Negev, Dubai
- "תרבות" / "culture" → match posts about: Japan, India, Morocco, Italy, Greece
- "אוכל" / "food" / "קולינריה" → match posts about: Italy, Japan, Thailand, Mexico, India

Rules:
- Support Hebrew and English queries equally well
- Match by DESTINATION CHARACTER, not just keywords
- If a post mentions a location, use your knowledge of that location to determine relevance
- Be generous with matches - include a post if there is reasonable thematic or geographic overlap
- Exclude only posts that are clearly unrelated

Return ONLY a valid JSON array of matching post IDs (strings). Example: ["abc123","def456"]
Return [] if nothing matches. No explanations, no markdown, only JSON.`;
function extractJsonArray(rawText: string): string {
  const cleaned = rawText.trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return "[]";
  return cleaned.slice(start, end + 1);
}

function keywordFallback(query: string, posts: PostSummary[]): string[] {
  const q = query.toLowerCase();
  return posts
    .filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q)
    )
    .map((p) => p.id);
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

  console.log("[gemini] query:", query);
  console.log("[gemini] posts sent to Gemini:", JSON.stringify(postList, null, 2));

  const prompt = `Query: "${query}"\n\nPosts:\n${JSON.stringify(
    postList,
    null,
    0
  )}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SEMANTIC_SEARCH_PROMPT,
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    console.log("[gemini] raw response:", rawText);
    const jsonText = extractJsonArray(rawText);
    const parsed = JSON.parse(jsonText) as unknown;

    if (!Array.isArray(parsed)) return keywordFallback(query, posts);

    return parsed.filter((id): id is string => typeof id === "string");
  } catch (error) {
    console.log("[gemini] ERROR:", error);
    return keywordFallback(query, posts);
  }
}
