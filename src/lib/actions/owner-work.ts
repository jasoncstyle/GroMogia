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
  isOpenOwnerWork,
} from "@/lib/growth/owner-work";
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

    await db
      .update(growthActions)
      .set({
        status: OWNER_DONE_STATUS,
        result: "The owner did this. GroovGro did not execute it.",
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
