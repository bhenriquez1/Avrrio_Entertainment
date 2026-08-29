export type CanonType =
  | "character"
  | "relationship"
  | "magic_system"
  | "species"
  | "location"
  | "organization"
  | "artifact"
  | "historical_event"
  | "rule"
  | "world_detail";

export type CanonStatus = "proposed" | "approved" | "rejected" | "superseded";

export type CanonProposedBy = "openai" | "claude" | "user";

export const CANON_TYPE_LABELS: Record<CanonType, string> = {
  character: "Character",
  relationship: "Relationship",
  magic_system: "Magic System",
  species: "Species",
  location: "Location",
  organization: "Organization",
  artifact: "Artifact",
  historical_event: "Historical Event",
  rule: "Rule",
  world_detail: "World Detail",
};

export const CANON_STATUS_LABELS: Record<CanonStatus, string> = {
  proposed: "Proposed",
  approved: "Approved",
  rejected: "Rejected",
  superseded: "Superseded",
};

export interface CanonRecord {
  id: string;
  productionId: string;
  type: CanonType;
  title: string;
  statement: string;
  status: CanonStatus;
  source: string;
  proposedBy: CanonProposedBy;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  canonVersion: string;
  supersedes: string | null;
  dependencies: string[];
  reviewNote: string;
  contradictions: string[];
}
