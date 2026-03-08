type RouteCategoryId = "academic" | "financial" | "housing" | "tech" | null;

export type GeminiErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "quota_exceeded"
  | "forbidden"
  | "timeout"
  | "network_error"
  | "invalid_response"
  | "unknown";

export type GeminiRouteResult = {
  text: string;
  categoryId: RouteCategoryId;
};

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_TIMEOUT_MS = 12000;
const GEMINI_MAX_ATTEMPTS = 3;

export class GeminiApiError extends Error {
  code: GeminiErrorCode;
  status?: number;

  constructor(code: GeminiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "GeminiApiError";
    this.code = code;
    this.status = status;
  }
}

function getGeminiErrorCodeFromStatus(status: number, details: string): GeminiErrorCode {
  const lowerDetails = details.toLowerCase();

  if (status === 400 && (lowerDetails.includes("api key") || lowerDetails.includes("invalid_argument"))) {
    return "invalid_api_key";
  }
  if (status === 429) {
    return "quota_exceeded";
  }
  if (status === 403) {
    return lowerDetails.includes("quota") ? "quota_exceeded" : "forbidden";
  }
  if (status === 408) {
    return "timeout";
  }
  if (status >= 500) {
    return "network_error";
  }

  return "unknown";
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof GeminiApiError) {
    return error.code === "timeout" || error.code === "network_error" || error.code === "quota_exceeded";
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGeminiUserFacingErrorMessage(error: unknown): string {
  if (error instanceof GeminiApiError) {
    switch (error.code) {
      case "missing_api_key":
        return "AI routing is not configured yet. Add `VITE_GEMINI_API_KEY` to your `.env` file, then restart the dev server.";
      case "invalid_api_key":
        return "Your Gemini API key looks invalid. Update `VITE_GEMINI_API_KEY` and restart the app.";
      case "quota_exceeded":
        return "The AI routing quota is currently exhausted. Please try again in a bit, or use the manual categories below.";
      case "forbidden":
        return "This Gemini key is blocked for this request. Check Google AI Studio key restrictions and API enablement.";
      case "timeout":
      case "network_error":
        return "The AI routing request timed out. Please retry, or use the manual categories below.";
      case "invalid_response":
        return "The AI routing service returned an unexpected response. Please try again, or use the manual categories below.";
      default:
        return "I couldn't reach the AI routing service right now. Please try again or browse the manual categories below.";
    }
  }

  return "I couldn't reach the AI routing service right now. Please try again or browse the manual categories below.";
}

function normalizeCategoryId(categoryId: unknown): RouteCategoryId {
  if (categoryId === "academic" || categoryId === "financial" || categoryId === "housing" || categoryId === "tech") {
    return categoryId;
  }
  return null;
}

function extractTextFromGeminiResponse(payload: any): string {
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" ? text : "";
}

function parseRouteResult(rawText: string): GeminiRouteResult {
  const stripped = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  let parsed: any;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new GeminiApiError("invalid_response", "Gemini response was not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new GeminiApiError("invalid_response", "Gemini response did not contain a JSON object");
  }

  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  if (!text) {
    throw new GeminiApiError("invalid_response", "Gemini response did not include text");
  }

  return {
    text,
    categoryId: normalizeCategoryId(parsed.categoryId)
  };
}

export async function routeWhoDoIAskQuery(query: string): Promise<GeminiRouteResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new GeminiApiError("missing_api_key", "Missing VITE_GEMINI_API_KEY");
  }

  const prompt = [
    "You are Nova, a UT Dallas support routing assistant.",
    "Given a student's question, return concise routing guidance and select the best category.",
    "Return only JSON with this exact shape:",
    '{"text":"<2-4 sentence answer with department and suggested next step>","categoryId":"academic|financial|housing|tech|null"}',
    "If no category is clearly correct, use null.",
    `Student question: ${query}`
  ].join("\n");

  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

      const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const details = await response.text().catch(() => "");
        const errorCode = getGeminiErrorCodeFromStatus(response.status, details);
        throw new GeminiApiError(
          errorCode,
          `Gemini request failed (${response.status})${details ? `: ${details}` : ""}`,
          response.status
        );
      }

      const payload = await response.json();
      const rawText = extractTextFromGeminiResponse(payload);
      if (!rawText) {
        throw new GeminiApiError("invalid_response", "Gemini returned an empty response");
      }

      return parseRouteResult(rawText);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new GeminiApiError("timeout", "Gemini request timed out");
      } else if (error instanceof TypeError) {
        lastError = new GeminiApiError("network_error", `Network error while calling Gemini: ${error.message}`);
      } else {
        lastError = error;
      }

      if (attempt < GEMINI_MAX_ATTEMPTS && isRetryableError(lastError)) {
        await delay(250 * attempt);
        continue;
      }

      if (lastError instanceof GeminiApiError) {
        throw lastError;
      }

      throw new GeminiApiError("unknown", "Unknown Gemini routing error");
    }
  }

  throw new GeminiApiError("unknown", "Unknown Gemini routing error");
}
