import { and, desc, eq } from "drizzle-orm";

import type { getDb } from "@/lib/db";
import {
  growthActions,
  searchConsoleSnapshots,
  seoAudits,
} from "@/lib/db/schema";
import { persistContentGaps } from "@/lib/growth/persist-content-gaps";
import { persistKeywordHistory } from "@/lib/growth/persist-keywords";
import {
  planSeoGrowthActions,
  type ExistingSeoAction,
  type SeoActionDraft,
} from "@/lib/growth/seo-actions";

type AppDb = NonNullable<ReturnType<typeof getDb>>;

const inflight = new Map<string, Promise<{ inserted: number; backfilled: number }>>();

export async function persistSeoGrowthActions(
  db: AppDb,
  organizationId: string,
): Promise<{ inserted: number; backfilled: number }> {
  const existing = inflight.get(organizationId);
  if (existing) return existing;

  const run = persistSeoGrowthActionsOnce(db, organizationId).finally(() => {
    if (inflight.get(organizationId) === run) inflight.delete(organizationId);
  });
  inflight.set(organizationId, run);
  return run;
}

async function persistSeoGrowthActionsOnce(
  db: AppDb,
  organizationId: string,
): Promise<{ inserted: number; backfilled: number }> {
  const [auditRows, snapshotRows, actionRows] = await Promise.all([
    db
      .select({
        url: seoAudits.url,
        findings: seoAudits.findings,
        builderSiteId: seoAudits.builderSiteId,
        createdAt: seoAudits.createdAt,
      })
      .from(seoAudits)
      .where(eq(seoAudits.organizationId, organizationId))
      .orderBy(desc(seoAudits.createdAt))
      .limit(10),
    db
      .select({
        startDate: searchConsoleSnapshots.startDate,
        endDate: searchConsoleSnapshots.endDate,
        topQueries: searchConsoleSnapshots.topQueries,
      })
      .from(searchConsoleSnapshots)
      .where(eq(searchConsoleSnapshots.organizationId, organizationId))
      .orderBy(desc(searchConsoleSnapshots.createdAt))
      .limit(1),
    db
      .select({
        id: growthActions.id,
        organizationId: growthActions.organizationId,
        actionType: growthActions.actionType,
        module: growthActions.module,
        externalId: growthActions.externalId,
        status: growthActions.status,
        title: growthActions.title,
      })
      .from(growthActions)
      .where(
        and(
          eq(growthActions.organizationId, organizationId),
          eq(growthActions.module, "seo"),
        ),
      ),
  ]);

  const connectedAudits = auditRows.filter((row) => !row.builderSiteId);
  const audits = (connectedAudits.length > 0 ? connectedAudits : auditRows.slice(0, 1)).map(
    (row) => ({
      url: row.url,
      findings: row.findings ?? [],
    }),
  );
  const snapshot = snapshotRows[0] ?? null;
  const existingActions: ExistingSeoAction[] = actionRows;

  const plan = planSeoGrowthActions({
    organizationId,
    audits,
    searchConsole: snapshot
      ? {
          startDate: snapshot.startDate,
          endDate: snapshot.endDate,
          topQueries: snapshot.topQueries ?? [],
        }
      : null,
    existingActions,
  });

  const belowThreshold = plan.skipped.filter((item) => item.reason === "below_threshold").length;
  const duplicates = plan.skipped.filter((item) => item.reason === "duplicate");
  const otherSkips = plan.skipped.filter(
    (item) => item.reason !== "below_threshold" && item.reason !== "duplicate",
  );

  if (belowThreshold > 0) {
    console.info("GroovGro SEO growth action skipped", {
      organizationId,
      reason: "below_threshold",
      count: belowThreshold,
    });
  }
  for (const skip of duplicates) {
    console.info("GroovGro SEO growth action skipped", {
      organizationId,
      reason: "duplicate",
      actionType: skip.actionType,
      kind: skip.kind,
    });
  }
  for (const skip of otherSkips) {
    console.info("GroovGro SEO growth action skipped", {
      organizationId,
      reason: skip.reason,
      actionType: skip.actionType,
      kind: skip.kind,
      impressions: skip.impressions,
      position: skip.position,
    });
  }

  let inserted = 0;
  let backfilled = 0;
  for (const item of plan.toBackfill) {
    if (item.draft.organizationId !== organizationId) continue;
    try {
      await db
        .update(growthActions)
        .set({
          title: item.draft.title,
          evidence: item.draft.evidence,
          confidence: item.draft.confidence,
          expectedImpact: item.draft.expectedImpact,
          priority: item.draft.priority,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(growthActions.id, item.id),
            eq(growthActions.organizationId, organizationId),
          ),
        );
      backfilled += 1;
      console.info("GroovGro SEO growth action evidence backfilled", {
        organizationId,
        actionType: item.draft.actionType,
      });
    } catch (error) {
      console.error("GroovGro SEO growth action persist failed", {
        organizationId,
        actionType: item.draft.actionType,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }
  for (const draft of plan.toInsert) {
    if (draft.organizationId !== organizationId) {
      console.info("GroovGro SEO growth action skipped", {
        organizationId,
        reason: "tenant_mismatch",
        actionType: draft.actionType,
      });
      continue;
    }
    try {
      await insertProposedSeoAction(db, organizationId, draft);
      inserted += 1;
      console.info("GroovGro SEO growth action created", {
        organizationId,
        actionType: draft.actionType,
        provider: draft.provider,
        kind: draft.externalId.split(":")[1] ?? draft.actionType,
      });
    } catch (error) {
      console.error("GroovGro SEO growth action persist failed", {
        organizationId,
        actionType: draft.actionType,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  try {
    await persistKeywordHistory(db, organizationId);
  } catch (error) {
    console.error("GroovGro keyword history persist failed", {
      organizationId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  try {
    await persistContentGaps(db, organizationId);
  } catch (error) {
    console.error("GroovGro content gap persist failed", {
      organizationId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return { inserted, backfilled };
}

async function insertProposedSeoAction(
  db: AppDb,
  organizationId: string,
  draft: SeoActionDraft,
) {
  await db.insert(growthActions).values({
    organizationId,
    module: draft.module,
    actionType: draft.actionType,
    title: draft.title,
    description: draft.description,
    evidence: draft.evidence,
    confidence: draft.confidence,
    expectedImpact: draft.expectedImpact,
    priority: draft.priority,
    status: "proposed",
    risk: draft.risk,
    provider: draft.provider,
    externalId: draft.externalId,
  });
}
