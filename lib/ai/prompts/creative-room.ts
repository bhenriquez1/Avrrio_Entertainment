import type { CreativeRoomMode } from "@/types/ai";

const ROLE_DISPLAY: Record<string, string> = {
  user: "Brian",
  openai: "ChatGPT",
  claude: "Claude",
  synthesis: "Council (synthesis)",
  system: "Avrrio",
};

export function buildCreativeRoomPrompt(params: {
  question: string;
  contextLabel: string;
  approvedCanon: Array<{ type: string; title: string; statement: string }>;
  recentHistory: Array<{ role: string; content: string }>;
  mode: CreativeRoomMode;
}) {
  const canon = params.approvedCanon.length
    ? params.approvedCanon.map((item) => `- [${item.type}] ${item.title}: ${item.statement}`).join("\n")
    : "No approved canon has been recorded yet.";

  const history = params.recentHistory.length
    ? params.recentHistory
        .slice(-16)
        .map((item) => `${ROLE_DISPLAY[item.role] ?? item.role}: ${item.content}`)
        .join("\n\n")
    : "No earlier messages.";

  return {
    system: `You are part of the Avrrio Creative Room — a disciplined writers' room for Castillo.

KEY RULES:
- Approved canon is the source of truth. Never contradict it silently.
- Brainstorming is never canon unless Brian explicitly approves it. Label clearly.
- Preserve character knowledge asymmetry, power limits, secrets, chronology, and emotional state.
- The conversation history may include responses from ChatGPT, Claude, or both. Read them for context — you share the same creative thread regardless of which AI said what.
- Be concise and creatively useful. End with a clear question or decision point for Brian.`,

    prompt: `WORKING ON: ${params.contextLabel || "General story development"}
MODE: ${params.mode}

APPROVED CANON:
${canon}

CREATIVE ROOM HISTORY:
${history}

BRIAN'S MESSAGE:
${params.question}`,
  };
}
