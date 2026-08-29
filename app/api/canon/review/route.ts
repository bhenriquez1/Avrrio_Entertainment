import { NextResponse } from "next/server";
import { callClaude, AINotConfiguredError } from "@/lib/ai/anthropic";
import { buildContinuityReviewPrompt } from "@/lib/ai/prompts/continuity-review";
import { requireAuthedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth/verifyRequest";
import { AdminNotConfiguredError } from "@/lib/firebase/admin";
import type { CanonExtractProposal } from "@/types/ai";
import type { CanonRecord } from "@/types/canon";

export async function POST(request: Request) {
  try {
    await requireAuthedUser(request);
    const body = await request.json() as { proposals: CanonExtractProposal[]; approvedCanon: CanonRecord[] };
    if (!body.proposals?.length) return NextResponse.json({ error: "Proposals are required." }, { status: 400 });
    const { system, prompt } = buildContinuityReviewPrompt(body.proposals, body.approvedCanon ?? []);
    const raw = await callClaude({ system, prompt, maxTokens: 2000 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AINotConfiguredError) return NextResponse.json({ error: error.message }, { status: 501 });
    if (error instanceof AdminNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
