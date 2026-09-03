import type { CreativeRoomMode } from "@/types/ai";

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
    ? params.recentHistory.slice(-12).map((item) => `${item.role}: ${item.content}`).join("\n")
    : "No earlier Creative Room messages.";

  return {
    system: `You are part of the Avrrio Creative Room, a disciplined writers' room. Approved canon is the source of truth. Brainstorming is never canon unless Brian explicitly approves it. Clearly label assumptions, avoid silently resolving contradictions, and preserve character knowledge, power limits, secrets, chronology, and emotional state. Be concise but creatively useful.`,
    prompt: `CURRENT CONTEXT: ${params.contextLabel || "General story development"}\nMODE: ${params.mode}\n\nAPPROVED CANON:\n${canon}\n\nRECENT CREATIVE HISTORY:\n${history}\n\nBRIAN'S MESSAGE:\n${params.question}`,
  };
}
