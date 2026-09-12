import { normalizeQueryKey } from "@/lib/growth/seo-actions";
import type { KeywordScoreLabel } from "@/lib/growth/keyword-score";

/**
 * Conservative content-gap detection from stored Search Console queries
 * and pages GroovGro already read. GroovGro does not invent topics,
 * scrape competitors, write a brief, or create a page.
 */
export const CONTENT_GAP_SOURCE_STORED_PAGES = "stored_pages";
export const CONTENT_GAP_STATUS_GAP = "gap";
export const CONTENT_GAP_STATUS_COVERED = "covered";
export const CONTENT_GAP_MAX_SHOWN = 8;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "best",
  "by",
  "do",
  "does",
  "for",
  "from",
  "how",
  "in",
  "is",
  "me",
  "my",
  "near",
  "of",
  "on",
  "or",
  "our",
  "the",
  "to",
  "top",
  "vs",
  "what",
  "when",
  "where",
  "who",
  "with",
  "your",
]);

export type ContentGapPage = {
  url: string
  label?: string | null
  title?: string | null
  description?: string | null
  headings?: string[] | null
};

export type ContentGapKeyword = {
  organizationId: string
  query: string
  queryKey: string
  opportunityLabel: KeywordScoreLabel
  opportunityScore: number
  impressions: number
};

export type ContentGapDraft = {
  organizationId: string
  queryKey: string
  query: string
  status: typeof CONTENT_GAP_STATUS_GAP | typeof CONTENT_GAP_STATUS_COVERED
  why: string
  matchedPageUrl: string
  pageCount: number
  source: typeof CONTENT_GAP_SOURCE_STORED_PAGES
};

export type ContentGapView = {
  query: string
  queryKey: string
  why: string
  pageCount: number
};

export type ContentGapSkipReason =
  | "not_enough_query_evidence"
  | "pages_not_read"
  | "not_meaningful"
  | "tenant_mismatch";

export function pageWasRead(page: ContentGapPage): boolean {
  return Boolean(
    (page.title ?? "").trim() ||
      (Array.isArray(page.headings) && page.headings.some((item) => item.trim())),
  );
}

export function queryTokens(query: string): string[] {
  return normalizeQueryKey(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export function pageText(page: ContentGapPage): string {
  const pathWords = pathToWords(page.url);
  return normalizeQueryKey(
    [
      page.title ?? "",
      page.label ?? "",
      page.description ?? "",
      ...(Array.isArray(page.headings) ? page.headings : []),
      pathWords,
    ].join(" "),
  );
}

export function pageCoversQuery(page: ContentGapPage, query: string): boolean {
  const text = pageText(page);
  const queryKey = normalizeQueryKey(query);
  if (!text || !queryKey) return false;
  if (text.includes(queryKey)) return true;
  const tokens = queryTokens(queryKey);
  if (tokens.length === 0) return false;
  return tokens.every((token) => text.includes(token));
}

export function planContentGaps(input: {
  organizationId: string
  keywords: ContentGapKeyword[]
  pages: ContentGapPage[]
}): {
  toUpsert: ContentGapDraft[]
  skipped: Array<{ reason: ContentGapSkipReason; queryKey?: string }>
} {
  if (!input.organizationId) {
    return { toUpsert: [], skipped: [{ reason: "tenant_mismatch" }] };
  }

  const pagesRead = input.pages.filter(pageWasRead);
  const skipped: Array<{ reason: ContentGapSkipReason; queryKey?: string }> = [];
  const toUpsert: ContentGapDraft[] = [];

  if (pagesRead.length === 0) {
    skipped.push({ reason: "pages_not_read" });
    return { toUpsert, skipped };
  }

  const ranked = [...input.keywords]
    .filter((keyword) => keyword.organizationId === input.organizationId)
    .sort((left, right) => {
      if (right.opportunityScore !== left.opportunityScore) {
        return right.opportunityScore - left.opportunityScore;
      }
      return right.impressions - left.impressions;
    });

  for (const keyword of ranked) {
    if (keyword.opportunityLabel !== "review") {
      skipped.push({
        reason: "not_enough_query_evidence",
        queryKey: keyword.queryKey,
      });
      continue;
    }
    const tokens = queryTokens(keyword.queryKey || keyword.query);
    if (tokens.length === 0) {
      skipped.push({ reason: "not_meaningful", queryKey: keyword.queryKey });
      continue;
    }

    const match = pagesRead.find((page) => pageCoversQuery(page, keyword.query));
    if (match) {
      toUpsert.push({
        organizationId: input.organizationId,
        queryKey: keyword.queryKey || normalizeQueryKey(keyword.query),
        query: keyword.query,
        status: CONTENT_GAP_STATUS_COVERED,
        why: `A page GroovGro already read mentions “${keyword.query}”. GroovGro will not write or change that page.`,
        matchedPageUrl: match.url,
        pageCount: pagesRead.length,
        source: CONTENT_GAP_SOURCE_STORED_PAGES,
      });
      continue;
    }

    toUpsert.push({
      organizationId: input.organizationId,
      queryKey: keyword.queryKey || normalizeQueryKey(keyword.query),
      query: keyword.query,
      status: CONTENT_GAP_STATUS_GAP,
      why: `GroovGro did not find “${keyword.query}” on the ${pagesRead.length} ${pagesRead.length === 1 ? "page" : "pages"} it already read. This is not a brief or a new page.`,
      matchedPageUrl: "",
      pageCount: pagesRead.length,
      source: CONTENT_GAP_SOURCE_STORED_PAGES,
    });
  }

  return { toUpsert, skipped };
}

export function describeContentGapsHeading(gapCount: number): string {
  if (gapCount <= 0) {
    return "Queries with no matching page GroovGro has read";
  }
  return `Queries with no matching page GroovGro has read · ${gapCount}`;
}

export function gapsToShow(rows: ContentGapDraft[]): ContentGapView[] {
  return rows
    .filter((row) => row.status === CONTENT_GAP_STATUS_GAP)
    .slice(0, CONTENT_GAP_MAX_SHOWN)
    .map((row) => ({
      query: row.query,
      queryKey: row.queryKey,
      why: row.why,
      pageCount: row.pageCount,
    }));
}

function pathToWords(url: string): string {
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    return decodeURIComponent(parsed.pathname)
      .split("/")
      .filter(Boolean)
      .join(" ")
      .replace(/[-_]+/g, " ");
  } catch {
    return "";
  }
}
