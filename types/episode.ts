export type SeasonStatus = "development" | "pre-production" | "production" | "complete";
export type EpisodeStatus = "development" | "scripted" | "storyboarded" | "in-production" | "complete";

export interface Season {
  id: string;
  productionId: string;
  number: number;
  title: string;
  synopsis: string;
  status: SeasonStatus;
  episodeCount: number;
  createdAt: string;
  updatedAt: string;
  theme?: string;
  arc?: string;
  storyBeats?: string[];
}

export interface Episode {
  id: string;
  productionId: string;
  seasonId: string;
  number: number;
  title: string;
  synopsis: string;
  targetRuntimeMinutes: number;
  status: EpisodeStatus;
  canonDependencies: string[];
  acts: string[];
  createdAt: string;
  updatedAt: string;
  logline?: string;
  coldOpen?: string;
  climax?: string;
  resolution?: string;
  storyBeats?: string[];
}
