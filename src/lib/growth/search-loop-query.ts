import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  brandSettings,
  brandVoiceExamples,
  brandVoiceProfiles,
  businessBrains,
  contentBriefs,
  contentDrafts,
  contentGaps,
  growthActions,
  growthGoals,
  offers,
  websiteDiscoveredPages,
} from "@/lib/db/schema";
import { CONTENT_GAP_STATUS_GAP } from "@/lib/growth/content-gaps";
import { getKeywordHistory } from "@/lib/growth/persist-keywords";
import {
  SEARCH_LOOP_ACTION,
  planSearchLoop,
  type SearchLoopView,
} from "@/lib/growth/search-loop";

export async function getSearchLoopView(
  organizationId: string,
): Promise<SearchLoopView> {
  const empty = planSearchLoop({});
  const db = getDb();
  if (!db || !organizationId) return empty;

  const [
    keywords,
    gapRows,
    briefRows,
    draftRows,
    pageRows,
    offerRows,
    goalRows,
    pasteRows,
    brand,
    voice,
    example,
    brain,
  ] = await Promise.all([
    getKeywordHistory(db, organizationId),
    db
      .select({
        query: contentGaps.query,
        queryKey: contentGaps.queryKey,
        why: contentGaps.why,
        status: contentGaps.status,
      })
      .from(contentGaps)
      .where(eq(contentGaps.organizationId, organizationId)),
    db
      .select({
        id: contentBriefs.id,
        query: contentBriefs.query,
        title: contentBriefs.title,
        audience: contentBriefs.audience,
        outline: contentBriefs.outline,
      })
      .from(contentBriefs)
      .where(eq(contentBriefs.organizationId, organizationId)),
    db
      .select({
        id: contentDrafts.id,
        briefId: contentDrafts.briefId,
        title: contentDrafts.title,
        body: contentDrafts.body,
      })
      .from(contentDrafts)
      .where(eq(contentDrafts.organizationId, organizationId)),
    db
      .select({
        url: websiteDiscoveredPages.url,
        title: websiteDiscoveredPages.title,
        label: websiteDiscoveredPages.label,
        description: websiteDiscoveredPages.description,
        headings: websiteDiscoveredPages.headings,
      })
      .from(websiteDiscoveredPages)
      .where(eq(websiteDiscoveredPages.organizationId, organizationId)),
    db
      .select({ name: offers.name })
      .from(offers)
      .where(eq(offers.organizationId, organizationId)),
    db
      .select({
        id: growthGoals.id,
        title: growthGoals.title,
      })
      .from(growthGoals)
      .where(
        and(
          eq(growthGoals.organizationId, organizationId),
          eq(growthGoals.status, "active"),
        ),
      )
      .orderBy(desc(growthGoals.updatedAt))
      .limit(1),
    db
      .select({
        id: growthActions.id,
        result: growthActions.result,
        evidence: growthActions.evidence,
        title: growthActions.title,
      })
      .from(growthActions)
      .where(
        and(
          eq(growthActions.organizationId, organizationId),
          eq(growthActions.actionType, SEARCH_LOOP_ACTION),
        ),
      ),
    db
      .select({ businessName: brandSettings.businessName })
      .from(brandSettings)
      .where(eq(brandSettings.organizationId, organizationId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        tone: brandVoiceProfiles.tone,
        audience: brandVoiceProfiles.audience,
        doSay: brandVoiceProfiles.doSay,
        dontSay: brandVoiceProfiles.dontSay,
      })
      .from(brandVoiceProfiles)
      .where(eq(brandVoiceProfiles.organizationId, organizationId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        title: brandVoiceExamples.title,
        body: brandVoiceExamples.body,
      })
      .from(brandVoiceExamples)
      .where(
        and(
          eq(brandVoiceExamples.organizationId, organizationId),
          eq(brandVoiceExamples.direction, "more_like_this"),
        ),
      )
      .orderBy(desc(brandVoiceExamples.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({ differentiators: businessBrains.differentiators })
      .from(businessBrains)
      .where(eq(businessBrains.organizationId, organizationId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const latestPoint = (points: { impressions: number; clicks: number; position: number; ctr: number }[]) =>
    points[points.length - 1];

  return planSearchLoop({
    keywords: keywords.map((keyword) => {
      const point = latestPoint(keyword.points);
      return {
        query: keyword.query,
        queryKey: keyword.queryKey,
        opportunityLabel: keyword.opportunityLabel,
        opportunityScore: keyword.opportunityScore,
        impressions: point?.impressions ?? 0,
        clicks: point?.clicks ?? 0,
        position: point?.position ?? 0,
        ctr: point?.ctr ?? 0,
      };
    }),
    gaps: gapRows
      .filter((row) => row.status === CONTENT_GAP_STATUS_GAP)
      .map((row) => ({
        query: row.query,
        queryKey: row.queryKey,
        why: row.why,
      })),
    briefs: briefRows.map((brief) => {
      const draft = draftRows.find((row) => row.briefId === brief.id);
      return {
        id: brief.id,
        query: brief.query,
        title: brief.title,
        audience: brief.audience,
        outline: brief.outline,
        draft: draft
          ? { id: draft.id, title: draft.title, body: draft.body }
          : null,
      };
    }),
    pastes: pasteRows.map((row) => ({
      id: row.id,
      query: row.evidence?.query || row.title,
      result: row.result,
    })),
    pages: pageRows,
    offers: offerRows.map((row) => row.name),
    goal: goalRows[0] ?? null,
    voice: {
      businessName: brand?.businessName ?? "",
      difference: (brain?.differentiators ?? []).find((row) => row.trim()) ?? "",
      doSay: voice?.doSay ?? "",
      dontSay: voice?.dontSay ?? "",
      tone: voice?.tone ?? "",
      audience: voice?.audience ?? "",
      exampleTitle: example?.title ?? "",
      exampleBody: example?.body ?? "",
    },
  });
}
