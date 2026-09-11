import { GEO_EVIDENCE_ESTIMATE } from "@/lib/geo/architecture";
import {
  GEO_ANSWER_NO,
  GEO_ANSWER_YES,
  isGeoAnswer,
  type GeoAnswer,
} from "@/lib/geo/history";

/**
 * GEO audits from already-saved visibility history.
 * GroovGro does not ask an AI system, scrape answers, invent share of
 * voice, or treat one answer as truth.
 */
export const GEO_AUDIT_SOURCE_STORED_HISTORY = "stored_history";
export const GEO_AUDIT_STATUS_GAP = "citation_gap";
export const GEO_AUDIT_STATUS_COVERED = "covered";
export const GEO_AUDIT_MAX_SHOWN = 12;

export type GeoAuditStatus =
  | typeof GEO_AUDIT_STATUS_GAP
  | typeof GEO_AUDIT_STATUS_COVERED;

export type GeoAuditQuery = {
  id: string
  organizationId: string
  query: string
  queryKey: string
};

export type GeoAuditSnapshot = {
  id: string
  organizationId: string
  queryId: string
  query: string
  queryKey: string
  mentioned: GeoAnswer
  cited: GeoAnswer
  createdAt: Date
};

export type GeoAuditDraft = {
  organizationId: string
  queryId: string
  queryKey: string
  query: string
  historyId: string
  mentioned: GeoAnswer
  cited: GeoAnswer
  status: GeoAuditStatus
  why: string
  source: typeof GEO_AUDIT_SOURCE_STORED_HISTORY
};

export type GeoAuditView = {
  queryId: string
  query: string
  queryKey: string
  mentioned: GeoAnswer
  cited: GeoAnswer
  why: string
};

export type GeoAuditSkipReason =
  | "tenant_mismatch"
  | "history_missing"
  | "not_enough_evidence";

export function latestSnapshotForQuery(
  history: GeoAuditSnapshot[],
  queryId: string,
): GeoAuditSnapshot | null {
  return (
    [...history]
      .filter((row) => row.queryId === queryId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null
  );
}

export function planGeoAudits(input: {
  organizationId: string
  queries: GeoAuditQuery[]
  history: GeoAuditSnapshot[]
}): {
  toUpsert: GeoAuditDraft[]
  skipped: Array<{ reason: GeoAuditSkipReason; queryId?: string }>
} {
  if (!input.organizationId) {
    return { toUpsert: [], skipped: [{ reason: "tenant_mismatch" }] };
  }

  const skipped: Array<{ reason: GeoAuditSkipReason; queryId?: string }> = [];
  const toUpsert: GeoAuditDraft[] = [];
  const history = input.history.filter(
    (row) => row.organizationId === input.organizationId,
  );

  if (history.length === 0) {
    skipped.push({ reason: "history_missing" });
    return { toUpsert, skipped };
  }

  for (const query of input.queries) {
    if (query.organizationId !== input.organizationId) {
      skipped.push({ reason: "tenant_mismatch", queryId: query.id });
      continue;
    }
    const latest = latestSnapshotForQuery(history, query.id);
    if (!latest || latest.organizationId !== input.organizationId) {
      skipped.push({ reason: "history_missing", queryId: query.id });
      continue;
    }
    if (!isGeoAnswer(latest.mentioned) || !isGeoAnswer(latest.cited)) {
      skipped.push({ reason: "not_enough_evidence", queryId: query.id });
      continue;
    }

    const mentionedNo = latest.mentioned === GEO_ANSWER_NO;
    const citedNo = latest.cited === GEO_ANSWER_NO;
    const bothYes =
      latest.mentioned === GEO_ANSWER_YES && latest.cited === GEO_ANSWER_YES;

    if (!mentionedNo && !citedNo && !bothYes) {
      skipped.push({ reason: "not_enough_evidence", queryId: query.id });
      continue;
    }

    toUpsert.push({
      organizationId: input.organizationId,
      queryId: query.id,
      queryKey: query.queryKey || latest.queryKey,
      query: query.query || latest.query,
      historyId: latest.id,
      mentioned: latest.mentioned,
      cited: latest.cited,
      status: bothYes ? GEO_AUDIT_STATUS_COVERED : GEO_AUDIT_STATUS_GAP,
      why: describeGeoAuditWhy({
        query: query.query || latest.query,
        mentioned: latest.mentioned,
        cited: latest.cited,
        covered: bothYes,
      }),
      source: GEO_AUDIT_SOURCE_STORED_HISTORY,
    });
  }

  return { toUpsert, skipped };
}

export function describeGeoAuditWhy(input: {
  query: string
  mentioned: GeoAnswer
  cited: GeoAnswer
  covered: boolean
}): string {
  if (input.covered) {
    return `The latest saved snapshot for “${input.query}” said the business was mentioned and cited. GroovGro will not treat one answer as truth.`;
  }
  if (input.mentioned === GEO_ANSWER_NO && input.cited === GEO_ANSWER_NO) {
    return `The latest saved snapshot for “${input.query}” said the business was not mentioned and not cited. This is an estimate from owner-saved history, not a live AI answer.`;
  }
  if (input.mentioned === GEO_ANSWER_NO) {
    return `The latest saved snapshot for “${input.query}” said the business was not mentioned. This is an estimate from owner-saved history, not a live AI answer.`;
  }
  return `The latest saved snapshot for “${input.query}” said the business was not cited. This is an estimate from owner-saved history, not a live AI answer.`;
}

export function describeGeoAudit(
  row: Pick<GeoAuditView, "query" | "mentioned" | "cited">,
): string {
  return `For “${row.query}”, the latest saved snapshot said mentioned: ${row.mentioned}, cited: ${row.cited}.`;
}

export function auditsToShow(rows: GeoAuditDraft[]): GeoAuditView[] {
  return rows
    .filter((row) => row.status === GEO_AUDIT_STATUS_GAP)
    .slice(0, GEO_AUDIT_MAX_SHOWN)
    .map((row) => ({
      queryId: row.queryId,
      query: row.query,
      queryKey: row.queryKey,
      mentioned: row.mentioned,
      cited: row.cited,
      why: row.why,
    }));
}

export function isGeoAuditEstimate(source: string): boolean {
  return source === GEO_AUDIT_SOURCE_STORED_HISTORY || source === GEO_EVIDENCE_ESTIMATE;
}
