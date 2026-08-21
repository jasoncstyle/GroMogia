import { and, desc, eq } from "drizzle-orm";

import { readGoogleSecret } from "@/lib/actions/search-console";
import { getDb } from "@/lib/db";
import {
  brandSettings,
  brandVoiceProfiles,
  builderSites,
  integrationConnections,
  searchConsoleSnapshots,
  seoAudits,
  seoDrafts,
  websites,
} from "@/lib/db/schema";
import { isGoogleOAuthConfigured } from "@/lib/env";

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
      searchConsole: emptySearchConsole,
    };
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

  const [builderSite] = await db
    .select({ id: builderSites.id })
    .from(builderSites)
    .where(eq(builderSites.organizationId, organizationId))
    .limit(1);

  const audits = await db
    .select()
    .from(seoAudits)
    .where(eq(seoAudits.organizationId, organizationId))
    .orderBy(desc(seoAudits.createdAt))
    .limit(12);

  const drafts = await db
    .select()
    .from(seoDrafts)
    .where(and(eq(seoDrafts.organizationId, organizationId)))
    .orderBy(desc(seoDrafts.createdAt))
    .limit(30);

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

  const snapshots = await db
    .select()
    .from(searchConsoleSnapshots)
    .where(eq(searchConsoleSnapshots.organizationId, organizationId))
    .orderBy(desc(searchConsoleSnapshots.createdAt))
    .limit(8);

  return {
    website: website ?? null,
    brand: brand ?? null,
    voice: voice ?? null,
    audits,
    drafts,
    hasBuilderSite: Boolean(builderSite),
    searchConsole: {
      configured: isGoogleOAuthConfigured(),
      connected: google?.status === "connected",
      propertyUrl: secret?.siteUrl ?? null,
      candidates: secret?.candidates ?? [],
      lastSyncAt: google?.lastSyncAt ?? null,
      lastError: google?.lastError ?? null,
      snapshots,
    },
  };
}

