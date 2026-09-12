import { GEO_EVIDENCE_OWNER } from "@/lib/geo/architecture";

/**
 * Owner-entered AI visibility history. Each save is a new snapshot.
 * GroovGro does not overwrite the only copy, ask an AI system, or
 * treat one answer as truth.
 */
export const GEO_HISTORY_SOURCE_OWNER = GEO_EVIDENCE_OWNER;
export const GEO_ANSWER_YES = "yes";
export const GEO_ANSWER_NO = "no";
export const GEO_ANSWER_UNSURE = "unsure";
export const GEO_HISTORY_MAX_SHOWN = 12;

export const GEO_ANSWERS = [
  GEO_ANSWER_YES,
  GEO_ANSWER_NO,
  GEO_ANSWER_UNSURE,
] as const;

export type GeoAnswer = (typeof GEO_ANSWERS)[number];

export type GeoHistoryDraft = {
  organizationId: string
  queryId: string
  query: string
  queryKey: string
  mentioned: GeoAnswer
  cited: GeoAnswer
  note: string
  source: typeof GEO_HISTORY_SOURCE_OWNER
};

export type GeoHistoryView = {
  id: string
  queryId: string
  query: string
  mentioned: GeoAnswer
  cited: GeoAnswer
  note: string
  createdAt: Date
};

export function isGeoAnswer(value: string): value is GeoAnswer {
  return (GEO_ANSWERS as readonly string[]).includes(value);
}

export function planGeoHistory(input: {
  organizationId: string
  queryId?: string | null
  query?: string | null
  queryKey?: string | null
  mentioned?: string | null
  cited?: string | null
  note?: string | null
}): GeoHistoryDraft {
  if (!input.organizationId) {
    throw new Error("Missing organization.");
  }
  const queryId = (input.queryId ?? "").trim();
  const query = (input.query ?? "").trim().replace(/\s+/g, " ");
  if (!queryId || !query) {
    throw new Error("Pick a saved library question first.");
  }
  const mentioned = (input.mentioned ?? "").trim();
  if (!isGeoAnswer(mentioned)) {
    throw new Error("Say whether the business was mentioned.");
  }
  const citedRaw = (input.cited ?? GEO_ANSWER_UNSURE).trim() || GEO_ANSWER_UNSURE;
  if (!isGeoAnswer(citedRaw)) {
    throw new Error("Say whether the business was cited, or leave it unsure.");
  }
  return {
    organizationId: input.organizationId,
    queryId,
    query,
    queryKey: (input.queryKey ?? "").trim(),
    mentioned,
    cited: citedRaw,
    note: (input.note ?? "").trim(),
    source: GEO_HISTORY_SOURCE_OWNER,
  };
}

export function describeGeoHistory(
  row: Pick<GeoHistoryView, "query" | "mentioned" | "cited">,
): string {
  return `For “${row.query}”, the owner already heard mentioned: ${row.mentioned}, cited: ${row.cited}.`;
}

export function sortQueriesForHistory<T extends { id: string }>(
  queries: T[],
  history: Array<{ queryId: string }>,
): T[] {
  const needing = new Set(
    queriesNeedingHistory(queries, history).map((query) => query.id),
  );
  return [...queries].sort((left, right) => {
    const leftNeed = needing.has(left.id) ? 0 : 1;
    const rightNeed = needing.has(right.id) ? 0 : 1;
    return leftNeed - rightNeed;
  });
}

export function queriesNeedingHistory<T extends { id: string }>(
  queries: T[],
  history: Array<{ queryId: string }>,
): T[] {
  const saved = new Set(history.map((row) => row.queryId));
  return queries.filter((query) => !saved.has(query.id));
}

export function describeGeoHistoryHeading(
  historyCount = 0,
  needingCount = 0,
): string {
  if (historyCount <= 0 && needingCount <= 0) {
    return "What you already measured";
  }
  const history = historyCount <= 0 ? "" : ` · ${historyCount}`;
  const remaining =
    needingCount <= 0
      ? ""
      : ` · ${needingCount} still ${needingCount === 1 ? "needs" : "need"} a snapshot`;
  return `What you already measured${history}${remaining}`;
}

export function historyToShow(rows: GeoHistoryView[]): GeoHistoryView[] {
  return rows.slice(0, GEO_HISTORY_MAX_SHOWN);
}
