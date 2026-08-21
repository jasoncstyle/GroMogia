import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  brandSettings,
  builderRows,
  builderSections,
  builderSites,
  organizations,
} from "@/lib/db/schema";
import { parseColumnWidths, parseContentWidth } from "@/lib/website-builder/layout";
import { parseBuilderColor, parseBuilderTheme } from "@/lib/website-builder/style";
import type { BuilderLayoutRow } from "@/lib/website-builder/types";

export type { BuilderLayoutRow } from "@/lib/website-builder/types";

function toLayoutRows(
  rows: (typeof builderRows.$inferSelect)[],
  sections: (typeof builderSections.$inferSelect)[],
): BuilderLayoutRow[] {
  const grouped = rows
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      sortOrder: row.sortOrder,
      columnWidths: parseColumnWidths(row.columnWidths),
      backgroundColor: parseBuilderColor(row.backgroundColor),
      contentWidth: parseContentWidth(row.contentWidth),
      widgets: [] as BuilderLayoutRow["widgets"],
    }));
  const byId = new Map(grouped.map((row) => [row.id, row]));
  const leftovers: BuilderLayoutRow["widgets"] = [];

  for (const section of sections.slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
    const widget = {
      id: section.id,
      type: section.type,
      visible: section.visible,
      columnIndex: section.columnIndex,
      sortOrder: section.sortOrder,
      content: section.content,
    };
    const row = section.rowId ? byId.get(section.rowId) : undefined;
    if (row) row.widgets.push(widget);
    else leftovers.push(widget);
  }

  if (leftovers.length > 0) {
    grouped.push({
      id: "legacy",
      sortOrder: grouped.length,
      columnWidths: [100],
      backgroundColor: "",
      contentWidth: "normal",
      widgets: leftovers.map((widget) => ({ ...widget, columnIndex: 0 })),
    });
  }

  return grouped;
}

export async function getBuilderEditorData(organizationId: string) {
  const db = getDb();
  if (!db) {
    return { site: null, rows: [] as BuilderLayoutRow[], brand: null };
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
  if (!site) {
    return { site: null, rows: [] as BuilderLayoutRow[], brand: brand ?? null };
  }

  const rows = await db
    .select()
    .from(builderRows)
    .where(
      and(
        eq(builderRows.organizationId, organizationId),
        eq(builderRows.siteId, site.id),
      ),
    )
    .orderBy(asc(builderRows.sortOrder));
  const sections = await db
    .select()
    .from(builderSections)
    .where(
      and(
        eq(builderSections.organizationId, organizationId),
        eq(builderSections.siteId, site.id),
      ),
    )
    .orderBy(asc(builderSections.sortOrder));

  return {
    site: site
      ? { ...site, theme: parseBuilderTheme(site.theme) }
      : null,
    rows: toLayoutRows(rows, sections),
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

  const rows = await db
    .select()
    .from(builderRows)
    .where(
      and(
        eq(builderRows.organizationId, organization.id),
        eq(builderRows.siteId, site.id),
      ),
    )
    .orderBy(asc(builderRows.sortOrder));

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
    site: { ...site, theme: parseBuilderTheme(site.theme) },
    rows: toLayoutRows(rows, sections).filter((row) => row.widgets.length > 0),
    sections,
  };
}
