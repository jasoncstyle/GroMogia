import { and, desc, eq } from "drizzle-orm";

import { readGoogleSecret } from "@/lib/actions/search-console";
import { getDb } from "@/lib/db";
import {
  brandSettings,
  brandVoiceProfiles,
  integrationConnections,
  searchConsoleSnapshots,
  seoAudits,
  seoDrafts,
  websites,
} from "@/lib/db/schema";
import { isGoogleOAuthConfigured } from "@/lib/env";
import {
  getKeywordHistory,
  persistKeywordHistory,
} from "@/lib/growth/persist-keywords";
import type { KeywordWithHistory } from "@/lib/growth/keywords";
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

  const [snapshots, keywords] = await Promise.all([
    db
      .select()
      .from(searchConsoleSnapshots)
      .where(eq(searchConsoleSnapshots.organizationId, organizationId))
      .orderBy(desc(searchConsoleSnapshots.createdAt))
      .limit(8),
    getKeywordHistory(db, organizationId),
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
  };
}

