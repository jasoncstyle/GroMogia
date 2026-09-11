import { eq } from "drizzle-orm";

import type { getDb } from "@/lib/db";
import {
  internalLinkSuggestions,
  pageSchemaFacts,
  websiteDiscoveredPages,
} from "@/lib/db/schema";
import {
  linksToShow,
  PAGE_STRUCTURE_SOURCE_STORED_PAGES,
  planPageStructure,
  SCHEMA_FACT_SOURCE_PAGE_GROUP,
  schemaFactsToShow,
  type InternalLinkView,
  type SchemaFactView,
} from "@/lib/growth/page-structure";

type AppDb = NonNullable<ReturnType<typeof getDb>>;

const inflight = new Map<string, Promise<{ upserted: number }>>();

export async function persistPageStructure(
  db: AppDb,
  organizationId: string,
): Promise<{ upserted: number }> {
  const existing = inflight.get(organizationId);
  if (existing) return existing;

  const run = persistPageStructureOnce(db, organizationId).finally(() => {
    if (inflight.get(organizationId) === run) inflight.delete(organizationId);
  });
  inflight.set(organizationId, run);
  return run;
}

async function persistPageStructureOnce(
  db: AppDb,
  organizationId: string,
): Promise<{ upserted: number }> {
  const pages = await db
    .select({
      id: websiteDiscoveredPages.id,
      url: websiteDiscoveredPages.url,
      urlKey: websiteDiscoveredPages.urlKey,
      label: websiteDiscoveredPages.label,
      title: websiteDiscoveredPages.title,
      description: websiteDiscoveredPages.description,
      headings: websiteDiscoveredPages.headings,
      pageGroup: websiteDiscoveredPages.pageGroup,
      organizationId: websiteDiscoveredPages.organizationId,
    })
    .from(websiteDiscoveredPages)
    .where(eq(websiteDiscoveredPages.organizationId, organizationId));

  const plan = planPageStructure({
    organizationId,
    pages: pages
      .filter((page) => page.organizationId === organizationId)
      .map((page) => ({
        id: page.id,
        url: page.url,
        urlKey: page.urlKey,
        label: page.label,
        title: page.title,
        description: page.description,
        headings: page.headings,
        pageGroup: page.pageGroup,
      })),
  });

  const now = new Date();
  await db
    .delete(internalLinkSuggestions)
    .where(eq(internalLinkSuggestions.organizationId, organizationId));
  await db
    .delete(pageSchemaFacts)
    .where(eq(pageSchemaFacts.organizationId, organizationId));

  let upserted = 0;
  for (const draft of plan.links) {
    if (draft.organizationId !== organizationId) continue;
    await db.insert(internalLinkSuggestions).values({
      organizationId,
      fromPageId: draft.fromPageId,
      fromUrl: draft.fromUrl,
      fromTitle: draft.fromTitle,
      toPageId: draft.toPageId,
      toUrl: draft.toUrl,
      toTitle: draft.toTitle,
      reason: draft.reason,
      source: draft.source,
      detectedAt: now,
      updatedAt: now,
    });
    upserted += 1;
  }

  for (const draft of plan.schemaFacts) {
    if (draft.organizationId !== organizationId) continue;
    await db.insert(pageSchemaFacts).values({
      organizationId,
      pageId: draft.pageId,
      pageUrl: draft.pageUrl,
      pageTitle: draft.pageTitle,
      schemaType: draft.schemaType,
      why: draft.why,
      source: draft.source,
      detectedAt: now,
      updatedAt: now,
    });
    upserted += 1;
  }

  return { upserted };
}

export async function getPageStructure(
  db: AppDb,
  organizationId: string,
): Promise<{
  links: InternalLinkView[]
  schemaFacts: SchemaFactView[]
}> {
  const [linkRows, factRows] = await Promise.all([
    db
      .select({
        fromPageId: internalLinkSuggestions.fromPageId,
        fromUrl: internalLinkSuggestions.fromUrl,
        fromTitle: internalLinkSuggestions.fromTitle,
        toPageId: internalLinkSuggestions.toPageId,
        toUrl: internalLinkSuggestions.toUrl,
        toTitle: internalLinkSuggestions.toTitle,
        reason: internalLinkSuggestions.reason,
        organizationId: internalLinkSuggestions.organizationId,
      })
      .from(internalLinkSuggestions)
      .where(eq(internalLinkSuggestions.organizationId, organizationId)),
    db
      .select({
        pageId: pageSchemaFacts.pageId,
        pageUrl: pageSchemaFacts.pageUrl,
        pageTitle: pageSchemaFacts.pageTitle,
        schemaType: pageSchemaFacts.schemaType,
        why: pageSchemaFacts.why,
        organizationId: pageSchemaFacts.organizationId,
      })
      .from(pageSchemaFacts)
      .where(eq(pageSchemaFacts.organizationId, organizationId)),
  ]);

  return {
    links: linksToShow(
      linkRows
        .filter((row) => row.organizationId === organizationId)
        .map((row) => ({
          organizationId,
          fromPageId: row.fromPageId,
          fromUrl: row.fromUrl,
          fromTitle: row.fromTitle,
          toPageId: row.toPageId,
          toUrl: row.toUrl,
          toTitle: row.toTitle,
          reason: row.reason,
          source: PAGE_STRUCTURE_SOURCE_STORED_PAGES,
        })),
    ),
    schemaFacts: schemaFactsToShow(
      factRows
        .filter((row) => row.organizationId === organizationId)
        .map((row) => ({
          organizationId,
          pageId: row.pageId,
          pageUrl: row.pageUrl,
          pageTitle: row.pageTitle,
          schemaType: row.schemaType,
          why: row.why,
          source: SCHEMA_FACT_SOURCE_PAGE_GROUP,
        })),
    ),
  };
}
