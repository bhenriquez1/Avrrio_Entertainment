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
