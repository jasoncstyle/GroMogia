import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  channelScores,
  contentBriefs,
  contentDrafts,
  contentGaps,
  geoAudits,
  growthActions,
  keywords,
  leadRecords,
  leadStages,
} from "@/lib/db/schema";
import {
  CHANNEL_SCORE_SOURCE_STORED,
  channelScoreFactsFromCounts,
  channelTitle,
  isChannelId,
  isChannelScoreLabel,
  planChannelScores,
  scoresToShow,
  type ChannelScoreFacts,
  type ChannelScoreView,
} from "@/lib/growth/channel-score";
import { CONTENT_GAP_STATUS_GAP } from "@/lib/growth/content-gaps";
import { isWaitingActionStatus } from "@/lib/growth/next-step";
import { isSeoGrowthActionType } from "@/lib/growth/seo-actions";
import { GEO_AUDIT_STATUS_GAP } from "@/lib/geo/audits";

type AppDb = NonNullable<ReturnType<typeof getDb>>;

const inflight = new Map<string, Promise<ChannelScoreView[]>>();

export async function refreshChannelScores(
  organizationId: string,
): Promise<ChannelScoreView[]> {
  if (!organizationId) return [];
  const existing = inflight.get(organizationId);
  if (existing) return existing;

  const run = refreshChannelScoresOnce(organizationId).finally(() => {
    if (inflight.get(organizationId) === run) inflight.delete(organizationId);
  });
  inflight.set(organizationId, run);
  return run;
}

export async function persistChannelScores(
  db: AppDb,
  organizationId: string,
  facts: ChannelScoreFacts,
): Promise<{ upserted: number }> {
  if (!organizationId) return { upserted: 0 };
  const plan = planChannelScores({ organizationId, facts });
  const now = new Date();
  let upserted = 0;
  for (const draft of plan.toUpsert) {
    if (draft.organizationId !== organizationId) continue;
    await db
      .insert(channelScores)
      .values({
        organizationId,
        channel: draft.channel,
        label: draft.label,
        score: draft.score,
        evidenceCount: draft.evidenceCount,
        why: draft.why,
        source: draft.source,
        computedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [channelScores.organizationId, channelScores.channel],
        set: {
          label: draft.label,
          score: draft.score,
          evidenceCount: draft.evidenceCount,
          why: draft.why,
          source: draft.source,
          computedAt: now,
          updatedAt: now,
        },
      });
    upserted += 1;
  }
  return { upserted };
}

export async function getStoredChannelScores(
  organizationId: string,
): Promise<ChannelScoreView[]> {
  const db = getDb();
  if (!db || !organizationId) return [];
  const rows = await db
    .select({
      channel: channelScores.channel,
      label: channelScores.label,
      score: channelScores.score,
      evidenceCount: channelScores.evidenceCount,
      why: channelScores.why,
      source: channelScores.source,
      organizationId: channelScores.organizationId,
    })
    .from(channelScores)
    .where(eq(channelScores.organizationId, organizationId))
    .orderBy(desc(channelScores.score));

  return scoresToShow(
    rows.flatMap((row) => {
      if (
        row.organizationId !== organizationId ||
        !isChannelId(row.channel) ||
        !isChannelScoreLabel(row.label)
      ) {
        return [];
      }
      return [
        {
          channel: row.channel,
          title: channelTitle(row.channel),
          label: row.label,
          score: row.score,
          evidenceCount: row.evidenceCount,
          why: row.why,
          source: CHANNEL_SCORE_SOURCE_STORED,
          confidence: "inferred" as const,
        },
      ];
    }),
  );
}

async function refreshChannelScoresOnce(
  organizationId: string,
): Promise<ChannelScoreView[]> {
  const facts = await loadChannelScoreFacts(organizationId);
  const plan = planChannelScores({ organizationId, facts });
  const db = getDb();
  if (db) {
    await persistChannelScores(db, organizationId, facts);
  }
  return scoresToShow(plan.toUpsert);
}

export async function loadChannelScoreFacts(
  organizationId: string,
): Promise<ChannelScoreFacts> {
  if (!organizationId) return channelScoreFactsFromCounts({});
  const db = getDb();
  if (!db) return channelScoreFactsFromCounts({});

  const [
    openLeadCount,
    proposedSeoActionCount,
    keywordReviewCount,
    contentGapCount,
    contentBriefCount,
    contentDraftCount,
    geoAuditGapCount,
  ] = await Promise.all([
    countOpenLeads(db, organizationId),
    countProposedSeoActions(db, organizationId),
    countKeywordReviews(db, organizationId),
    countRows(
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(contentGaps)
        .where(
          and(
            eq(contentGaps.organizationId, organizationId),
            eq(contentGaps.status, CONTENT_GAP_STATUS_GAP),
          ),
        ),
    ),
    countRows(
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(contentBriefs)
        .where(eq(contentBriefs.organizationId, organizationId)),
    ),
    countRows(
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(contentDrafts)
        .where(eq(contentDrafts.organizationId, organizationId)),
    ),
    countRows(
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(geoAudits)
        .where(
          and(
            eq(geoAudits.organizationId, organizationId),
            eq(geoAudits.status, GEO_AUDIT_STATUS_GAP),
          ),
        ),
    ),
  ]);

  return channelScoreFactsFromCounts({
    openLeadCount,
    proposedSeoActionCount,
    keywordReviewCount,
    contentGapCount,
    contentBriefCount,
    contentDraftCount,
    geoAuditGapCount,
  });
}

async function countOpenLeads(db: AppDb, organizationId: string): Promise<number> {
  const openStages = await db
    .select({ id: leadStages.id })
    .from(leadStages)
    .where(
      and(
        eq(leadStages.organizationId, organizationId),
        eq(leadStages.isWon, false),
        eq(leadStages.isLost, false),
      ),
    );
  const openStageIds = openStages.map((stage) => stage.id);
  if (openStageIds.length === 0) return 0;
  return countRows(
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(leadRecords)
      .where(
        and(
          eq(leadRecords.organizationId, organizationId),
          inArray(leadRecords.stageId, openStageIds),
        ),
      ),
  );
}

async function countProposedSeoActions(
  db: AppDb,
  organizationId: string,
): Promise<number> {
  const rows = await db
    .select({
      actionType: growthActions.actionType,
      status: growthActions.status,
      organizationId: growthActions.organizationId,
      module: growthActions.module,
    })
    .from(growthActions)
    .where(eq(growthActions.organizationId, organizationId));
  return rows.filter(
    (row) =>
      row.organizationId === organizationId &&
      row.module === "seo" &&
      isSeoGrowthActionType(row.actionType) &&
      isWaitingActionStatus(row.status),
  ).length;
}

async function countKeywordReviews(
  db: AppDb,
  organizationId: string,
): Promise<number> {
  const rows = await db
    .select({
      opportunityLabel: keywords.opportunityLabel,
      organizationId: keywords.organizationId,
    })
    .from(keywords)
    .where(eq(keywords.organizationId, organizationId));
  return rows.filter(
    (row) =>
      row.organizationId === organizationId && row.opportunityLabel === "review",
  ).length;
}

async function countRows(
  query: Promise<{ value: number }[]>,
): Promise<number> {
  const [row] = await query;
  return Number(row?.value ?? 0);
}
