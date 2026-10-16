import { BRAIN_AUDIT_ACTIONS, BRAIN_AUDIT_TARGET_TYPES } from "./audit";
import { canPromoteToVerified } from "./authority";
import { isMaterialGateDecision } from "./gate";
import { ownedById, requireOwned } from "./isolation";
import {
  OPEN_CONTRADICTION_STATUSES,
  type BrainContradictionMember,
  type BrainContradictionRecord,
  type BrainFactHistoryRecord,
  type BrainFactRecord,
  type BrainIntakeItemRecord,
  type BrainObservationRecord,
  type BrainRelationshipRecord,
  type BrainSourceRecord,
  type ChangeKind,
  type FactRisk,
  type FactStatus,
  type FactUseDecision,
  type FreshnessState,
  type SourceClass,
  type SourceKind,
} from "./types";

function id(): string {
  return crypto.randomUUID();
}

export type BrainAuditEvent = {
  action: string;
  targetType: string;
  targetId: string;
  organizationId: string;
  metadata: Record<string, unknown>;
};

export type CreateSourceInput = {
  sourceClass: SourceClass;
  name: string;
  domain: string;
  kind: SourceKind;
  providerKey?: string | null;
  locator?: string;
  recordedAt?: Date | null;
  notes?: string;
};

export type CreateObservationInput = {
  sourceId: string;
  intakeItemId?: string | null;
  subject: string;
  observedClaim: string;
  locator?: string;
  observedAt: Date;
  coverageNote?: string;
  relatedFactId?: string | null;
  notes?: string;
};

export type CreateFactInput = {
  subject: string;
  attribute: string;
  valueText: string;
  valueJson?: Record<string, unknown> | null;
  status?: FactStatus;
  risk: FactRisk;
  freshness: FreshnessState;
  sourceId?: string | null;
  domain: string;
  brandScope?: string;
  locationScope?: string;
  offeringId?: string | null;
  personLabel?: string;
  coverageLimitation?: string;
  observedAt?: Date | null;
  intakeItemId?: string | null;
  notes?: string;
};

const DEFAULT_FACT_STATUS: FactStatus = "UNKNOWN";

export class MemoryBrainStore {
  sources = new Map<string, BrainSourceRecord>();
  observations = new Map<string, BrainObservationRecord>();
  facts = new Map<string, BrainFactRecord>();
  history: BrainFactHistoryRecord[] = [];
  contradictions = new Map<string, BrainContradictionRecord>();
  members: BrainContradictionMember[] = [];
  relationships = new Map<string, BrainRelationshipRecord>();
  intake = new Map<string, BrainIntakeItemRecord>();
  offerings = new Map<string, { id: string; organizationId: string }>();
  audits: BrainAuditEvent[] = [];

  registerOffering(organizationId: string, offeringId: string) {
    this.offerings.set(offeringId, { id: offeringId, organizationId });
  }

  private audit(
    organizationId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ) {
    this.audits.push({
      action,
      targetType,
      targetId,
      organizationId,
      metadata,
    });
  }

  private appendHistory(
    organizationId: string,
    fact: BrainFactRecord,
    changeKind: ChangeKind,
    note: string,
    actorUserId: string | null = null,
  ) {
    this.history.push({
      id: id(),
      organizationId,
      factId: fact.id,
      previousValueText: fact.valueText,
      previousStatus: fact.status,
      previousRisk: fact.risk,
      previousSourceId: fact.sourceId,
      changeKind,
      note,
      actorUserId,
      createdAt: new Date(),
    });
  }

  createSource(organizationId: string, input: CreateSourceInput): BrainSourceRecord {
    const record: BrainSourceRecord = {
      id: id(),
      organizationId,
      sourceClass: input.sourceClass,
      name: input.name,
      domain: input.domain,
      kind: input.kind,
      providerKey: input.providerKey ?? null,
      locator: input.locator ?? "",
      recordedAt: input.recordedAt ?? null,
      notes: input.notes ?? "",
    };
    this.sources.set(record.id, record);
    return record;
  }

  createIntakeItem(
    organizationId: string,
    input: Omit<BrainIntakeItemRecord, "id" | "organizationId">,
  ): BrainIntakeItemRecord {
    if (input.sourceId) {
      ownedById(this.sources, input.sourceId, organizationId, "source");
    }
    const record: BrainIntakeItemRecord = {
      id: id(),
      organizationId,
      ...input,
    };
    this.intake.set(record.id, record);
    return record;
  }

  createObservation(
    organizationId: string,
    input: CreateObservationInput,
  ): BrainObservationRecord {
    ownedById(this.sources, input.sourceId, organizationId, "source");
    if (input.intakeItemId) {
      ownedById(this.intake, input.intakeItemId, organizationId, "intake item");
    }
    if (input.relatedFactId) {
      ownedById(this.facts, input.relatedFactId, organizationId, "fact");
    }
    const record: BrainObservationRecord = {
      id: id(),
      organizationId,
      sourceId: input.sourceId,
      intakeItemId: input.intakeItemId ?? null,
      subject: input.subject,
      observedClaim: input.observedClaim,
      locator: input.locator ?? "",
      observedAt: input.observedAt,
      coverageNote: input.coverageNote ?? "",
      relatedFactId: input.relatedFactId ?? null,
      notes: input.notes ?? "",
    };
    this.observations.set(record.id, record);
    return record;
  }

  createFact(organizationId: string, input: CreateFactInput): BrainFactRecord {
    if (input.status === "VERIFIED") {
      throw new Error("Facts must not be created as VERIFIED; use promoteToVerified.");
    }
    let sourceClass: SourceClass | "" = "";
    if (input.sourceId) {
      const source = ownedById(this.sources, input.sourceId, organizationId, "source");
      sourceClass = source.sourceClass;
    }
    if (input.offeringId) {
      ownedById(this.offerings, input.offeringId, organizationId, "offering");
    }
    if (input.intakeItemId) {
      ownedById(this.intake, input.intakeItemId, organizationId, "intake item");
    }
    const record: BrainFactRecord = {
      id: id(),
      organizationId,
      subject: input.subject,
      attribute: input.attribute,
      valueText: input.valueText,
      valueJson: input.valueJson ?? null,
      status: input.status ?? DEFAULT_FACT_STATUS,
      risk: input.risk,
      freshness: input.freshness,
      sourceId: input.sourceId ?? null,
      sourceClass,
      domain: input.domain,
      brandScope: input.brandScope ?? "",
      locationScope: input.locationScope ?? "",
      offeringId: input.offeringId ?? null,
      personLabel: input.personLabel ?? "",
      coverageLimitation: input.coverageLimitation ?? "",
      supersededByFactId: null,
      supersedesFactId: null,
      observedAt: input.observedAt ?? null,
      lastVerifiedAt: null,
      intakeItemId: input.intakeItemId ?? null,
      notes: input.notes ?? "",
    };
    this.facts.set(record.id, record);
    this.appendHistory(organizationId, record, "created", "Fact created");
    this.audit(organizationId, "brain.fact.created", "brain_fact", record.id, {
      status: record.status,
      risk: record.risk,
      domain: record.domain,
    });
    return record;
  }

  getFact(organizationId: string, factId: string): BrainFactRecord | null {
    const fact = this.facts.get(factId);
    if (!fact) return null;
    return requireOwned(fact, organizationId, "fact");
  }

  listFacts(organizationId: string): BrainFactRecord[] {
    return [...this.facts.values()].filter((row) => row.organizationId === organizationId);
  }

  listObservations(organizationId: string): BrainObservationRecord[] {
    return [...this.observations.values()].filter(
      (row) => row.organizationId === organizationId,
    );
  }

  getSource(organizationId: string, sourceId: string): BrainSourceRecord | null {
    const source = this.sources.get(sourceId);
    if (!source) return null;
    return requireOwned(source, organizationId, "source");
  }

  changeFactStatus(
    organizationId: string,
    factId: string,
    status: FactStatus,
    note: string,
  ): BrainFactRecord {
    if (status === "VERIFIED") {
      throw new Error("Use promoteToVerified; status changes must not silently verify.");
    }
    const fact = this.requireFact(organizationId, factId);
    this.appendHistory(organizationId, fact, "status_change", note);
    fact.status = status;
    this.audit(organizationId, "brain.fact.status_changed", "brain_fact", fact.id, {
      status,
      note,
    });
    return fact;
  }

  promoteToVerified(
    organizationId: string,
    factId: string,
    note: string,
  ): BrainFactRecord {
    const fact = this.requireFact(organizationId, factId);
    const source = fact.sourceId
      ? ownedById(this.sources, fact.sourceId, organizationId, "source")
      : null;
    const decision = canPromoteToVerified({ fact, source });
    if (!decision.allowed) {
      throw new Error(decision.reasons.join(" "));
    }
    this.appendHistory(organizationId, fact, "status_change", note);
    fact.status = "VERIFIED";
    fact.lastVerifiedAt = new Date();
    this.audit(organizationId, "brain.fact.status_changed", "brain_fact", fact.id, {
      status: "VERIFIED",
      note,
    });
    return fact;
  }

  ownerCorrectFact(
    organizationId: string,
    factId: string,
    valueText: string,
    sourceId: string,
    note: string,
    actorUserId: string | null = null,
  ): BrainFactRecord {
    const fact = this.requireFact(organizationId, factId);
    const source = this.requireSource(organizationId, sourceId);
    this.appendHistory(organizationId, fact, "owner_correction", note, actorUserId);
    fact.valueText = valueText;
    fact.sourceId = source.id;
    fact.sourceClass = source.sourceClass;
    fact.status = "NEEDS_OWNER_CONFIRMATION";
    if (source.sourceClass === "S1") {
      const promotion = canPromoteToVerified({
        fact: { ...fact, status: "PROVISIONAL" },
        source,
      });
      if (promotion.allowed) {
        fact.status = "VERIFIED";
        fact.lastVerifiedAt = new Date();
      }
    }
    this.audit(organizationId, "brain.fact.owner_corrected", "brain_fact", fact.id, {
      status: fact.status,
      note,
    });
    return fact;
  }

  supersedeFact(
    organizationId: string,
    previousFactId: string,
    replacement: CreateFactInput,
    note: string,
  ): { previous: BrainFactRecord; replacement: BrainFactRecord } {
    const previous = this.requireFact(organizationId, previousFactId);
    const next = this.createFact(organizationId, replacement);
    this.appendHistory(organizationId, previous, "supersession", note);
    previous.status = "SUPERSEDED";
    previous.supersededByFactId = next.id;
    next.supersedesFactId = previous.id;
    this.audit(organizationId, "brain.fact.superseded", "brain_fact", previous.id, {
      replacementFactId: next.id,
      note,
    });
    return { previous, replacement: next };
  }

  historyFor(organizationId: string, factId: string): BrainFactHistoryRecord[] {
    this.requireFact(organizationId, factId);
    return this.history.filter(
      (row) => row.organizationId === organizationId && row.factId === factId,
    );
  }

  createContradiction(
    organizationId: string,
    input: {
      summary: string;
      domain?: string;
      members: Array<Omit<BrainContradictionMember, "id" | "organizationId" | "contradictionId">>;
    },
  ): BrainContradictionRecord {
    const record: BrainContradictionRecord = {
      id: id(),
      organizationId,
      status: "OPEN",
      summary: input.summary,
      domain: input.domain ?? "",
      resolutionNote: "",
      resolvedAt: null,
    };
    this.contradictions.set(record.id, record);
    for (const member of input.members) {
      if (member.partyType === "fact") {
        ownedById(this.facts, member.partyId, organizationId, "fact");
      } else if (member.partyType === "observation") {
        ownedById(this.observations, member.partyId, organizationId, "observation");
      } else if (member.partyType === "source") {
        ownedById(this.sources, member.partyId, organizationId, "source");
      }
      this.members.push({
        id: id(),
        organizationId,
        contradictionId: record.id,
        ...member,
      });
    }
    this.audit(organizationId, "brain.contradiction.created", "brain_contradiction", record.id, {
      summary: record.summary,
    });
    return record;
  }

  narrowContradiction(organizationId: string, contradictionId: string, note: string) {
    const row = this.requireContradiction(organizationId, contradictionId);
    row.status = "NARROWED";
    row.resolutionNote = note;
    return row;
  }

  /**
   * Resolution requires an explicit authorized choice. Never pick first-found
   * or newest without authority.
   */
  resolveContradiction(
    organizationId: string,
    contradictionId: string,
    chosenFactId: string,
    note: string,
  ): BrainContradictionRecord {
    const row = this.requireContradiction(organizationId, contradictionId);
    const chosen = this.requireFact(organizationId, chosenFactId);
    const source = chosen.sourceId
      ? ownedById(this.sources, chosen.sourceId, organizationId, "source")
      : null;
    const promotion = canPromoteToVerified({
      fact: { ...chosen, coverageLimitation: "" },
      source,
    });
    if (chosen.status !== "VERIFIED" && !promotion.allowed) {
      throw new Error(
        "Contradiction stays OPEN until an authoritative resolution is recorded. " +
          promotion.reasons.join(" "),
      );
    }
    row.status = "RESOLVED";
    row.resolutionNote = note;
    row.resolvedAt = new Date();
    this.audit(organizationId, "brain.contradiction.resolved", "brain_contradiction", row.id, {
      chosenFactId,
      note,
    });
    return row;
  }

  openContradictionsForFact(
    organizationId: string,
    factId: string,
  ): BrainContradictionRecord[] {
    const ids = this.members
      .filter(
        (member) =>
          member.organizationId === organizationId &&
          member.partyType === "fact" &&
          member.partyId === factId,
      )
      .map((member) => member.contradictionId);
    return ids
      .map((contradictionId) => this.contradictions.get(contradictionId))
      .filter((row): row is BrainContradictionRecord => Boolean(row))
      .filter((row) => OPEN_CONTRADICTION_STATUSES.includes(row.status));
  }

  createRelationship(
    organizationId: string,
    input: Omit<BrainRelationshipRecord, "id" | "organizationId">,
  ): BrainRelationshipRecord {
    if (input.evidenceFactId) {
      ownedById(this.facts, input.evidenceFactId, organizationId, "fact");
    }
    if (input.evidenceObservationId) {
      ownedById(this.observations, input.evidenceObservationId, organizationId, "observation");
    }
    const record: BrainRelationshipRecord = {
      id: id(),
      organizationId,
      ...input,
    };
    this.relationships.set(record.id, record);
    return record;
  }

  factsForRelatedBusiness(): BrainFactRecord[] {
    return [];
  }

  recordGateDecision(
    organizationId: string,
    factId: string,
    decision: FactUseDecision,
  ): void {
    if (!isMaterialGateDecision(decision)) return;
    this.audit(
      organizationId,
      BRAIN_AUDIT_ACTIONS.factUseGateMaterial,
      BRAIN_AUDIT_TARGET_TYPES.gate,
      factId,
      {
        intendedUse: decision.intendedUse,
        allowed: decision.allowed,
        withheld: decision.withheld,
        reasons: decision.reasons,
        grantsExternalAction: false,
      },
    );
  }

  private requireFact(organizationId: string, factId: string): BrainFactRecord {
    return ownedById(this.facts, factId, organizationId, "fact");
  }

  private requireSource(organizationId: string, sourceId: string): BrainSourceRecord {
    return ownedById(this.sources, sourceId, organizationId, "source");
  }

  private requireContradiction(
    organizationId: string,
    contradictionId: string,
  ): BrainContradictionRecord {
    return ownedById(this.contradictions, contradictionId, organizationId, "contradiction");
  }
}
