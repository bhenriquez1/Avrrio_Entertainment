import { listItems, getItem, saveItem, deleteItem } from "./storage";
import type { CharacterVoice, Production, ProductionQueueJob, ProductionScript, ProductionShot, QualityReview, ReferenceAsset, StoryScene } from "@/types/production";
import type { CanonRecord } from "@/types/canon";
import type { Season, Episode } from "@/types/episode";
import type { CreativeMessage } from "@/types/ai";

function nowIso() { return new Date().toISOString(); }
function newId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

// Productions
export async function listProductions(uid: string): Promise<Production[]> {
  return listItems<Production>(uid, "productions");
}
export async function saveProduction(uid: string, data: Omit<Production, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Production> {
  const now = nowIso();
  const prod: Production = {
    ...data,
    id: data.id ?? newId(),
    canonVersion: data.canonVersion ?? "1.0",
    createdAt: now,
    updatedAt: now,
  };
  await saveItem(uid, "productions", prod);
  return prod;
}
export async function getProduction(uid: string, id: string): Promise<Production | null> {
  return getItem<Production>(uid, "productions", id);
}
export async function deleteProduction(uid: string, id: string): Promise<void> {
  return deleteItem(uid, "productions", id);
}

// Canon
export async function listCanon(uid: string, productionId: string): Promise<CanonRecord[]> {
  const all = await listItems<CanonRecord>(uid, `canon-${productionId}`);
  return all;
}
export async function saveCanonRecord(uid: string, productionId: string, data: Omit<CanonRecord, "id" | "createdAt" | "updatedAt" | "contradictions" | "reviewNote" | "supersedes" | "dependencies" | "approvedBy"> & { id?: string; createdAt?: string; contradictions?: string[]; reviewNote?: string; supersedes?: string | null; dependencies?: string[]; approvedBy?: string | null }): Promise<CanonRecord> {
  const now = nowIso();
  const record: CanonRecord = {
    contradictions: [],
    reviewNote: "",
    supersedes: null,
    dependencies: [],
    approvedBy: null,
    ...data,
    id: data.id ?? newId(),
    productionId,
    createdAt: data.id ? data.createdAt ?? now : now,
    updatedAt: now,
  };
  await saveItem(uid, `canon-${productionId}`, record);
  return record;
}
export async function deleteCanonRecord(uid: string, productionId: string, id: string): Promise<void> {
  return deleteItem(uid, `canon-${productionId}`, id);
}

// Seasons
export async function listSeasons(uid: string, productionId: string): Promise<Season[]> {
  return listItems<Season>(uid, `seasons-${productionId}`);
}
export async function saveSeason(uid: string, productionId: string, data: Omit<Season, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Season> {
  const now = nowIso();
  const season: Season = { ...data, id: data.id ?? newId(), productionId, createdAt: now, updatedAt: now };
  await saveItem(uid, `seasons-${productionId}`, season);
  return season;
}

// Episodes
export async function listEpisodes(uid: string, productionId: string, seasonId: string): Promise<Episode[]> {
  return listItems<Episode>(uid, `episodes-${seasonId}`);
}
export async function saveEpisode(uid: string, productionId: string, seasonId: string, data: Omit<Episode, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Episode> {
  const now = nowIso();
  const ep: Episode = { ...data, id: data.id ?? newId(), productionId, seasonId, acts: data.acts ?? [], canonDependencies: data.canonDependencies ?? [], createdAt: now, updatedAt: now };
  await saveItem(uid, `episodes-${seasonId}`, ep);
  return ep;
}

// Creative Room history
export async function listCreativeMessages(uid: string, productionId: string): Promise<CreativeMessage[]> {
  return listItems<CreativeMessage>(uid, `creative-room-${productionId}`);
}

export async function saveCreativeMessage(
  uid: string,
  productionId: string,
  data: Omit<CreativeMessage, "id" | "productionId" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<CreativeMessage> {
  const message: CreativeMessage = {
    ...data,
    id: data.id ?? newId(),
    productionId,
    createdAt: data.createdAt ?? nowIso(),
  };
  await saveItem(uid, `creative-room-${productionId}`, message);
  return message;
}

// Production Queue — drafts remain local until Brian explicitly submits a paid generation.
export async function listProductionJobs(uid: string, productionId: string): Promise<ProductionQueueJob[]> {
  return listItems<ProductionQueueJob>(uid, `production-jobs-${productionId}`);
}

export async function saveProductionJob(
  uid: string,
  productionId: string,
  data: Omit<ProductionQueueJob, "id" | "productionId" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }
): Promise<ProductionQueueJob> {
  const now = nowIso();
  const job: ProductionQueueJob = { ...data, id: data.id ?? newId(), productionId, createdAt: data.createdAt ?? now, updatedAt: now };
  await saveItem(uid, `production-jobs-${productionId}`, job);
  return job;
}

export async function listCharacterVoices(uid: string, productionId: string): Promise<CharacterVoice[]> {
  return listItems<CharacterVoice>(uid, `character-voices-${productionId}`);
}

export async function saveCharacterVoice(uid: string, productionId: string, data: Omit<CharacterVoice, "id" | "productionId" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }): Promise<CharacterVoice> {
  const now = nowIso();
  const voice: CharacterVoice = { ...data, id: data.id ?? newId(), productionId, createdAt: data.createdAt ?? now, updatedAt: now };
  await saveItem(uid, `character-voices-${productionId}`, voice);
  return voice;
}

export async function listScenes(uid: string, productionId: string): Promise<StoryScene[]> {
  return listItems<StoryScene>(uid, `scenes-${productionId}`);
}

export async function saveScene(uid: string, productionId: string, data: Omit<StoryScene, "id" | "productionId" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }): Promise<StoryScene> {
  const now = nowIso();
  const scene: StoryScene = { ...data, id: data.id ?? newId(), productionId, createdAt: data.createdAt ?? now, updatedAt: now };
  await saveItem(uid, `scenes-${productionId}`, scene);
  return scene;
}

async function saveProductionRecord<T extends { id: string; productionId: string; createdAt: string; updatedAt: string }>(uid: string, productionId: string, collectionName: string, data: Omit<T, "id" | "productionId" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }): Promise<T> {
  const now = nowIso();
  const record = { ...data, id: data.id ?? newId(), productionId, createdAt: data.createdAt ?? now, updatedAt: now } as T;
  await saveItem(uid, `${collectionName}-${productionId}`, record);
  return record;
}

export const listScripts = (uid: string, productionId: string) => listItems<ProductionScript>(uid, `scripts-${productionId}`);
export const saveScript = (uid: string, productionId: string, data: Omit<ProductionScript, "id" | "productionId" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }) => saveProductionRecord<ProductionScript>(uid, productionId, "scripts", data);
export const listShots = (uid: string, productionId: string) => listItems<ProductionShot>(uid, `shots-${productionId}`);
export const saveShot = (uid: string, productionId: string, data: Omit<ProductionShot, "id" | "productionId" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }) => saveProductionRecord<ProductionShot>(uid, productionId, "shots", data);
export const listReferenceAssets = (uid: string, productionId: string) => listItems<ReferenceAsset>(uid, `assets-${productionId}`);
export const saveReferenceAsset = (uid: string, productionId: string, data: Omit<ReferenceAsset, "id" | "productionId" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }) => saveProductionRecord<ReferenceAsset>(uid, productionId, "assets", data);
export const listQualityReviews = (uid: string, productionId: string) => listItems<QualityReview>(uid, `quality-reviews-${productionId}`);
export const saveQualityReview = (uid: string, productionId: string, data: Omit<QualityReview, "id" | "productionId" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }) => saveProductionRecord<QualityReview>(uid, productionId, "quality-reviews", data);
