import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  brandSettings,
  brandVoiceProfiles,
  seoAudits,
  seoDrafts,
  websites,
} from "@/lib/db/schema";

export async function getSeoPageData(organizationId: string) {
  const db = getDb();
  if (!db) {
    return {
      website: null,
      brand: null,
      voice: null,
      audits: [] as (typeof seoAudits.$inferSelect)[],
      drafts: [] as (typeof seoDrafts.$inferSelect)[],
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

  const audits = await db
    .select()
    .from(seoAudits)
    .where(eq(seoAudits.organizationId, organizationId))
    .orderBy(desc(seoAudits.createdAt))
    .limit(12);

  const drafts = await db
    .select()
    .from(seoDrafts)
    .where(
      and(
        eq(seoDrafts.organizationId, organizationId),
      ),
    )
    .orderBy(desc(seoDrafts.createdAt))
    .limit(30);

  return {
    website: website ?? null,
    brand: brand ?? null,
    voice: voice ?? null,
    audits,
    drafts,
  };
}
