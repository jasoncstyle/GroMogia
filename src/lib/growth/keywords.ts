import { normalizeQueryKey } from "@/lib/growth/seo-actions";
import type { SearchConsoleMetricRow } from "@/lib/seo/search-console";

export const KEYWORD_SOURCE_SEARCH_CONSOLE = "search_console";

export type KeywordSnapshotInput = {
  id: string
  organizationId: string
  propertyUrl?: string | null
  startDate: string
  endDate: string
  createdAt: Date
  topQueries?: SearchConsoleMetricRow[] | null
};

export type ExistingKeywordHistoryRow = {
  organizationId: string
  queryKey: string
  snapshotId: string | null
};

export type KeywordDraft = {
  organizationId: string
  queryKey: string
  query: string
  source: typeof KEYWORD_SOURCE_SEARCH_CONSOLE
  firstSeenAt: Date
  lastSeenAt: Date
};

export type KeywordHistoryDraft = {
  organizationId: string
  queryKey: string
  snapshotId: string
  propertyUrl: string
  startDate: string
  endDate: string
  clicks: number
  impressions: number
  ctr: number
  position: number
};

export type KeywordHistoryPoint = {
  startDate: string
  endDate: string
  clicks: number
  impressions: number
  ctr: number
  position: number
};

export type KeywordWithHistory = {
  query: string
  queryKey: string
  source: string
  firstSeenAt: Date
  lastSeenAt: Date
  points: KeywordHistoryPoint[]
};

function metricNumber(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function displayQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function planKeywordHistory(input: {
  organizationId: string
  snapshots: KeywordSnapshotInput[]
  existingHistory?: ExistingKeywordHistoryRow[]
}): {
  keywordsToUpsert: KeywordDraft[]
  historyToInsert: KeywordHistoryDraft[]
} {
  const keywords = new Map<string, KeywordDraft>();
  const history: KeywordHistoryDraft[] = [];
  const seenHistory = new Set<string>();

  for (const row of input.existingHistory ?? []) {
    if (row.organizationId !== input.organizationId || !row.snapshotId) continue;
    seenHistory.add(`${row.queryKey}:${row.snapshotId}`);
  }

  const snapshots = [...input.snapshots]
    .filter((snapshot) => snapshot.organizationId === input.organizationId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const snapshot of snapshots) {
    for (const row of snapshot.topQueries ?? []) {
      const query = displayQuery(row.key ?? "");
      const queryKey = normalizeQueryKey(query);
      if (!queryKey) continue;

      const recordedAt = snapshot.createdAt;
      const existing = keywords.get(queryKey);
      if (existing) {
        existing.query = query;
        if (recordedAt < existing.firstSeenAt) existing.firstSeenAt = recordedAt;
        if (recordedAt > existing.lastSeenAt) existing.lastSeenAt = recordedAt;
      } else {
        keywords.set(queryKey, {
          organizationId: input.organizationId,
          queryKey,
          query,
          source: KEYWORD_SOURCE_SEARCH_CONSOLE,
          firstSeenAt: recordedAt,
          lastSeenAt: recordedAt,
        });
      }

      const historyKey = `${queryKey}:${snapshot.id}`;
      if (seenHistory.has(historyKey)) continue;
      seenHistory.add(historyKey);
      history.push({
        organizationId: input.organizationId,
        queryKey,
        snapshotId: snapshot.id,
        propertyUrl: snapshot.propertyUrl?.trim() ?? "",
        startDate: snapshot.startDate,
        endDate: snapshot.endDate,
        clicks: Math.max(0, Math.round(metricNumber(row.clicks))),
        impressions: Math.max(0, Math.round(metricNumber(row.impressions))),
        ctr: metricNumber(row.ctr),
        position: metricNumber(row.position),
      });
    }
  }

  return {
    keywordsToUpsert: [...keywords.values()],
    historyToInsert: history,
  };
}

export function describeKeywordHistory(points: KeywordHistoryPoint[]): string {
  const ordered = [...points].sort((a, b) => a.endDate.localeCompare(b.endDate));
  if (ordered.length === 0) {
    return "No Search Console history is stored for this query yet.";
  }
  if (ordered.length === 1) {
    const point = ordered[0];
    return `Recorded in 1 Search Console snapshot (${point.startDate} to ${point.endDate}): ${point.impressions} impressions, average position ${formatPosition(point.position)}.`;
  }
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  return `Recorded in ${ordered.length} Search Console snapshots. Impressions went from ${first.impressions} to ${latest.impressions}. Average position went from ${formatPosition(first.position)} to ${formatPosition(latest.position)}.`;
}

export function formatPosition(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

export function latestKeywordPoint(
  points: KeywordHistoryPoint[],
): KeywordHistoryPoint | null {
  if (points.length === 0) return null;
  return [...points].sort((a, b) => a.endDate.localeCompare(b.endDate)).at(-1) ?? null;
}
