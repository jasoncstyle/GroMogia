import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  brandSettings,
  builderSections,
  builderSites,
  organizations,
} from "@/lib/db/schema";

export async function getBuilderEditorData(organizationId: string) {
  const db = getDb();
  if (!db) {
    return { site: null, sections: [], brand: null };
  }

  const [brand] = await db
    .select()
    .from(brandSettings)
    .where(eq(brandSettings.organizationId, organizationId))
    .limit(1);
  const [site] = await db
    .select()
    .from(builderSites)
    .where(eq(builderSites.organizationId, organizationId))
    .limit(1);
  const sections = site
    ? await db
        .select()
        .from(builderSections)
        .where(
          and(
            eq(builderSections.organizationId, organizationId),
            eq(builderSections.siteId, site.id),
          ),
        )
        .orderBy(asc(builderSections.sortOrder))
    : [];

  return {
    site: site ?? null,
    sections,
    brand: brand ?? null,
  };
}

export async function getPublishedBuilderPage(orgSlug: string) {
  const db = getDb();
  if (!db) return null;

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!organization) return null;

  const [site] = await db
    .select()
    .from(builderSites)
    .where(eq(builderSites.organizationId, organization.id))
    .limit(1);
  if (!site || site.status !== "published") return null;

  const [brand] = await db
    .select()
    .from(brandSettings)
    .where(eq(brandSettings.organizationId, organization.id))
    .limit(1);

  const sections = await db
    .select()
    .from(builderSections)
    .where(
      and(
        eq(builderSections.organizationId, organization.id),
        eq(builderSections.siteId, site.id),
        eq(builderSections.visible, true),
      ),
    )
    .orderBy(asc(builderSections.sortOrder));

  return {
    organization,
    brand: brand ?? null,
    site,
    sections,
  };
}
