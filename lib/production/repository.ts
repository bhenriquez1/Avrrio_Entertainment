import { listItems, getItem, saveItem, deleteItem } from "./storage";
import type { Production } from "@/types/production";
import type { CanonRecord } from "@/types/canon";
import type { Season, Episode } from "@/types/episode";

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
