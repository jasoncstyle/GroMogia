import { sourceAuthoritativeForDomain } from "./authority";
import {
  CONSEQUENTIAL_USES,
  EXTERNAL_ACTION_USES,
  INTERNAL_USES,
  OPEN_CONTRADICTION_STATUSES,
  type BrainContradictionRecord,
  type BrainFactRecord,
  type BrainObservationRecord,
  type BrainSourceRecord,
  type FactUseDecision,
  type IntendedUse,
} from "./types";

export type FactUseInput = {
  fact: BrainFactRecord;
  source: BrainSourceRecord | null;
  intendedUse: IntendedUse;
  contradictions?: BrainContradictionRecord[];
};

function decision(
  intendedUse: IntendedUse,
  reasons: string[],
): FactUseDecision {
  const withheld = reasons.length > 0;
  return {
    allowed: !withheld,
    withheld,
    intendedUse,
    grantsExternalAction: false,
    reasons,
  };
}

/**
 * Central Fact-Use Gate. Decides whether a fact is trustworthy enough for
 * an intended use. Never grants permission to publish, send, spend, or
 * change an external system.
 */
export function evaluateFactUse(input: FactUseInput): FactUseDecision {
  const { fact, source, intendedUse } = input;
  const reasons: string[] = [];
  const consequential = CONSEQUENTIAL_USES.has(intendedUse);
  const externalAction = EXTERNAL_ACTION_USES.has(intendedUse);

  if (externalAction) {
    reasons.push(
      "The Fact-Use Gate does not grant permission to publish, send, spend, or change external systems.",
    );
  }

  if (fact.status === "SUPERSEDED") {
    reasons.push("Use the replacement fact; this value is SUPERSEDED.");
  }

  if (fact.status === "NOT_CURRENT" && intendedUse !== "internal_investigation") {
    reasons.push("This fact is NOT CURRENT and must not be used as a live claim.");
  }

  if (
    fact.status === "OWNER_STATED_FUTURE_INTENT" &&
    consequential
  ) {
    reasons.push("Owner-stated future intent is not a current fact.");
  }

  if (fact.status === "UNKNOWN" && consequential) {
    reasons.push("UNKNOWN facts must not support consequential use.");
  }

  if (fact.status === "NEEDS_OWNER_CONFIRMATION" && consequential) {
    reasons.push(
      "Owner confirmation is still required before consequential use.",
    );
  }

  if (!fact.sourceClass && consequential) {
    reasons.push("Missing provenance; withhold consequential use.");
  }

  if (consequential && !fact.freshness) {
    reasons.push("Missing freshness; withhold consequential use.");
  }

  if (consequential && fact.freshness === "STALE_REVERIFY") {
    reasons.push("Re-verify before consequential use; this fact is stale.");
  }

  if (
    consequential &&
    fact.freshness === "AGING" &&
    fact.risk === "HIGH"
  ) {
    reasons.push("HIGH-risk aging facts must be re-verified before consequential use.");
  }

  const openConflicts = (input.contradictions ?? []).filter((row) =>
    OPEN_CONTRADICTION_STATUSES.includes(row.status),
  );
  if (openConflicts.length > 0 && consequential) {
    reasons.push(
      "An unresolved contradiction blocks consequential use of this fact.",
    );
  }

  if (fact.status === "PROVISIONAL" && consequential) {
    reasons.push(
      "PROVISIONAL facts are not authoritative for customer-facing or other consequential use.",
    );
  }

  if (fact.status === "PROVISIONAL" && fact.risk === "HIGH" && !INTERNAL_USES.has(intendedUse)) {
    reasons.push(
      "HIGH-risk provisional facts must not be treated as authoritative because a worker needs them.",
    );
  }

  if (consequential) {
    const authority = sourceAuthoritativeForDomain({
      sourceClass: source?.sourceClass ?? fact.sourceClass,
      sourceDomain: source?.domain ?? "",
      factDomain: fact.domain,
    });
    if (!authority.authoritative) {
      reasons.push(...authority.reasons);
    }
  }

  if (fact.status === "VERIFIED" && fact.coverageLimitation.trim() && consequential) {
    reasons.push(
      "Coverage is limited to an observed sample; do not use as a population-wide claim.",
    );
  }

  if (consequential && fact.status !== "VERIFIED" && fact.status !== "PROVISIONAL") {
    if (
      fact.status !== "NEEDS_OWNER_CONFIRMATION" &&
      fact.status !== "UNKNOWN" &&
      fact.status !== "NOT_CURRENT" &&
      fact.status !== "OWNER_STATED_FUTURE_INTENT" &&
      fact.status !== "SUPERSEDED"
    ) {
      reasons.push("Required evidence or authority is missing.");
    }
  }

  const unique = [...new Set(reasons)];
  return decision(intendedUse, unique);
}

/**
 * An Observation records what a source displayed. It does not establish
 * the underlying business fact, even when the observation itself is certain.
 */
export function evaluateObservationAsFact(input: {
  observation: BrainObservationRecord;
  intendedUse: IntendedUse;
}): FactUseDecision {
  const reasons = [
    "An observation is not a fact. Verifying that a source displayed a claim does not verify the underlying business fact.",
  ];
  if (input.intendedUse === "quote_current_price") {
    reasons.push(
      "A content observation cannot be used as a VERIFIED price for a customer-facing quote.",
    );
  }
  if (CONSEQUENTIAL_USES.has(input.intendedUse)) {
    reasons.push("Consequential use requires a fact that independently passes the Fact-Use Gate.");
  }
  return decision(input.intendedUse, reasons);
}

export function isMaterialGateDecision(decision: FactUseDecision): boolean {
  return (
    decision.intendedUse !== "internal_investigation" &&
    decision.intendedUse !== "hypothesis_generation" &&
    decision.intendedUse !== "retrieve_next"
  );
}
