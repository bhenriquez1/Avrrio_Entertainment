import { NextResponse } from "next/server";
import { callClaude, AINotConfiguredError } from "@/lib/ai/anthropic";
import { callOpenAI, OpenAINotConfiguredError } from "@/lib/ai/openai";
import { buildCreativeRoomPrompt } from "@/lib/ai/prompts/creative-room";
import { requireAuthedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth/verifyRequest";
import { AdminNotConfiguredError } from "@/lib/firebase/admin";
import type { CreativeRoomMode, CreativeRoomResponse } from "@/types/ai";

interface RequestBody {
  question: string;
  mode: CreativeRoomMode;
  contextLabel?: string;
  approvedCanon?: Array<{ type: string; title: string; statement: string }>;
  recentHistory?: Array<{ role: string; content: string }>;
}

export async function POST(request: Request) {
  try {
    await requireAuthedUser(request);
    const body = await request.json() as RequestBody;
    if (!body.question?.trim()) return NextResponse.json({ error: "A message is required." }, { status: 400 });
    if (!(["openai", "claude", "both", "council"] as string[]).includes(body.mode)) {
      return NextResponse.json({ error: "Invalid Creative Room mode." }, { status: 400 });
    }

    const prompt = buildCreativeRoomPrompt({
      question: body.question.trim(),
      mode: body.mode,
      contextLabel: body.contextLabel ?? "General story development",
      approvedCanon: (body.approvedCanon ?? []).slice(0, 80),
      recentHistory: (body.recentHistory ?? []).slice(-12),
    });
    const result: CreativeRoomResponse = { responses: [], continuityNotes: [] };

    if (body.mode === "openai" || body.mode === "both" || body.mode === "council") {
      const content = await callOpenAI({ ...prompt, maxTokens: 1200 });
      result.responses.push({ role: "openai", content });
    }
    if (body.mode === "claude" || body.mode === "both") {
      const content = await callClaude({ ...prompt, maxTokens: 1200 });
      result.responses.push({ role: "claude", content });
    }
    if (body.mode === "council") {
      const proposal = result.responses[0]?.content ?? "";
      const critique = await callClaude({
        system: `${prompt.system} You are the continuity editor. Critique the OpenAI proposal; identify contradictions, premature reveals, and a stronger alternative where useful.`,
        prompt: `${prompt.prompt}\n\nOPENAI PROPOSAL:\n${proposal}`,
        maxTokens: 1200,
      });
      result.responses.push({ role: "claude", content: critique });
      const synthesis = await callOpenAI({
        system: `${prompt.system} Produce one final synthesis for Brian. Preserve disagreements and end with a clear decision point; do not declare anything canon.`,
        prompt: `${prompt.prompt}\n\nOPENAI PROPOSAL:\n${proposal}\n\nCLAUDE CRITIQUE:\n${critique}`,
        maxTokens: 1000,
      });
      result.responses.push({ role: "synthesis", content: synthesis });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof OpenAINotConfiguredError || error instanceof AINotConfiguredError) return NextResponse.json({ error: error.message }, { status: 501 });
    if (error instanceof AdminNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Creative Room failed." }, { status: 500 });
  }
}
