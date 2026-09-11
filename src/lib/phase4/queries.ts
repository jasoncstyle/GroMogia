import { and, desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  aiActionLogs,
  cmsPublishRequests,
  contentBriefs,
  contentDrafts,
  contentGaps,
  geoAudits,
  geoHistory,
  geoNotes,
  geoQueries,
  internalLinkSuggestions,
  keywords,
  pageSchemaFacts,
  payments,
  serpNotes,
} from "@/lib/db/schema";
import {
  channelScoreFactsFromCounts,
  channelsWithEvidence,
  scoreGrowthChannels,
  scoresToShow,
  type ChannelScoreView,
} from "@/lib/growth/channel-score";
import {
  getBeforeAfterLooks,
  refreshBeforeAfterLooks,
} from "@/lib/growth/persist-before-after";
import {
  persistChannelScores,
  refreshChannelScores,
} from "@/lib/growth/persist-channel-scores";
import {
  brainSeoContextCounts,
  brainSeoContextSaved,
} from "@/lib/growth/brain-context";
import { GEO_AUDIT_STATUS_GAP } from "@/lib/geo/audits";
import { CONTENT_GAP_STATUS_GAP } from "@/lib/growth/content-gaps";
import { isDefaultSchemaType } from "@/lib/growth/page-structure";
import {
  buildIntelligenceBrief,
  type IntelligenceBrief,
  type IntelligenceFacts,
} from "@/lib/intelligence/observe";
import { isWaitingActionStatus } from "@/lib/growth/next-step";
import { isSeoGrowthActionType } from "@/lib/growth/seo-actions";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
import { getMarketingSnapshot } from "@/lib/phase3/queries";

export async function getIntelligenceFacts(
  organizationId: string,
  options: { showFinancials: boolean },
): Promise<IntelligenceFacts> {
  const [dashboard, marketing, charges, growth] = await Promise.all([
    getDashboardSnapshot(organizationId),
    getMarketingSnapshot(organizationId),
    countChargesThisMonth(organizationId),
    getGrowthSnapshot(organizationId),
  ]);
  const [
    keywordCounts,
    serpNoteCount,
    contentGapCount,
    contentBriefCount,
    contentDraftCount,
    cmsPublishRequestCount,
    pageStructureCounts,
    geoNoteCount,
    geoQueryCount,
    geoHistoryCount,
    geoAuditGapCount,
  ] = await Promise.all([
    countRecordedKeywords(organizationId),
    countSerpNotes(organizationId),
    countContentGaps(organizationId),
    countContentBriefs(organizationId),
    countContentDrafts(organizationId),
    countCmsPublishRequests(organizationId),
    countPageStructure(organizationId),
    countGeoNotes(organizationId),
    countGeoQueries(organizationId),
    countGeoHistory(organizationId),
    countGeoAuditGaps(organizationId),
  ]);

  const activeGoal = (growth?.activeGoals ?? []).find((goal) => goal.shareNote);
  const proposedSeo = (growth?.actions ?? []).filter(
    (action) =>
      action.module === "seo" &&
      isSeoGrowthActionType(action.actionType) &&
      isWaitingActionStatus(action.status),
  );
  const seoExample =
    proposedSeo[0]?.title?.trim() ||
    (proposedSeo[0]?.description ?? "")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && line !== "GroovGro found an opportunity worth reviewing.");

  const channelFacts = channelScoreFactsFromCounts({
    openLeadCount: dashboard.openLeadCount,
    proposedSeoActionCount: proposedSeo.length,
    keywordReviewCount: keywordCounts.review,
    contentGapCount,
    contentBriefCount,
    contentDraftCount,
    geoAuditGapCount,
  });
  const channelScores = scoresToShow(scoreGrowthChannels(channelFacts));
  const db = getDb();
  if (db) {
    await persistChannelScores(db, organizationId, channelFacts);
  }

  return {
    websiteConnected: Boolean(dashboard.website?.publicUrl),
    stripeConnected: dashboard.stripeConnected,
    openLeadCount: dashboard.openLeadCount,
    customerCount: dashboard.customerCount,
    contactCount: dashboard.contactCount,
    paymentTotalCents: options.showFinancials ? dashboard.paymentTotalCents : 0,
    chargeCountThisMonth: charges,
    unattributedRevenueCents: options.showFinancials
      ? marketing.unattributedRevenueCents
      : 0,
    upcomingEventCount: dashboard.upcomingEvents.filter((event) => {
      if (!event.startsAt) return false;
      return event.startsAt.getTime() >= Date.now();
    }).length,
    sources: marketing.rows,
    showFinancials: options.showFinancials,
    activeGoalShare: activeGoal
      ? {
          title: activeGoal.title,
          note: activeGoal.shareNote,
          rows: activeGoal.shareRows,
        }
      : null,
    proposedSeoActionCount: proposedSeo.length,
    proposedSeoSummary: seoExample ?? "",
    businessBrainSaved: Boolean(
      growth?.brain?.industry?.trim() && growth?.brain?.businessModel?.trim(),
    ),
    businessContextSaved: brainSeoContextSaved(growth?.brain ?? null),
    recordedKeywordCount: keywordCounts.total,
    keywordReviewCount: keywordCounts.review,
    serpNoteCount,
    knownCompetitorCount: brainSeoContextCounts(growth?.brain ?? null).competitors,
    contentGapCount,
    contentBriefCount,
    contentDraftCount,
    cmsPublishRequestCount,
    internalLinkCount: pageStructureCounts.links,
    schemaFactCount: pageStructureCounts.facts,
    schemaReviewCount: pageStructureCounts.review,
    geoNoteCount,
    geoQueryCount,
    geoHistoryCount,
    geoAuditGapCount,
    channelCompareCount: channelsWithEvidence(channelScores).length,
    attributionDirectCount: marketing.labelCounts?.direct ?? 0,
    attributionAssistedCount: marketing.labelCounts?.assisted ?? 0,
    attributionEstimatedCount: marketing.labelCounts?.estimated ?? 0,
    attributionUnknownCount: marketing.labelCounts?.unknown ?? 0,
    beforeAfterLookCount: (await refreshBeforeAfterLooks(organizationId)).length,
  };
}

export async function getChannelScoreViews(
  organizationId: string,
): Promise<ChannelScoreView[]> {
  return refreshChannelScores(organizationId);
}

async function countRecordedKeywords(organizationId: string): Promise<{
  total: number
  review: number
}> {
  const db = getDb();
  if (!db) return { total: 0, review: 0 };
  const rows = await db
    .select({
      id: keywords.id,
      opportunityLabel: keywords.opportunityLabel,
    })
    .from(keywords)
    .where(eq(keywords.organizationId, organizationId));
  return {
    total: rows.length,
    review: rows.filter((row) => row.opportunityLabel === "review").length,
  };
}

async function countGeoQueries(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(geoQueries)
    .where(eq(geoQueries.organizationId, organizationId));
  return Number(row?.value ?? 0);
}

async function countGeoHistory(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(geoHistory)
    .where(eq(geoHistory.organizationId, organizationId));
  return Number(row?.value ?? 0);
}

async function countGeoAuditGaps(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(geoAudits)
    .where(
      and(
        eq(geoAudits.organizationId, organizationId),
        eq(geoAudits.status, GEO_AUDIT_STATUS_GAP),
      ),
    );
  return Number(row?.value ?? 0);
}

async function countGeoNotes(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(geoNotes)
    .where(eq(geoNotes.organizationId, organizationId));
  return Number(row?.value ?? 0);
}

async function countSerpNotes(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(serpNotes)
    .where(eq(serpNotes.organizationId, organizationId));
  return Number(row?.value ?? 0);
}

async function countContentGaps(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(contentGaps)
    .where(
      and(
        eq(contentGaps.organizationId, organizationId),
        eq(contentGaps.status, CONTENT_GAP_STATUS_GAP),
      ),
    );
  return Number(row?.value ?? 0);
}

async function countContentBriefs(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(contentBriefs)
    .where(eq(contentBriefs.organizationId, organizationId));
  return Number(row?.value ?? 0);
}

async function countContentDrafts(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(contentDrafts)
    .where(eq(contentDrafts.organizationId, organizationId));
  return Number(row?.value ?? 0);
}

async function countCmsPublishRequests(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(cmsPublishRequests)
    .where(eq(cmsPublishRequests.organizationId, organizationId));
  return Number(row?.value ?? 0);
}

async function countPageStructure(organizationId: string): Promise<{
  links: number
  facts: number
  review: number
}> {
  const db = getDb();
  if (!db) return { links: 0, facts: 0, review: 0 };
  const [linkRow, factRows] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(internalLinkSuggestions)
      .where(eq(internalLinkSuggestions.organizationId, organizationId)),
    db
      .select({
        schemaType: pageSchemaFacts.schemaType,
        organizationId: pageSchemaFacts.organizationId,
      })
      .from(pageSchemaFacts)
      .where(eq(pageSchemaFacts.organizationId, organizationId)),
  ]);
  const facts = factRows.filter((row) => row.organizationId === organizationId);
  return {
    links: Number(linkRow[0]?.value ?? 0),
    facts: facts.length,
    review: facts.filter((row) => !isDefaultSchemaType(row.schemaType)).length,
  };
}

export async function getIntelligencePageData(
  organizationId: string,
  options: { showFinancials: boolean },
) {
  const facts = await getIntelligenceFacts(organizationId, options);
  const brief = buildIntelligenceBrief(facts);
  const logs = await getRecentInsightLogs(organizationId);
  const channelScores = scoresToShow(
    scoreGrowthChannels(
      channelScoreFactsFromCounts({
        openLeadCount: facts.openLeadCount,
        proposedSeoActionCount: facts.proposedSeoActionCount,
        keywordReviewCount: facts.keywordReviewCount,
        contentGapCount: facts.contentGapCount,
        contentBriefCount: facts.contentBriefCount,
        contentDraftCount: facts.contentDraftCount,
        geoAuditGapCount: facts.geoAuditGapCount,
      }),
    ),
  );
  const beforeAfterLooks = await getBeforeAfterLooks(organizationId);
  return { facts, brief, logs, channelScores, beforeAfterLooks };
}

export async function getRecentInsightLogs(organizationId: string) {
  const db = getDb();
  if (!db) return [] as { id: string; createdAt: Date; output: string; status: string }[];

  return db
    .select({
      id: aiActionLogs.id,
      createdAt: aiActionLogs.createdAt,
      output: aiActionLogs.output,
      status: aiActionLogs.status,
    })
    .from(aiActionLogs)
    .where(eq(aiActionLogs.organizationId, organizationId))
    .orderBy(desc(aiActionLogs.createdAt))
    .limit(5);
}

export function parseStoredBrief(output: string): IntelligenceBrief | null {
  try {
    const parsed = JSON.parse(output) as { brief?: IntelligenceBrief };
    if (parsed.brief?.headline && Array.isArray(parsed.brief.observations)) {
      return parsed.brief;
    }
  } catch {
    return null;
  }
  return null;
}

async function countChargesThisMonth(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.kind, "charge"),
        sql`${payments.providerObjectId} like 'ch_%'`,
        gte(payments.createdAt, monthStart),
      ),
    );

  return Number(row?.value ?? 0);
}
