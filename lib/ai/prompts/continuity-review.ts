import type { CanonRecord } from "@/types/canon";
import type { CanonExtractProposal } from "@/types/ai";

export function buildContinuityReviewPrompt(
  proposals: CanonExtractProposal[],
  approvedCanon: CanonRecord[]
) {
  const approvedList = approvedCanon.length > 0
    ? approvedCanon.map((c) => `[${c.id.slice(0, 8)}] ${c.title}: ${c.statement}`).join("\n")
    : "(no approved canon yet)";

  const proposalList = proposals.map((p, i) => `${i + 1}. [${p.type}] ${p.title}: ${p.statement}`).join("\n");

  const system = `You are the Production Director for an animated series. Your role is independent continuity and contradiction review.
OpenAI already extracted these canon proposals. You must independently verify each against approved canon.
Return ONLY valid JSON:
{
  "contradictions": [
    {
      "proposedTitle": "title of the proposed fact",
      "issue": "precise description of the contradiction or conflict",
      "severity": "critical|moderate|minor",
      "suggestion": "how to resolve it"
    }
  ],
  "confirmed": [
    {
      "proposedTitle": "title",
      "note": "any useful clarification or connection to existing canon"
    }
  ],
  "summary": "One paragraph executive summary of your review"
}
Be thorough. A 'critical' contradiction is one that would require rewriting existing approved scripts or significantly alter established character/world facts.`;

  const prompt = `APPROVED CANON:
${approvedList}

---

PROPOSALS FROM OPENAI TO REVIEW:
${proposalList}

Perform your independent continuity review. Return JSON only.`;

  return { system, prompt };
}
