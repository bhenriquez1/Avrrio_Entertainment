export type ProductionProviderName = "runway" | "kling" | "elevenlabs" | "blender";

export interface ProductionJobRequest {
  productionId: string;
  sceneId?: string;
  prompt: string;
  referenceUrls?: string[];
  metadata?: Record<string, string | number | boolean>;
}

export interface ProductionJob {
  id: string;
  provider: ProductionProviderName;
  status: "queued" | "running" | "complete" | "failed";
  outputUrls: string[];
  error?: string;
}

export interface ProductionProvider {
  readonly name: ProductionProviderName;
  isConfigured(): boolean;
  submit(request: ProductionJobRequest): Promise<ProductionJob>;
  getJob(id: string): Promise<ProductionJob>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not configured.`);
  }
}

export function providerConfiguration() {
  return {
    runway: Boolean(process.env.RUNWAY_API_KEY),
    kling: Boolean(process.env.KLING_API_KEY),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    blender: Boolean(process.env.BLENDER_WORKER_URL && process.env.BLENDER_WORKER_TOKEN),
  };
}
