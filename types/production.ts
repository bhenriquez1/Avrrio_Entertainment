export type ProductionStatus =
  | "development"
  | "pre-production"
  | "production"
  | "post-production"
  | "complete";

export interface Production {
  id: string;
  title: string;
  logline: string;
  genre: string[];
  status: ProductionStatus;
  ownerId: string;
  targetRuntimeMinutes: number;
  targetSeasons: number;
  targetEpisodesPerSeason: number;
  canonVersion: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductionProvider = "runway" | "kling" | "elevenlabs" | "blender";
export type ProductionJobStatus = "draft" | "ready" | "submitted" | "processing" | "review" | "approved" | "failed" | "archived";

export interface ProductionQueueJob {
  id: string;
  productionId: string;
  title: string;
  provider: ProductionProvider;
  assetType: "video" | "voice" | "audio" | "image" | "3d-render";
  prompt: string;
  context: string;
  status: ProductionJobStatus;
  providerJobId: string | null;
  outputUrls: string[];
  error: string | null;
  voiceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterVoice {
  id: string;
  productionId: string;
  characterName: string;
  provider: "elevenlabs";
  voiceId: string;
  voiceVersion: string;
  status: "candidate" | "approved" | "retired";
  emotionalDirection: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type SceneStatus = "draft" | "review" | "approved";

export interface StoryScene {
  id: string;
  productionId: string;
  title: string;
  storyContext: string;
  action: string;
  visualDirection: string;
  status: SceneStatus;
  linkedCanonIds: string[];
  productionJobId: string | null;
  createdAt: string;
  updatedAt: string;
  seasonId?: string;
  episodeId?: string;
  sceneNumber?: number;
  act?: string;
  storyBeat?: string;
}

export type ReviewStatus = "draft" | "review" | "approved";

export interface ProductionScript {
  id: string; productionId: string; title: string; storyContext: string; content: string;
  status: ReviewStatus; linkedCanonIds: string[]; createdAt: string; updatedAt: string;
}

export interface ProductionShot {
  id: string; productionId: string; title: string; sceneContext: string; description: string;
  camera: string; durationSeconds: number; status: ReviewStatus; productionJobId: string | null;
  createdAt: string; updatedAt: string;
}

export interface ReferenceAsset {
  id: string; productionId: string; name: string; kind: "character" | "location" | "prop" | "style";
  dataUrl: string; mimeType: string; notes: string; status: ReviewStatus; createdAt: string; updatedAt: string;
  characterId?: string | null;
  characterName?: string;
  section?: "concept-art" | "approved-reference" | "expressions" | "wardrobe" | "age-reference" | "power-visual-language" | "voice" | "production-assets";
  visualStatus?: "reference" | "proposed" | "approved" | "canon-visual";
  providerReady?: boolean;
}

export interface StoryLocation {
  id: string; productionId: string; name: string; description: string; geography: string;
  timePeriod: string; visualLanguage: string; lighting: string; soundscape: string;
  status: ReviewStatus; linkedCanonIds: string[]; createdAt: string; updatedAt: string;
}

export interface TimelineEvent {
  id: string; productionId: string; title: string; order: number; era: string; dateLabel: string;
  description: string; seasonId: string | null; episodeId: string | null; sceneId: string | null;
  status: ReviewStatus; linkedCanonIds: string[]; createdAt: string; updatedAt: string;
}

export interface QualityReview {
  id: string; productionId: string; jobId: string; title: string; continuity: boolean;
  visualQuality: boolean; audioQuality: boolean; rightsCleared: boolean; notes: string;
  status: "pending" | "approved" | "changes_requested"; createdAt: string; updatedAt: string;
}
