import { GEO_EVIDENCE_OWNER } from "@/lib/geo/architecture";
import { normalizeQueryKey } from "@/lib/growth/seo-actions";

/**
 * Owner-entered questions for later AI visibility work.
 * GroovGro does not ask an AI system from this library.
 */
export const GEO_QUERY_SOURCE_OWNER = GEO_EVIDENCE_OWNER;
export const GEO_QUERY_STATUS_PLANNED = "planned";

export type GeoQueryDraft = {
  organizationId: string
  query: string
  queryKey: string
  why: string
  status: typeof GEO_QUERY_STATUS_PLANNED
  source: typeof GEO_QUERY_SOURCE_OWNER
};

export type GeoQueryView = {
  id: string
  query: string
  why: string
  createdAt: Date
};

export function planGeoQuery(input: {
  organizationId: string
  query?: string | null
  why?: string | null
}): GeoQueryDraft {
  const query = (input.query ?? "").trim().replace(/\s+/g, " ");
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  if (!query) {
    throw new Error("Add a question to remember.");
  }
  return {
    organizationId: input.organizationId,
    query,
    queryKey: normalizeQueryKey(query),
    why: (input.why ?? "").trim(),
    status: GEO_QUERY_STATUS_PLANNED,
    source: GEO_QUERY_SOURCE_OWNER,
  };
}

export function describeGeoQuery(row: Pick<GeoQueryView, "query" | "why">): string {
  if (row.why) {
    return `Remember: “${row.query}”. ${row.why}`;
  }
  return `Remember: “${row.query}”.`;
}

export function geoQueriesNeedingWhy<T extends { why?: string | null }>(
  rows: T[],
): T[] {
  return rows.filter((row) => !(row.why ?? "").trim());
}

export function describeGeoQueriesHeading(
  queryCount = 0,
  needingWhyCount = 0,
): string {
  if (queryCount <= 0 && needingWhyCount <= 0) {
    return "Questions to remember for later AI visibility";
  }
  const queries = queryCount <= 0 ? "" : ` · ${queryCount}`;
  const needing =
    needingWhyCount <= 0
      ? ""
      : ` · ${needingWhyCount} still need a why`;
  return `Questions to remember for later AI visibility${queries}${needing}`;
}

export function sortGeoQueriesForPanel<T extends { why?: string | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((left, right) => {
    const leftWhy = (left.why ?? "").trim() ? 1 : 0;
    const rightWhy = (right.why ?? "").trim() ? 1 : 0;
    if (leftWhy !== rightWhy) return leftWhy - rightWhy;
    return 0;
  });
}
