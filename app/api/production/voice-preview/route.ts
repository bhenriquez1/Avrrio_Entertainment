import { NextResponse } from "next/server";
import { requireAuthedUser, UnauthorizedError, ForbiddenError } from "@/lib/auth/verifyRequest";
import { AdminNotConfiguredError } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    await requireAuthedUser(request);
    const body = await request.json() as { voiceId?: string; text?: string; confirmedCharge?: boolean };
    if (!body.confirmedCharge) return NextResponse.json({ error: "Credit-use confirmation is required." }, { status: 409 });
    const voiceId = body.voiceId?.trim();
    const text = body.text?.trim();
    if (!voiceId || !/^[A-Za-z0-9_-]{8,80}$/.test(voiceId)) return NextResponse.json({ error: "A valid ElevenLabs Voice ID is required." }, { status: 400 });
    if (!text || text.length > 500) return NextResponse.json({ error: "Preview text must contain 1–500 characters." }, { status: 400 });
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ElevenLabs is not configured." }, { status: 503 });
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL ?? "eleven_v3" }),
    });
    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ error: detail.slice(0, 800) || `ElevenLabs rejected the preview (${response.status}).` }, { status: response.status });
    }
    return new Response(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") ?? "audio/mpeg", "Cache-Control": "no-store", "X-Character-Cost": response.headers.get("character-cost") ?? "unknown" } });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof AdminNotConfiguredError) return NextResponse.json({ error: error.message }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Voice preview failed." }, { status: 500 });
  }
}
