import { NextResponse } from "next/server";
import { callOpenAI, OpenAINotConfiguredError } from "@/lib/ai/openai";
import { buildStructureGeneratePrompt } from "@/lib/ai/prompts/structure-generate";
import { requireAuthedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth/verifyRequest";
import { AdminNotConfiguredError } from "@/lib/firebase/admin";
import type { CanonRecord } from "@/types/canon";

interface GenerateStructureRequest {
  productionTitle: string;
  logline: string;
  approvedCanon: CanonRecord[];
  targetSeasons: number;
  targetEpisodesPerSeason: number;
  targetRuntimeMinutes: number;
}

export async function POST(request: Request) {
  try {
    await requireAuthedUser(request);
    const body = await request.json() as GenerateStructureRequest;
    if (!body.productionTitle || !body.approvedCanon) {
      return NextResponse.json({ error: "productionTitle and approvedCanon are required." }, { status: 400 });
    }
    const { system, prompt } = buildStructureGeneratePrompt(
      body.productionTitle, body.logline ?? "", body.approvedCanon,
      body.targetSeasons ?? 1, body.targetEpisodesPerSeason ?? 10, body.targetRuntimeMinutes ?? 25
    );
    const raw = await callOpenAI({ system, prompt, maxTokens: 4000, jsonMode: true });
    const result = JSON.parse(raw);
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof OpenAINotConfiguredError) return NextResponse.json({ error: error.message }, { status: 501 });
    if (error instanceof AdminNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
