export type AIProvider = "openai" | "claude" | "runway" | "elevenlabs" | "blender" | "heyomi";
export type AIProviderStatus = "ready" | "not_configured" | "future";

export interface ProviderInfo {
  provider: AIProvider;
  label: string;
  role: string;
  department: string;
  status: AIProviderStatus;
}

export interface CanonExtractProposal {
  type: string;
  title: string;
  statement: string;
  confidence: "high" | "medium" | "low";
  source_passage: string;
}

export interface CanonExtractResult {
  proposals: CanonExtractProposal[];
  notes: string;
}

export interface ContradictionFlag {
  proposedTitle: string;
  issue: string;
  severity: "critical" | "moderate" | "minor";
  suggestion: string;
}

export interface ContinuityReviewResult {
  contradictions: ContradictionFlag[];
  confirmed: Array<{ proposedTitle: string; note: string }>;
  summary: string;
}
