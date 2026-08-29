import type { CanonRecord } from "@/types/canon";

export function buildStructureGeneratePrompt(
  productionTitle: string,
  logline: string,
  approvedCanon: CanonRecord[],
  targetSeasons: number,
  targetEpisodesPerSeason: number,
  targetRuntimeMinutes: number
) {
  const canonList = approvedCanon.map((c) => `[${c.type}] ${c.title}: ${c.statement}`).join("\n");

  const system = `You are generating a season/episode structure for a professional animated series.
Each episode targets approximately ${targetRuntimeMinutes} minutes.
Structure must be consistent with all approved canon facts provided.
Return ONLY valid JSON:
{
  "seasons": [
    {
      "number": 1,
      "title": "Season title",
      "synopsis": "2-3 sentence season arc",
      "episodes": [
        {
          "number": 1,
          "title": "Episode title",
          "synopsis": "2-3 sentence episode synopsis",
          "canonDependencies": ["canon title 1", "canon title 2"],
          "acts": ["Act I: ...", "Act II: ...", "Act III: ..."]
        }
      ]
    }
  ]
}`;

  const prompt = `PRODUCTION: ${productionTitle}
LOGLINE: ${logline}
TARGET: ${targetSeasons} season(s), ${targetEpisodesPerSeason} episodes each, ~${targetRuntimeMinutes} min/episode

APPROVED CANON:
${canonList}

Generate the season/episode structure. Every episode synopsis must be grounded in the approved canon. Return JSON only.`;

  return { system, prompt };
}
