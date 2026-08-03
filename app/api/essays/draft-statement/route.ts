import { NextResponse } from "next/server";
import { AINotConfiguredError, callClaude } from "@/lib/ai/anthropic";
import {
  buildGuidedPersonalStatementPrompt,
  buildPersonalStatementComparisonPrompt,
  buildPersonalStatementOutlinePrompt,
  buildPersonalStatementPrompt,
  buildPersonalStatementRefinePrompt,
  type GuidedPersonalStatementInput,
  type PersonalStatementRefineAction,
} from "@/lib/ai/prompts";
import { AdminNotConfiguredError } from "@/lib/firebase/admin";
import { requireAuthedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth/verifyRequest";
import { logAuditEvent } from "@/lib/audit/server";

type DraftMode = "simple" | "guided" | "outline" | "refine" | "compare";

interface DraftStatementRequest {
  mode?: DraftMode;
  topic?: string;
  notes?: string;
  guidedInput?: GuidedPersonalStatementInput;
  content?: string;
  refineAction?: PersonalStatementRefineAction;
  currentDraft?: string;
  previousStatement?: string;
}

const REFINE_ACTIONS: PersonalStatementRefineAction[] = [
  "improve_grammar",
  "more_reflective",
  "add_specific_detail",
  "reduce_repetition",
  "strengthen_opening",
  "strengthen_conclusion",
  "check_authenticity",
];

export async function POST(request: Request) {
  try {
    const user = await requireAuthedUser(request);
    const body = (await request.json()) as DraftStatementRequest;
    const mode = body.mode ?? "simple";

    let system: string;
    let prompt: string;
    let maxTokens = 1500;

    if (mode === "guided") {
      if (!body.guidedInput) {
        return NextResponse.json({ error: "Guided input is required." }, { status: 400 });
      }
      ({ system, prompt } = buildGuidedPersonalStatementPrompt(body.guidedInput));
      maxTokens = 2000;
    } else if (mode === "outline") {
      if (!body.guidedInput) {
        return NextResponse.json({ error: "Guided input is required." }, { status: 400 });
      }
      ({ system, prompt } = buildPersonalStatementOutlinePrompt(body.guidedInput));
      maxTokens = 800;
    } else if (mode === "refine") {
      if (!body.content?.trim()) {
        return NextResponse.json({ error: "Content is required." }, { status: 400 });
      }
      if (!body.refineAction || !REFINE_ACTIONS.includes(body.refineAction)) {
        return NextResponse.json({ error: "Invalid refine action." }, { status: 400 });
      }
      ({ system, prompt } = buildPersonalStatementRefinePrompt(body.content, body.refineAction));
      maxTokens = 2000;
    } else if (mode === "compare") {
      if (!body.currentDraft?.trim() || !body.previousStatement?.trim()) {
        return NextResponse.json(
          { error: "Both current draft and previous statement are required." },
          { status: 400 }
        );
      }
      ({ system, prompt } = buildPersonalStatementComparisonPrompt(
        body.currentDraft,
        body.previousStatement
      ));
      maxTokens = 800;
    } else {
      ({ system, prompt } = buildPersonalStatementPrompt(body.topic ?? "", body.notes ?? ""));
    }

    const content = await callClaude({ system, prompt, maxTokens });

    await logAuditEvent({
      uid: user.uid,
      email: user.email,
      action: "ai_draft_personal_statement",
      metadata: { mode },
    });

    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof AINotConfiguredError || error instanceof AdminNotConfiguredError) {
      return NextResponse.json(
        { error: error.message },
        { status: error instanceof AINotConfiguredError ? 501 : 503 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
