"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { decisionRecords, growthGoals } from "@/lib/db/schema";
import {
  alreadyDraftedNextGoal,
  canDraftNextGoal,
  draftNextGoalFromReached,
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
      return "A next Goal was already drafted from this one. Open Goals to review it. GroovGro did not start marketing.";
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
