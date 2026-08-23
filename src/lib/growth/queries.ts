import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  availabilityConstraints,
  brandSettings,
  decisionRecords,
  evidencePolicies,
  growthActions,
  growthGoals,
  growthPlans,
  growthSettings,
  offers,
  businessBrains,
} from "@/lib/db/schema";
import { goalProgressPercent } from "@/lib/growth/types";

export async function getGrowthSnapshot(organizationId: string) {
  const db = getDb();
  if (!db) return null;

  const [
    brainRows,
    brandRows,
    offerRows,
    constraintRows,
    goalRows,
    planRows,
    decisionRows,
    actionRows,
    settingRows,
    policyRows,
  ] = await Promise.all([
    db
      .select()
      .from(businessBrains)
      .where(eq(businessBrains.organizationId, organizationId))
      .limit(1),
    db
      .select()
      .from(brandSettings)
      .where(eq(brandSettings.organizationId, organizationId))
      .limit(1),
    db
      .select()
      .from(offers)
      .where(eq(offers.organizationId, organizationId))
      .orderBy(desc(offers.updatedAt)),
    db
      .select()
      .from(availabilityConstraints)
      .where(eq(availabilityConstraints.organizationId, organizationId))
      .orderBy(desc(availabilityConstraints.updatedAt)),
    db
      .select()
      .from(growthGoals)
      .where(eq(growthGoals.organizationId, organizationId))
      .orderBy(desc(growthGoals.updatedAt)),
    db
      .select()
      .from(growthPlans)
      .where(eq(growthPlans.organizationId, organizationId))
      .orderBy(desc(growthPlans.updatedAt)),
    db
      .select()
      .from(decisionRecords)
      .where(eq(decisionRecords.organizationId, organizationId))
      .orderBy(desc(decisionRecords.createdAt)),
    db
      .select()
      .from(growthActions)
      .where(eq(growthActions.organizationId, organizationId))
      .orderBy(desc(growthActions.updatedAt)),
    db
      .select()
      .from(growthSettings)
      .where(eq(growthSettings.organizationId, organizationId))
      .limit(1),
    db
      .select()
      .from(evidencePolicies)
      .where(eq(evidencePolicies.organizationId, organizationId)),
  ]);

  const goals = goalRows.map((goal) => ({
    ...goal,
    progressPercent: goalProgressPercent(goal.currentValue, goal.targetValue),
  }));

  return {
    brain: brainRows[0] ?? null,
    brand: brandRows[0] ?? null,
    offers: offerRows,
    constraints: constraintRows,
    goals,
    plans: planRows,
    decisions: decisionRows,
    actions: actionRows,
    settings: settingRows[0] ?? null,
    policies: policyRows,
    activeGoals: goals.filter((goal) => goal.status === "active"),
    inferredOffers: offerRows.filter((offer) => offer.discoveryStatus === "inferred"),
    inferredGoals: goals.filter((goal) => goal.discoveryStatus === "inferred"),
    latestNoChange: decisionRows.find((row) => row.decisionType === "no_change") ?? null,
    awaitingApproval: actionRows.filter((row) => row.status === "awaiting_approval"),
  };
}

export async function getOfferById(organizationId: string, offerId: string) {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(offers)
    .where(and(eq(offers.organizationId, organizationId), eq(offers.id, offerId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getGoalById(organizationId: string, goalId: string) {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(growthGoals)
    .where(
      and(eq(growthGoals.organizationId, organizationId), eq(growthGoals.id, goalId)),
    )
    .limit(1);
  return rows[0] ?? null;
}
