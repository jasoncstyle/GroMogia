"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { getDb } from "@/lib/db";
import { decisionRecords, growthActions } from "@/lib/db/schema";
import {
  OWNER_DONE_STATUS,
  OWNER_SKIPPED_STATUS,
  isFinishedOwnerWork,
  isOpenOwnerWork,
} from "@/lib/growth/owner-work";
import { getGrowthSnapshot } from "@/lib/growth/queries";
import {
  daysBetween,
  encodeWorkBaseline,
  learnFromOwnerWork,
  parseWorkBaseline,
} from "@/lib/growth/work-learning";
import { hasPermission } from "@/lib/permissions";
import { requireOrgSession } from "@/lib/require-org";

function revalidateWork() {
  revalidatePath("/app");
  revalidatePath("/app/work");
  revalidatePath("/app/goals");
  revalidatePath("/app/next-step");
  revalidatePath("/app/decisions");
}

const actionIdSchema = z.object({
  actionId: z.string().uuid(),
});

async function loadApprovedAction(actionId: string, organizationId: string) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [action] = await db
    .select()
    .from(growthActions)
    .where(
      and(
        eq(growthActions.id, actionId),
        eq(growthActions.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!action) throw new Error("That action was not found.");
  if (!isOpenOwnerWork(action.status)) {
    throw new Error("Approve that action first. GroovGro will not mark a draft as done.");
  }
  return { db, action };
}

export async function markOwnerActionDone(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not save that you did this.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "modify_goals")) {
      throw new Error("You do not have permission to update this work.");
    }
    const { actionId } = actionIdSchema.parse({
      actionId: formData.get("actionId"),
    });
    const { db, action } = await loadApprovedAction(
      actionId,
      session.organizationId,
    );
    const snapshot = await getGrowthSnapshot(session.organizationId);
    const goal = action.goalId
      ? snapshot?.goals.find((row) => row.id === action.goalId)
      : null;
    const baseline = goal
      ? encodeWorkBaseline({
          value: goal.liveCurrentValue,
          targetValue: goal.targetValue,
          unit: goal.unit ?? "",
        })
      : "";
    const result = [
      "The owner did this. GroovGro did not execute it.",
      baseline,
    ]
      .filter(Boolean)
      .join("\n");

    await db
      .update(growthActions)
      .set({
        status: OWNER_DONE_STATUS,
        result,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(growthActions.id, action.id),
          eq(growthActions.organizationId, session.organizationId),
        ),
      );

    await db.insert(decisionRecords).values({
      organizationId: session.organizationId,
      goalId: action.goalId,
      planId: action.planId,
      actionId: action.id,
      decisionType: action.risk === "operational" ? "operational" : "recommend",
      recommendation: action.description,
      rationale: "The owner did this work. GroovGro did not execute it.",
      supportingEvidence: baseline,
      evidenceWindow: "owner work",
      userResponse: "completed",
      approvalStatus: "approved",
      resultingAction: "owner_completed",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_action.completed_by_owner",
      targetType: "growth_action",
      targetId: action.id,
      metadata: { executed: false, executedAt: null },
    });
    revalidateWork();
    return "Saved. GroovGro recorded that you did this. It did not run marketing, send email, or change the live website.";
  });
}

export async function skipOwnerAction(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not skip that work.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "modify_goals")) {
      throw new Error("You do not have permission to update this work.");
    }
    const { actionId } = actionIdSchema.parse({
      actionId: formData.get("actionId"),
    });
    const { db, action } = await loadApprovedAction(
      actionId,
      session.organizationId,
    );

    await db
      .update(growthActions)
      .set({
        status: OWNER_SKIPPED_STATUS,
        result: "The owner skipped this. GroovGro did not execute it.",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(growthActions.id, action.id),
          eq(growthActions.organizationId, session.organizationId),
        ),
      );

    await db.insert(decisionRecords).values({
      organizationId: session.organizationId,
      goalId: action.goalId,
      planId: action.planId,
      actionId: action.id,
      decisionType: "no_change",
      recommendation: action.description,
      rationale: "The owner skipped this work. GroovGro did not execute it.",
      evidenceWindow: "owner work",
      userResponse: "skipped",
      approvalStatus: "rejected",
      resultingAction: "none",
      createdBy: session.userId,
    });

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_action.skipped_by_owner",
      targetType: "growth_action",
      targetId: action.id,
      metadata: { executed: false },
    });
    revalidateWork();
    return "Skipped. GroovGro did not run it.";
  });
}

export async function checkWhatChanged(
  formData: FormData,
): Promise<ActionResult> {
  return runAction("Could not check what changed.", async () => {
    const session = await requireOrgSession();
    if (!hasPermission(session.permissions, "view_decision_history")) {
      throw new Error("You do not have permission to read this learning.");
    }
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const { actionId } = actionIdSchema.parse({
      actionId: formData.get("actionId"),
    });

    const [action] = await db
      .select()
      .from(growthActions)
      .where(
        and(
          eq(growthActions.id, actionId),
          eq(growthActions.organizationId, session.organizationId),
        ),
      )
      .limit(1);
    if (!action) throw new Error("That action was not found.");
    if (action.status !== OWNER_DONE_STATUS) {
      throw new Error("Mark the work as done first, then check what changed.");
    }
    if (!isFinishedOwnerWork(action.status)) {
      throw new Error("That work is not finished yet.");
    }

    const snapshot = await getGrowthSnapshot(session.organizationId);
    const goal = action.goalId
      ? snapshot?.goals.find((row) => row.id === action.goalId)
      : null;
    const stored = parseWorkBaseline(action.result);
    const learning = learnFromOwnerWork({
      goalTitle: goal?.title ?? "",
      hasGoal: Boolean(goal),
      baselineValue: stored?.value ?? null,
      currentValue: goal ? goal.liveCurrentValue : null,
      targetValue: goal?.targetValue ?? stored?.targetValue ?? null,
      unit: goal?.unit || stored?.unit || "",
      daysSinceDone: daysBetween(action.updatedAt, new Date()),
      shareNote: goal?.shareNote,
      shareRows: goal?.shareRows,
    });

    const nextResult = stored
      ? `${action.result.split("\nWhat changed:")[0].trim()}\n\nWhat changed: ${learning.outcome}`
      : goal
        ? [
            action.result.split("\nWhat changed:")[0].trim() ||
              "The owner did this. GroovGro did not execute it.",
            encodeWorkBaseline({
              value: goal.liveCurrentValue,
              targetValue: goal.targetValue,
              unit: goal.unit ?? "",
            }),
            `What changed: ${learning.outcome}`,
          ].join("\n")
        : `${action.result.split("\nWhat changed:")[0].trim()}\n\nWhat changed: ${learning.outcome}`;

    await db
      .update(growthActions)
      .set({
        result: nextResult,
        updatedAt: action.updatedAt,
      })
      .where(
        and(
          eq(growthActions.id, action.id),
          eq(growthActions.organizationId, session.organizationId),
        ),
      );

    const [decision] = snapshot
      ? snapshot.decisions.filter(
          (row) => row.actionId === action.id && row.userResponse === "completed",
        )
      : [];
    if (decision) {
      await db
        .update(decisionRecords)
        .set({
          outcome: learning.outcome,
          supportingEvidence: stored
            ? decision.supportingEvidence || encodeWorkBaseline(stored)
            : goal
              ? encodeWorkBaseline({
                  value: goal.liveCurrentValue,
                  targetValue: goal.targetValue,
                  unit: goal.unit ?? "",
                })
              : decision.supportingEvidence,
        })
        .where(
          and(
            eq(decisionRecords.id, decision.id),
            eq(decisionRecords.organizationId, session.organizationId),
          ),
        );
    }

    await recordAudit({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "growth_action.learning_checked",
      targetType: "growth_action",
      targetId: action.id,
      metadata: { kind: learning.kind, changeCourse: false, executed: false },
    });
    revalidateWork();
    return learning.outcome;
  });
}
