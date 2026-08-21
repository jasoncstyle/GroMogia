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
import { builderPageLabel, HOME_PAGE_SLUG, isHomePageSlug } from "@/lib/website-builder/pages";
import { parseBuilderColor, parseBuilderTheme } from "@/lib/website-builder/style";
import type { BuilderLayoutRow } from "@/lib/website-builder/types";

export type { BuilderLayoutRow } from "@/lib/website-builder/types";

export type BuilderPageSummary = {
  id: string
  title: string
  slug: string
  status: string
  templateId: string
  isHome: boolean
  label: string
};

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

function toPageSummary(site: typeof builderSites.$inferSelect): BuilderPageSummary {
  return {
    id: site.id,
    title: site.title,
    slug: site.slug,
    status: site.status,
    templateId: site.templateId,
    isHome: isHomePageSlug(site.slug),
    label: builderPageLabel(site),
  };
}

function sortPages<T extends { slug: string; title: string }>(pages: T[]): T[] {
  return pages.slice().sort((a, b) => {
    if (isHomePageSlug(a.slug) && !isHomePageSlug(b.slug)) return -1;
    if (isHomePageSlug(b.slug) && !isHomePageSlug(a.slug)) return 1;
    return a.title.localeCompare(b.title);
  });
}

export async function listBuilderPages(organizationId: string): Promise<BuilderPageSummary[]> {
  const db = getDb();
  if (!db) return [];
  const pages = await db
    .select()
    .from(builderSites)
    .where(eq(builderSites.organizationId, organizationId))
    .orderBy(asc(builderSites.createdAt));
  return sortPages(pages.map(toPageSummary));
}

export async function getBuilderEditorData(
  organizationId: string,
  pageId?: string | null,
) {
  const db = getDb();
  if (!db) {
    return { pages: [] as BuilderPageSummary[], site: null, rows: [] as BuilderLayoutRow[], brand: null };
  }

  const [brand] = await db
    .select()
    .from(brandSettings)
    .where(eq(brandSettings.organizationId, organizationId))
    .limit(1);
  const allSites = await db
    .select()
    .from(builderSites)
    .where(eq(builderSites.organizationId, organizationId));
  const pages = sortPages(allSites.map(toPageSummary));
  if (allSites.length === 0) {
    return { pages, site: null, rows: [] as BuilderLayoutRow[], brand: brand ?? null };
  }

  const site =
    (pageId ? allSites.find((candidate) => candidate.id === pageId) : undefined) ??
    allSites.find((candidate) => isHomePageSlug(candidate.slug)) ??
    allSites[0];
  if (!site) {
    return { pages, site: null, rows: [] as BuilderLayoutRow[], brand: brand ?? null };
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
    pages,
    site: { ...site, theme: parseBuilderTheme(site.theme) },
    rows: toLayoutRows(rows, sections),
    brand: brand ?? null,
  };
}

export async function getPublishedBuilderPage(orgSlug: string, pageSlug = HOME_PAGE_SLUG) {
  const db = getDb();
  if (!db) return null;

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  if (!organization) return null;

  const slug = pageSlug.replace(/^\/+|\/+$/g, "").toLowerCase();
  const [site] = await db
    .select()
    .from(builderSites)
    .where(
      and(
        eq(builderSites.organizationId, organization.id),
        eq(builderSites.slug, slug),
      ),
    )
    .limit(1);
  if (!site || site.status !== "published") return null;

  const [brand] = await db
    .select()
    .from(brandSettings)
    .where(eq(brandSettings.organizationId, organization.id))
    .limit(1);

  const publishedPages = sortPages(
    (
      await db
        .select()
        .from(builderSites)
        .where(
          and(
            eq(builderSites.organizationId, organization.id),
            eq(builderSites.status, "published"),
          ),
        )
    ).map(toPageSummary),
  );

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
    pages: publishedPages,
    rows: toLayoutRows(rows, sections).filter((row) => row.widgets.length > 0),
    sections,
  };
}
