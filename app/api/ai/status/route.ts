import { NextResponse } from "next/server";
import { isClaudeConfigured } from "@/lib/ai/anthropic";
import { isOpenAIConfigured } from "@/lib/ai/openai";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      openai: isOpenAIConfigured(),
      claude: isClaudeConfigured(),
      runway: Boolean(process.env.RUNWAY_API_KEY),
      kling: Boolean(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY),
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
      blender: Boolean(process.env.BLENDER_WORKER_URL && process.env.BLENDER_WORKER_TOKEN),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
