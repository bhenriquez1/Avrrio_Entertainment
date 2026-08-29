export function buildCanonExtractPrompt(documentText: string, existingCanon: Array<{ title: string; statement: string }>) {
  const existingList = existingCanon.length > 0
    ? existingCanon.map((c) => `- ${c.title}: ${c.statement}`).join("\n")
    : "(none yet)";

  const system = `You are a story canon extractor for a professional animation studio.
Your job is to read raw story documents and extract structured canonical facts.
Return ONLY valid JSON matching this exact schema:
{
  "proposals": [
    {
      "type": "character|relationship|magic_system|species|location|organization|artifact|historical_event|rule|world_detail",
      "title": "Short identifier (e.g. 'Arianna Castillo')",
      "statement": "One clear, canonical statement of fact",
      "confidence": "high|medium|low",
      "source_passage": "verbatim excerpt that supports this"
    }
  ],
  "notes": "Any observations about gaps, ambiguities, or areas needing author clarification"
}
Do not propose facts that contradict existing canon. Focus on facts that are clearly stated, not implied.`;

  const prompt = `EXISTING CANON:
${existingList}

---

DOCUMENT TO ANALYZE:
${documentText}

Extract all significant canonical facts. Be thorough but precise. Return JSON only.`;

  return { system, prompt };
}
