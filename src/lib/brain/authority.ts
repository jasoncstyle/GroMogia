import {
  OBJECTIVE_EXTERNAL_DOMAINS,
  OWNER_OWNED_DOMAINS,
  type BrainFactRecord,
  type BrainSourceRecord,
  type FactRisk,
  type SourceClass,
} from "./types";

export type AuthorityDecision = {
  authoritative: boolean;
  reasons: string[];
};

/**
 * Authority is domain-specific. Source classes are not a universal ranking.
 * Shopify (S2) may own inventory; the owner (S1) owns strategy; neither
 * automatically owns the other's domain.
 */
export function sourceAuthoritativeForDomain(input: {
  sourceClass: SourceClass | "";
  sourceDomain: string;
  factDomain: string;
}): AuthorityDecision {
  const reasons: string[] = [];
  const sourceClass = input.sourceClass;
  const sourceDomain = input.sourceDomain.trim();
  const factDomain = input.factDomain.trim();

  if (!sourceClass) {
    return {
      authoritative: false,
      reasons: ["Missing source class; withhold consequential use."],
    };
  }

  if (sourceClass === "S6") {
    return {
      authoritative: false,
      reasons: ["Worker inference never becomes authoritative Brain truth."],
    };
  }

  if (sourceClass === "S5") {
    return {
      authoritative: false,
      reasons: ["Public research is evidence, not automatic Brain truth."],
    };
  }

  if (sourceClass === "S3") {
    return {
      authoritative: false,
      reasons: [
        "A business-controlled source is useful and may be stale; it is not automatic truth.",
      ],
    };
  }

  if (sourceClass === "S1") {
    if (OBJECTIVE_EXTERNAL_DOMAINS.has(factDomain)) {
      return {
        authoritative: false,
        reasons: [
          "Owner confirmation does not invent objective external reality.",
        ],
      };
    }
    if (OWNER_OWNED_DOMAINS.has(factDomain) || sourceDomain === factDomain) {
      return { authoritative: true, reasons: [] };
    }
    reasons.push("Owner source is not authoritative for this information domain.");
    return { authoritative: false, reasons };
  }

  if (sourceClass === "S2" || sourceClass === "S4") {
    if (!sourceDomain || !factDomain || sourceDomain !== factDomain) {
      return {
        authoritative: false,
        reasons: [
          "System or external source is authoritative only within the domain it owns.",
        ],
      };
    }
    return { authoritative: true, reasons: [] };
  }

  return { authoritative: false, reasons: ["Unrecognized source class."] };
}

export function canPromoteToVerified(input: {
  fact: Pick<BrainFactRecord, "status" | "risk" | "domain" | "sourceClass" | "coverageLimitation">;
  source: Pick<BrainSourceRecord, "sourceClass" | "domain"> | null;
}): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { fact, source } = input;

  if (fact.status === "SUPERSEDED") {
    reasons.push("A superseded fact cannot become VERIFIED.");
  }
  if (fact.status === "NOT_CURRENT") {
    reasons.push("A not-current fact cannot become VERIFIED.");
  }
  if (fact.status === "OWNER_STATED_FUTURE_INTENT") {
    reasons.push("Future intent is not a current VERIFIED fact.");
  }
  if (fact.status === "UNKNOWN") {
    reasons.push("UNKNOWN stays unknown until evidence exists.");
  }
  if (fact.coverageLimitation.trim()) {
    reasons.push(
      "A fact limited to an observed sample cannot be promoted to a population-wide VERIFIED claim.",
    );
  }

  const sourceClass = source?.sourceClass ?? fact.sourceClass;
  const authority = sourceAuthoritativeForDomain({
    sourceClass,
    sourceDomain: source?.domain ?? fact.domain,
    factDomain: fact.domain,
  });
  if (!authority.authoritative) {
    reasons.push(...authority.reasons);
  }

  if (fact.risk === "HIGH" && sourceClass === "S3") {
    reasons.push(
      "HIGH-risk facts must not become VERIFIED merely because one business-controlled page states them.",
    );
  }

  if (sourceClass === "S6") {
    reasons.push("Worker inference must not be promoted to VERIFIED.");
  }

  return { allowed: reasons.length === 0, reasons };
}

export function riskAllowsProvisionalUse(
  risk: FactRisk,
  consequential: boolean,
): boolean {
  if (!consequential) return true;
  if (risk === "HIGH") return false;
  return false;
}
