import { and, desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { aiActionLogs, payments } from "@/lib/db/schema";
import {
  buildIntelligenceBrief,
  type IntelligenceBrief,
  type IntelligenceFacts,
} from "@/lib/intelligence/observe";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
import { getMarketingSnapshot } from "@/lib/phase3/queries";

export async function getIntelligenceFacts(
  organizationId: string,
  options: { showFinancials: boolean },
): Promise<IntelligenceFacts> {
  const [dashboard, marketing, charges, growth] = await Promise.all([
    getDashboardSnapshot(organizationId),
    getMarketingSnapshot(organizationId),
    countChargesThisMonth(organizationId),
    getGrowthSnapshot(organizationId),
  ]);

  const activeGoal = (growth?.activeGoals ?? []).find((goal) => goal.shareNote);

  return {
    websiteConnected: Boolean(dashboard.website?.publicUrl),
    stripeConnected: dashboard.stripeConnected,
    openLeadCount: dashboard.openLeadCount,
    customerCount: dashboard.customerCount,
    contactCount: dashboard.contactCount,
    paymentTotalCents: options.showFinancials ? dashboard.paymentTotalCents : 0,
    chargeCountThisMonth: charges,
    unattributedRevenueCents: options.showFinancials
      ? marketing.unattributedRevenueCents
      : 0,
    upcomingEventCount: dashboard.upcomingEvents.filter((event) => {
      if (!event.startsAt) return false;
      return event.startsAt.getTime() >= Date.now();
    }).length,
    sources: marketing.rows,
    showFinancials: options.showFinancials,
    activeGoalShare: activeGoal
      ? { title: activeGoal.title, note: activeGoal.shareNote }
      : null,
  };
}

export async function getIntelligencePageData(
  organizationId: string,
  options: { showFinancials: boolean },
) {
  const facts = await getIntelligenceFacts(organizationId, options);
  const brief = buildIntelligenceBrief(facts);
  const logs = await getRecentInsightLogs(organizationId);
  return { facts, brief, logs };
}

export async function getRecentInsightLogs(organizationId: string) {
  const db = getDb();
  if (!db) return [] as { id: string; createdAt: Date; output: string; status: string }[];

  return db
    .select({
      id: aiActionLogs.id,
      createdAt: aiActionLogs.createdAt,
      output: aiActionLogs.output,
      status: aiActionLogs.status,
    })
    .from(aiActionLogs)
    .where(eq(aiActionLogs.organizationId, organizationId))
    .orderBy(desc(aiActionLogs.createdAt))
    .limit(5);
}

export function parseStoredBrief(output: string): IntelligenceBrief | null {
  try {
    const parsed = JSON.parse(output) as { brief?: IntelligenceBrief };
    if (parsed.brief?.headline && Array.isArray(parsed.brief.observations)) {
      return parsed.brief;
    }
  } catch {
    return null;
  }
  return null;
}

async function countChargesThisMonth(organizationId: string): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.kind, "charge"),
        sql`${payments.providerObjectId} like 'ch_%'`,
        gte(payments.createdAt, monthStart),
      ),
    );

  return Number(row?.value ?? 0);
}
