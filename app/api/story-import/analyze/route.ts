import { NextResponse } from "next/server";
import { callOpenAI, OpenAINotConfiguredError } from "@/lib/ai/openai";
import { requireAuthedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth/verifyRequest";
import { AdminNotConfiguredError } from "@/lib/firebase/admin";

const SYSTEM = `You are a story development analyst for a professional animation studio.
Read the provided document and extract structured story development records.
Return ONLY valid JSON matching this exact schema — no other text:

{
  "records": [
    {
      "category": "character|relationship|timeline_event|power_rule|location|secret|foreshadowing|idea|canon_decision|season_episode",
      "title": "Short identifier (3-8 words)",
      "statement": "One precise, clearly-stated fact or idea from the text",
      "confidence": "high|medium|low",
      "source_passage": "Verbatim excerpt supporting this",
      "notes": "Optional: ambiguity, gaps, or author clarification needed"
    }
  ],
  "summary": "2-3 sentence overview of what the document covers"
}

Category definitions:
- character: A person, their traits, background, abilities, or arc
- relationship: How two or more characters relate to each other
- timeline_event: A specific event and when/where it happened
- power_rule: A rule, limitation, or mechanic of powers, magic, or tech
- location: A place and its defining characteristics
- secret: Hidden information, undisclosed facts, or information asymmetry between characters
- foreshadowing: A planted setup intended to pay off later
- idea: A creative direction or possibility that is NOT established fact (label clearly)
- canon_decision: A creative decision made by the author about story direction
- season_episode: A concept, arc, or structure for a season or episode

Focus on clearly stated facts. Distinguish between confirmed facts (high confidence)
and possibilities the author is exploring (use idea category or low confidence).
Never invent or infer beyond what the text says.`;

interface RequestBody {
  documentText: string;
  existingCanon?: Array<{ title: string; statement: string }>;
}

export async function POST(request: Request) {
  try {
    await requireAuthedUser(request);
    const body = await request.json() as RequestBody;
    if (!body.documentText?.trim()) {
      return NextResponse.json({ error: "Document text is required." }, { status: 400 });
    }

    const existingList = (body.existingCanon ?? []).length > 0
      ? (body.existingCanon ?? []).map((c) => `- ${c.title}: ${c.statement}`).join("\n")
      : "(none yet)";

    const prompt = `EXISTING APPROVED CANON (do not re-propose these):
${existingList}

---

DOCUMENT TO ANALYZE:
${body.documentText.trim()}

Extract all story development records. Return JSON only.`;

    const raw = await callOpenAI({ system: SYSTEM, prompt, maxTokens: 4000, jsonMode: true });
    const result = JSON.parse(raw);
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof OpenAINotConfiguredError) return NextResponse.json({ error: error.message }, { status: 501 });
    if (error instanceof AdminNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analysis failed." }, { status: 500 });
  }
}
