import OpenAI from "openai";

export class OpenAINotConfiguredError extends Error {
  constructor() { super("OpenAI API key is not configured."); }
}

const apiKey = process.env.OPENAI_API_KEY;

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!apiKey) throw new OpenAINotConfiguredError();
  if (!_client) _client = new OpenAI({ apiKey });
  return _client;
}

export async function callOpenAI({ system, prompt, maxTokens = 2000, jsonMode = false }: {
  system: string;
  prompt: string;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    max_tokens: maxTokens,
    response_format: jsonMode ? { type: "json_object" } : undefined,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

export function isOpenAIConfigured(): boolean {
  return Boolean(apiKey);
}
