import type { MemoryBrainStore } from "./store";
import type { BrainFactRecord, SourceKind } from "./types";

export type LegacyBusinessBrain = {
  organizationId: string;
  industry: string;
  businessModel: string;
  locations: string[];
  serviceAreas: string[];
  operatingHours: string;
  seasonality: string;
  notes: string;
  idealCustomers: string[];
  painPoints: string[];
  competitors: string[];
  differentiators: string[];
  prohibitedClaims: string[];
  discoveryStatus: string;
  inferredSummary: string;
  inferredSource: string;
  confidence: number;
};

export type OwnerFacingBrain = LegacyBusinessBrain;

const TEXT_FIELDS: Array<{
  key: keyof LegacyBusinessBrain;
  attribute: string;
  domain: string;
}> = [
  { key: "industry", attribute: "industry", domain: "identity" },
  { key: "businessModel", attribute: "business_model", domain: "identity" },
  { key: "operatingHours", attribute: "operating_hours", domain: "operations" },
  { key: "seasonality", attribute: "seasonality", domain: "operations" },
  { key: "notes", attribute: "notes", domain: "owner_policy" },
];

const LIST_FIELDS: Array<{
  key: keyof LegacyBusinessBrain;
  attribute: string;
  domain: string;
}> = [
  { key: "locations", attribute: "location", domain: "operations" },
  { key: "serviceAreas", attribute: "service_area", domain: "operations" },
  { key: "idealCustomers", attribute: "ideal_customer", domain: "audience" },
  { key: "painPoints", attribute: "pain_point", domain: "audience" },
  { key: "competitors", attribute: "competitor_name", domain: "strategy" },
  { key: "differentiators", attribute: "differentiator", domain: "strategy" },
  { key: "prohibitedClaims", attribute: "prohibited_claim", domain: "brand_boundaries" },
];

/**
 * Dual-read for the current five-screen app. Owner screens keep reading
 * `business_brains`. Structured facts are not merged in.
 */
export function readOwnerFacingBrain(
  row: LegacyBusinessBrain | null,
): OwnerFacingBrain | null {
  return row;
}

/**
 * Explicit snapshot of a legacy Brain row into intake + observations + facts.
 * Never promotes to VERIFIED. Ignores the legacy numeric confidence field.
 * `discoveryStatus = confirmed` is not an S1 source record.
 */
export function snapshotLegacyBrain(
  store: MemoryBrainStore,
  brain: LegacyBusinessBrain,
): { intakeId: string; factIds: string[]; observationIds: string[] } {
  const organizationId = brain.organizationId;
  const legacySource = store.createSource(organizationId, {
    sourceClass: "S3",
    name: "Legacy Business Brain row",
    domain: "website_content",
    kind: "business_controlled" satisfies SourceKind,
    notes:
      "Snapshot of business_brains. Not a Stage 2 confirmation record. Do not treat as VERIFIED.",
  });

  const intake = store.createIntakeItem(organizationId, {
    kind: "legacy_brain",
    subject: "business_brains",
    payload: {
      discoveryStatus: brain.discoveryStatus,
      confidenceIgnored: brain.confidence,
      inferredSource: brain.inferredSource,
    },
    sourceId: legacySource.id,
    convertedToObservationId: null,
    convertedToFactId: null,
    notes: "Historical Brain copy. Status is not auto-flipped.",
  });

  const factIds: string[] = [];
  const observationIds: string[] = [];

  const inferred = store.createSource(organizationId, {
    sourceClass: "S6",
    name: brain.inferredSource.trim() || "Legacy inferred summary",
    domain: "identity",
    kind: "worker_inference",
    notes: "Legacy inferred_summary. Worker inference never auto-promotes.",
  });

  const recordText = (
    attribute: string,
    value: string,
    domain: string,
    extra?: { sourceClass?: "S6"; coverageLimitation?: string },
  ) => {
    if (!value.trim()) return;
    const observation = store.createObservation(organizationId, {
      sourceId: extra?.sourceClass === "S6" ? inferred.id : legacySource.id,
      intakeItemId: intake.id,
      subject: "business",
      observedClaim: value.trim(),
      locator: `business_brains.${attribute}`,
      observedAt: new Date(),
      coverageNote: extra?.coverageLimitation ?? "",
    });
    observationIds.push(observation.id);
    const fact = store.createFact(organizationId, {
      subject: "business",
      attribute,
      valueText: value.trim(),
      status: extra?.sourceClass === "S6" ? "PROVISIONAL" : "UNKNOWN",
      risk: "MEDIUM",
      freshness: "AGING",
      sourceId: observation.sourceId,
      domain,
      coverageLimitation: extra?.coverageLimitation ?? "",
      intakeItemId: intake.id,
      notes:
        "Legacy snapshot. Historical unknowns remain unknown. Not auto-VERIFIED.",
    });
    factIds.push(fact.id);
    observation.relatedFactId = fact.id;
  };

  for (const field of TEXT_FIELDS) {
    recordText(field.attribute, String(brain[field.key] ?? ""), field.domain);
  }
  for (const field of LIST_FIELDS) {
    const values = (brain[field.key] as string[]) ?? [];
    for (const value of values) {
      recordText(field.attribute, value, field.domain);
    }
  }
  if (brain.inferredSummary.trim()) {
    recordText("inferred_summary", brain.inferredSummary, "identity", {
      sourceClass: "S6",
      coverageLimitation: "Worker-inferred summary from the legacy Brain. Not verified.",
    });
  }

  return { intakeId: intake.id, factIds, observationIds };
}

export function snapshotPromotedAnyVerified(facts: BrainFactRecord[]): boolean {
  return facts.some((fact) => fact.status === "VERIFIED");
}

export const FUTURE_BRAIN_MIGRATION_STEPS = [
  "Keep business_brains as the owner-facing store until a later cutover review.",
  "Run snapshotLegacyBrain only as an explicit, reversible copy into intake items.",
  "Do not flip status to VERIFIED during copy. UNKNOWN stays UNKNOWN.",
  "Create an S1 source record only when the owner confirms a fact in Stage 2.",
  "Historical owner-confirmed form values keep documented authority only after an S1 source record exists.",
  "Offers, goals, and Brand Voice stay canonical; link them as Fact subjects later.",
  "Harbor / Albatross / MBSS Markdown importers wait for Phase G.",
  "Rollback: drop brain_* tables. business_brains is unchanged.",
] as const;
