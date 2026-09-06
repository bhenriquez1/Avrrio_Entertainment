import { NextResponse } from "next/server";
import { callOpenAI, OpenAINotConfiguredError } from "@/lib/ai/openai";
import { requireAuthedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth/verifyRequest";
import { AdminNotConfiguredError } from "@/lib/firebase/admin";

const SYSTEM = `You are a story development analyst. Given a creative conversation excerpt, extract only concrete story decisions or facts that were established — things a writer would want to remember about their world, characters, or story.

Return ONLY valid JSON:
{
  "proposals": [
    {
      "type": "character|relationship|timeline_event|power_rule|location|secret|foreshadowing|idea|canon_decision",
      "title": "Short identifier (3-8 words)",
      "statement": "One precise, clearly-stated fact (one sentence)",
      "confidence": "high|medium|low",
      "sourceExcerpt": "Brief verbatim excerpt (max 120 chars) that supports this"
    }
  ],
  "count": 0
}

Rules:
- Only extract things that were clearly established or decided, not things still being explored
- Each proposal must be one atomic fact — no compound sentences
- confidence=high: stated directly as a fact. confidence=medium: strongly implied. confidence=low: speculative or conditional
- Return empty proposals array if nothing was established
- Never invent or infer beyond what the text says
- The count field must equal proposals.length`;

interface RequestBody {
  recentMessages: Array<{ role: string; content: string }>;
  workingOn: string;
  existingCanon?: Array<{ title: string; statement: string }>;
}

export async function POST(request: Request) {
  try {
    await requireAuthedUser(request);
    const body = await request.json() as RequestBody;
    if (!body.recentMessages?.length) {
      return NextResponse.json({ proposals: [], count: 0 });
    }

    const conversation = body.recentMessages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const existingList = (body.existingCanon ?? []).length > 0
      ? (body.existingCanon ?? []).map((c) => `- ${c.title}: ${c.statement}`).join("\n")
      : "(none yet)";

    const prompt = `WORKING ON: ${body.workingOn || "General story development"}

EXISTING CANON (do not re-propose):
${existingList}

RECENT CONVERSATION:
${conversation}

Extract any story decisions established in this conversation. Return JSON only.`;

    const raw = await callOpenAI({ system: SYSTEM, prompt, maxTokens: 1500, jsonMode: true });
    const result = JSON.parse(raw) as { proposals: unknown[]; count: number };
    result.count = Array.isArray(result.proposals) ? result.proposals.length : 0;
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof OpenAINotConfiguredError) return NextResponse.json({ proposals: [], count: 0 });
    if (error instanceof AdminNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ proposals: [], count: 0 });
  }
}
