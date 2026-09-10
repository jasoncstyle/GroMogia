import type { GrowthActionEvidence } from "@/lib/db/schema";

/**
 * Structured fields added in Phase B. They store facts the UI can show
 * without parsing `description`. Priority is stored but is not used to
 * reorder Next step yet (cross-channel scoring stays later).
 */
export const GROWTH_ACTION_CONFIDENCE_OBSERVED = "observed";
export const GROWTH_ACTION_CONFIDENCE_INFERRED = "inferred";
export const GROWTH_ACTION_IMPACT_UNKNOWN = "unknown";

export type GrowthActionFact = {
  label: string
  value: string
};

export function isEmptyEvidence(evidence?: GrowthActionEvidence | null): boolean {
  if (!evidence) return true;
  return Object.values(evidence).every((value) => {
    if (value == null) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "string") return value.trim() === "";
    return false;
  });
}

export function growthActionFacts(
  evidence?: GrowthActionEvidence | null,
): GrowthActionFact[] {
  if (!evidence || isEmptyEvidence(evidence)) return [];
  const facts: GrowthActionFact[] = [];
  if (evidence.query?.trim()) {
    facts.push({ label: "Search", value: evidence.query.trim() });
  }
  if (typeof evidence.impressions === "number") {
    facts.push({
      label: "Search visibility",
      value: `${formatCount(evidence.impressions)} impressions`,
    });
  }
  if (typeof evidence.position === "number") {
    facts.push({
      label: "Average position",
      value: evidence.position.toFixed(1),
    });
  }
  if (typeof evidence.ctr === "number") {
    facts.push({
      label: "Click-through rate",
      value: `${(evidence.ctr * 100).toFixed(1)}%`,
    });
  }
  if (evidence.labels && evidence.labels.length > 0) {
    facts.push({
      label: "Page signals",
      value: evidence.labels.join(", "),
    });
  }
  if (evidence.startDate && evidence.endDate) {
    facts.push({
      label: "Measurement window",
      value: `${evidence.startDate} to ${evidence.endDate}`,
    });
  }
  return facts;
}

export function confidenceNote(confidence?: string | null): string {
  if (confidence === GROWTH_ACTION_CONFIDENCE_OBSERVED) {
    return "GroovGro observed this on the connected page or in Search Console.";
  }
  if (confidence === GROWTH_ACTION_CONFIDENCE_INFERRED) {
    return "GroovGro inferred an opportunity from observed numbers. This is not a guarantee.";
  }
  return "";
}

export function expectedImpactNote(expectedImpact?: string | null): string {
  if (expectedImpact === GROWTH_ACTION_IMPACT_UNKNOWN) {
    return "Expected impact is not estimated yet.";
  }
  return "";
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}
