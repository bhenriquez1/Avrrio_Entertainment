import { NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/ai/anthropic";
import { isOpenAIConfigured } from "@/lib/ai/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      openai: isOpenAIConfigured(),
      claude: isClaudeConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
