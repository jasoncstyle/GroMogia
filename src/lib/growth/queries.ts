import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  availabilityConstraints,
  bookings,
  brandSettings,
  businessBrains,
  decisionRecords,
  events,
  evidencePolicies,
  growthActions,
  growthGoals,
  growthPlans,
  growthSettings,
  leadRecords,
  offers,
  payments,
} from "@/lib/db/schema";
import { liveGoalProgress } from "@/lib/growth/progress";
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
    eventRows,
    bookingRows,
    paymentRows,
    leadRows,
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
    db.select().from(events).where(eq(events.organizationId, organizationId)),
    db.select().from(bookings).where(eq(bookings.organizationId, organizationId)),
    db.select().from(payments).where(eq(payments.organizationId, organizationId)),
    db.select().from(leadRecords).where(eq(leadRecords.organizationId, organizationId)),
  ]);

  const bookingOfferById = new Map(
    bookingRows.map((booking) => [booking.id, booking.offerId]),
  );
  const facts = {
    now: new Date(),
    leads: leadRows.map((lead) => ({
      createdAt: lead.createdAt,
      offerId: lead.offerId,
    })),
    bookings: bookingRows.map((booking) => ({
      createdAt: booking.createdAt,
      offerId: booking.offerId,
      eventId: booking.eventId,
      status: booking.status,
    })),
    payments: paymentRows.map((payment) => ({
      createdAt: payment.createdAt,
      amountCents: payment.amountCents,
      kind: payment.kind,
      offerId: bookingOfferById.get(payment.bookingId ?? "") ?? null,
    })),
    events: eventRows.map((event) => ({
      id: event.id,
      offerId: event.offerId,
      startsAt: event.startsAt,
      capacity: event.capacity,
      status: event.status,
    })),
  };

  const goals = goalRows.map((goal) => {
    const live = liveGoalProgress(goal, facts);
    return {
      ...goal,
      liveCurrentValue: live.currentValue,
      liveNote: live.note,
      liveComputable: live.computable,
      progressPercent: live.computable
        ? live.progressPercent
        : goalProgressPercent(goal.currentValue, goal.targetValue),
    };
  });

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

export async function getGrowthLinkOptions(organizationId: string) {
  const db = getDb();
  if (!db) return { offers: [], goals: [] };

  const [linkOffers, linkGoals] = await Promise.all([
    db
      .select({ id: offers.id, name: offers.name, status: offers.status })
      .from(offers)
      .where(eq(offers.organizationId, organizationId))
      .orderBy(desc(offers.updatedAt)),
    db
      .select({
        id: growthGoals.id,
        title: growthGoals.title,
        status: growthGoals.status,
      })
      .from(growthGoals)
      .where(eq(growthGoals.organizationId, organizationId))
      .orderBy(desc(growthGoals.updatedAt)),
  ]);

  return {
    offers: linkOffers.filter((offer) => offer.status !== "archived"),
    goals: linkGoals.filter(
      (goal) => goal.status !== "cancelled" && goal.status !== "missed",
    ),
  };
}
