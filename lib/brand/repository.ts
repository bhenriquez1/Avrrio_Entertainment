import { getItem, saveItem } from "@/lib/production/storage";
import type { IdentVariant, SonicSignature, StudioBrandPackage, AssetStatus, IdentVariantType, AssetFormat } from "@/types/brand";

const BRAND_COL = "studio:brand";

const INITIAL_VARIANTS: IdentVariant[] = [
  {
    id: "ident-standard",
    type: "standard",
    label: "Standard Ident",
    description: "Normal episode opener. Full particle-assembly sequence in 8–12 seconds.",
    formats: ["4k", "hdr", "youtube"],
    status: "concept",
    durationSeconds: 10,
    fileRef: null,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ident-dark",
    type: "dark",
    label: "Dark Ident",
    description: "For particularly ominous episodes. Slower particle movement, muted palette, subdued sonic resolution.",
    formats: ["4k", "hdr", "youtube"],
    status: "concept",
    durationSeconds: 10,
    fileRef: null,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ident-holiday",
    type: "holiday",
    label: "Holiday / Special Ident",
    description: "Special and holiday episodes. Seasonal energy in the particle field; same timing and logo reveal.",
    formats: ["4k", "youtube"],
    status: "concept",
    durationSeconds: 10,
    fileRef: null,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ident-castillo",
    type: "castillo",
    label: "Castillo Variant",
    description: "Supernatural energy subtly interacts with the Avrrio mark before the episode starts. Castillo-series-specific.",
    formats: ["4k", "hdr", "youtube"],
    status: "concept",
    durationSeconds: 11,
    fileRef: null,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_PACKAGE: StudioBrandPackage = {
  id: "studio-brand",
  logoStatus: "concept",
  identVariants: INITIAL_VARIANTS,
  sonicSignature: {
    id: "sonic-signature",
    durationSeconds: 4,
    status: "concept",
    fileRef: null,
    notes: "Original 3–5 second motif. Must be recognizable without seeing the logo.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  openingTitleRules: "",
  closingLogoStatus: "concept",
  copyrightCard: `© ${new Date().getFullYear()} Avrrio Entertainment. All rights reserved.`,
  productionNumber: "AE-001",
  updatedAt: new Date().toISOString(),
};

export async function getStudioBrand(uid: string): Promise<StudioBrandPackage> {
  const existing = await getItem<StudioBrandPackage>(uid, BRAND_COL, "studio-brand");
  return existing ?? DEFAULT_PACKAGE;
}

export async function saveStudioBrand(uid: string, pkg: StudioBrandPackage): Promise<void> {
  await saveItem(uid, BRAND_COL, { ...pkg, updatedAt: new Date().toISOString() });
}

export async function updateIdentVariant(
  uid: string,
  variantId: string,
  updates: Partial<Pick<IdentVariant, "status" | "durationSeconds" | "formats" | "fileRef" | "notes" | "description">>
): Promise<void> {
  const pkg = await getStudioBrand(uid);
  pkg.identVariants = pkg.identVariants.map((v) =>
    v.id === variantId ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
  );
  await saveStudioBrand(uid, pkg);
}

export async function updateSonicSignature(
  uid: string,
  updates: Partial<Pick<SonicSignature, "status" | "durationSeconds" | "fileRef" | "notes">>
): Promise<void> {
  const pkg = await getStudioBrand(uid);
  if (!pkg.sonicSignature) return;
  pkg.sonicSignature = { ...pkg.sonicSignature, ...updates, updatedAt: new Date().toISOString() };
  await saveStudioBrand(uid, pkg);
}

export async function updateBrandField(
  uid: string,
  field: keyof Pick<StudioBrandPackage, "logoStatus" | "closingLogoStatus" | "openingTitleRules" | "copyrightCard" | "productionNumber">,
  value: string
): Promise<void> {
  const pkg = await getStudioBrand(uid);
  (pkg as unknown as Record<string, unknown>)[field] = value;
  await saveStudioBrand(uid, pkg);
}
