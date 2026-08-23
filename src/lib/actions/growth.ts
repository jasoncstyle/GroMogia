"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import {
  availabilityConstraints,
  bookings,
  brandSettings,
  businessBrains,
  decisionRecords,
  events,
  growthActions,
  growthGoals,
  growthPlans,
  growthSettings,
  offers,
  payments,
  websites,
} from "@/lib/db/schema";
import { assertSameOrganization } from "@/lib/db/tenant";
import { discoverFromConnectedData, normalizeOfferKey } from "@/lib/growth/discover";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { REVIEW_KINDS } from "@/lib/growth/review";
import {
  CONSTRAINT_TYPES,
  DECISION_TYPES,
  GOAL_STATUSES,
  GOAL_TYPES,
  OFFER_TYPES,
  PRICING_MODELS,
  REVIEW_FREQUENCIES,
  WEEKDAYS,
  isGoalAchieved,
  listFromCommaText,
  parseOptionalInt,
} from "@/lib/growth/types";
import { dollarsToCents } from "@/lib/money";
import { hasPermission, type Permission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

const moneyField = z.string().optional().default("");
const optionalId = z.string().optional().default("");

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalUuid(value: string): string | null {
  return value && value.length > 0 ? value : null;
}

function moneyCents(value: string): number | null {
  if (!value.trim()) return null;
  return dollarsToCents(value);
}

function revalidateGrowth() {
  revalidatePath("/app");
  revalidatePath("/app/business");
  revalidatePath("/app/offers");
  revalidatePath("/app/goals");
  revalidatePath("/app/decisions");
  revalidatePath("/app/growth-review");
}

async function requirePermission(permission: Permission) {
  const session = await requireOrgSession();
  if (!hasPermission(session.permissions, permission)) {
    throw new Error("You do not have permission to do that.");
  }
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  return { session, db };
}

const brainSchema = z.object({
  industry: z.string().trim().max(120).optional().default(""),
  businessModel: z.string().trim().max(200).optional().default(""),
  locations: z.string().trim().max(1000).optional().default(""),
  serviceAreas: z.string().trim().max(1000).optional().default(""),
  operatingHours: z.string().trim().max(1000).optional().default(""),
  seasonality: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(4000).optional().default(""),
  discoveryStatus: z
    .enum(["not_started", "inferred", "confirmed"])
    .optional()
    .default("not_started"),
});

export async function updateBusinessBrain(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the Business Brain.", async () => {
    const { session, db } = await requirePermission("manage_settings");
    const parsed = brainSchema.parse({
      industry: formData.get("industry") ?? "",
      businessModel: formData.get("businessModel") ?? "",
      locations: formData.get("locations") ?? "",
      serviceAreas: formData.get("serviceAreas") ?? "",
      operatingHours: formData.get("operatingHours") ?? "",
      seasonality: formData.get("seasonality") ?? "",
      notes: formData.get("notes") ?? "",
      discoveryStatus: formData.get("discoveryStatus") ?? "not_started",
    });

    await db
      .insert(businessBrains)
      .values({
        organizationId: session.organizationId,
        industry: parsed.industry,
        businessModel: parsed.businessModel,
        locations: listFromCommaText(parsed.locations),
        serviceAreas: listFromCommaText(parsed.serviceAreas),
        operatingHours: parsed.operatingHours,
        seasonality: parsed.seasonality,
        notes: parsed.notes,
        discoveryStatus: parsed.discoveryStatus,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: businessBrains.organizationId,
        set: {
          industry: parsed.industry,
          businessModel: parsed.businessModel,
          locations: listFromCommaText(parsed.locations),
          serviceAreas: listFromCommaText(parsed.serviceAreas),
          operatingHours: parsed.operatingHours,
          seasonality: parsed.seasonality,
          notes: parsed.notes,
          discoveryStatus: parsed.discoveryStatus,
          updatedAt: new Date(),
        },
      });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "business_brain.updated",
      targetType: "business_brain",
      targetId: session.organizationId,
    });
    revalidateGrowth();
    return "Business saved";
  });
}

const offerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional().default(""),
  offerType: z.enum(OFFER_TYPES).optional().default("other"),
  category: z.string().trim().max(80).optional().default(""),
  pricingModel: z.enum(PRICING_MODELS).optional().default("unspecified"),
  price: moneyField,
  cost: moneyField,
  availabilityModel: z.enum(CONSTRAINT_TYPES).optional().default("unconstrained"),
  location: z.string().trim().max(200).optional().default(""),
  conversionUrl: z.string().trim().max(500).optional().default(""),
  status: z.enum(["draft", "active", "paused", "archived"]).optional().default("active"),
});

export async function createOffer(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the offer.", async () => {
    const { session, db } = await requirePermission("manage_offers");
    const parsed = offerSchema.parse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      offerType: formData.get("offerType") ?? "other",
      category: formData.get("category") ?? "",
      pricingModel: formData.get("pricingModel") ?? "unspecified",
      price: formData.get("price") ?? "",
      cost: formData.get("cost") ?? "",
      availabilityModel: formData.get("availabilityModel") ?? "unconstrained",
      location: formData.get("location") ?? "",
      conversionUrl: formData.get("conversionUrl") ?? "",
      status: formData.get("status") ?? "active",
    });

    const offerId = crypto.randomUUID();
    const priceCents = moneyCents(parsed.price);
    const costCents = moneyCents(parsed.cost);
    await db.insert(offers).values({
      id: offerId,
      organizationId: session.organizationId,
      name: parsed.name,
      description: parsed.description,
      offerType: parsed.offerType,
      category: parsed.category,
      pricingModel: parsed.pricingModel,
      priceCents,
      costCents,
      estimatedMarginCents:
        priceCents != null && costCents != null ? priceCents - costCents : null,
      availabilityModel: parsed.availabilityModel,
      location: parsed.location,
      conversionUrl: parsed.conversionUrl,
      status: parsed.status,
      source: "manual",
      discoveryStatus: "confirmed",
      confidence: 100,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "offer.created",
      targetType: "offer",
      targetId: offerId,
    });
    revalidateGrowth();
    return "Offer saved";
  });
}

const constraintSchema = z.object({
  offerId: optionalId,
  constraintType: z.enum(CONSTRAINT_TYPES),
  unit: z.string().trim().max(40).optional().default(""),
  totalAvailability: z.string().optional().default(""),
  remainingAvailability: z.string().optional().default(""),
  resourceName: z.string().trim().max(120).optional().default(""),
  startsOn: z.string().optional().default(""),
  endsOn: z.string().optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
});

export async function createConstraint(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the constraint.", async () => {
    const { session, db } = await requirePermission("manage_offers");
    const parsed = constraintSchema.parse({
      offerId: formData.get("offerId") ?? "",
      constraintType: formData.get("constraintType"),
      unit: formData.get("unit") ?? "",
      totalAvailability: formData.get("totalAvailability") ?? "",
      remainingAvailability: formData.get("remainingAvailability") ?? "",
      resourceName: formData.get("resourceName") ?? "",
      startsOn: formData.get("startsOn") ?? "",
      endsOn: formData.get("endsOn") ?? "",
      notes: formData.get("notes") ?? "",
    });

    const constraintId = crypto.randomUUID();
    await db.insert(availabilityConstraints).values({
      id: constraintId,
      organizationId: session.organizationId,
      offerId: optionalUuid(parsed.offerId),
      constraintType: parsed.constraintType,
      unit: parsed.unit,
      totalAvailability: parseOptionalInt(parsed.totalAvailability),
      remainingAvailability: parseOptionalInt(parsed.remainingAvailability),
      resourceName: parsed.resourceName,
      startsOn: parseDate(parsed.startsOn),
      endsOn: parseDate(parsed.endsOn),
      notes: parsed.notes,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "constraint.created",
      targetType: "availability_constraint",
      targetId: constraintId,
    });
    revalidateGrowth();
    return "Constraint saved";
  });
}

const goalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional().default(""),
  goalType: z.enum(GOAL_TYPES).optional().default("custom"),
  priority: z.enum(["low", "normal", "high"]).optional().default("normal"),
  startsOn: z.string().optional().default(""),
  deadline: z.string().optional().default(""),
  targetMetric: z.string().trim().max(80).optional().default(""),
  targetValue: z.string().optional().default(""),
  baselineValue: z.string().optional().default(""),
  currentValue: z.string().optional().default(""),
  unit: z.string().trim().max(40).optional().default(""),
  offerId: optionalId,
  customerSegment: z.string().trim().max(160).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  expectedRevenue: moneyField,
  totalBudget: moneyField,
  successDefinition: z.string().trim().max(1000).optional().default(""),
});

export async function createGoal(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the goal.", async () => {
    const { session, db } = await requirePermission("create_goals");
    const parsed = goalSchema.parse({
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      goalType: formData.get("goalType") ?? "custom",
      priority: formData.get("priority") ?? "normal",
      startsOn: formData.get("startsOn") ?? "",
      deadline: formData.get("deadline") ?? "",
      targetMetric: formData.get("targetMetric") ?? "",
      targetValue: formData.get("targetValue") ?? "",
      baselineValue: formData.get("baselineValue") ?? "",
      currentValue: formData.get("currentValue") ?? "",
      unit: formData.get("unit") ?? "",
      offerId: formData.get("offerId") ?? "",
      customerSegment: formData.get("customerSegment") ?? "",
      location: formData.get("location") ?? "",
      expectedRevenue: formData.get("expectedRevenue") ?? "",
      totalBudget: formData.get("totalBudget") ?? "",
      successDefinition: formData.get("successDefinition") ?? "",
    });

    const goalId = crypto.randomUUID();
    const currentValue = parseOptionalInt(parsed.currentValue) ?? 0;
    const targetValue = parseOptionalInt(parsed.targetValue);
    await db.insert(growthGoals).values({
      id: goalId,
      organizationId: session.organizationId,
      title: parsed.title,
      description: parsed.description,
      goalType: parsed.goalType,
      priority: parsed.priority,
      startsOn: parseDate(parsed.startsOn),
      deadline: parseDate(parsed.deadline),
      targetMetric: parsed.targetMetric,
      targetValue,
      baselineValue: parseOptionalInt(parsed.baselineValue),
      currentValue,
      unit: parsed.unit,
      offerId: optionalUuid(parsed.offerId),
      customerSegment: parsed.customerSegment,
      location: parsed.location,
      expectedRevenueCents: moneyCents(parsed.expectedRevenue),
      totalBudgetCents: moneyCents(parsed.totalBudget),
      successDefinition: parsed.successDefinition,
      createdBy: session.userId,
      status: isGoalAchieved(currentValue, targetValue) ? "achieved" : "active",
      completedAt: isGoalAchieved(currentValue, targetValue) ? new Date() : null,
      source: "manual",
      discoveryStatus: "confirmed",
      confidence: 100,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "goal.created",
      targetType: "growth_goal",
      targetId: goalId,
    });
    revalidateGrowth();
    return "Goal saved";
  });
}

const goalProgressSchema = z.object({
  goalId: z.string().uuid(),
  currentValue: z.string().min(1),
  status: z.enum(GOAL_STATUSES).optional(),
});

export async function updateGoalProgress(formData: FormData): Promise<ActionResult> {
  return runAction("Could not update the goal.", async () => {
    const { session, db } = await requirePermission("modify_goals");
    const parsed = goalProgressSchema.parse({
      goalId: formData.get("goalId"),
      currentValue: formData.get("currentValue"),
      status: formData.get("status") || undefined,
    });

    const existing = await db
      .select()
      .from(growthGoals)
      .where(eq(growthGoals.id, parsed.goalId))
      .limit(1);
    const goal = existing[0];
    if (!goal) throw new Error("Goal not found.");
    assertSameOrganization(goal.organizationId, session.organizationId);

    const currentValue = parseOptionalInt(parsed.currentValue) ?? 0;
    const achieved = isGoalAchieved(currentValue, goal.targetValue);
    const status = parsed.status ?? (achieved ? "achieved" : goal.status);

    await db
      .update(growthGoals)
      .set({
        currentValue,
        status,
        completedAt: status === "achieved" ? goal.completedAt ?? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(growthGoals.id, parsed.goalId),
          eq(growthGoals.organizationId, session.organizationId),
        ),
      );

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "goal.updated",
      targetType: "growth_goal",
      targetId: parsed.goalId,
    });
    revalidateGrowth();
    return "Goal updated";
  });
}

const planSchema = z.object({
  goalId: z.string().uuid(),
  strategySummary: z.string().trim().min(1).max(4000),
  budget: moneyField,
  status: z.enum(["draft", "active", "approved", "rejected", "superseded"]).optional().default("draft"),
});

export async function createGrowthPlan(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the plan.", async () => {
    const { session, db } = await requirePermission("modify_goals");
    const parsed = planSchema.parse({
      goalId: formData.get("goalId"),
      strategySummary: formData.get("strategySummary"),
      budget: formData.get("budget") ?? "",
      status: formData.get("status") ?? "draft",
    });

    const existing = await db
      .select()
      .from(growthGoals)
      .where(eq(growthGoals.id, parsed.goalId))
      .limit(1);
    const goal = existing[0];
    if (!goal) throw new Error("Goal not found.");
    assertSameOrganization(goal.organizationId, session.organizationId);

    const prior = await db
      .select({ version: growthPlans.version })
      .from(growthPlans)
      .where(
        and(
          eq(growthPlans.organizationId, session.organizationId),
          eq(growthPlans.goalId, parsed.goalId),
        ),
      );
    const version = prior.reduce((max, row) => Math.max(max, row.version), 0) + 1;
    const planId = crypto.randomUUID();

    await db.insert(growthPlans).values({
      id: planId,
      organizationId: session.organizationId,
      goalId: parsed.goalId,
      strategySummary: parsed.strategySummary,
      status: parsed.status,
      version,
      budgetCents: moneyCents(parsed.budget),
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_plan.created",
      targetType: "growth_plan",
      targetId: planId,
      metadata: { version },
    });
    revalidateGrowth();
    return `Plan v${version} saved`;
  });
}

const settingsSchema = z.object({
  reviewFrequency: z.enum(REVIEW_FREQUENCIES),
  reviewDay: z.enum(WEEKDAYS),
  reviewTime: z.string().trim().min(1).max(8),
  timezone: z.string().trim().min(1).max(80),
});

export async function updateGrowthSettings(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the review schedule.", async () => {
    const { session, db } = await requirePermission("manage_settings");
    const parsed = settingsSchema.parse({
      reviewFrequency: formData.get("reviewFrequency"),
      reviewDay: formData.get("reviewDay"),
      reviewTime: formData.get("reviewTime"),
      timezone: formData.get("timezone"),
    });

    await db
      .insert(growthSettings)
      .values({
        organizationId: session.organizationId,
        ...parsed,
        autonomyLevel: 2,
      })
      .onConflictDoUpdate({
        target: growthSettings.organizationId,
        set: {
          ...parsed,
          updatedAt: new Date(),
        },
      });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_settings.updated",
      targetType: "growth_settings",
      targetId: session.organizationId,
    });
    revalidateGrowth();
    return "Review schedule saved";
  });
}

const decisionSchema = z.object({
  goalId: optionalId,
  decisionType: z.enum(DECISION_TYPES),
  recommendation: z.string().trim().min(1).max(2000),
  rationale: z.string().trim().max(4000).optional().default(""),
  supportingEvidence: z.string().trim().max(4000).optional().default(""),
  evidenceWindow: z.string().trim().max(200).optional().default(""),
  confidence: z.string().optional().default(""),
});

export async function recordDecision(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the decision.", async () => {
    const { session, db } = await requirePermission("view_decision_history");
    const parsed = decisionSchema.parse({
      goalId: formData.get("goalId") ?? "",
      decisionType: formData.get("decisionType"),
      recommendation: formData.get("recommendation"),
      rationale: formData.get("rationale") ?? "",
      supportingEvidence: formData.get("supportingEvidence") ?? "",
      evidenceWindow: formData.get("evidenceWindow") ?? "",
      confidence: formData.get("confidence") ?? "",
    });

    const decisionId = crypto.randomUUID();
    await db.insert(decisionRecords).values({
      id: decisionId,
      organizationId: session.organizationId,
      goalId: optionalUuid(parsed.goalId),
      decisionType: parsed.decisionType,
      recommendation: parsed.recommendation,
      rationale: parsed.rationale,
      supportingEvidence: parsed.supportingEvidence,
      evidenceWindow: parsed.evidenceWindow,
      confidence: parseOptionalInt(parsed.confidence) ?? 0,
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "decision.recorded",
      targetType: "decision_record",
      targetId: decisionId,
    });
    revalidateGrowth();
    return parsed.decisionType === "no_change"
      ? "No-change decision saved"
      : "Decision saved";
  });
}

const reviewKindSchema = z.object({
  kind: z.enum(REVIEW_KINDS),
});

export async function saveGrowthReview(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the growth review.", async () => {
    const { session, db } = await requirePermission("view_decision_history");
    const { kind } = reviewKindSchema.parse({ kind: formData.get("kind") });
    const snapshot = await getGrowthSnapshot(session.organizationId);
    if (!snapshot) throw new Error("Could not load connected data for this review.");
    const review = kind === "monthly" ? snapshot.monthlyReview : snapshot.weeklyReview;

    const decisionType =
      review.primary.kind === "no_change_yet"
        ? "no_change"
        : review.primary.classification === "operational"
          ? "operational"
          : review.primary.classification === "strategic"
            ? "strategic"
            : "recommend";

    const decisionId = crypto.randomUUID();
    await db.insert(decisionRecords).values({
      id: decisionId,
      organizationId: session.organizationId,
      goalId: review.primary.goalId,
      decisionType,
      recommendation: review.headline,
      rationale: `${review.summary} ${review.whatShouldHappenNext}`,
      supportingEvidence: review.whatChanged,
      evidenceWindow: review.periodLabel,
      confidence: review.primary.confidence,
      alternatives: review.recommendations
        .map((item) => `${item.title}: ${item.recommendation}`)
        .join("\n"),
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_review.saved",
      targetType: "decision_record",
      targetId: decisionId,
      metadata: { kind, decisionType },
    });
    revalidateGrowth();
    return review.primary.kind === "no_change_yet"
      ? "Review saved. GroovGro recorded that nothing should change yet."
      : "Review saved to Decision History. GroovGro will not execute it.";
  });
}

const actionSchema = z.object({
  goalId: optionalId,
  description: z.string().trim().min(1).max(2000),
  module: z.string().trim().max(80).optional().default(""),
  risk: z.enum(["operational", "optimization", "strategic"]).optional().default("optimization"),
});

export async function proposeGrowthAction(formData: FormData): Promise<ActionResult> {
  return runAction("Could not save the proposed action.", async () => {
    const { session, db } = await requirePermission("modify_goals");
    const parsed = actionSchema.parse({
      goalId: formData.get("goalId") ?? "",
      description: formData.get("description"),
      module: formData.get("module") ?? "",
      risk: formData.get("risk") ?? "optimization",
    });

    const actionId = crypto.randomUUID();
    await db.insert(growthActions).values({
      id: actionId,
      organizationId: session.organizationId,
      goalId: optionalUuid(parsed.goalId),
      description: parsed.description,
      module: parsed.module,
      risk: parsed.risk,
      status: "proposed",
      proposedBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_action.proposed",
      targetType: "growth_action",
      targetId: actionId,
    });
    revalidateGrowth();
    return "Proposed action saved. GroovGro will not execute it.";
  });
}

export async function reviewConnectedBusiness(
  _formData?: FormData,
): Promise<ActionResult> {
  return runAction("Could not review connected data.", async () => {
    const { session, db } = await requirePermission("manage_offers");
    const organizationId = session.organizationId;

    const [
      eventRows,
      bookingRows,
      paymentRows,
      offerRows,
      goalRows,
      constraintRows,
      websiteRows,
      brandRows,
      brainRows,
    ] = await Promise.all([
      db.select().from(events).where(eq(events.organizationId, organizationId)),
      db.select().from(bookings).where(eq(bookings.organizationId, organizationId)),
      db.select().from(payments).where(eq(payments.organizationId, organizationId)),
      db.select().from(offers).where(eq(offers.organizationId, organizationId)),
      db.select().from(growthGoals).where(eq(growthGoals.organizationId, organizationId)),
      db
        .select()
        .from(availabilityConstraints)
        .where(eq(availabilityConstraints.organizationId, organizationId)),
      db.select().from(websites).where(eq(websites.organizationId, organizationId)).limit(1),
      db.select().from(brandSettings).where(eq(brandSettings.organizationId, organizationId)).limit(1),
      db.select().from(businessBrains).where(eq(businessBrains.organizationId, organizationId)).limit(1),
    ]);

    const discovery = discoverFromConnectedData({
      events: eventRows,
      bookings: bookingRows,
      payments: paymentRows,
      existingOffers: offerRows,
      existingGoals: goalRows,
      existingConstraints: constraintRows,
      websiteUrl: websiteRows[0]?.publicUrl ?? "",
      brandDescription: brandRows[0]?.description ?? "",
    });

    const createdOfferIds = new Map<string, string>();
    let offersCreated = 0;
    for (const proposal of discovery.offers) {
      const offerId = crypto.randomUUID();
      await db.insert(offers).values({
        id: offerId,
        organizationId,
        name: proposal.name,
        description: proposal.description,
        offerType: proposal.offerType,
        availabilityModel: proposal.availabilityModel,
        priceCents: proposal.priceCents,
        location: proposal.location,
        conversionUrl: proposal.conversionUrl,
        externalProvider: proposal.externalProvider,
        externalId: proposal.externalId,
        status: "draft",
        source: "inferred",
        discoveryStatus: "inferred",
        inferredFrom: proposal.inferredFrom,
        confidence: proposal.confidence,
      });
      createdOfferIds.set(proposal.externalId, offerId);
      offersCreated += 1;
      if (proposal.eventIds.length > 0) {
        await db
          .update(events)
          .set({ offerId, updatedAt: new Date() })
          .where(
            and(
              eq(events.organizationId, organizationId),
              inArray(events.id, proposal.eventIds),
            ),
          );
        await db
          .update(bookings)
          .set({ offerId, updatedAt: new Date() })
          .where(
            and(
              eq(bookings.organizationId, organizationId),
              inArray(bookings.eventId, proposal.eventIds),
            ),
          );
      }
    }

    let constraintsCreated = 0;
    for (const proposal of discovery.constraints) {
      const offerId =
        createdOfferIds.get(proposal.offerExternalId) ??
        offerRows.find(
          (offer) =>
            offer.externalId === proposal.offerExternalId ||
            normalizeOfferKey(offer.name) === proposal.offerExternalId,
        )?.id ??
        null;
      await db.insert(availabilityConstraints).values({
        organizationId,
        offerId,
        constraintType: proposal.constraintType,
        unit: proposal.unit,
        totalAvailability: proposal.totalAvailability,
        remainingAvailability: proposal.remainingAvailability,
        startsOn: proposal.startsOn,
        endsOn: proposal.endsOn,
        source: "inferred",
        externalId: proposal.eventId,
        notes: proposal.notes,
      });
      constraintsCreated += 1;
    }

    let goalsCreated = 0;
    if (hasPermission(session.permissions, "create_goals")) {
      for (const proposal of discovery.goals) {
        await db.insert(growthGoals).values({
          organizationId,
          title: proposal.title,
          description: proposal.description,
          goalType: proposal.goalType,
          status: "draft",
          targetMetric: proposal.unit,
          targetValue: proposal.targetValue,
          baselineValue: proposal.baselineValue,
          currentValue: proposal.currentValue,
          unit: proposal.unit,
          successDefinition: proposal.successDefinition,
          createdBy: session.userId,
          source: "inferred",
          discoveryStatus: "inferred",
          inferredFrom: proposal.inferredFrom,
          confidence: proposal.confidence,
        });
        goalsCreated += 1;
      }
    }

    const brain = brainRows[0];
    await db
      .insert(businessBrains)
      .values({
        organizationId,
        inferredSummary: discovery.brainSummary,
        inferredSource: discovery.brainSource,
        confidence: discovery.confidence,
        discoveryStatus:
          brain?.discoveryStatus === "confirmed" ? "confirmed" : "inferred",
      })
      .onConflictDoUpdate({
        target: businessBrains.organizationId,
        set: {
          inferredSummary: discovery.brainSummary,
          inferredSource: discovery.brainSource,
          confidence: discovery.confidence,
          discoveryStatus:
            brain?.discoveryStatus === "confirmed" ? "confirmed" : "inferred",
          updatedAt: new Date(),
        },
      });

    await recordAudit({
      organizationId,
      actorUserId: session.userId,
      action: "business_brain.reviewed",
      targetType: "business_brain",
      targetId: organizationId,
      metadata: { offersCreated, constraintsCreated, goalsCreated },
    });
    revalidateGrowth();

    if (offersCreated === 0 && goalsCreated === 0 && constraintsCreated === 0) {
      return "GroovGro did not find new drafts. Confirm or reject what is already waiting, or add your own.";
    }
    return `Drafted ${offersCreated} offer${offersCreated === 1 ? "" : "s"} and ${goalsCreated} suggested goal${goalsCreated === 1 ? "" : "s"}. Nothing is active until you confirm.`;
  });
}

const idSchema = z.object({ id: z.string().uuid() });

export async function confirmOffer(formData: FormData): Promise<ActionResult> {
  return runAction("Could not confirm the offer.", async () => {
    const { session, db } = await requirePermission("manage_offers");
    const { id } = idSchema.parse({ id: formData.get("id") });
    const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    if (!offer) throw new Error("Offer not found.");
    assertSameOrganization(offer.organizationId, session.organizationId);

    await db
      .update(offers)
      .set({
        status: "active",
        discoveryStatus: "confirmed",
        updatedAt: new Date(),
      })
      .where(and(eq(offers.id, id), eq(offers.organizationId, session.organizationId)));

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "offer.confirmed",
      targetType: "offer",
      targetId: id,
    });
    revalidateGrowth();
    return "Offer confirmed";
  });
}

export async function rejectOffer(formData: FormData): Promise<ActionResult> {
  return runAction("Could not reject the offer.", async () => {
    const { session, db } = await requirePermission("manage_offers");
    const { id } = idSchema.parse({ id: formData.get("id") });
    const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    if (!offer) throw new Error("Offer not found.");
    assertSameOrganization(offer.organizationId, session.organizationId);

    await db
      .update(offers)
      .set({
        status: "archived",
        discoveryStatus: "rejected",
        updatedAt: new Date(),
      })
      .where(and(eq(offers.id, id), eq(offers.organizationId, session.organizationId)));

    await db
      .update(events)
      .set({ offerId: null, updatedAt: new Date() })
      .where(
        and(eq(events.organizationId, session.organizationId), eq(events.offerId, id)),
      );
    await db
      .update(bookings)
      .set({ offerId: null, updatedAt: new Date() })
      .where(
        and(eq(bookings.organizationId, session.organizationId), eq(bookings.offerId, id)),
      );

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "offer.rejected",
      targetType: "offer",
      targetId: id,
    });
    revalidateGrowth();
    return "Offer rejected";
  });
}

export async function confirmGoal(formData: FormData): Promise<ActionResult> {
  return runAction("Could not confirm the goal.", async () => {
    const { session, db } = await requirePermission("modify_goals");
    const { id } = idSchema.parse({ id: formData.get("id") });
    const [goal] = await db.select().from(growthGoals).where(eq(growthGoals.id, id)).limit(1);
    if (!goal) throw new Error("Goal not found.");
    assertSameOrganization(goal.organizationId, session.organizationId);

    await db
      .update(growthGoals)
      .set({
        status: "active",
        discoveryStatus: "confirmed",
        updatedAt: new Date(),
      })
      .where(
        and(eq(growthGoals.id, id), eq(growthGoals.organizationId, session.organizationId)),
      );

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "goal.confirmed",
      targetType: "growth_goal",
      targetId: id,
    });
    revalidateGrowth();
    return "Goal confirmed";
  });
}

export async function rejectGoal(formData: FormData): Promise<ActionResult> {
  return runAction("Could not reject the goal.", async () => {
    const { session, db } = await requirePermission("modify_goals");
    const { id } = idSchema.parse({ id: formData.get("id") });
    const [goal] = await db.select().from(growthGoals).where(eq(growthGoals.id, id)).limit(1);
    if (!goal) throw new Error("Goal not found.");
    assertSameOrganization(goal.organizationId, session.organizationId);

    await db
      .update(growthGoals)
      .set({
        status: "cancelled",
        discoveryStatus: "rejected",
        updatedAt: new Date(),
      })
      .where(
        and(eq(growthGoals.id, id), eq(growthGoals.organizationId, session.organizationId)),
      );

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "goal.rejected",
      targetType: "growth_goal",
      targetId: id,
    });
    revalidateGrowth();
    return "Goal rejected";
  });
}
