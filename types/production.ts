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
  createdAt: string;
  updatedAt: string;
}
