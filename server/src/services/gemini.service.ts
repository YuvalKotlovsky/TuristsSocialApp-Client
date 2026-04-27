import { GoogleGenerativeAI } from "@google/generative-ai";

export interface QueryIntents {
  locations: string[];
  themes: string[];
  keywords: string[];
}

const MODEL_NAME = "gemini-1.5-flash";
const SYSTEM_PROMPT =
  "You are a travel search assistant. Extract from the user's natural language query: location keywords, travel themes/tags, and mood. Return ONLY a JSON object with: { locations: string[], themes: string[], keywords: string[] }";

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sanitizeIntents(value: unknown): QueryIntents {
  if (!value || typeof value !== "object") {
    return { locations: [], themes: [], keywords: [] };
  }

  const intents = value as Partial<Record<keyof QueryIntents, unknown>>;

  return {
    locations: sanitizeStringArray(intents.locations),
    themes: sanitizeStringArray(intents.themes),
    keywords: sanitizeStringArray(intents.keywords),
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

function fallback(query: string): QueryIntents {
  return {
    locations: [],
    themes: [],
    keywords: [query],
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

    if (intents.locations.length || intents.themes.length || intents.keywords.length) {
      return intents;
    }

    return fallback(trimmedQuery);
  } catch {
    return fallback(trimmedQuery);
  }
}
