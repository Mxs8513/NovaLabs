import { createClient } from "npm:@supabase/supabase-js";

async function test() {
  const text = `Monday
8:30 AM – 9:45 AM — CS 3345-005
Room: ECSW 1.355
Professor: Omar Hamdy`;

  const prompt = `Return ONLY a raw JSON array representing this university schedule. NO markdown formatting, NO backticks, NO conversational text, NO explanations. Start exactly with [ and end exactly with ].

Format each object like this exactly:
{"time":"1:00pm-2:15pm","course":"CS 3341","title":"Probability","location":"ECSS 2.412","type":"class"}

Text to parse:
${text.substring(0, 2000)}`;

  const response = await fetch("https://text.pollinations.ai/openai", {
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

  console.log("Status:", response.status);
  const json = await response.json();
  console.log("Resp:", JSON.stringify(json, null, 2));
}

test();
