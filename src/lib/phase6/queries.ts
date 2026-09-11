import { and, desc, eq } from "drizzle-orm";

import { readGoogleSecret } from "@/lib/actions/search-console";
import { getDb } from "@/lib/db";
import {
  brandSettings,
  brandVoiceProfiles,
  businessBrains,
  contentBriefs,
  contentDrafts,
  geoNotes,
  geoQueries,
  integrationConnections,
  searchConsoleSnapshots,
  seoAudits,
  seoDrafts,
  serpNotes,
  websiteDiscoveredPages,
  websites,
} from "@/lib/db/schema";
import { isGoogleOAuthConfigured } from "@/lib/env";
import {
  getKeywordHistory,
  persistKeywordHistory,
} from "@/lib/growth/persist-keywords";
import type { ContentGapView } from "@/lib/growth/content-gaps";
import { pageWasRead } from "@/lib/growth/content-gaps";
import {
  getContentGaps,
  persistContentGaps,
} from "@/lib/growth/persist-content-gaps";
import type { InternalLinkView, SchemaFactView } from "@/lib/growth/page-structure";
import {
  getPageStructure,
  persistPageStructure,
} from "@/lib/growth/persist-page-structure";
import type { ContentBriefView } from "@/lib/growth/content-briefs";
import type { ContentDraftView } from "@/lib/growth/content-drafts";
import type { KeywordWithHistory } from "@/lib/growth/keywords";
import type { GeoNoteView } from "@/lib/geo/notes";
import type { GeoQueryView } from "@/lib/geo/queries";
import type { SerpNoteView } from "@/lib/growth/serp-notes";
import { listBuilderPages, type BuilderPageSummary } from "@/lib/website-builder/queries";

export async function getSeoPageData(organizationId: string) {
  const emptySearchConsole = {
    configured: isGoogleOAuthConfigured(),
    connected: false,
    propertyUrl: null as string | null,
    candidates: [] as string[],
    lastSyncAt: null as Date | null,
    lastError: null as string | null,
    snapshots: [] as (typeof searchConsoleSnapshots.$inferSelect)[],
  };

  const db = getDb();
  if (!db) {
    return {
      website: null,
      brand: null,
      voice: null,
      audits: [] as (typeof seoAudits.$inferSelect)[],
      drafts: [] as (typeof seoDrafts.$inferSelect)[],
      hasBuilderSite: false,
      builderPages: [] as (BuilderPageSummary & {
        lastScore: number | null
        lastCheckedAt: Date | null
      })[],
      searchConsole: emptySearchConsole,
      keywords: [] as KeywordWithHistory[],
      serpNotes: [] as SerpNoteView[],
      geoNotes: [] as GeoNoteView[],
      geoQueries: [] as GeoQueryView[],
      knownCompetitors: [] as string[],
      contentGaps: [] as ContentGapView[],
      pagesRead: false,
      contentBriefs: [] as Array<ContentBriefView & { draft?: ContentDraftView | null }>,
      internalLinks: [] as InternalLinkView[],
      schemaFacts: [] as SchemaFactView[],
    };
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

  try {
    await persistPageStructure(db, organizationId);
  } catch (error) {
    console.error("GroovGro page structure persist failed", {
      organizationId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.organizationId, organizationId))
    .limit(1);

  const [brand] = await db
    .select()
    .from(brandSettings)
    .where(eq(brandSettings.organizationId, organizationId))
    .limit(1);

  const [voice] = await db
    .select()
    .from(brandVoiceProfiles)
    .where(eq(brandVoiceProfiles.organizationId, organizationId))
    .limit(1);

  const pages = await listBuilderPages(organizationId);

  const audits = await db
    .select()
    .from(seoAudits)
    .where(eq(seoAudits.organizationId, organizationId))
    .orderBy(desc(seoAudits.createdAt))
    .limit(80);

  const drafts = await db
    .select()
    .from(seoDrafts)
    .where(and(eq(seoDrafts.organizationId, organizationId)))
    .orderBy(desc(seoDrafts.createdAt))
    .limit(40);

  const latestByPage = new Map<string, (typeof audits)[number]>();
  for (const audit of audits) {
    if (!audit.builderSiteId || latestByPage.has(audit.builderSiteId)) continue;
    latestByPage.set(audit.builderSiteId, audit);
  }

  const builderPages = pages.map((page) => {
    const latest = latestByPage.get(page.id);
    return {
      ...page,
      lastScore: latest?.score ?? null,
      lastCheckedAt: latest?.createdAt ?? null,
    };
  });

  const [google] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.organizationId, organizationId),
        eq(integrationConnections.providerKey, "google"),
      ),
    )
    .limit(1);

  const secret =
    google?.status === "connected"
      ? await readGoogleSecret(organizationId)
      : null;

  const [
    snapshots,
    keywords,
    noteRows,
    brainRows,
    pageRows,
    contentGapRows,
    briefRows,
    draftRows,
    pageStructure,
    geoNoteRows,
    geoQueryRows,
  ] = await Promise.all([
    db
      .select()
      .from(searchConsoleSnapshots)
      .where(eq(searchConsoleSnapshots.organizationId, organizationId))
      .orderBy(desc(searchConsoleSnapshots.createdAt))
      .limit(8),
    getKeywordHistory(db, organizationId),
    db
      .select({
        id: serpNotes.id,
        query: serpNotes.query,
        competitorName: serpNotes.competitorName,
        note: serpNotes.note,
        source: serpNotes.source,
        createdAt: serpNotes.createdAt,
        organizationId: serpNotes.organizationId,
      })
      .from(serpNotes)
      .where(eq(serpNotes.organizationId, organizationId))
      .orderBy(desc(serpNotes.createdAt))
      .limit(20),
    db
      .select({ competitors: businessBrains.competitors })
      .from(businessBrains)
      .where(eq(businessBrains.organizationId, organizationId))
      .limit(1),
    db
      .select({
        title: websiteDiscoveredPages.title,
        headings: websiteDiscoveredPages.headings,
        organizationId: websiteDiscoveredPages.organizationId,
      })
      .from(websiteDiscoveredPages)
      .where(eq(websiteDiscoveredPages.organizationId, organizationId)),
    getContentGaps(db, organizationId),
    db
      .select({
        id: contentBriefs.id,
        query: contentBriefs.query,
        title: contentBriefs.title,
        audience: contentBriefs.audience,
        outline: contentBriefs.outline,
        createdAt: contentBriefs.createdAt,
        organizationId: contentBriefs.organizationId,
      })
      .from(contentBriefs)
      .where(eq(contentBriefs.organizationId, organizationId))
      .orderBy(desc(contentBriefs.createdAt))
      .limit(20),
    db
      .select({
        briefId: contentDrafts.briefId,
        title: contentDrafts.title,
        body: contentDrafts.body,
        createdAt: contentDrafts.createdAt,
        organizationId: contentDrafts.organizationId,
      })
      .from(contentDrafts)
      .where(eq(contentDrafts.organizationId, organizationId)),
    getPageStructure(db, organizationId),
    db
      .select({
        id: geoNotes.id,
        query: geoNotes.query,
        place: geoNotes.place,
        heard: geoNotes.heard,
        note: geoNotes.note,
        source: geoNotes.source,
        createdAt: geoNotes.createdAt,
        organizationId: geoNotes.organizationId,
      })
      .from(geoNotes)
      .where(eq(geoNotes.organizationId, organizationId))
      .orderBy(desc(geoNotes.createdAt))
      .limit(20),
    db
      .select({
        id: geoQueries.id,
        query: geoQueries.query,
        why: geoQueries.why,
        createdAt: geoQueries.createdAt,
        organizationId: geoQueries.organizationId,
      })
      .from(geoQueries)
      .where(eq(geoQueries.organizationId, organizationId))
      .orderBy(desc(geoQueries.createdAt))
      .limit(20),
  ]);

  return {
    website: website ?? null,
    brand: brand ?? null,
    voice: voice ?? null,
    audits,
    drafts,
    hasBuilderSite: pages.length > 0,
    builderPages,
    searchConsole: {
      configured: isGoogleOAuthConfigured(),
      connected: google?.status === "connected",
      propertyUrl: secret?.siteUrl ?? null,
      candidates: secret?.candidates ?? [],
      lastSyncAt: google?.lastSyncAt ?? null,
      lastError: google?.lastError ?? null,
      snapshots,
    },
    keywords,
    serpNotes: noteRows
      .filter((row) => row.organizationId === organizationId)
      .map((row) => ({
        id: row.id,
        query: row.query,
        competitorName: row.competitorName,
        note: row.note,
        source: row.source,
        createdAt: row.createdAt,
      })),
    knownCompetitors: filledNames(brainRows[0]?.competitors),
    geoNotes: geoNoteRows
      .filter((row) => row.organizationId === organizationId)
      .map((row) => ({
        id: row.id,
        query: row.query,
        place: row.place,
        heard: row.heard,
        note: row.note,
        source: row.source,
        createdAt: row.createdAt,
      })),
    geoQueries: geoQueryRows
      .filter((row) => row.organizationId === organizationId)
      .map((row) => ({
        id: row.id,
        query: row.query,
        why: row.why,
        createdAt: row.createdAt,
      })),
    contentGaps: contentGapRows,
    pagesRead: pageRows.some(
      (page) =>
        page.organizationId === organizationId &&
        pageWasRead({ title: page.title, headings: page.headings, url: "" }),
    ),
    contentBriefs: briefRows
      .filter((row) => row.organizationId === organizationId)
      .map((row) => {
        const draft = draftRows.find(
          (item) =>
            item.organizationId === organizationId && item.briefId === row.id,
        );
        return {
          id: row.id,
          query: row.query,
          title: row.title,
          audience: row.audience,
          outline: row.outline,
          createdAt: row.createdAt,
          draft: draft
            ? {
                briefId: draft.briefId,
                title: draft.title,
                body: draft.body,
                createdAt: draft.createdAt,
              }
            : null,
        };
      }),
    internalLinks: pageStructure.links,
    schemaFacts: pageStructure.schemaFacts,
  };
}

function filledNames(values?: string[] | null): string[] {
  return (values ?? []).map((item) => item.trim()).filter(Boolean);
}

