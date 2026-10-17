export const FACT_STATUSES = [
  "VERIFIED",
  "PROVISIONAL",
  "NEEDS_OWNER_CONFIRMATION",
  "UNKNOWN",
  "NOT_CURRENT",
  "OWNER_STATED_FUTURE_INTENT",
  "SUPERSEDED",
] as const;

export type FactStatus = (typeof FACT_STATUSES)[number];

export const FACT_RISKS = ["LOW", "MEDIUM", "HIGH"] as const;
export type FactRisk = (typeof FACT_RISKS)[number];

export const FRESHNESS_STATES = [
  "CURRENT_ENOUGH",
  "AGING",
  "STALE_REVERIFY",
] as const;
export type FreshnessState = (typeof FRESHNESS_STATES)[number];

export const SOURCE_CLASSES = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;
export type SourceClass = (typeof SOURCE_CLASSES)[number];

export const SOURCE_CLASS_NAMES = {
  S1: "Owner Decision / Confirmation",
  S2: "System of Record",
  S3: "Business-Controlled Source",
  S4: "External Authoritative Source",
  S5: "Public Research",
  S6: "Worker Inference",
} as const;

export const SOURCE_KINDS = [
  "owner_confirmation",
  "system_of_record",
  "business_controlled",
  "external_authoritative",
  "public_research",
  "worker_inference",
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const CONTRADICTION_STATUSES = [
  "OPEN",
  "RESOLVING",
  "NARROWED",
  "RESOLVED",
  "NO_LONGER_RELEVANT",
] as const;
export type ContradictionStatus = (typeof CONTRADICTION_STATUSES)[number];

export const OPEN_CONTRADICTION_STATUSES: readonly ContradictionStatus[] = [
  "OPEN",
  "RESOLVING",
  "NARROWED",
];

export const INTENDED_USES = [
  "internal_investigation",
  "hypothesis_generation",
  "specialist_selection",
  "retrieve_next",
  "owner_internal_display",
  "customer_facing_claim",
  "quote_current_price",
  "promise_availability",
  "credential_legal_safety_claim",
  "change_policy",
  "advertise_discount",
  "spend_based_on_fact",
  "material_customer_commitment",
  "publish",
  "send",
  "spend",
  "change_external",
] as const;
export type IntendedUse = (typeof INTENDED_USES)[number];

export const INTERNAL_USES: ReadonlySet<IntendedUse> = new Set([
  "internal_investigation",
  "hypothesis_generation",
  "specialist_selection",
  "retrieve_next",
]);

export const CONSEQUENTIAL_USES: ReadonlySet<IntendedUse> = new Set([
  "customer_facing_claim",
  "quote_current_price",
  "promise_availability",
  "credential_legal_safety_claim",
  "change_policy",
  "advertise_discount",
  "spend_based_on_fact",
  "material_customer_commitment",
  "publish",
  "send",
  "spend",
  "change_external",
]);

export const EXTERNAL_ACTION_USES: ReadonlySet<IntendedUse> = new Set([
  "publish",
  "send",
  "spend",
  "change_external",
  "change_policy",
  "advertise_discount",
]);

export const CUSTOMER_COMMITMENT_USES: ReadonlySet<IntendedUse> = new Set([
  "quote_current_price",
  "promise_availability",
  "credential_legal_safety_claim",
  "material_customer_commitment",
  "advertise_discount",
  "spend_based_on_fact",
]);

export const S3_VERIFIABLE_LOW_DOMAINS: ReadonlySet<string> = new Set([
  "identity",
  "operations",
  "offering",
  "website_content",
  "audience",
  "brand_voice",
]);

export const FACT_DOMAINS = [
  "identity",
  "strategy",
  "goals",
  "brand_voice",
  "brand_boundaries",
  "owner_policy",
  "future_intent",
  "subjective_positioning",
  "audience",
  "offering",
  "pricing",
  "inventory",
  "availability",
  "operations",
  "website_content",
  "credentials",
  "legal",
  "safety",
  "external_certification",
] as const;
export type FactDomain = (typeof FACT_DOMAINS)[number] | (string & {});

export const OWNER_OWNED_DOMAINS: ReadonlySet<string> = new Set([
  "strategy",
  "goals",
  "brand_voice",
  "brand_boundaries",
  "owner_policy",
  "future_intent",
  "subjective_positioning",
  "audience",
]);

export const OBJECTIVE_EXTERNAL_DOMAINS: ReadonlySet<string> = new Set([
  "inventory",
  "availability",
  "credentials",
  "legal",
  "safety",
  "external_certification",
  "pricing",
]);

export const CHANGE_KINDS = [
  "created",
  "status_change",
  "owner_correction",
  "supersession",
  "value_change",
] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export type BrainSourceRecord = {
  id: string;
  organizationId: string;
  sourceClass: SourceClass;
  name: string;
  domain: string;
  kind: SourceKind;
  providerKey: string | null;
  locator: string;
  recordedAt: Date | null;
  notes: string;
};

export type BrainObservationRecord = {
  id: string;
  organizationId: string;
  sourceId: string;
  intakeItemId: string | null;
  subject: string;
  observedClaim: string;
  locator: string;
  observedAt: Date;
  coverageNote: string;
  relatedFactId: string | null;
  notes: string;
};

export type BrainFactRecord = {
  id: string;
  organizationId: string;
  subject: string;
  attribute: string;
  valueText: string;
  valueJson: Record<string, unknown> | null;
  status: FactStatus;
  risk: FactRisk;
  freshness: FreshnessState;
  sourceId: string | null;
  sourceClass: SourceClass | "";
  domain: string;
  brandScope: string;
  locationScope: string;
  offeringId: string | null;
  personLabel: string;
  coverageLimitation: string;
  supersededByFactId: string | null;
  supersedesFactId: string | null;
  observedAt: Date | null;
  lastVerifiedAt: Date | null;
  intakeItemId: string | null;
  notes: string;
};

export type BrainFactHistoryRecord = {
  id: string;
  organizationId: string;
  factId: string;
  previousValueText: string;
  previousStatus: string;
  previousRisk: string;
  previousSourceId: string | null;
  changeKind: ChangeKind;
  note: string;
  actorUserId: string | null;
  createdAt: Date;
};

export type BrainContradictionRecord = {
  id: string;
  organizationId: string;
  status: ContradictionStatus;
  summary: string;
  domain: string;
  resolutionNote: string;
  resolvedAt: Date | null;
};

export type BrainContradictionMember = {
  id: string;
  organizationId: string;
  contradictionId: string;
  partyType: "fact" | "observation" | "source";
  partyId: string;
  role: string;
};

export type BrainRelationshipRecord = {
  id: string;
  organizationId: string;
  fromKind: string;
  fromRef: string;
  toKind: string;
  toRef: string;
  relationType: string;
  evidenceFactId: string | null;
  evidenceObservationId: string | null;
  status: string;
  notes: string;
};

export type BrainIntakeItemRecord = {
  id: string;
  organizationId: string;
  kind: string;
  subject: string;
  payload: Record<string, unknown>;
  sourceId: string | null;
  convertedToObservationId: string | null;
  convertedToFactId: string | null;
  notes: string;
};

export type FactUseDecision = {
  allowed: boolean;
  withheld: boolean;
  intendedUse: IntendedUse;
  grantsExternalAction: false;
  grantsConnectorAccess: false;
  grantsOwnerBusinessPermission: false;
  enablesA3: false;
  enablesA4: false;
  reasons: string[];
};

export const FACT_USE_GATE_AUTHORITY_BOUNDARY = {
  grantsExternalAction: false,
  grantsConnectorAccess: false,
  grantsOwnerBusinessPermission: false,
  enablesA3: false,
  enablesA4: false,
} as const;

export function isFactStatus(value: string): value is FactStatus {
  return (FACT_STATUSES as readonly string[]).includes(value);
}

export function isSourceClass(value: string): value is SourceClass {
  return (SOURCE_CLASSES as readonly string[]).includes(value);
}

export function isFactRisk(value: string): value is FactRisk {
  return (FACT_RISKS as readonly string[]).includes(value);
}

export function isFreshnessState(value: string): value is FreshnessState {
  return (FRESHNESS_STATES as readonly string[]).includes(value);
}

export function isIntendedUse(value: string): value is IntendedUse {
  return (INTENDED_USES as readonly string[]).includes(value);
}
