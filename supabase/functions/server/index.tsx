import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-a9f9c092/health", (c) => {
  return c.json({ status: "ok" });
});

// Custom Signup endpoint bypassing frontend email_confirm requirement if possible
app.post("/make-server-a9f9c092/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || 'Student' },
      email_confirm: true
    });
    
    if (error) {
      return c.json({ error: error.message }, 400);
    }
    
    return c.json({ user: data.user }, 200);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post("/make-server-a9f9c092/extract-schedule", async (c) => {
  try {
    const { text } = await c.req.json();
    if (!text) {
      return c.json({ error: "No text provided" }, 400);
    }

    const prompt = `Return ONLY a raw JSON array representing this university schedule. NO markdown formatting, NO backticks, NO conversational text, NO explanations. Start exactly with [ and end exactly with ].

Format each object like this exactly:
{"time":"1:00pm-2:15pm","course":"CS 3341","title":"Probability","location":"ECSS 2.412","type":"class"}

Text to parse:
${text.substring(0, 2000)}`;

    let response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { 
            role: "system", 
            content: "You are a strict data extractor. You MUST output ONLY a valid JSON array. Do not include markdown formatting, backticks, or conversational text. JUST the raw JSON array." 
          },
          { role: "user", content: prompt }
        ],
        jsonMode: true,
        seed: Math.floor(Math.random() * 1000000)
      })
    });

    if (!response.ok) {
      // Fallback to simple POST
      response = await fetch(`https://text.pollinations.ai/?json=true`, {
        method: "POST",
        body: prompt
      });
      if (!response.ok) {
        const errText = await response.text();
        return c.json({ error: `Pollinations API error: ${response.status} ${errText}` }, 500);
      }
    }

    const responseText = await response.text();
    let rawText = "";

    try {
      const data = JSON.parse(responseText);
      rawText = data?.choices?.[0]?.message?.content || responseText;
    } catch {
      rawText = responseText;
    }
    
    // Aggressively extract JSON array
    let extractedJSON = rawText;
    const arrayMatch = rawText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      extractedJSON = arrayMatch[0];
    }
    extractedJSON = extractedJSON.replace(/```json/gi, '').replace(/```/gi, '').trim();

    return c.json({ rawText: extractedJSON }, 200);
  } catch (err: any) {
    console.error("Schedule extraction error:", err);
    return c.json({ error: err.message }, 500);
  }
});

Deno.serve(app.fetch);