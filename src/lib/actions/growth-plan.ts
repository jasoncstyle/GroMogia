"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { decisionRecords, growthPlans } from "@/lib/db/schema";
import { draftGrowthPlanSummary } from "@/lib/growth/plan-draft";
import { getCoordinatedNextStep, getGrowthSnapshot } from "@/lib/growth/queries";
import { getDashboardSnapshot } from "@/lib/phase2/queries";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

function revalidatePlans() {
  revalidatePath("/app");
  revalidatePath("/app/goals");
  revalidatePath("/app/next-step");
  revalidatePath("/app/decisions");
  revalidatePath("/app/growth-review");
}

export async function draftGrowthPlanForGoal(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not draft a plan.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "modify_goals")) {
      throw new Error("You do not have permission to save a plan.");
    }
    const db = getDb();
    if (!db) throw new Error("Database is not configured");

    const goalId = z.string().uuid().parse(formData.get("goalId"));
    const [snapshot, nextStep, dashboard] = await Promise.all([
      getGrowthSnapshot(session.organizationId),
      getCoordinatedNextStep(session.organizationId),
      getDashboardSnapshot(session.organizationId),
    ]);
    if (!snapshot) throw new Error("Sign in to draft a plan.");

    const goal = snapshot.goals.find((row) => row.id === goalId);
    if (!goal || goal.organizationId !== session.organizationId) {
      throw new Error("That Goal was not found.");
    }
    if (goal.discoveryStatus === "inferred") {
      throw new Error("Confirm that Goal first. GroovGro will not plan from a draft.");
    }

    const confirmedOffers = snapshot.offers.filter(
      (offer) => offer.discoveryStatus === "confirmed",
    );
    const summary = draftGrowthPlanSummary({
      businessName: snapshot.brand?.businessName || session.organizationName || "",
      description: snapshot.brand?.description ?? "",
      targetCustomers: snapshot.brand?.targetCustomers ?? "",
      goal: {
        title: goal.title,
        goalType: goal.goalType,
        status: goal.status,
        liveCurrentValue: goal.liveCurrentValue,
        targetValue: goal.targetValue,
        unit: goal.unit ?? "",
        liveNote: goal.liveNote,
        progressPercent: goal.progressPercent,
      },
      offers: confirmedOffers.map((offer) => ({
        name: offer.name,
        description: offer.description,
      })),
      nextStepTitle: nextStep?.primary.title ?? "",
      nextStepBody: nextStep?.primary.body ?? "",
      nextStepKind: nextStep?.primary.kind ?? "no_change_yet",
      leftAlone: (nextStep?.leftAlone ?? []).map((item) =>
        [item.title, item.body].filter(Boolean).join(" "),
      ),
      websiteConnected: Boolean(dashboard.website?.publicUrl),
      openLeadCount: dashboard.openLeadCount,
    });

    const prior = snapshot.plans.filter((plan) => plan.goalId === goal.id);
    const version = prior.reduce((max, row) => Math.max(max, row.version), 0) + 1;
    const planId = crypto.randomUUID();

    await db.insert(growthPlans).values({
      id: planId,
      organizationId: session.organizationId,
      goalId: goal.id,
      strategySummary: summary,
      status: "draft",
      version,
      createdBy: session.userId,
      createdByAi: true,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_plan.drafted",
      targetType: "growth_plan",
      targetId: planId,
      metadata: { version, executeAllowed: false },
    });
    revalidatePlans();
    return `Draft plan v${version} saved for “${goal.title}.” It is not active. GroovGro will not run it.`;
  });
}

const planIdSchema = z.object({
  planId: z.string().uuid(),
});

export async function approveGrowthPlan(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not approve that plan.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "approve_plans")) {
      throw new Error("You do not have permission to approve a plan.");
    }
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const { planId } = planIdSchema.parse({ planId: formData.get("planId") });

    const [plan] = await db
      .select()
      .from(growthPlans)
      .where(
        and(
          eq(growthPlans.id, planId),
          eq(growthPlans.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!plan) throw new Error("That plan was not found.");
    if (plan.status !== "draft") {
      throw new Error("Only a draft plan can be approved.");
    }

    await db
      .update(growthPlans)
      .set({ status: "superseded", updatedAt: new Date() })
      .where(
        and(
          eq(growthPlans.organizationId, session.organizationId),
          eq(growthPlans.goalId, plan.goalId),
          inArray(growthPlans.status, ["active", "approved"]),
          ne(growthPlans.id, plan.id),
        ),
      );

    await db
      .update(growthPlans)
      .set({
        status: "approved",
        approvedBy: session.userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(growthPlans.id, plan.id),
          eq(growthPlans.organizationId, session.organizationId),
        ),
      );

    await db.insert(decisionRecords).values({
      organizationId: session.organizationId,
      goalId: plan.goalId,
      planId: plan.id,
      decisionType: "recommend",
      recommendation: `Approved plan v${plan.version}`,
      rationale: plan.strategySummary.slice(0, 2000),
      evidenceWindow: "growth plan",
      userResponse: "approved",
      approvalStatus: "approved",
      resultingAction: "none",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_plan.approved",
      targetType: "growth_plan",
      targetId: plan.id,
      metadata: { executed: false },
    });
    revalidatePlans();
    return "Plan approved. GroovGro did not run it, start ads, or change the live website.";
  });
}

export async function rejectGrowthPlan(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not reject that plan.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "approve_plans")) {
      throw new Error("You do not have permission to reject a plan.");
    }
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const { planId } = planIdSchema.parse({ planId: formData.get("planId") });

    const [plan] = await db
      .select()
      .from(growthPlans)
      .where(
        and(
          eq(growthPlans.id, planId),
          eq(growthPlans.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!plan) throw new Error("That plan was not found.");
    if (plan.status !== "draft") {
      throw new Error("Only a draft plan can be rejected.");
    }

    await db
      .update(growthPlans)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(
        and(
          eq(growthPlans.id, plan.id),
          eq(growthPlans.organizationId, session.organizationId),
        ),
      );

    await db.insert(decisionRecords).values({
      organizationId: session.organizationId,
      goalId: plan.goalId,
      planId: plan.id,
      decisionType: "no_change",
      recommendation: `Rejected plan v${plan.version}`,
      rationale: "The owner rejected this plan. GroovGro did not execute it.",
      evidenceWindow: "growth plan",
      userResponse: "rejected",
      approvalStatus: "rejected",
      resultingAction: "none",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_plan.rejected",
      targetType: "growth_plan",
      targetId: plan.id,
      metadata: { executed: false },
    });
    revalidatePlans();
    return "Plan rejected. GroovGro did not run it.";
  });
}
