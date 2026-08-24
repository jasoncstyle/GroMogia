"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { and, eq, ne } from "drizzle-orm";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { decisionRecords, growthGoals } from "@/lib/db/schema";
import {
  alreadyDraftedNextGoal,
  canActivateDraftGoal,
  canDraftNextGoal,
  draftNextGoalFromReached,
  sourceGoalIdFromInferred,
} from "@/lib/growth/next-goal";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

function revalidateGoals() {
  revalidatePath("/app");
  revalidatePath("/app/goals");
  revalidatePath("/app/next-step");
  revalidatePath("/app/decisions");
  revalidatePath("/app/work");
}

export async function draftNextGoalFromReachedGoal(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not draft the next Goal.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "create_goals")) {
      throw new Error("You do not have permission to add a Goal.");
    }
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const goalId = z.string().uuid().parse(formData.get("goalId"));
    const snapshot = await getGrowthSnapshot(session.organizationId);
    if (!snapshot) throw new Error("Sign in to draft the next Goal.");

    const goal = snapshot.goals.find((row) => row.id === goalId);
    if (!goal || goal.organizationId !== session.organizationId) {
      throw new Error("That Goal was not found.");
    }
    const current = goal.liveCurrentValue;
    if (
      !canDraftNextGoal({
        status: goal.status,
        currentValue: current,
        targetValue: goal.targetValue,
      })
    ) {
      throw new Error("That Goal has not reached its target yet.");
    }
    if (alreadyDraftedNextGoal(snapshot.goals, goal.id)) {
      return "A next Goal was already drafted from this one. Open Next step to review it. GroovGro did not start marketing.";
    }

    const draft = draftNextGoalFromReached({
      id: goal.id,
      title: goal.title,
      goalType: goal.goalType,
      unit: goal.unit ?? "",
      currentValue: current,
      targetValue: goal.targetValue,
      offerId: goal.offerId,
      successDefinition: goal.successDefinition ?? "",
      status: goal.status,
    });
    const nextId = crypto.randomUUID();

    await db.insert(growthGoals).values({
      id: nextId,
      organizationId: session.organizationId,
      title: draft.title,
      description: draft.description,
      goalType: draft.goalType,
      status: "draft",
      priority: goal.priority,
      targetMetric: goal.targetMetric,
      targetValue: draft.targetValue,
      baselineValue: draft.baselineValue,
      currentValue: draft.currentValue,
      unit: draft.unit,
      offerId: draft.offerId,
      customerSegment: goal.customerSegment,
      location: goal.location,
      successDefinition: draft.successDefinition,
      createdBy: session.userId,
      source: "reached_goal",
      discoveryStatus: "confirmed",
      confidence: 80,
      inferredFrom: draft.inferredFrom,
    });

    await db.insert(decisionRecords).values({
      organizationId: session.organizationId,
      goalId: nextId,
      decisionType: "recommend",
      recommendation: `Drafted next Goal after “${goal.title}” reached its target`,
      rationale: draft.description,
      evidenceWindow: "reached goal",
      userResponse: "drafted",
      approvalStatus: "none",
      resultingAction: "none",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_goal.next_drafted",
      targetType: "growth_goal",
      targetId: nextId,
      metadata: { fromGoalId: goal.id, executeAllowed: false },
    });
    revalidateGoals();
    return `Drafted “${draft.title}.” It is a draft. Set it to Active when you want it. GroovGro did not start marketing.`;
  });
}

export async function activateDraftGoal(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not make that the active Goal.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "modify_goals")) {
      throw new Error("You do not have permission to change a Goal.");
    }
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const goalId = z.string().uuid().parse(formData.get("goalId"));
    const snapshot = await getGrowthSnapshot(session.organizationId);
    if (!snapshot) throw new Error("Sign in to change a Goal.");

    const goal = snapshot.goals.find((row) => row.id === goalId);
    if (!goal || goal.organizationId !== session.organizationId) {
      throw new Error("That Goal was not found.");
    }
    if (goal.status === "active") {
      return `“${goal.title}” is already the active Goal. GroovGro did not start marketing.`;
    }
    if (!canActivateDraftGoal(goal)) {
      throw new Error("Only a draft Goal you have reviewed can be made active this way.");
    }

    const now = new Date();
    const parsedSource = z
      .string()
      .uuid()
      .safeParse(sourceGoalIdFromInferred(goal.inferredFrom) ?? "");
    const source = parsedSource.success
      ? snapshot.goals.find((row) => row.id === parsedSource.data)
      : null;

    if (
      source &&
      source.organizationId === session.organizationId &&
      source.status !== "achieved"
    ) {
      await db
        .update(growthGoals)
        .set({
          status: "achieved",
          completedAt: source.completedAt ?? now,
          updatedAt: now,
        })
        .where(
          and(
            eq(growthGoals.id, source.id),
            eq(growthGoals.organizationId, session.organizationId),
          ),
        );
    }

    await db
      .update(growthGoals)
      .set({
        status: "paused",
        updatedAt: now,
      })
      .where(
        and(
          eq(growthGoals.organizationId, session.organizationId),
          eq(growthGoals.status, "active"),
          ne(growthGoals.id, goal.id),
        ),
      );

    await db
      .update(growthGoals)
      .set({
        status: "active",
        updatedAt: now,
      })
      .where(
        and(
          eq(growthGoals.id, goal.id),
          eq(growthGoals.organizationId, session.organizationId),
        ),
      );

    await db.insert(decisionRecords).values({
      organizationId: session.organizationId,
      goalId: goal.id,
      decisionType: "recommend",
      recommendation: `Made “${goal.title}” the active Goal`,
      rationale: source
        ? `The owner chose the next Goal after “${source.title}.” GroovGro will not start marketing.`
        : "The owner made this draft the active Goal. GroovGro will not start marketing.",
      evidenceWindow: "owner choice",
      userResponse: "activated",
      approvalStatus: "approved",
      resultingAction: "none",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_goal.activated",
      targetType: "growth_goal",
      targetId: goal.id,
      metadata: { fromGoalId: source?.id ?? null, executeAllowed: false },
    });
    revalidateGoals();
    return `“${goal.title}” is now the active Goal. Draft a plan when you want one. GroovGro did not start marketing.`;
  });
}
