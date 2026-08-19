import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    _ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return _ai;
}

const FALLBACK_MODELS = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

export async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
}) {
  const ai = getGeminiClient();
  const models = [
    params.preferredModel || "gemini-3.7-flash",
    ...FALLBACK_MODELS.filter((m) => m !== (params.preferredModel || "gemini-3.7-flash")),
  ];

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || "");
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (isTransient) {
          // Wait 1-2 seconds with slight jitter before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        // If not a transient load error, immediately try next model or throw
        break;
      }
    }
  }

  throw lastError || new Error("Failed to generate content after retries.");
}
