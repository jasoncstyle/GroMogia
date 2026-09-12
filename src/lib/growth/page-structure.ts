import {
  pageCoversQuery,
  pageWasRead,
  queryTokens,
} from "@/lib/growth/content-gaps";

/**
 * Conservative internal-link suggestions and schema.org type estimates
 * from pages GroovGro already read. GroovGro does not invent URLs,
 * write HTML onto the live site, or emit JSON-LD.
 */
export const PAGE_STRUCTURE_SOURCE_STORED_PAGES = "stored_pages";
export const SCHEMA_FACT_SOURCE_PAGE_GROUP = "page_group";
export const INTERNAL_LINK_MAX_SHOWN = 8;
export const DEFAULT_SCHEMA_TYPE = "WebPage";

const CONTACT_PATH = /(^|\/)(contact|contact-us)(\/|$)/i;
const ABOUT_PATH = /(^|\/)(about|about-us)(\/|$)/i;

export type StructurePage = {
  id: string
  url: string
  urlKey?: string | null
  label?: string | null
  title?: string | null
  description?: string | null
  headings?: string[] | null
  pageGroup?: string | null
};

export type InternalLinkDraft = {
  organizationId: string
  fromPageId: string
  fromUrl: string
  fromTitle: string
  toPageId: string
  toUrl: string
  toTitle: string
  reason: string
  source: typeof PAGE_STRUCTURE_SOURCE_STORED_PAGES
};

export type SchemaFactDraft = {
  organizationId: string
  pageId: string
  pageUrl: string
  pageTitle: string
  schemaType: string
  why: string
  source: typeof SCHEMA_FACT_SOURCE_PAGE_GROUP
};

export type InternalLinkView = {
  fromPageId: string
  fromUrl: string
  fromTitle: string
  toPageId: string
  toUrl: string
  toTitle: string
  reason: string
};

export type SchemaFactView = {
  pageId: string
  pageUrl: string
  pageTitle: string
  schemaType: string
  why: string
};

export type PageStructureSkipReason =
  | "pages_not_read"
  | "not_enough_pages"
  | "tenant_mismatch";

export function isDefaultSchemaType(schemaType: string): boolean {
  return schemaType === DEFAULT_SCHEMA_TYPE;
}

export function describePageStructureHeading(
  linkCount = 0,
  schemaCount = 0,
  schemaReviewCount = 0,
): string {
  const base = "Links and schema facts from pages GroovGro already read";
  if (linkCount <= 0 && schemaCount <= 0 && schemaReviewCount <= 0) {
    return base;
  }
  const links =
    linkCount <= 0
      ? ""
      : ` · ${linkCount} suggested ${linkCount === 1 ? "link" : "links"}`;
  const schema =
    schemaCount <= 0
      ? ""
      : ` · ${schemaCount} schema ${schemaCount === 1 ? "fact" : "facts"}`;
  const review =
    schemaReviewCount <= 0
      ? ""
      : ` · ${schemaReviewCount} not the default`;
  return `${base}${links}${schema}${review}`;
}

export function describePageStructureGroupHeading(
  group: "links" | "schema",
  count: number,
  reviewCount = 0,
): string {
  if (group === "links") {
    return count <= 0
      ? "Suggested links"
      : `Suggested links · ${count}`;
  }
  const review =
    reviewCount <= 0 ? "" : ` · ${reviewCount} not the default`;
  return count <= 0
    ? `Estimated schema types${review}`
    : `Estimated schema types · ${count}${review}`;
}

export function pageDisplayTitle(page: StructurePage): string {
  return (page.title ?? "").trim() || (page.label ?? "").trim() || page.url;
}

export function schemaTypeForPage(page: StructurePage): string | null {
  if (page.pageGroup === "third_party") return null;
  if (page.pageGroup === "home") return "WebSite";
  if (page.pageGroup === "event") return "Event";
  if (page.pageGroup === "program") return "Service";
  if (page.pageGroup === "calendar") return "CollectionPage";
  if (page.pageGroup === "legal") {
    if (CONTACT_PATH.test(page.url)) return "ContactPage";
    if (ABOUT_PATH.test(page.url)) return "AboutPage";
    return DEFAULT_SCHEMA_TYPE;
  }
  return DEFAULT_SCHEMA_TYPE;
}

export function planPageStructure(input: {
  organizationId: string
  pages: StructurePage[]
}): {
  links: InternalLinkDraft[]
  schemaFacts: SchemaFactDraft[]
  skipped: Array<{ reason: PageStructureSkipReason }>
} {
  if (!input.organizationId) {
    return { links: [], schemaFacts: [], skipped: [{ reason: "tenant_mismatch" }] };
  }

  const readPages = input.pages.filter(
    (page) => page.id && page.pageGroup !== "third_party" && pageWasRead(page),
  );
  const skipped: Array<{ reason: PageStructureSkipReason }> = [];
  const schemaFacts = planSchemaFacts(input.organizationId, readPages);

  if (readPages.length === 0) {
    skipped.push({ reason: "pages_not_read" });
    return { links: [], schemaFacts, skipped };
  }

  if (readPages.length < 2) {
    skipped.push({ reason: "not_enough_pages" });
    return { links: [], schemaFacts, skipped };
  }

  return {
    links: planInternalLinks(input.organizationId, readPages),
    schemaFacts,
    skipped,
  };
}

export function linksToShow(rows: InternalLinkDraft[]): InternalLinkView[] {
  return rows.slice(0, INTERNAL_LINK_MAX_SHOWN).map((row) => ({
    fromPageId: row.fromPageId,
    fromUrl: row.fromUrl,
    fromTitle: row.fromTitle,
    toPageId: row.toPageId,
    toUrl: row.toUrl,
    toTitle: row.toTitle,
    reason: row.reason,
  }));
}

export function sortSchemaFactsForPanel<
  T extends { schemaType: string; pageUrl?: string },
>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const leftDefault = isDefaultSchemaType(left.schemaType) ? 1 : 0;
    const rightDefault = isDefaultSchemaType(right.schemaType) ? 1 : 0;
    if (leftDefault !== rightDefault) return leftDefault - rightDefault;
    return (left.pageUrl ?? "").localeCompare(right.pageUrl ?? "");
  });
}

export function schemaFactsToShow(rows: SchemaFactDraft[]): SchemaFactView[] {
  return sortSchemaFactsForPanel(rows).map((row) => ({
    pageId: row.pageId,
    pageUrl: row.pageUrl,
    pageTitle: row.pageTitle,
    schemaType: row.schemaType,
    why: row.why,
  }));
}

function planInternalLinks(
  organizationId: string,
  pages: StructurePage[],
): InternalLinkDraft[] {
  const destinations = pages.filter((page) => {
    if (page.pageGroup === "legal") return false;
    return queryTokens(pageDisplayTitle(page)).length >= 2;
  });

  const drafts: InternalLinkDraft[] = [];
  for (const source of pages) {
    for (const dest of destinations) {
      if (source.id === dest.id) continue;
      if (sameStoredUrl(source, dest)) continue;
      if (!pageCoversQuery(source, pageDisplayTitle(dest))) continue;
      drafts.push({
        organizationId,
        fromPageId: source.id,
        fromUrl: source.url,
        fromTitle: pageDisplayTitle(source),
        toPageId: dest.id,
        toUrl: dest.url,
        toTitle: pageDisplayTitle(dest),
        reason:
          "This page's stored text mentions words from the other page's title. GroovGro will not add a link on the live website.",
        source: PAGE_STRUCTURE_SOURCE_STORED_PAGES,
      });
    }
  }

  drafts.sort((left, right) => {
    const from = left.fromUrl.localeCompare(right.fromUrl);
    if (from !== 0) return from;
    return left.toUrl.localeCompare(right.toUrl);
  });

  return drafts.slice(0, INTERNAL_LINK_MAX_SHOWN);
}

function planSchemaFacts(
  organizationId: string,
  pages: StructurePage[],
): SchemaFactDraft[] {
  return pages
    .map((page) => {
      const schemaType = schemaTypeForPage(page);
      if (!schemaType) return null;
      return {
        organizationId,
        pageId: page.id,
        pageUrl: page.url,
        pageTitle: pageDisplayTitle(page),
        schemaType,
        why: "Estimated from the stored page group. GroovGro will not add schema to the live website.",
        source: SCHEMA_FACT_SOURCE_PAGE_GROUP,
      } satisfies SchemaFactDraft;
    })
    .filter((row): row is SchemaFactDraft => Boolean(row))
    .sort((left, right) => left.pageUrl.localeCompare(right.pageUrl));
}

function sameStoredUrl(left: StructurePage, right: StructurePage): boolean {
  const leftKey = (left.urlKey ?? "").trim().toLowerCase();
  const rightKey = (right.urlKey ?? "").trim().toLowerCase();
  if (leftKey && rightKey && leftKey === rightKey) return true;
  return normalizeStoredUrl(left.url) === normalizeStoredUrl(right.url);
}

function normalizeStoredUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${path}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}
