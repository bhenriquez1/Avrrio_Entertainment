import type { ProductionProvider, ProductionQueueJob } from "@/types/production";
import { storeProductionArtifact } from "@/lib/production/artifactStorage";

const RUNWAY_API = "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = "2024-11-06";

export interface ProviderTask { id: string; status: ProductionQueueJob["status"]; outputUrls: string[]; error: string | null; }

function mapRunwayStatus(status: string): ProductionQueueJob["status"] {
  if (status === "SUCCEEDED") return "review";
  if (status === "FAILED" || status === "CANCELED") return "failed";
  if (status === "RUNNING" || status === "THROTTLED") return "processing";
  return "submitted";
}

export async function submitProviderJob(job: ProductionQueueJob, uid: string): Promise<ProviderTask> {
  if (job.provider === "runway") {
    const key = process.env.RUNWAY_API_KEY;
    if (!key) throw new Error("Runway is not configured.");
    const response = await fetch(`${RUNWAY_API}/image_to_video`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Runway-Version": RUNWAY_VERSION },
      body: JSON.stringify({ model: process.env.RUNWAY_VIDEO_MODEL ?? "gen4.5", promptText: job.prompt, ratio: process.env.RUNWAY_VIDEO_RATIO ?? "1280:720", duration: Number(process.env.RUNWAY_VIDEO_DURATION ?? 5) }),
    });
    const data = await response.json() as { id?: string; error?: string; message?: string };
    if (!response.ok || !data.id) throw new Error(data.error ?? data.message ?? `Runway rejected the job (${response.status}).`);
    return { id: data.id, status: "submitted", outputUrls: [], error: null };
  }
  if (job.provider === "blender") {
    const url = process.env.BLENDER_WORKER_URL; const token = process.env.BLENDER_WORKER_TOKEN;
    if (!url || !token) throw new Error("Blender Worker is not configured.");
    const response = await fetch(`${url}/jobs`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ production_id: job.productionId, title: job.title, objects: [{ kind: "text", name: job.title, text: job.title, location: [0, 0, 0], scale: [1, 1, 1], color: [0.85, 0.65, 0.18, 1] }] }) });
    const data = await response.json() as { id?: string; detail?: string };
    if (!response.ok || !data.id) throw new Error(data.detail ?? `Blender rejected the job (${response.status}).`);
    return { id: data.id, status: "submitted", outputUrls: [], error: null };
  }
  if (job.provider === "elevenlabs") {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ElevenLabs is not configured.");
    if (!job.voiceId || !/^[A-Za-z0-9_-]{8,80}$/.test(job.voiceId)) throw new Error("Choose an approved ElevenLabs voice before submitting.");
    if (!job.prompt.trim() || job.prompt.length > 5000) throw new Error("ElevenLabs production text must contain 1–5000 characters.");
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(job.voiceId)}?output_format=mp3_44100_128`, {
      method: "POST", headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: job.prompt, model_id: process.env.ELEVENLABS_MODEL ?? "eleven_v3" }),
    });
    if (!response.ok) throw new Error((await response.text()).slice(0, 800) || `ElevenLabs rejected the job (${response.status}).`);
    const outputUrl = await storeProductionArtifact(uid, job.productionId, job.id, await response.arrayBuffer(), response.headers.get("content-type") ?? "audio/mpeg", "mp3");
    return { id: `elevenlabs-${job.id}`, status: "review", outputUrls: [outputUrl], error: null };
  }
  throw new Error(`${job.provider} dispatch is not enabled in this production stage yet.`);
}

export async function getProviderTask(provider: ProductionProvider, id: string): Promise<ProviderTask> {
  if (provider === "runway") {
    const key = process.env.RUNWAY_API_KEY; if (!key) throw new Error("Runway is not configured.");
    const response = await fetch(`${RUNWAY_API}/tasks/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${key}`, "X-Runway-Version": RUNWAY_VERSION }, cache: "no-store" });
    const data = await response.json() as { id?: string; status?: string; output?: string[]; failure?: string; failureCode?: string };
    if (!response.ok) throw new Error(`Runway status check failed (${response.status}).`);
    const status = mapRunwayStatus(data.status ?? "PENDING");
    return { id, status, outputUrls: status === "review" ? [`/api/production/artifact?provider=runway&jobId=${encodeURIComponent(id)}`] : [], error: data.failure ?? data.failureCode ?? null };
  }
  if (provider === "blender") {
    const url = process.env.BLENDER_WORKER_URL; const token = process.env.BLENDER_WORKER_TOKEN; if (!url || !token) throw new Error("Blender Worker is not configured.");
    const response = await fetch(`${url}/jobs/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const data = await response.json() as { status?: string; artifactPath?: string; error?: string };
    if (!response.ok) throw new Error(`Blender status check failed (${response.status}).`);
    const status = data.status === "complete" ? "review" : data.status === "failed" ? "failed" : data.status === "running" ? "processing" : "submitted";
    return { id, status, outputUrls: data.artifactPath ? [`/api/production/artifact?provider=blender&jobId=${encodeURIComponent(id)}`] : [], error: data.error ?? null };
  }
  throw new Error(`${provider} status polling is not enabled yet.`);
}
