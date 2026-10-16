import { and, eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import {
  brainContradictions,
  brainContradictionMembers,
  brainFactHistory,
  brainFacts,
  brainIntakeItems,
  brainObservations,
  brainRelationships,
  brainSources,
  offers,
} from "@/lib/db/schema";

import { BRAIN_AUDIT_ACTIONS, BRAIN_AUDIT_TARGET_TYPES } from "./audit";
import { canPromoteToVerified } from "./authority";
import { TENANT_ISOLATION_ERROR } from "./isolation";
import type {
  CreateFactInput,
  CreateObservationInput,
  CreateSourceInput,
} from "./store";
import type {
  BrainContradictionMember,
  FactRisk,
  FactStatus,
  FreshnessState,
  SourceClass,
} from "./types";

type Db = NonNullable<ReturnType<typeof getDb>>;

function requireDb(db?: Db | null): Db {
  const resolved = db ?? getDb();
  if (!resolved) throw new Error("Database is not configured");
  return resolved;
}

async function loadOwned<T extends { organizationId: string }>(
  rows: T[],
  organizationId: string,
  label: string,
): Promise<T> {
  const row = rows[0];
  if (!row) throw new Error(`Unknown ${label}`);
  if (row.organizationId !== organizationId) {
    throw new Error(TENANT_ISOLATION_ERROR);
  }
  return row;
}

export async function persistGetSource(
  organizationId: string,
  sourceId: string,
  db?: Db | null,
) {
  const database = requireDb(db);
  const rows = await database
    .select()
    .from(brainSources)
    .where(
      and(
        eq(brainSources.id, sourceId),
        eq(brainSources.organizationId, organizationId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function persistGetFact(
  organizationId: string,
  factId: string,
  db?: Db | null,
) {
  const database = requireDb(db);
  const rows = await database
    .select()
    .from(brainFacts)
    .where(
      and(eq(brainFacts.id, factId), eq(brainFacts.organizationId, organizationId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function requireSource(organizationId: string, sourceId: string, db: Db) {
  const row = await persistGetSource(organizationId, sourceId, db);
  if (!row) throw new Error("Unknown source");
  return row;
}

async function requireFact(organizationId: string, factId: string, db: Db) {
  const row = await persistGetFact(organizationId, factId, db);
  if (!row) throw new Error("Unknown fact");
  return row;
}

async function requireOffering(organizationId: string, offeringId: string, db: Db) {
  const rows = await db
    .select({ id: offers.id, organizationId: offers.organizationId })
    .from(offers)
    .where(and(eq(offers.id, offeringId), eq(offers.organizationId, organizationId)))
    .limit(1);
  return loadOwned(rows, organizationId, "offering");
}

async function requireIntake(organizationId: string, intakeId: string, db: Db) {
  const rows = await db
    .select()
    .from(brainIntakeItems)
    .where(
      and(
        eq(brainIntakeItems.id, intakeId),
        eq(brainIntakeItems.organizationId, organizationId),
      ),
    )
    .limit(1);
  return loadOwned(rows, organizationId, "intake item");
}

async function appendHistory(
  db: Db,
  organizationId: string,
  fact: {
    id: string;
    valueText: string;
    status: string;
    risk: string;
    sourceId: string | null;
  },
  changeKind: string,
  note: string,
  actorUserId: string | null = null,
) {
  await db.insert(brainFactHistory).values({
    organizationId,
    factId: fact.id,
    previousValueText: fact.valueText,
    previousStatus: fact.status,
    previousRisk: fact.risk,
    previousSourceId: fact.sourceId,
    changeKind,
    note,
    actorUserId,
  });
}

export async function persistCreateSource(
  organizationId: string,
  input: CreateSourceInput,
  db?: Db | null,
) {
  const database = requireDb(db);
  const [row] = await database
    .insert(brainSources)
    .values({
      organizationId,
      sourceClass: input.sourceClass,
      name: input.name,
      domain: input.domain,
      kind: input.kind,
      providerKey: input.providerKey ?? null,
      locator: input.locator ?? "",
      recordedAt: input.recordedAt ?? null,
      notes: input.notes ?? "",
    })
    .returning();
  return row;
}

export async function persistCreateIntakeItem(
  organizationId: string,
  input: {
    kind: string;
    subject?: string;
    payload?: Record<string, unknown>;
    sourceId?: string | null;
    notes?: string;
  },
  db?: Db | null,
) {
  const database = requireDb(db);
  if (input.sourceId) {
    await requireSource(organizationId, input.sourceId, database);
  }
  const [row] = await database
    .insert(brainIntakeItems)
    .values({
      organizationId,
      kind: input.kind,
      subject: input.subject ?? "",
      payload: input.payload ?? {},
      sourceId: input.sourceId ?? null,
      notes: input.notes ?? "",
    })
    .returning();
  return row;
}

export async function persistCreateObservation(
  organizationId: string,
  input: CreateObservationInput,
  db?: Db | null,
) {
  const database = requireDb(db);
  await requireSource(organizationId, input.sourceId, database);
  if (input.intakeItemId) {
    await requireIntake(organizationId, input.intakeItemId, database);
  }
  if (input.relatedFactId) {
    await requireFact(organizationId, input.relatedFactId, database);
  }
  const [row] = await database
    .insert(brainObservations)
    .values({
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
    })
    .returning();
  return row;
}

export async function persistCreateFact(
  organizationId: string,
  input: CreateFactInput,
  db?: Db | null,
) {
  if (input.status === "VERIFIED") {
    throw new Error("Facts must not be created as VERIFIED; use persistPromoteToVerified.");
  }
  const database = requireDb(db);
  let sourceClass = "";
  if (input.sourceId) {
    const source = await requireSource(organizationId, input.sourceId, database);
    sourceClass = source.sourceClass;
  }
  if (input.offeringId) {
    await requireOffering(organizationId, input.offeringId, database);
  }
  if (input.intakeItemId) {
    await requireIntake(organizationId, input.intakeItemId, database);
  }
  const [row] = await database
    .insert(brainFacts)
    .values({
      organizationId,
      subject: input.subject,
      attribute: input.attribute,
      valueText: input.valueText,
      valueJson: input.valueJson ?? null,
      status: input.status ?? "UNKNOWN",
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
      observedAt: input.observedAt ?? null,
      intakeItemId: input.intakeItemId ?? null,
      notes: input.notes ?? "",
    })
    .returning();
  await appendHistory(database, organizationId, row, "created", "Fact created");
  await recordAudit({
    organizationId,
    action: BRAIN_AUDIT_ACTIONS.factCreated,
    targetType: BRAIN_AUDIT_TARGET_TYPES.fact,
    targetId: row.id,
    metadata: { status: row.status, risk: row.risk, domain: row.domain },
  });
  return row;
}

export async function persistChangeFactStatus(
  organizationId: string,
  factId: string,
  status: FactStatus,
  note: string,
  db?: Db | null,
) {
  if (status === "VERIFIED") {
    throw new Error("Use persistPromoteToVerified; status changes must not silently verify.");
  }
  const database = requireDb(db);
  const fact = await requireFact(organizationId, factId, database);
  await appendHistory(database, organizationId, fact, "status_change", note);
  const [row] = await database
    .update(brainFacts)
    .set({ status, updatedAt: new Date() })
    .where(
      and(eq(brainFacts.id, factId), eq(brainFacts.organizationId, organizationId)),
    )
    .returning();
  await recordAudit({
    organizationId,
    action: BRAIN_AUDIT_ACTIONS.factStatusChanged,
    targetType: BRAIN_AUDIT_TARGET_TYPES.fact,
    targetId: factId,
    metadata: { status, note },
  });
  return row;
}

export async function persistPromoteToVerified(
  organizationId: string,
  factId: string,
  note: string,
  db?: Db | null,
) {
  const database = requireDb(db);
  const fact = await requireFact(organizationId, factId, database);
  const source = fact.sourceId
    ? await requireSource(organizationId, fact.sourceId, database)
    : null;
  const decision = canPromoteToVerified({
    fact: {
      organizationId: fact.organizationId,
      status: fact.status as FactStatus,
      risk: fact.risk as FactRisk,
      domain: fact.domain,
      sourceId: fact.sourceId,
      sourceClass: fact.sourceClass as SourceClass | "",
      coverageLimitation: fact.coverageLimitation,
      freshness: fact.freshness as FreshnessState,
    },
    source: source
      ? {
          id: source.id,
          organizationId: source.organizationId,
          sourceClass: source.sourceClass as SourceClass,
          domain: source.domain,
        }
      : null,
  });
  if (!decision.allowed) {
    throw new Error(decision.reasons.join(" "));
  }
  await appendHistory(database, organizationId, fact, "status_change", note);
  const [row] = await database
    .update(brainFacts)
    .set({
      status: "VERIFIED",
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(brainFacts.id, factId), eq(brainFacts.organizationId, organizationId)),
    )
    .returning();
  await recordAudit({
    organizationId,
    action: BRAIN_AUDIT_ACTIONS.factStatusChanged,
    targetType: BRAIN_AUDIT_TARGET_TYPES.fact,
    targetId: factId,
    metadata: { status: "VERIFIED", note },
  });
  return row;
}

export async function persistCreateContradiction(
  organizationId: string,
  input: {
    summary: string;
    domain?: string;
    members: Array<Omit<BrainContradictionMember, "id" | "organizationId" | "contradictionId">>;
  },
  db?: Db | null,
) {
  const database = requireDb(db);
  for (const member of input.members) {
    if (member.partyType === "fact") {
      await requireFact(organizationId, member.partyId, database);
    } else if (member.partyType === "source") {
      await requireSource(organizationId, member.partyId, database);
    }
  }
  const [row] = await database
    .insert(brainContradictions)
    .values({
      organizationId,
      status: "OPEN",
      summary: input.summary,
      domain: input.domain ?? "",
    })
    .returning();
  if (input.members.length > 0) {
    await database.insert(brainContradictionMembers).values(
      input.members.map((member) => ({
        organizationId,
        contradictionId: row.id,
        partyType: member.partyType,
        partyId: member.partyId,
        role: member.role,
      })),
    );
  }
  await recordAudit({
    organizationId,
    action: BRAIN_AUDIT_ACTIONS.contradictionCreated,
    targetType: BRAIN_AUDIT_TARGET_TYPES.contradiction,
    targetId: row.id,
    metadata: { summary: row.summary },
  });
  return row;
}

export async function persistCreateRelationship(
  organizationId: string,
  input: {
    fromKind: string;
    fromRef: string;
    toKind: string;
    toRef: string;
    relationType: string;
    evidenceFactId?: string | null;
    evidenceObservationId?: string | null;
    status?: string;
    notes?: string;
  },
  db?: Db | null,
) {
  const database = requireDb(db);
  if (input.evidenceFactId) {
    await requireFact(organizationId, input.evidenceFactId, database);
  }
  if (input.evidenceObservationId) {
    const rows = await database
      .select()
      .from(brainObservations)
      .where(
        and(
          eq(brainObservations.id, input.evidenceObservationId),
          eq(brainObservations.organizationId, organizationId),
        ),
      )
      .limit(1);
    await loadOwned(rows, organizationId, "observation");
  }
  const [row] = await database
    .insert(brainRelationships)
    .values({
      organizationId,
      fromKind: input.fromKind,
      fromRef: input.fromRef,
      toKind: input.toKind,
      toRef: input.toRef,
      relationType: input.relationType,
      evidenceFactId: input.evidenceFactId ?? null,
      evidenceObservationId: input.evidenceObservationId ?? null,
      status: input.status ?? "recorded",
      notes: input.notes ?? "",
    })
    .returning();
  return row;
}
