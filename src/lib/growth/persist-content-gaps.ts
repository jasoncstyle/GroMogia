import { and, desc, eq } from "drizzle-orm";

import type { getDb } from "@/lib/db";
import { contentGaps, websiteDiscoveredPages } from "@/lib/db/schema";
import {
  CONTENT_GAP_SOURCE_STORED_PAGES,
  CONTENT_GAP_STATUS_GAP,
  gapsToShow,
  planContentGaps,
  type ContentGapView,
} from "@/lib/growth/content-gaps";
import { getKeywordHistory } from "@/lib/growth/persist-keywords";
import { latestKeywordPoint } from "@/lib/growth/keywords";

type AppDb = NonNullable<ReturnType<typeof getDb>>;

const inflight = new Map<string, Promise<{ upserted: number }>>();

export async function persistContentGaps(
  db: AppDb,
  organizationId: string,
): Promise<{ upserted: number }> {
  const existing = inflight.get(organizationId);
  if (existing) return existing;

  const run = persistContentGapsOnce(db, organizationId).finally(() => {
    if (inflight.get(organizationId) === run) inflight.delete(organizationId);
  });
  inflight.set(organizationId, run);
  return run;
}

async function persistContentGapsOnce(
  db: AppDb,
  organizationId: string,
): Promise<{ upserted: number }> {
  const [keywords, pages] = await Promise.all([
    getKeywordHistory(db, organizationId),
    db
      .select({
        url: websiteDiscoveredPages.url,
        label: websiteDiscoveredPages.label,
        title: websiteDiscoveredPages.title,
        description: websiteDiscoveredPages.description,
        headings: websiteDiscoveredPages.headings,
        organizationId: websiteDiscoveredPages.organizationId,
      })
      .from(websiteDiscoveredPages)
      .where(eq(websiteDiscoveredPages.organizationId, organizationId)),
  ]);

  const plan = planContentGaps({
    organizationId,
    keywords: keywords.map((keyword) => ({
      organizationId,
      query: keyword.query,
      queryKey: keyword.queryKey,
      opportunityLabel: keyword.opportunityLabel,
      opportunityScore: keyword.opportunityScore,
      impressions: latestKeywordPoint(keyword.points)?.impressions ?? 0,
    })),
    pages: pages
      .filter((page) => page.organizationId === organizationId)
      .map((page) => ({
        url: page.url,
        label: page.label,
        title: page.title,
        description: page.description,
        headings: page.headings,
      })),
  });

  const now = new Date();
  let upserted = 0;
  for (const draft of plan.toUpsert) {
    if (draft.organizationId !== organizationId) continue;
    await db
      .insert(contentGaps)
      .values({
        organizationId,
        queryKey: draft.queryKey,
        query: draft.query,
        status: draft.status,
        why: draft.why,
        matchedPageUrl: draft.matchedPageUrl,
        pageCount: draft.pageCount,
        source: draft.source,
        detectedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [contentGaps.organizationId, contentGaps.queryKey],
        set: {
          query: draft.query,
          status: draft.status,
          why: draft.why,
          matchedPageUrl: draft.matchedPageUrl,
          pageCount: draft.pageCount,
          source: draft.source,
          detectedAt: now,
          updatedAt: now,
        },
      });
    upserted += 1;
  }

  return { upserted };
}

export async function getContentGaps(
  db: AppDb,
  organizationId: string,
): Promise<ContentGapView[]> {
  const rows = await db
    .select({
      query: contentGaps.query,
      queryKey: contentGaps.queryKey,
      why: contentGaps.why,
      pageCount: contentGaps.pageCount,
      status: contentGaps.status,
      organizationId: contentGaps.organizationId,
    })
    .from(contentGaps)
    .where(
      and(
        eq(contentGaps.organizationId, organizationId),
        eq(contentGaps.status, CONTENT_GAP_STATUS_GAP),
      ),
    )
    .orderBy(desc(contentGaps.detectedAt));

  return gapsToShow(
    rows
      .filter((row) => row.organizationId === organizationId)
      .map((row) => ({
        organizationId,
        queryKey: row.queryKey,
        query: row.query,
        status: CONTENT_GAP_STATUS_GAP,
        why: row.why,
        matchedPageUrl: "",
        pageCount: row.pageCount,
        source: CONTENT_GAP_SOURCE_STORED_PAGES,
      })),
  );
}
