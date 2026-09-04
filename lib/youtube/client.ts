import { adminStorage } from "@/lib/firebase/admin";

export function isYouTubeConfigured() {
  return Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REFRESH_TOKEN);
}

async function accessToken() {
  if (!isYouTubeConfigured()) throw new Error("YouTube OAuth is not connected.");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.YOUTUBE_CLIENT_ID!, client_secret: process.env.YOUTUBE_CLIENT_SECRET!, refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!, grant_type: "refresh_token" }), cache: "no-store" });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? "YouTube authorization could not be refreshed.");
  return data.access_token;
}

export async function uploadStoredVideo({ uid, artifactUrl, title, description, tags, privacyStatus, madeForKids }: { uid: string; artifactUrl: string; title: string; description: string; tags: string[]; privacyStatus: "private" | "unlisted" | "public"; madeForKids: boolean }) {
  const parsed = new URL(artifactUrl, "https://avrrio.local");
  const path = parsed.searchParams.get("path");
  if (parsed.pathname !== "/api/production/artifact" || parsed.searchParams.get("provider") !== "firebase" || !path?.startsWith(`users/${uid}/productions/`) || !path.includes("/outputs/") || !adminStorage) throw new Error("Only permanent Avrrio production outputs can be uploaded.");
  const file = adminStorage.bucket().file(path); const [metadata] = await file.getMetadata(); const [bytes] = await file.download(); const token = await accessToken();
  const initiation = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Upload-Content-Type": metadata.contentType ?? "video/mp4", "X-Upload-Content-Length": String(bytes.byteLength) }, body: JSON.stringify({ snippet: { title, description, tags, categoryId: "24" }, status: { privacyStatus, selfDeclaredMadeForKids: madeForKids } }) });
  const uploadUrl = initiation.headers.get("location"); if (!initiation.ok || !uploadUrl) throw new Error(`YouTube could not start the upload (${initiation.status}).`);
  const upload = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": metadata.contentType ?? "video/mp4", "Content-Length": String(bytes.byteLength) }, body: Uint8Array.from(bytes).buffer });
  const result = await upload.json() as { id?: string; error?: { message?: string } }; if (!upload.ok || !result.id) throw new Error(result.error?.message ?? `YouTube upload failed (${upload.status}).`);
  return { videoId: result.id, url: `https://www.youtube.com/watch?v=${result.id}`, privacyStatus };
}
