// Simple wrapper around OpenAI API.
// Uses your paid OpenAI API key from VITE_OPENAI_API_KEY environment variable.

const AI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function askAI(prompt: string): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    console.error("Missing VITE_OPENAI_API_KEY in environment variables");
    return null;
  }

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful UT Dallas campus assistant. Answer the user query concisely and factually." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!res.ok) {
      console.error("OpenAI API returned status", res.status);
      return null;
    }

    const json = await res.json();
    // Extract the assistant message from OpenAI response
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }

    return null;
  } catch (err) {
    console.error("askAI error", err);
    return null;
  }
}
