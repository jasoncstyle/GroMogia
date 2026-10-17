import {
  CUSTOMER_COMMITMENT_USES,
  OBJECTIVE_EXTERNAL_DOMAINS,
  OWNER_OWNED_DOMAINS,
  S3_VERIFIABLE_LOW_DOMAINS,
  type BrainFactRecord,
  type BrainSourceRecord,
  type FactRisk,
  type FreshnessState,
  type IntendedUse,
  type SourceClass,
} from "./types";

export type AuthorityDecision = {
  authoritative: boolean;
  reasons: string[];
};

export type SourceAuthorityInput = {
  sourceClass: SourceClass | "";
  sourceDomain: string;
  factDomain: string;
  risk?: FactRisk;
  freshness?: FreshnessState;
  coverageLimitation?: string;
  intendedUse?: IntendedUse;
};

/**
 * Authority is domain-specific. Source classes are not a universal ranking.
 * Shopify (S2) may own inventory; the owner (S1) owns strategy; neither
 * automatically owns the other's domain.
 *
 * S3 business-controlled sources are not automatic truth. Fresh, domain-
 * appropriate S3 evidence may verify certain LOW-risk facts. MEDIUM/HIGH
 * risk and customer commitments stay stricter.
 */
export function sourceAuthoritativeForDomain(
  input: SourceAuthorityInput,
): AuthorityDecision {
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
    return evaluateS3Authority(input, sourceDomain, factDomain);
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

function evaluateS3Authority(
  input: SourceAuthorityInput,
  sourceDomain: string,
  factDomain: string,
): AuthorityDecision {
  const reasons: string[] = [];

  if (input.risk && input.risk !== "LOW") {
    reasons.push(
      "Business-controlled sources do not verify MEDIUM or HIGH-risk facts on their own.",
    );
  }
  if (input.freshness && input.freshness !== "CURRENT_ENOUGH") {
    reasons.push(
      "Business-controlled evidence must be current enough to verify.",
    );
  }
  if (!sourceDomain || !factDomain || sourceDomain !== factDomain) {
    reasons.push(
      "A business-controlled source is authoritative only within the domain it actually covers.",
    );
  }
  if (factDomain && !S3_VERIFIABLE_LOW_DOMAINS.has(factDomain)) {
    reasons.push(
      "This information domain cannot be verified from a business-controlled page alone.",
    );
  }
  if (input.coverageLimitation?.trim()) {
    reasons.push("Sample coverage cannot verify a population-wide fact.");
  }
  if (input.intendedUse && CUSTOMER_COMMITMENT_USES.has(input.intendedUse)) {
    reasons.push(
      "Business-controlled sources are not sufficient for customer commitments.",
    );
  }
  if (input.risk === undefined || input.freshness === undefined) {
    reasons.push(
      "A business-controlled source is not automatically authoritative; LOW-risk, current, domain-matched evidence is required.",
    );
  }

  if (reasons.length > 0) {
    return { authoritative: false, reasons };
  }
  return { authoritative: true, reasons: [] };
}

export function provenanceSourceForAuthority(input: {
  fact: Pick<BrainFactRecord, "organizationId" | "sourceId" | "sourceClass" | "domain">;
  source: Pick<BrainSourceRecord, "id" | "organizationId" | "sourceClass" | "domain"> | null;
}): {
  source: Pick<BrainSourceRecord, "id" | "organizationId" | "sourceClass" | "domain">;
  reasons: string[];
} | { source: null; reasons: string[] } {
  if (!input.source) {
    return {
      source: null,
      reasons: [
        "Missing source record. A fact's recorded source class is not a substitute for provenance.",
      ],
    };
  }
  if (input.source.organizationId !== input.fact.organizationId) {
    return {
      source: null,
      reasons: ["Source record belongs to a different business."],
    };
  }
  if (!input.fact.sourceId) {
    return {
      source: null,
      reasons: [
        "Insufficient provenance: this fact has no supporting source record.",
      ],
    };
  }
  if (input.source.id !== input.fact.sourceId) {
    return {
      source: null,
      reasons: ["Provided source does not match the fact's provenance."],
    };
  }
  return { source: input.source, reasons: [] };
}

export function canPromoteToVerified(input: {
  fact: Pick<
    BrainFactRecord,
    | "organizationId"
    | "status"
    | "risk"
    | "domain"
    | "sourceId"
    | "sourceClass"
    | "coverageLimitation"
    | "freshness"
  >;
  source: Pick<BrainSourceRecord, "id" | "organizationId" | "sourceClass" | "domain"> | null;
}): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { fact } = input;

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

  const provenance = provenanceSourceForAuthority({ fact, source: input.source });
  reasons.push(...provenance.reasons);
  if (!provenance.source) {
    return { allowed: false, reasons };
  }

  const authority = sourceAuthoritativeForDomain({
    sourceClass: provenance.source.sourceClass,
    sourceDomain: provenance.source.domain,
    factDomain: fact.domain,
    risk: fact.risk,
    freshness: fact.freshness,
    coverageLimitation: fact.coverageLimitation,
  });
  if (!authority.authoritative) {
    reasons.push(...authority.reasons);
  }

  if (provenance.source.sourceClass === "S6") {
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
