export type AssetStatus = "concept" | "in-development" | "approved" | "final";
export type AssetFormat = "4k" | "hdr" | "youtube" | "web" | "audio";
export type IdentVariantType = "standard" | "dark" | "holiday" | "castillo";

export const IDENT_VARIANT_LABELS: Record<IdentVariantType, string> = {
  standard: "Standard",
  dark: "Dark",
  holiday: "Holiday / Special",
  castillo: "Castillo Variant",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  concept: "Concept",
  "in-development": "In Development",
  approved: "Approved",
  final: "Final",
};

export const ASSET_FORMAT_LABELS: Record<AssetFormat, string> = {
  "4k": "4K Master",
  hdr: "HDR",
  youtube: "YouTube",
  web: "Web",
  audio: "Audio",
};

export interface IdentVariant {
  id: string;
  type: IdentVariantType;
  label: string;
  description: string;
  formats: AssetFormat[];
  status: AssetStatus;
  durationSeconds: number;
  fileRef: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SonicSignature {
  id: string;
  durationSeconds: number;
  status: AssetStatus;
  fileRef: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioBrandPackage {
  id: string;
  logoStatus: AssetStatus;
  identVariants: IdentVariant[];
  sonicSignature: SonicSignature | null;
  openingTitleRules: string;
  closingLogoStatus: AssetStatus;
  copyrightCard: string;
  productionNumber: string;
  updatedAt: string;
}
