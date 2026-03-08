type RouteCategoryId = "academic" | "financial" | "housing" | "tech" | null;

export type OpenAIRouteResult = {
  text: string;
  categoryId: RouteCategoryId;
};

export type OpenAIErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "quota_exceeded"
  | "timeout"
  | "network_error"
  | "invalid_response"
  | "unknown";

export class OpenAIRoutingError extends Error {
  code: OpenAIErrorCode;
  status?: number;

  constructor(code: OpenAIErrorCode, message: string, status?: number) {
    super(message);
    this.name = "OpenAIRoutingError";
    this.code = code;
    this.status = status;
  }
}

function getOpenAIErrorCodeFromStatus(status: number, details: string): OpenAIErrorCode {
  const lowerDetails = details.toLowerCase();

  if (status === 401 || status === 403) {
    return "invalid_api_key";
  }
  if (status === 429) {
    return "quota_exceeded";
  }
  if (status === 408) {
    return "timeout";
  }
  if (status >= 500) {
    return "network_error";
  }

  return "unknown";
}

function normalizeCategoryId(categoryId: unknown): RouteCategoryId {
  if (categoryId === "academic" || categoryId === "financial" || categoryId === "housing" || categoryId === "tech") {
    return categoryId;
  }
  return null;
}

function parseRouteResult(rawText: string): OpenAIRouteResult {
  const stripped = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  let parsed: any;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new OpenAIRoutingError("invalid_response", "OpenAI response was not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new OpenAIRoutingError("invalid_response", "OpenAI response did not contain a JSON object");
  }

  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  if (!text) {
    throw new OpenAIRoutingError("invalid_response", "OpenAI response did not include text");
  }

  return {
    text,
    categoryId: normalizeCategoryId(parsed.categoryId)
  };
}

export function getOpenAIUserFacingErrorMessage(error: unknown): string {
  if (error instanceof OpenAIRoutingError) {
    switch (error.code) {
      case "missing_api_key":
        return "AI routing is not configured yet. Add `VITE_OPENAI_API_KEY` to your `.env` file, then restart the dev server.";
      case "invalid_api_key":
        return "Your OpenAI API key looks invalid. Update `VITE_OPENAI_API_KEY` in your `.env` file and restart the app.";
      case "quota_exceeded":
        return "The AI routing quota is currently exhausted. Please try again in a bit, or use the manual categories below.";
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

export async function routeWhoDoIAskQuery(query: string): Promise<OpenAIRouteResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new OpenAIRoutingError("missing_api_key", "Missing VITE_OPENAI_API_KEY");
  }

  const prompt = `You are Nova, a UT Dallas support routing assistant.
Given a student's question, return concise routing guidance and select the best category.
Return only JSON with this exact shape:
{"text":"<2-4 sentence answer with department and suggested next step>","categoryId":"academic|financial|housing|tech|null"}
If no category is clearly correct, use null.
Student question: ${query}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a JSON response generator. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 300
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      const errorCode = getOpenAIErrorCodeFromStatus(response.status, details);
      throw new OpenAIRoutingError(
        errorCode,
        `OpenAI request failed (${response.status})${details ? `: ${details}` : ""}`,
        response.status
      );
    }

    const payload = await response.json();
    const rawText = payload?.choices?.[0]?.message?.content;
    
    if (!rawText || typeof rawText !== "string") {
      throw new OpenAIRoutingError("invalid_response", "OpenAI returned an empty response");
    }

    return parseRouteResult(rawText);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new OpenAIRoutingError("timeout", "OpenAI request timed out");
    } else if (error instanceof TypeError) {
      throw new OpenAIRoutingError("network_error", `Network error while calling OpenAI: ${error.message}`);
    } else if (error instanceof OpenAIRoutingError) {
      throw error;
    }

    throw new OpenAIRoutingError("unknown", "Unknown OpenAI routing error");
  }
}
