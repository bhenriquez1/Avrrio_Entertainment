import { adminStorage } from "@/lib/firebase/admin";

export async function storeProductionArtifact(uid: string, productionId: string, jobId: string, bytes: ArrayBuffer, contentType: string, extension: string) {
  if (!adminStorage) throw new Error("Firebase Storage is not configured for permanent production outputs.");
  const safeExtension = extension.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  const path = `users/${uid}/productions/${productionId}/outputs/${jobId}.${safeExtension}`;
  await adminStorage.bucket().file(path).save(Buffer.from(bytes), { resumable: false, contentType, metadata: { cacheControl: "private, max-age=3600" } });
  return `/api/production/artifact?provider=firebase&path=${encodeURIComponent(path)}`;
}
