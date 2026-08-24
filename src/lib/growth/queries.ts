import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { readGoogleSecret } from "@/lib/actions/search-console";
import { getDb } from "@/lib/db";
import {
  availabilityConstraints,
  bookings,
  brandSettings,
  businessBrains,
  contacts,
  decisionRecords,
  events,
  evidencePolicies,
  goalProgressSnapshots,
  growthActions,
  growthGoals,
  growthPlans,
  growthSettings,
  integrationConnections,
  leadRecords,
  leadStages,
  offers,
  payments,
  seoAudits,
  seoDrafts,
  searchConsoleSnapshots,
} from "@/lib/db/schema";
import { connectedProgressFacts, liveGoalProgress } from "@/lib/growth/progress";
import { findActivateCandidate } from "@/lib/growth/next-goal";
import { findPlanNeedingActions } from "@/lib/growth/plan-actions";
import { draftPlanExcerpt, findDraftPlanToApprove, findPlanDraftGoal } from "@/lib/growth/plan-draft";
import { coordinateNextStep } from "@/lib/growth/next-step";
import { isOpenOwnerWork, needsWhatChangedCheck } from "@/lib/growth/owner-work";
import { learningKindFromOutcome } from "@/lib/growth/work-learning";
import { generateGrowthReview } from "@/lib/growth/review";
import { websiteWasRead } from "@/lib/growth/status-alerts";
import {
  buildSpecialistReports,
  type SpecialistFacts,
} from "@/lib/growth/specialists";
import { goalProgressPercent } from "@/lib/growth/types";
import { getDashboardSnapshot } from "@/lib/phase2/queries";

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
    snapshotRows,
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
    db
      .select()
      .from(goalProgressSnapshots)
      .where(eq(goalProgressSnapshots.organizationId, organizationId))
      .orderBy(desc(goalProgressSnapshots.recordedAt)),
  ]);

  const facts = connectedProgressFacts({
    now: new Date(),
    leads: leadRows,
    bookings: bookingRows,
    payments: paymentRows,
    events: eventRows,
  });

  const historyByGoal = new Map<string, (typeof snapshotRows)[number][]>();
  for (const row of snapshotRows) {
    const list = historyByGoal.get(row.goalId) ?? [];
    if (list.length < 8) list.push(row);
    historyByGoal.set(row.goalId, list);
  }

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
      progressHistory: historyByGoal.get(goal.id) ?? [],
    };
  });

  const reviewFacts = {
    now: facts.now,
    goals: goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      status: goal.status,
      goalType: goal.goalType,
      liveCurrentValue: goal.liveCurrentValue,
      targetValue: goal.targetValue,
      progressPercent: goal.progressPercent,
      liveNote: goal.liveNote,
      discoveryStatus: goal.discoveryStatus,
    })),
    offers: offerRows.map((offer) => ({
      name: offer.name,
      discoveryStatus: offer.discoveryStatus,
    })),
    decisions: decisionRows.map((decision) => ({
      decisionType: decision.decisionType,
      recommendation: decision.recommendation,
      createdAt: decision.createdAt,
    })),
    policies: policyRows,
    settings: settingRows[0] ?? null,
    leads: leadRows.map((lead) => ({ createdAt: lead.createdAt })),
    bookings: bookingRows.map((booking) => ({ createdAt: booking.createdAt })),
    payments: paymentRows.map((payment) => ({
      createdAt: payment.createdAt,
      amountCents: payment.amountCents,
      kind: payment.kind,
    })),
  };

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
    weeklyReview: generateGrowthReview({ ...reviewFacts, kind: "weekly" }),
    monthlyReview: generateGrowthReview({ ...reviewFacts, kind: "monthly" }),
    activeGoals: goals.filter((goal) => goal.status === "active"),
    inferredOffers: offerRows.filter((offer) => offer.discoveryStatus === "inferred"),
    inferredGoals: goals.filter((goal) => goal.discoveryStatus === "inferred"),
    latestNoChange: decisionRows.find((row) => row.decisionType === "no_change") ?? null,
    awaitingApproval: actionRows.filter(
      (row) => row.status === "proposed" || row.status === "awaiting_approval",
    ),
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

async function getOpenSeoDrafts(organizationId: string) {
  const db = getDb();
  if (!db) return [];
  return db
    .select({
      id: seoDrafts.id,
      title: seoDrafts.title,
      proposedChange: seoDrafts.proposedChange,
      howToApply: seoDrafts.howToApply,
    })
    .from(seoDrafts)
    .where(
      and(
        eq(seoDrafts.organizationId, organizationId),
        eq(seoDrafts.status, "draft"),
        isNull(seoDrafts.builderSiteId),
      ),
    )
    .orderBy(desc(seoDrafts.createdAt));
}

async function getOpenLeadsAndStages(organizationId: string) {
  const db = getDb();
  if (!db) return { openLeads: [], leadStages: [] as { id: string; name: string }[] };

  const stages = await db
    .select({
      id: leadStages.id,
      name: leadStages.name,
      sortOrder: leadStages.sortOrder,
      isWon: leadStages.isWon,
      isLost: leadStages.isLost,
    })
    .from(leadStages)
    .where(eq(leadStages.organizationId, organizationId))
    .orderBy(asc(leadStages.sortOrder));
  const openStageIds = stages
    .filter((stage) => !stage.isWon && !stage.isLost)
    .map((stage) => stage.id);
  if (openStageIds.length === 0) {
    return {
      openLeads: [],
      leadStages: stages.map((stage) => ({ id: stage.id, name: stage.name })),
    };
  }

  const rows = await db
    .select({
      id: leadRecords.id,
      name: contacts.displayName,
      email: contacts.email,
      stageId: leadStages.id,
      stageName: leadStages.name,
      source: leadRecords.source,
      isWon: leadStages.isWon,
    })
    .from(leadRecords)
    .innerJoin(contacts, eq(leadRecords.contactId, contacts.id))
    .innerJoin(leadStages, eq(leadRecords.stageId, leadStages.id))
    .where(
      and(
        eq(leadRecords.organizationId, organizationId),
        inArray(leadRecords.stageId, openStageIds),
      ),
    )
    .orderBy(desc(leadRecords.createdAt))
    .limit(8);

  return {
    openLeads: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email ?? "",
      stageId: row.stageId,
      stageName: row.stageName,
      source: row.source,
      isWon: row.isWon,
    })),
    leadStages: stages.map((stage) => ({ id: stage.id, name: stage.name })),
  };
}

async function getLatestSeoSummary(organizationId: string) {
  const db = getDb();
  if (!db) {
    return {
      seoScore: null as number | null,
      seoSummary: "",
      seoFailCount: 0,
      seoWarnCount: 0,
      seoCheckedAt: null as Date | null,
      searchConsoleConnected: false,
      searchConsoleProperty: false,
      searchConsoleSnapshot: false,
    };
  }

  const [audits, googleRows, snapshotRows] = await Promise.all([
    db
      .select()
      .from(seoAudits)
      .where(eq(seoAudits.organizationId, organizationId))
      .orderBy(desc(seoAudits.createdAt))
      .limit(10),
    db
      .select({ status: integrationConnections.status })
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.organizationId, organizationId),
          eq(integrationConnections.providerKey, "google"),
        ),
      )
      .limit(1),
    db
      .select({ id: searchConsoleSnapshots.id })
      .from(searchConsoleSnapshots)
      .where(eq(searchConsoleSnapshots.organizationId, organizationId))
      .limit(1),
  ]);

  const audit = audits.find((row) => !row.builderSiteId) ?? audits[0] ?? null;
  const findings = audit?.findings ?? [];
  const searchConsoleConnected = googleRows[0]?.status === "connected";
  const secret = searchConsoleConnected
    ? await readGoogleSecret(organizationId)
    : null;

  return {
    seoScore: audit?.score ?? null,
    seoSummary: audit?.summary ?? "",
    seoFailCount: findings.filter((item) => item.severity === "fail").length,
    seoWarnCount: findings.filter((item) => item.severity === "warn").length,
    seoCheckedAt: audit?.createdAt ?? null,
    searchConsoleConnected,
    searchConsoleProperty: Boolean(secret?.siteUrl),
    searchConsoleSnapshot: snapshotRows.length > 0,
  };
}

export async function getSpecialistReports(organizationId: string) {
  const [snapshot, dashboard, seo] = await Promise.all([
    getGrowthSnapshot(organizationId),
    getDashboardSnapshot(organizationId),
    getLatestSeoSummary(organizationId),
  ]);
  if (!snapshot) return [];

  const defaultCheck = snapshot.weeklyReview.evidenceChecks.find(
    (row) => row.channel === "default",
  );
  const facts: SpecialistFacts = {
    now: snapshot.weeklyReview.generatedAt,
    goals: snapshot.goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      status: goal.status,
      goalType: goal.goalType,
      liveCurrentValue: goal.liveCurrentValue,
      targetValue: goal.targetValue,
      progressPercent: goal.progressPercent,
      liveNote: goal.liveNote,
    })),
    inferredDraftCount:
      snapshot.inferredOffers.length + snapshot.inferredGoals.length,
    policies: snapshot.policies,
    websiteConnected: Boolean(dashboard.website?.publicUrl),
    websiteUrl: dashboard.website?.publicUrl ?? "",
    openLeadCount: dashboard.openLeadCount,
    recordedVisitCount: dashboard.topChannels.reduce(
      (total, row) => total + row.count,
      0,
    ),
    upcomingEventCount: dashboard.upcomingEvents.length,
    evidenceSample: defaultCheck?.sample ?? {
      elapsedDays: 0,
      observations: 0,
      conversions: 0,
    },
    advertisingConnected: false,
    emailConnected: false,
    socialConnected: false,
    ...seo,
  };

  return buildSpecialistReports(facts);
}

export async function getCoordinatedNextStep(organizationId: string) {
  const [snapshot, reports, dashboard, openSeoDrafts, pipeline] = await Promise.all([
    getGrowthSnapshot(organizationId),
    getSpecialistReports(organizationId),
    getDashboardSnapshot(organizationId),
    getOpenSeoDrafts(organizationId),
    getOpenLeadsAndStages(organizationId),
  ]);
  if (!snapshot) return null;

  const learned = snapshot.decisions.find((row) => row.outcome);
  const activate = findActivateCandidate(snapshot.goals);
  const planGoal = findPlanDraftGoal(
    snapshot.activeGoals.map((goal) => ({
      ...goal,
      currentValue: goal.liveCurrentValue,
    })),
    snapshot.plans,
  );
  const approve = findDraftPlanToApprove(snapshot.activeGoals, snapshot.plans);
  const propose = findPlanNeedingActions(
    snapshot.activeGoals,
    snapshot.plans,
    snapshot.actions,
  );
  return coordinateNextStep({
    inferredDraftCount:
      snapshot.inferredOffers.length + snapshot.inferredGoals.length,
    reports,
    waitingActions: snapshot.actions.map((action) => ({
      id: action.id,
      description: action.description,
      module: action.module,
      status: action.status,
      risk: action.risk,
    })),
    openWork: snapshot.actions
      .filter((action) => isOpenOwnerWork(action.status))
      .map((action) => ({
        id: action.id,
        description: action.description,
        module: action.module,
        actionType: action.actionType,
        risk: action.risk,
      })),
    uncheckedWork: snapshot.actions
      .filter((action) => needsWhatChangedCheck(action))
      .map((action) => ({
        id: action.id,
        description: action.description,
        status: action.status,
      })),
    inferredDrafts: [
      ...snapshot.inferredOffers.map((offer) => ({
        id: offer.id,
        kind: "offer" as const,
        title: offer.name,
        description: offer.description,
        inferredFrom: offer.inferredFrom,
        confidence: offer.confidence,
      })),
      ...snapshot.inferredGoals.map((goal) => ({
        id: goal.id,
        kind: "goal" as const,
        title: goal.title,
        description: goal.description,
        inferredFrom: goal.inferredFrom,
        confidence: goal.confidence,
      })),
    ],
    latestLearningKind: learned
      ? (learningKindFromOutcome(learned.outcome) ?? "")
      : "",
    latestLearningOutcome: learned?.outcome ?? "",
    latestLearningGoalId: learned?.goalId ?? null,
    activateGoalId: activate?.id ?? null,
    activateGoalTitle: activate?.title ?? "",
    planGoalId: planGoal?.id ?? null,
    planGoalTitle: planGoal?.title ?? "",
    approvePlanId: approve?.plan.id ?? null,
    approvePlanGoalId: approve?.goal.id ?? null,
    approvePlanGoalTitle: approve?.goal.title ?? "",
    approvePlanVersion: approve?.plan.version,
    approvePlanExcerpt: approve ? draftPlanExcerpt(approve.plan.strategySummary) : "",
    proposePlanId: propose?.plan.id ?? null,
    proposePlanGoalId: propose?.goal.id ?? null,
    proposePlanGoalTitle: propose?.goal.title ?? "",
    proposePlanVersion: propose?.plan.version,
    activeGoalIds: snapshot.activeGoals.map((goal) => goal.id),
    websiteConnected: Boolean(dashboard.website?.publicUrl),
    websiteRead: websiteWasRead(snapshot.brain?.inferredSummary),
    seoDrafts: openSeoDrafts,
    openLeads: pipeline.openLeads,
    leadStages: pipeline.leadStages,
    learningGoal: learned?.goalId
      ? (() => {
          const goal = snapshot.goals.find((row) => row.id === learned.goalId);
          if (!goal) return null;
          return {
            id: goal.id,
            title: goal.title,
            liveCurrentValue: goal.liveCurrentValue,
            targetValue: goal.targetValue,
            unit: goal.unit,
            liveNote: goal.liveNote,
            progressPercent: goal.progressPercent,
          };
        })()
      : null,
  });
}
