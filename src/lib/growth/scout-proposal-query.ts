import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  searchConsoleSnapshots,
  seoProposalItems,
  seoProposalPacks,
} from "@/lib/db/schema";
import {
  SCOUT_STATUS_APPROVED,
  SCOUT_STATUS_PROPOSED,
  buildScoutGscExport,
  describeScoutInboxHeading,
  type ScoutGscExport,
  type ScoutItemStatus,
  type ScoutItemType,
} from "@/lib/growth/scout-proposals";

export type ScoutProposalRow = {
  id: string
  packId: string
  property: string
  source: string
  sourceRange: string
  externalId: string
  type: ScoutItemType
  priority: number
  evidence: string
  draft: string
  expectedEffect: string
  status: ScoutItemStatus
};

export async function getScoutProposalInbox(organizationId: string): Promise<{
  heading: string
  items: ScoutProposalRow[]
}> {
  const db = getDb();
  if (!db || !organizationId) {
    return { heading: describeScoutInboxHeading({ proposed: 0, approved: 0 }), items: [] };
  }
  const rows = await db
    .select({
      id: seoProposalItems.id,
      packId: seoProposalItems.packId,
      property: seoProposalPacks.property,
      source: seoProposalPacks.source,
      sourceRange: seoProposalPacks.sourceRange,
      externalId: seoProposalItems.externalId,
      type: seoProposalItems.type,
      priority: seoProposalItems.priority,
      evidence: seoProposalItems.evidence,
      draft: seoProposalItems.draft,
      expectedEffect: seoProposalItems.expectedEffect,
      status: seoProposalItems.status,
    })
    .from(seoProposalItems)
    .innerJoin(seoProposalPacks, eq(seoProposalItems.packId, seoProposalPacks.id))
    .where(eq(seoProposalItems.organizationId, organizationId))
    .orderBy(desc(seoProposalItems.createdAt))
    .limit(40);

  const items = rows.map((row) => ({
    ...row,
    type: row.type as ScoutItemType,
    status: row.status as ScoutItemStatus,
  }));
  const proposed = items.filter((item) => item.status === SCOUT_STATUS_PROPOSED).length;
  const approved = items.filter((item) => item.status === SCOUT_STATUS_APPROVED).length;
  return {
    heading: describeScoutInboxHeading({ proposed, approved }),
    items,
  };
}

export async function getScoutGscExport(
  organizationId: string,
): Promise<ScoutGscExport | null> {
  const db = getDb();
  if (!db || !organizationId) return null;
  const [latest] = await db
    .select()
    .from(searchConsoleSnapshots)
    .where(eq(searchConsoleSnapshots.organizationId, organizationId))
    .orderBy(desc(searchConsoleSnapshots.createdAt))
    .limit(1);
  if (!latest) return null;
  return buildScoutGscExport({
    pulledAt: latest.createdAt,
    propertyUrl: latest.propertyUrl,
    startDate: latest.startDate,
    endDate: latest.endDate,
    totals: latest.totals,
    queries: latest.topQueries,
    pages: latest.topPages,
  });
}
