import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getProviderTask } from "@/lib/ai/productionProviders";
import { adminStorage } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE_NAME)?.value ?? "");
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const provider = params.get("provider"); const jobId = params.get("jobId");
  if (provider === "firebase") {
    const path = params.get("path");
    if (!path || !path.startsWith(`users/${session.uid}/productions/`) || !path.includes("/outputs/") || !adminStorage) return NextResponse.json({ error: "Invalid artifact request." }, { status: 400 });
    const [bytes] = await adminStorage.bucket().file(path).download();
    const [metadata] = await adminStorage.bucket().file(path).getMetadata();
    return new Response(bytes, { headers: { "Content-Type": metadata.contentType ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
  }
  if (!jobId || (provider !== "blender" && provider !== "runway")) return NextResponse.json({ error: "Invalid artifact request." }, { status: 400 });
  if (provider === "runway") {
    const task = await getProviderTask("runway", jobId);
    if (task.status !== "review") return NextResponse.json({ error: "Artifact is not ready." }, { status: 409 });
    const taskResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${encodeURIComponent(jobId)}`, { headers: { Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`, "X-Runway-Version": "2024-11-06" }, cache: "no-store" });
    const taskData = await taskResponse.json() as { output?: string[] };
    if (!taskData.output?.[0]) return NextResponse.json({ error: "Artifact is unavailable." }, { status: 404 });
    const media = await fetch(taskData.output[0]);
    return new Response(media.body, { headers: { "Content-Type": media.headers.get("Content-Type") ?? "video/mp4", "Cache-Control": "private, max-age=300" } });
  }
  const url = process.env.BLENDER_WORKER_URL; const token = process.env.BLENDER_WORKER_TOKEN;
  if (!url || !token) return NextResponse.json({ error: "Blender Worker is not configured." }, { status: 503 });
  const response = await fetch(`${url}/jobs/${encodeURIComponent(jobId)}/artifact`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return NextResponse.json({ error: "Artifact is not available." }, { status: response.status });
  return new Response(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") ?? "image/png", "Cache-Control": "private, max-age=300" } });
}
