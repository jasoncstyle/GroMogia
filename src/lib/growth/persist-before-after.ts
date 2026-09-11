import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  beforeAfterLooks,
  goalProgressSnapshots,
  growthGoals,
} from "@/lib/db/schema";
import {
  BEFORE_AFTER_SOURCE_STORED_GOAL,
  isBeforeAfterStatus,
  looksToShow,
  planBeforeAfterLooks,
  type BeforeAfterView,
} from "@/lib/growth/before-after";

type AppDb = NonNullable<ReturnType<typeof getDb>>;

const inflight = new Map<string, Promise<BeforeAfterView[]>>();

export async function refreshBeforeAfterLooks(
  organizationId: string,
): Promise<BeforeAfterView[]> {
  if (!organizationId) return [];
  const existing = inflight.get(organizationId);
  if (existing) return existing;

  const run = refreshBeforeAfterLooksOnce(organizationId).finally(() => {
    if (inflight.get(organizationId) === run) inflight.delete(organizationId);
  });
  inflight.set(organizationId, run);
  return run;
}

export async function persistBeforeAfterLooks(
  db: AppDb,
  organizationId: string,
): Promise<{ upserted: number }> {
  if (!organizationId) return { upserted: 0 };
  const [goalRows, snapshotRows] = await Promise.all([
    db
      .select({
        id: growthGoals.id,
        title: growthGoals.title,
        unit: growthGoals.unit,
        organizationId: growthGoals.organizationId,
      })
      .from(growthGoals)
      .where(eq(growthGoals.organizationId, organizationId)),
    db
      .select({
        id: goalProgressSnapshots.id,
        goalId: goalProgressSnapshots.goalId,
        value: goalProgressSnapshots.value,
        recordedOn: goalProgressSnapshots.recordedOn,
        recordedAt: goalProgressSnapshots.recordedAt,
        organizationId: goalProgressSnapshots.organizationId,
      })
      .from(goalProgressSnapshots)
      .where(eq(goalProgressSnapshots.organizationId, organizationId))
      .orderBy(desc(goalProgressSnapshots.recordedAt)),
  ]);

  const plan = planBeforeAfterLooks({
    organizationId,
    goals: goalRows.filter((row) => row.organizationId === organizationId),
    snapshots: snapshotRows.filter((row) => row.organizationId === organizationId),
  });

  const now = new Date();
  let upserted = 0;
  for (const draft of plan.toUpsert) {
    if (draft.organizationId !== organizationId) continue;
    await db
      .insert(beforeAfterLooks)
      .values({
        organizationId,
        goalId: draft.goalId,
        title: draft.title,
        beforeValue: draft.beforeValue,
        afterValue: draft.afterValue,
        unit: draft.unit,
        beforeOn: draft.beforeOn,
        afterOn: draft.afterOn,
        beforeSnapshotId: draft.beforeSnapshotId,
        afterSnapshotId: draft.afterSnapshotId,
        status: draft.status,
        why: draft.why,
        source: draft.source,
        comparedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [beforeAfterLooks.organizationId, beforeAfterLooks.goalId],
        set: {
          title: draft.title,
          beforeValue: draft.beforeValue,
          afterValue: draft.afterValue,
          unit: draft.unit,
          beforeOn: draft.beforeOn,
          afterOn: draft.afterOn,
          beforeSnapshotId: draft.beforeSnapshotId,
          afterSnapshotId: draft.afterSnapshotId,
          status: draft.status,
          why: draft.why,
          source: draft.source,
          comparedAt: now,
          updatedAt: now,
        },
      });
    upserted += 1;
  }
  return { upserted };
}

export async function getBeforeAfterLooks(
  organizationId: string,
): Promise<BeforeAfterView[]> {
  const db = getDb();
  if (!db || !organizationId) return [];
  const rows = await db
    .select({
      goalId: beforeAfterLooks.goalId,
      title: beforeAfterLooks.title,
      beforeValue: beforeAfterLooks.beforeValue,
      afterValue: beforeAfterLooks.afterValue,
      unit: beforeAfterLooks.unit,
      beforeOn: beforeAfterLooks.beforeOn,
      afterOn: beforeAfterLooks.afterOn,
      beforeSnapshotId: beforeAfterLooks.beforeSnapshotId,
      afterSnapshotId: beforeAfterLooks.afterSnapshotId,
      status: beforeAfterLooks.status,
      why: beforeAfterLooks.why,
      source: beforeAfterLooks.source,
      organizationId: beforeAfterLooks.organizationId,
    })
    .from(beforeAfterLooks)
    .where(eq(beforeAfterLooks.organizationId, organizationId))
    .orderBy(desc(beforeAfterLooks.comparedAt));

  return looksToShow(
    rows.flatMap((row) => {
      if (
        row.organizationId !== organizationId ||
        !isBeforeAfterStatus(row.status)
      ) {
        return [];
      }
      return [
        {
          organizationId,
          goalId: row.goalId,
          title: row.title,
          beforeValue: row.beforeValue,
          afterValue: row.afterValue,
          unit: row.unit,
          beforeOn: row.beforeOn,
          afterOn: row.afterOn,
          beforeSnapshotId: row.beforeSnapshotId ?? "",
          afterSnapshotId: row.afterSnapshotId ?? "",
          status: row.status,
          why: row.why,
          source: BEFORE_AFTER_SOURCE_STORED_GOAL,
        },
      ];
    }),
  );
}

async function refreshBeforeAfterLooksOnce(
  organizationId: string,
): Promise<BeforeAfterView[]> {
  const db = getDb();
  if (db) {
    await persistBeforeAfterLooks(db, organizationId);
  }
  return getBeforeAfterLooks(organizationId);
}
