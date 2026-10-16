import { eq } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import {
  brainContradictions,
  brainContradictionMembers,
  brainFactHistory,
  brainFacts,
  brainObservations,
  brainRelationships,
  brainSources,
  businessBrains,
} from "@/lib/db/schema";
import { assertSameOrganization } from "@/lib/db/tenant";

import { BRAIN_AUDIT_ACTIONS, BRAIN_AUDIT_TARGET_TYPES } from "./audit";
import type { FactUseDecision } from "./types";
import { isMaterialGateDecision } from "./gate";
import type { LegacyBusinessBrain } from "./compatibility";

function requireDb() {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  return db;
}

export async function listBrainFacts(organizationId: string) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(brainFacts)
    .where(eq(brainFacts.organizationId, organizationId));
  for (const row of rows) {
    assertSameOrganization(row.organizationId, organizationId);
  }
  return rows;
}

export async function getBrainFact(organizationId: string, factId: string) {
  const db = requireDb();
  const [row] = await db
    .select()
    .from(brainFacts)
    .where(eq(brainFacts.id, factId))
    .limit(1);
  if (!row) return null;
  assertSameOrganization(row.organizationId, organizationId);
  return row;
}

export async function listBrainObservations(organizationId: string) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(brainObservations)
    .where(eq(brainObservations.organizationId, organizationId));
  for (const row of rows) {
    assertSameOrganization(row.organizationId, organizationId);
  }
  return rows;
}

export async function listBrainSources(organizationId: string) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(brainSources)
    .where(eq(brainSources.organizationId, organizationId));
  for (const row of rows) {
    assertSameOrganization(row.organizationId, organizationId);
  }
  return rows;
}

export async function listBrainContradictions(organizationId: string) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(brainContradictions)
    .where(eq(brainContradictions.organizationId, organizationId));
  for (const row of rows) {
    assertSameOrganization(row.organizationId, organizationId);
  }
  return rows;
}

export async function listBrainContradictionMembers(organizationId: string) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(brainContradictionMembers)
    .where(eq(brainContradictionMembers.organizationId, organizationId));
  for (const row of rows) {
    assertSameOrganization(row.organizationId, organizationId);
  }
  return rows;
}

export async function listBrainRelationships(organizationId: string) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(brainRelationships)
    .where(eq(brainRelationships.organizationId, organizationId));
  for (const row of rows) {
    assertSameOrganization(row.organizationId, organizationId);
  }
  return rows;
}

export async function listBrainFactHistory(organizationId: string, factId: string) {
  const db = requireDb();
  const rows = await db
    .select()
    .from(brainFactHistory)
    .where(eq(brainFactHistory.factId, factId));
  for (const row of rows) {
    assertSameOrganization(row.organizationId, organizationId);
  }
  return rows;
}

export async function readLegacyBusinessBrain(
  organizationId: string,
): Promise<LegacyBusinessBrain | null> {
  const db = requireDb();
  const [row] = await db
    .select()
    .from(businessBrains)
    .where(eq(businessBrains.organizationId, organizationId))
    .limit(1);
  if (!row) return null;
  assertSameOrganization(row.organizationId, organizationId);
  return row;
}

export async function recordMaterialFactUseGateDecision(input: {
  organizationId: string;
  factId: string;
  decision: FactUseDecision;
}): Promise<void> {
  if (!isMaterialGateDecision(input.decision)) return;
  await recordAudit({
    organizationId: input.organizationId,
    action: BRAIN_AUDIT_ACTIONS.factUseGateMaterial,
    targetType: BRAIN_AUDIT_TARGET_TYPES.gate,
    targetId: input.factId,
    metadata: {
      intendedUse: input.decision.intendedUse,
      allowed: input.decision.allowed,
      withheld: input.decision.withheld,
      reasons: input.decision.reasons,
      grantsExternalAction: false,
    },
  });
}
