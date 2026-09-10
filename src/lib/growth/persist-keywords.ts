import { and, desc, eq, sql } from "drizzle-orm";

import type { getDb } from "@/lib/db";
import { keywordHistory, keywords, searchConsoleSnapshots } from "@/lib/db/schema";
import {
  planKeywordHistory,
  type ExistingKeywordHistoryRow,
  type KeywordWithHistory,
} from "@/lib/growth/keywords";
import {
  compareKeywordScores,
  scoreKeywordOpportunity,
  type KeywordScoreLabel,
} from "@/lib/growth/keyword-score";

type AppDb = NonNullable<ReturnType<typeof getDb>>;

const inflight = new Map<string, Promise<{ keywords: number; history: number }>>();

export async function persistKeywordHistory(
  db: AppDb,
  organizationId: string,
): Promise<{ keywords: number; history: number }> {
  const existing = inflight.get(organizationId);
  if (existing) return existing;

  const run = persistKeywordHistoryOnce(db, organizationId).finally(() => {
    if (inflight.get(organizationId) === run) inflight.delete(organizationId);
  });
  inflight.set(organizationId, run);
  return run;
}

async function persistKeywordHistoryOnce(
  db: AppDb,
  organizationId: string,
): Promise<{ keywords: number; history: number }> {
  const [snapshotRows, keywordRows] = await Promise.all([
    db
      .select({
        id: searchConsoleSnapshots.id,
        organizationId: searchConsoleSnapshots.organizationId,
        propertyUrl: searchConsoleSnapshots.propertyUrl,
        startDate: searchConsoleSnapshots.startDate,
        endDate: searchConsoleSnapshots.endDate,
        createdAt: searchConsoleSnapshots.createdAt,
        topQueries: searchConsoleSnapshots.topQueries,
      })
      .from(searchConsoleSnapshots)
      .where(eq(searchConsoleSnapshots.organizationId, organizationId))
      .orderBy(desc(searchConsoleSnapshots.createdAt))
      .limit(8),
    db
      .select({
        id: keywords.id,
        queryKey: keywords.queryKey,
      })
      .from(keywords)
      .where(eq(keywords.organizationId, organizationId)),
  ]);

  const historyRows =
    keywordRows.length === 0
      ? []
      : await db
          .select({
            queryKey: keywords.queryKey,
            snapshotId: keywordHistory.snapshotId,
            organizationId: keywordHistory.organizationId,
          })
          .from(keywordHistory)
          .innerJoin(keywords, eq(keywordHistory.keywordId, keywords.id))
          .where(eq(keywordHistory.organizationId, organizationId));

  const existingHistory: ExistingKeywordHistoryRow[] = historyRows.map((row) => ({
    organizationId: row.organizationId,
    queryKey: row.queryKey,
    snapshotId: row.snapshotId,
  }));

  const plan = planKeywordHistory({
    organizationId,
    snapshots: snapshotRows,
    existingHistory,
  });

  const now = new Date();
  let upserted = 0;
  for (const draft of plan.keywordsToUpsert) {
    if (draft.organizationId !== organizationId) continue;
    await db
      .insert(keywords)
      .values({
        organizationId,
        queryKey: draft.queryKey,
        query: draft.query,
        source: draft.source,
        firstSeenAt: draft.firstSeenAt,
        lastSeenAt: draft.lastSeenAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [keywords.organizationId, keywords.queryKey],
        set: {
          query: draft.query,
          firstSeenAt: sql`least(${keywords.firstSeenAt}, ${draft.firstSeenAt})`,
          lastSeenAt: sql`greatest(${keywords.lastSeenAt}, ${draft.lastSeenAt})`,
          updatedAt: now,
        },
      });
    upserted += 1;
  }

  const storedKeywords = await db
    .select({
      id: keywords.id,
      queryKey: keywords.queryKey,
    })
    .from(keywords)
    .where(eq(keywords.organizationId, organizationId));
  const keywordIds = new Map(storedKeywords.map((row) => [row.queryKey, row.id]));

  let insertedHistory = 0;
  for (const draft of plan.historyToInsert) {
    if (draft.organizationId !== organizationId) continue;
    const keywordId = keywordIds.get(draft.queryKey);
    if (!keywordId) continue;
    await db
      .insert(keywordHistory)
      .values({
        organizationId,
        keywordId,
        snapshotId: draft.snapshotId,
        propertyUrl: draft.propertyUrl,
        startDate: draft.startDate,
        endDate: draft.endDate,
        clicks: draft.clicks,
        impressions: draft.impressions,
        ctr: draft.ctr,
        position: draft.position,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [keywordHistory.keywordId, keywordHistory.snapshotId],
      });
    insertedHistory += 1;
  }

  await persistKeywordScores(db, organizationId, now);

  return { keywords: upserted, history: insertedHistory };
}

async function persistKeywordScores(
  db: AppDb,
  organizationId: string,
  now: Date,
) {
  const [keywordRows, historyRows] = await Promise.all([
    db
      .select({
        id: keywords.id,
        organizationId: keywords.organizationId,
      })
      .from(keywords)
      .where(eq(keywords.organizationId, organizationId)),
    db
      .select({
        keywordId: keywordHistory.keywordId,
        startDate: keywordHistory.startDate,
        endDate: keywordHistory.endDate,
        clicks: keywordHistory.clicks,
        impressions: keywordHistory.impressions,
        ctr: keywordHistory.ctr,
        position: keywordHistory.position,
        organizationId: keywordHistory.organizationId,
      })
      .from(keywordHistory)
      .where(eq(keywordHistory.organizationId, organizationId)),
  ]);

  const pointsByKeyword = new Map<string, KeywordWithHistory["points"]>();
  for (const row of historyRows) {
    if (row.organizationId !== organizationId) continue;
    const list = pointsByKeyword.get(row.keywordId) ?? [];
    list.push({
      startDate: row.startDate,
      endDate: row.endDate,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    });
    pointsByKeyword.set(row.keywordId, list);
  }

  for (const row of keywordRows) {
    if (row.organizationId !== organizationId) continue;
    const scored = scoreKeywordOpportunity(pointsByKeyword.get(row.id) ?? []);
    await db
      .update(keywords)
      .set({
        opportunityScore: scored.score,
        opportunityLabel: scored.label,
        opportunityWhy: scored.why,
        scoredAt: now,
        updatedAt: now,
      })
      .where(
        and(eq(keywords.id, row.id), eq(keywords.organizationId, organizationId)),
      );
  }
}

export async function getKeywordHistory(
  db: AppDb,
  organizationId: string,
) {
  const [keywordRows, historyRows] = await Promise.all([
    db
      .select({
        id: keywords.id,
        query: keywords.query,
        queryKey: keywords.queryKey,
        source: keywords.source,
        firstSeenAt: keywords.firstSeenAt,
        lastSeenAt: keywords.lastSeenAt,
        opportunityScore: keywords.opportunityScore,
        opportunityLabel: keywords.opportunityLabel,
        opportunityWhy: keywords.opportunityWhy,
      })
      .from(keywords)
      .where(eq(keywords.organizationId, organizationId))
      .orderBy(desc(keywords.lastSeenAt)),
    db
      .select({
        keywordId: keywordHistory.keywordId,
        startDate: keywordHistory.startDate,
        endDate: keywordHistory.endDate,
        clicks: keywordHistory.clicks,
        impressions: keywordHistory.impressions,
        ctr: keywordHistory.ctr,
        position: keywordHistory.position,
      })
      .from(keywordHistory)
      .where(eq(keywordHistory.organizationId, organizationId)),
  ]);

  const pointsByKeyword = new Map<
    string,
    {
      startDate: string
      endDate: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }[]
  >();
  for (const row of historyRows) {
    const list = pointsByKeyword.get(row.keywordId) ?? [];
    list.push({
      startDate: row.startDate,
      endDate: row.endDate,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    });
    pointsByKeyword.set(row.keywordId, list);
  }

  return keywordRows
    .map((row) => {
      const points = (pointsByKeyword.get(row.id) ?? []).sort((a, b) =>
        a.endDate.localeCompare(b.endDate),
      );
      const label = asKeywordScoreLabel(row.opportunityLabel);
      return {
        query: row.query,
        queryKey: row.queryKey,
        source: row.source,
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        opportunityScore: row.opportunityScore,
        opportunityLabel: label,
        opportunityWhy: row.opportunityWhy,
        points,
      };
    })
    .sort((left, right) =>
      compareKeywordScores(
        {
          label: left.opportunityLabel,
          score: left.opportunityScore,
          impressions: left.points.at(-1)?.impressions ?? 0,
        },
        {
          label: right.opportunityLabel,
          score: right.opportunityScore,
          impressions: right.points.at(-1)?.impressions ?? 0,
        },
      ),
    );
}

function asKeywordScoreLabel(value: string | null | undefined): KeywordScoreLabel {
  if (value === "review" || value === "watch" || value === "none") return value;
  return "none";
}
