import { NextResponse } from "next/server";
import { callOpenAI, OpenAINotConfiguredError } from "@/lib/ai/openai";
import { buildCanonExtractPrompt } from "@/lib/ai/prompts/canon-extract";
import { requireAuthedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth/verifyRequest";
import { AdminNotConfiguredError } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const user = await requireAuthedUser(request);
    const body = await request.json() as { documentText: string; existingCanon?: Array<{ title: string; statement: string }> };
    if (!body.documentText?.trim()) {
      return NextResponse.json({ error: "Document text is required." }, { status: 400 });
    }
    const { system, prompt } = buildCanonExtractPrompt(body.documentText, body.existingCanon ?? []);
    const raw = await callOpenAI({ system, prompt, maxTokens: 3000, jsonMode: true });
    const result = JSON.parse(raw);
    return NextResponse.json({ result, uid: user.uid });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof OpenAINotConfiguredError) return NextResponse.json({ error: error.message }, { status: 501 });
    if (error instanceof AdminNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
