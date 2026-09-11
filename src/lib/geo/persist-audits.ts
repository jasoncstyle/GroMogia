import { and, desc, eq } from "drizzle-orm";

import type { getDb } from "@/lib/db";
import { geoAudits, geoHistory, geoQueries } from "@/lib/db/schema";
import {
  GEO_AUDIT_SOURCE_STORED_HISTORY,
  GEO_AUDIT_STATUS_GAP,
  auditsToShow,
  planGeoAudits,
  type GeoAuditView,
} from "@/lib/geo/audits";
import { isGeoAnswer } from "@/lib/geo/history";

type AppDb = NonNullable<ReturnType<typeof getDb>>;

const inflight = new Map<string, Promise<{ upserted: number }>>();

export async function persistGeoAudits(
  db: AppDb,
  organizationId: string,
): Promise<{ upserted: number }> {
  const existing = inflight.get(organizationId);
  if (existing) return existing;

  const run = persistGeoAuditsOnce(db, organizationId).finally(() => {
    if (inflight.get(organizationId) === run) inflight.delete(organizationId);
  });
  inflight.set(organizationId, run);
  return run;
}

async function persistGeoAuditsOnce(
  db: AppDb,
  organizationId: string,
): Promise<{ upserted: number }> {
  const [queryRows, historyRows] = await Promise.all([
    db
      .select({
        id: geoQueries.id,
        query: geoQueries.query,
        queryKey: geoQueries.queryKey,
        organizationId: geoQueries.organizationId,
      })
      .from(geoQueries)
      .where(eq(geoQueries.organizationId, organizationId)),
    db
      .select({
        id: geoHistory.id,
        queryId: geoHistory.queryId,
        query: geoHistory.query,
        queryKey: geoHistory.queryKey,
        mentioned: geoHistory.mentioned,
        cited: geoHistory.cited,
        createdAt: geoHistory.createdAt,
        organizationId: geoHistory.organizationId,
      })
      .from(geoHistory)
      .where(eq(geoHistory.organizationId, organizationId))
      .orderBy(desc(geoHistory.createdAt)),
  ]);

  const plan = planGeoAudits({
    organizationId,
    queries: queryRows.filter((row) => row.organizationId === organizationId),
    history: historyRows.flatMap((row) => {
      if (
        row.organizationId !== organizationId ||
        !isGeoAnswer(row.mentioned) ||
        !isGeoAnswer(row.cited)
      ) {
        return [];
      }
      return [
        {
          id: row.id,
          organizationId,
          queryId: row.queryId,
          query: row.query,
          queryKey: row.queryKey,
          mentioned: row.mentioned,
          cited: row.cited,
          createdAt: row.createdAt,
        },
      ];
    }),
  });

  const now = new Date();
  let upserted = 0;
  for (const draft of plan.toUpsert) {
    if (draft.organizationId !== organizationId) continue;
    await db
      .insert(geoAudits)
      .values({
        organizationId,
        queryId: draft.queryId,
        queryKey: draft.queryKey,
        query: draft.query,
        historyId: draft.historyId,
        mentioned: draft.mentioned,
        cited: draft.cited,
        status: draft.status,
        why: draft.why,
        source: draft.source,
        detectedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [geoAudits.organizationId, geoAudits.queryId],
        set: {
          queryKey: draft.queryKey,
          query: draft.query,
          historyId: draft.historyId,
          mentioned: draft.mentioned,
          cited: draft.cited,
          status: draft.status,
          why: draft.why,
          source: draft.source,
          detectedAt: now,
          updatedAt: now,
        },
      });
    upserted += 1;
  }

  return { upserted };
}

export async function getGeoAudits(
  db: AppDb,
  organizationId: string,
): Promise<GeoAuditView[]> {
  const rows = await db
    .select({
      queryId: geoAudits.queryId,
      query: geoAudits.query,
      queryKey: geoAudits.queryKey,
      mentioned: geoAudits.mentioned,
      cited: geoAudits.cited,
      why: geoAudits.why,
      status: geoAudits.status,
      organizationId: geoAudits.organizationId,
    })
    .from(geoAudits)
    .where(
      and(
        eq(geoAudits.organizationId, organizationId),
        eq(geoAudits.status, GEO_AUDIT_STATUS_GAP),
      ),
    )
    .orderBy(desc(geoAudits.detectedAt));

  return auditsToShow(
    rows.flatMap((row) => {
      if (
        row.organizationId !== organizationId ||
        !isGeoAnswer(row.mentioned) ||
        !isGeoAnswer(row.cited)
      ) {
        return [];
      }
      return [
        {
          organizationId,
          queryId: row.queryId,
          queryKey: row.queryKey,
          query: row.query,
          historyId: "",
          mentioned: row.mentioned,
          cited: row.cited,
          status: GEO_AUDIT_STATUS_GAP,
          why: row.why,
          source: GEO_AUDIT_SOURCE_STORED_HISTORY,
        },
      ];
    }),
  );
}
